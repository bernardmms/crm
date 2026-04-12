import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

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

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SESClient | null = null;
  private fromAddress: string;

  constructor() {
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
    const secretAccessKey = process.env.AWS_SES_SECRET_KEY;
    const region = process.env.AWS_SES_REGION;
    this.fromAddress = process.env.AWS_SES_FROM_ADDRESS || '';

    if (accessKeyId && secretAccessKey && region) {
      this.sesClient = new SESClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('AWS SES client initialized successfully');
    } else {
      this.logger.warn(
        'AWS SES credentials not configured. Emails will be logged but not sent. ' +
          'Set AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY, AWS_SES_REGION, and AWS_SES_FROM_ADDRESS to enable sending.',
      );
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.sesClient || !this.fromAddress) {
      this.logger.warn(
        `[DRY RUN] Would send email to ${params.to} — Subject: "${params.subject}"`,
      );
      return { success: true, messageId: `dry-run-${Date.now()}` };
    }

    try {
      const command = new SendEmailCommand({
        Source: this.fromAddress,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: { Data: params.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: params.htmlContent, Charset: 'UTF-8' },
          },
        },
      });

      const response = await this.sesClient.send(command);

      this.logger.log(
        `Email sent to ${params.to} — MessageId: ${response.MessageId}`,
      );

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown SES error';
      this.logger.error(`Failed to send email to ${params.to}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  isConfigured(): boolean {
    return this.sesClient !== null && this.fromAddress !== '';
  }
}
