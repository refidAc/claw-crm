import { Module } from '@nestjs/common';
import { EmailAdapter } from './email.adapter';
import { SmsAdapter } from './sms.adapter';
import { ChannelAdapterFactory } from './channel-adapter.factory';

@Module({
  providers: [EmailAdapter, SmsAdapter, ChannelAdapterFactory],
  exports: [ChannelAdapterFactory],
})
export class ChannelsModule {}
