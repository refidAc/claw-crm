/**
 * BullQueueModule — sets up BullMQ with Redis connection from env.
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
        return {
          redis: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || '6379', 10),
            password: redisUrl.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'workflows' },
      { name: 'emails' },
      { name: 'sms' },
    ),
  ],
  exports: [BullModule],
})
export class BullQueueModule {}
