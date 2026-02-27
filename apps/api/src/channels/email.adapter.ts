/**
 * EmailAdapter — stub implementation.
 * Ready for SendGrid / Mailgun integration.
 *
 * Env vars needed when real:
 *   EMAIL_PROVIDER=sendgrid|mailgun
 *   SENDGRID_API_KEY=
 *   MAILGUN_API_KEY=
 *   EMAIL_FROM=noreply@yourdomain.com
 */
import { Injectable, Logger } from '@nestjs/common';
import type { IChannelAdapter, SendMessageOptions, SendMessageResult } from './channel-adapter.interface';

@Injectable()
export class EmailAdapter implements IChannelAdapter {
  private readonly logger = new Logger(EmailAdapter.name);

  async send(options: SendMessageOptions): Promise<SendMessageResult> {
    // TODO: replace with real SendGrid / Mailgun call
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(this.config.get('SENDGRID_API_KEY'));
    // await sgMail.send({ to, from, subject, text: body });

    this.logger.log(
      `[EMAIL STUB] To: ${options.to} | Subject: ${options.subject ?? '(none)'} | Body: ${options.body.substring(0, 80)}`,
    );

    return { status: 'sent' };
  }
}
