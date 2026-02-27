/**
 * SmsAdapter — stub implementation.
 * Ready for Twilio integration.
 *
 * Env vars needed when real:
 *   TWILIO_ACCOUNT_SID=
 *   TWILIO_AUTH_TOKEN=
 *   TWILIO_FROM_NUMBER=+1xxxxxxxxxx
 */
import { Injectable, Logger } from '@nestjs/common';
import type { IChannelAdapter, SendMessageOptions, SendMessageResult } from './channel-adapter.interface';

@Injectable()
export class SmsAdapter implements IChannelAdapter {
  private readonly logger = new Logger(SmsAdapter.name);

  async send(options: SendMessageOptions): Promise<SendMessageResult> {
    // TODO: replace with real Twilio call
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({ body, from, to });

    this.logger.log(
      `[SMS STUB] To: ${options.to} | Body: ${options.body.substring(0, 80)}`,
    );

    return { status: 'sent' };
  }
}
