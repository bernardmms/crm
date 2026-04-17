import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY ?? '';
    this.fromAddress = process.env.BREVO_FROM_ADDRESS ?? '';
    this.fromName = process.env.BREVO_FROM_NAME ?? '';

    if (this.apiKey && this.fromAddress) {
      this.logger.log('Brevo email client initialized successfully');
    } else {
      this.logger.warn(
        'Brevo credentials not configured. Emails will be logged but not sent. ' +
          'Set BREVO_API_KEY and BREVO_FROM_ADDRESS to enable sending.',
      );
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `[DRY RUN] Would send email to ${params.to} — Subject: "${params.subject}"`,
      );
      return { success: true, messageId: `dry-run-${Date.now()}` };
    }

    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: this.fromAddress,
            ...(this.fromName ? { name: this.fromName } : {}),
          },
          to: [{ email: params.to }],
          subject: params.subject,
          htmlContent: params.htmlContent,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMessage = `Brevo API error ${response.status}: ${errorBody}`;
        this.logger.error(`Failed to send email to ${params.to}: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      const data = (await response.json()) as { messageId?: string };
      this.logger.log(
        `Email sent to ${params.to} — MessageId: ${data.messageId}`,
      );

      return { success: true, messageId: data.messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Brevo error';
      this.logger.error(`Failed to send email to ${params.to}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== '' && this.fromAddress !== '';
  }
}
