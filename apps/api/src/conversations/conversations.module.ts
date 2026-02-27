import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationProcessor } from './conversation.processor';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'conversations',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    ChannelsModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationProcessor],
  exports: [ConversationsService],
})
export class ConversationsModule {}
