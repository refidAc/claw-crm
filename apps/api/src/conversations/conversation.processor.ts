/**
 * ConversationProcessor — BullMQ worker for send-email / send-sms jobs.
 *
 * Job payload: { messageId: string, channel: ChannelType, to: string, body: string, subject?: string }
 * Retry: 3 attempts, exponential backoff.
 */
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { ChannelAdapterFactory } from '../channels/channel-adapter.factory';
import { ChannelType } from '@crm/types';

export interface SendMessageJobPayload {
  messageId: string;
  conversationId: string;
  accountId: string;
  channel: ChannelType;
  to: string;
  body: string;
  subject?: string;
}

@Processor('conversations')
export class ConversationProcessor {
  private readonly logger = new Logger(ConversationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly adapterFactory: ChannelAdapterFactory,
  ) {}

  @Process({ name: 'send-message', concurrency: 5 })
  async handleSendMessage(job: Job<SendMessageJobPayload>): Promise<void> {
    const { messageId, conversationId, accountId, channel, to, body, subject } = job.data;

    this.logger.log(`Processing send-message job [messageId=${messageId}, channel=${channel}]`);

    try {
      const adapter = this.adapterFactory.get(channel);
      const result = await adapter.send({ to, body, subject });

      if (result.status === 'sent') {
        await this.prisma.message.update({
          where: { id: messageId },
          data: { status: 'sent', sentAt: new Date() },
        });

        this.events.emit('message.sent', {
          accountId,
          conversationId,
          messageId,
          channel,
        });

        this.logger.log(`Message sent successfully [messageId=${messageId}]`);
      } else {
        throw new Error(result.error ?? 'Adapter returned failed status');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send message [messageId=${messageId}]: ${errorMsg}`);

      await this.prisma.message.update({
        where: { id: messageId },
        data: { status: 'failed' },
      });

      // Re-throw so BullMQ can retry
      throw err;
    }
  }
}
