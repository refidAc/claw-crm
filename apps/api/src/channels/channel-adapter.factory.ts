/**
 * ChannelAdapterFactory — resolves the correct adapter by ChannelType.
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { ChannelType } from '@crm/types';
import { EmailAdapter } from './email.adapter';
import { SmsAdapter } from './sms.adapter';
import type { IChannelAdapter } from './channel-adapter.interface';

@Injectable()
export class ChannelAdapterFactory {
  constructor(
    private readonly emailAdapter: EmailAdapter,
    private readonly smsAdapter: SmsAdapter,
  ) {}

  get(channel: ChannelType): IChannelAdapter {
    switch (channel) {
      case ChannelType.EMAIL:
        return this.emailAdapter;
      case ChannelType.SMS:
      case ChannelType.WHATSAPP:
        return this.smsAdapter;
      default:
        throw new BadRequestException(`No adapter available for channel: ${channel}`);
    }
  }
}
