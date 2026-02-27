import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { ChannelsModule } from '../channels/channels.module';

import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { TriggerMatcherService, TriggerMatcherEventHandler } from './trigger-matcher.service';
import { WorkflowQueueService } from './workflow-queue.service';
import { WorkflowRunnerProcessor } from './workflow-runner.processor';
import { ActionExecutorService } from './action-executor.service';

// Action executors
import { SendEmailActionExecutor } from './actions/send-email.executor';
import { SendSmsActionExecutor } from './actions/send-sms.executor';
import { CreateTaskActionExecutor } from './actions/create-task.executor';
import { AddNoteActionExecutor } from './actions/add-note.executor';
import { UpdateContactActionExecutor } from './actions/update-contact.executor';
import { MoveOpportunityActionExecutor } from './actions/move-opportunity.executor';
import { WebhookActionExecutor } from './actions/webhook.executor';
import { WaitActionExecutor } from './actions/wait.executor';
import { BranchActionExecutor } from './actions/branch.executor';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    ChannelsModule,
    BullModule.registerQueue({ name: 'workflows' }),
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    TriggerMatcherService,
    TriggerMatcherEventHandler,
    WorkflowQueueService,
    WorkflowRunnerProcessor,
    ActionExecutorService,
    // Executors
    SendEmailActionExecutor,
    SendSmsActionExecutor,
    CreateTaskActionExecutor,
    AddNoteActionExecutor,
    UpdateContactActionExecutor,
    MoveOpportunityActionExecutor,
    WebhookActionExecutor,
    WaitActionExecutor,
    BranchActionExecutor,
  ],
  exports: [WorkflowsService, WorkflowQueueService],
})
export class WorkflowsModule {}
