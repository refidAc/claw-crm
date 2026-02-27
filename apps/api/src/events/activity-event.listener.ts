/**
 * ActivityEventListener — catches every CRM event and writes an ActivityEvent
 * row to the database. This is the universal timeline/audit log.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@crm/db';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ContactCreatedPayload,
  ContactUpdatedPayload,
  ContactDeletedPayload,
  OpportunityCreatedPayload,
  OpportunityStageChangedPayload,
  OpportunityClosedPayload,
  MessageReceivedPayload,
  MessageSentPayload,
  ConversationCreatedPayload,
  WorkflowTriggeredPayload,
  JobCompletedPayload,
  JobFailedPayload,
} from './types';

@Injectable()
export class ActivityEventListener {
  private readonly logger = new Logger(ActivityEventListener.name);

  constructor(private readonly prisma: PrismaService) {}

  private async log(
    accountId: string,
    entityType: string,
    entityId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.activityEvent.create({
        data: { accountId, entityType, entityId, eventType, payload: payload as Prisma.InputJsonValue },
      });
    } catch (err) {
      this.logger.error(`Failed to log activity event [${eventType}]: ${String(err)}`);
    }
  }

  @OnEvent('contact.created')
  onContactCreated(p: ContactCreatedPayload) {
    return this.log(p.accountId, 'contact', p.contactId, 'contact.created', p as unknown as Record<string, unknown>);
  }

  @OnEvent('contact.updated')
  onContactUpdated(p: ContactUpdatedPayload) {
    return this.log(p.accountId, 'contact', p.contactId, 'contact.updated', p.changes);
  }

  @OnEvent('contact.deleted')
  onContactDeleted(p: ContactDeletedPayload) {
    return this.log(p.accountId, 'contact', p.contactId, 'contact.deleted', {});
  }

  @OnEvent('opportunity.created')
  onOpportunityCreated(p: OpportunityCreatedPayload) {
    return this.log(p.accountId, 'opportunity', p.opportunityId, 'opportunity.created', { pipelineId: p.pipelineId, stageId: p.stageId });
  }

  @OnEvent('opportunity.stage_changed')
  onOpportunityStageChanged(p: OpportunityStageChangedPayload) {
    return this.log(p.accountId, 'opportunity', p.opportunityId, 'opportunity.stage_changed', { fromStageId: p.fromStageId, toStageId: p.toStageId });
  }

  @OnEvent('opportunity.closed')
  onOpportunityClosed(p: OpportunityClosedPayload) {
    return this.log(p.accountId, 'opportunity', p.opportunityId, 'opportunity.closed', { status: p.status });
  }

  @OnEvent('message.received')
  onMessageReceived(p: MessageReceivedPayload) {
    return this.log(p.accountId, 'message', p.messageId, 'message.received', { conversationId: p.conversationId, channel: p.channel, direction: p.direction });
  }

  @OnEvent('message.sent')
  onMessageSent(p: MessageSentPayload) {
    return this.log(p.accountId, 'message', p.messageId, 'message.sent', { conversationId: p.conversationId, channel: p.channel });
  }

  @OnEvent('conversation.created')
  onConversationCreated(p: ConversationCreatedPayload) {
    return this.log(p.accountId, 'conversation', p.conversationId, 'conversation.created', { contactId: p.contactId });
  }

  @OnEvent('workflow.triggered')
  onWorkflowTriggered(p: WorkflowTriggeredPayload) {
    return this.log(p.accountId, 'workflow', p.workflowId, 'workflow.triggered', { triggerId: p.triggerId, payload: p.payload });
  }

  @OnEvent('job.completed')
  onJobCompleted(p: JobCompletedPayload) {
    return this.log(p.accountId, 'job', p.jobId, 'job.completed', { jobRunId: p.jobRunId });
  }

  @OnEvent('job.failed')
  onJobFailed(p: JobFailedPayload) {
    return this.log(p.accountId, 'job', p.jobId, 'job.failed', { jobRunId: p.jobRunId, error: p.error });
  }
}
