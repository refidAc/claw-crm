/**
 * EventsModule — global module that provides the typed EventsService
 * and wires up the ActivityEventListener.
 * Import EventEmitterModule.forRoot() in AppModule.
 */
import { Global, Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { ActivityEventListener } from './activity-event.listener';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [EventsService, ActivityEventListener],
  exports: [EventsService],
})
export class EventsModule {}
