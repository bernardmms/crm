import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '../lib/db';
import { buildUnsubscribeUrl } from './unsubscribe-token';

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  contactId: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: 'unsubscribed';
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
    const contact = await prisma.contact.findUnique({
      where: { id: params.contactId },
      select: { unsubscribedAt: true },
    });

    if (contact?.unsubscribedAt) {
      this.logger.log(
        `Skipping email to ${params.to} — contact ${params.contactId} unsubscribed at ${contact.unsubscribedAt.toISOString()}`,
      );
      return { success: false, skipped: 'unsubscribed' };
    }

    const htmlContent = injectUnsubscribeFooter(
      params.htmlContent,
      buildUnsubscribeUrl(params.contactId),
    );

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
          htmlContent,
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

function buildUnsubscribeFooterHtml(unsubscribeUrl: string): string {
  return `<div style="margin-top:24px;padding:16px 24px;border-top:1px solid #e4e4e7;background-color:#fafafa;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#71717a;font-size:12px;line-height:1.5;">
  <p style="margin:0;">
    Don't want to receive these emails? <a href="${unsubscribeUrl}" style="color:#3f3f46;text-decoration:underline;">Unsubscribe here</a>.
  </p>
</div>`;
}

function injectUnsubscribeFooter(
  htmlContent: string,
  unsubscribeUrl: string,
): string {
  const footer = buildUnsubscribeFooterHtml(unsubscribeUrl);
  const closingBody = /<\/body\s*>/i;

  if (closingBody.test(htmlContent)) {
    return htmlContent.replace(closingBody, `${footer}</body>`);
  }

  return `${htmlContent}\n${footer}`;
}
