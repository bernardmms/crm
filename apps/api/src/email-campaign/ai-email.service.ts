import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { generateEmailRequestSchema } from '@repo/api-contract';
import type z from 'zod';

type GenerateEmailRequest = z.infer<typeof generateEmailRequestSchema>;

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{SUBJECT}}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { width: 100%; background-color: #f4f4f5; padding: 32px 16px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background-color: #18181b; padding: 28px 40px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
    .body { padding: 40px; color: #3f3f46; }
    .body p { margin: 0 0 16px; line-height: 1.6; font-size: 15px; }
    .body ul { margin: 0 0 16px; padding-left: 20px; }
    .body ul li { margin-bottom: 8px; line-height: 1.6; font-size: 15px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; }
    .footer { background-color: #fafafa; border-top: 1px solid #e4e4e7; padding: 24px 40px; text-align: center; }
    .footer p { margin: 0; color: #71717a; font-size: 12px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>{{COMPANY_NAME}}</h1>
      </div>
      <div class="body">
        {{BODY_CONTENT}}
      </div>
      <div class="footer">
        <p>You are receiving this email because you are on our contact list.<br/>© {{YEAR}} {{COMPANY_NAME}}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

@Injectable()
export class AiEmailService {
  private readonly logger = new Logger(AiEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateEmailContent(request: GenerateEmailRequest): Promise<{ htmlContent: string; subject: string }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o';

    if (!apiKey) {
      throw new InternalServerErrorException('OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file.');
    }

    const { purpose, targetAudience, keyMessage, tone, companyName, additionalNotes } = request;

    const systemPrompt = `You are an expert email copywriter. Your task is to generate email body content and a subject line.
You must respond with a valid JSON object in exactly this format:
{
  "subject": "the email subject line",
  "bodyHtml": "the HTML body content that goes inside the email template"
}

Rules for bodyHtml:
- Use only <p>, <ul>, <li>, <strong>, <em>, and <div class="cta-wrapper"><a href="#" class="cta-button">...</a></div> tags
- Do NOT include <html>, <head>, <body>, or <style> tags — only the inner content
- Include a clear CTA button using the cta-wrapper/cta-button structure
- Keep it concise and compelling
- Tone must be: ${tone}`;

    const userPrompt = `Write an email for the following:
- Company: ${companyName}
- Purpose: ${purpose}
- Target audience: ${targetAudience}
- Key message / CTA: ${keyMessage}
${additionalNotes ? `- Additional notes: ${additionalNotes}` : ''}

Return only the JSON object as described.`;

    let raw: string;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`OpenAI API error ${response.status}: ${errorBody}`);
        throw new InternalServerErrorException('OpenAI request failed. Check your API key and quota.');
      }

      const data = (await response.json()) as OpenAIChatResponse;
      raw = data.choices[0]?.message?.content ?? '';
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Failed to reach OpenAI API', error);
      throw new InternalServerErrorException('Could not reach the OpenAI API. Check your network connection.');
    }

    let parsed: { subject: string; bodyHtml: string };
    try {
      parsed = JSON.parse(raw) as { subject: string; bodyHtml: string };
    } catch {
      this.logger.error('Failed to parse OpenAI response', raw);
      throw new InternalServerErrorException('Received an unexpected response from OpenAI. Please try again.');
    }

    const htmlContent = EMAIL_TEMPLATE
      .replace(/{{SUBJECT}}/g, parsed.subject)
      .replace(/{{COMPANY_NAME}}/g, companyName)
      .replace('{{BODY_CONTENT}}', parsed.bodyHtml)
      .replace(/{{YEAR}}/g, new Date().getFullYear().toString());

    return { htmlContent, subject: parsed.subject };
  }
}
