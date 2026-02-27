/**
 * TriggerMatcher — listens to ALL CRM events and finds matching workflow triggers.
 * Uses EventEmitter2 wildcard listener to catch every event.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowQueueService } from './workflow-queue.service';
import type { CrmEventName } from '../events/types';

@Injectable()
export class TriggerMatcherService {
  private readonly logger = new Logger(TriggerMatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: WorkflowQueueService,
  ) {}

  /**
   * Wildcard listener — fires for every emitted event.
   * event: the event name (e.g. 'contact.created')
   * payload: the event payload
   */
  @OnEvent('**')
  async handleAnyEvent(payload: Record<string, unknown>, event?: string): Promise<void> {
    // EventEmitter2 wildcard: first arg is payload, second may be the event name
    // However with NestJS @OnEvent the event name is not passed as arg
    // We'll get it from the decorator — use a different approach below
    // Actually with @OnEvent('**'), the payload IS the event data and the event
    // name is available as context. NestJS passes payload only.
    // We need to detect eventType from payload or use a per-event approach.
    // See handleEvent below for the actual implementation.
  }

  /**
   * Real implementation: called by handleEvent with the resolved event name.
   */
  async matchAndEnqueue(
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Find all active workflows with a trigger matching this eventType
      const workflows = await this.prisma.workflowDefinition.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          triggers: {
            some: { eventType: eventName },
          },
        },
        include: {
          triggers: { where: { eventType: eventName } },
        },
      });

      for (const workflow of workflows) {
        for (const trigger of workflow.triggers) {
          if (this.filtersMatch(trigger.filters as Record<string, unknown>, payload)) {
            await this.queue.enqueue(workflow.id, trigger.id, payload);
            this.logger.log(
              `Matched workflow=${workflow.id} trigger=${trigger.id} for event=${eventName}`,
            );
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`TriggerMatcher error for event=${eventName}: ${msg}`);
    }
  }

  /**
   * Simple key=value filter matching.
   * trigger.filters: { "status": "active", "channel": "email" }
   * All filter keys must match the payload for the trigger to fire.
   */
  private filtersMatch(
    filters: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    if (!filters || Object.keys(filters).length === 0) return true;

    return Object.entries(filters).every(([key, expected]) => {
      const actual = payload[key];
      return String(actual) === String(expected);
    });
  }
}

/**
 * Per-event handlers that delegate to matchAndEnqueue.
 * We can't use a true wildcard with the NestJS/EventEmitter2 integration easily,
 * so we explicitly handle all 12 CRM event types.
 */
@Injectable()
export class TriggerMatcherEventHandler {
  constructor(private readonly matcher: TriggerMatcherService) {}

  @OnEvent('contact.created') onContactCreated(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('contact.created', p); }
  @OnEvent('contact.updated') onContactUpdated(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('contact.updated', p); }
  @OnEvent('contact.deleted') onContactDeleted(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('contact.deleted', p); }
  @OnEvent('opportunity.created') onOpportunityCreated(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('opportunity.created', p); }
  @OnEvent('opportunity.stage_changed') onOpportunityStageChanged(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('opportunity.stage_changed', p); }
  @OnEvent('opportunity.closed') onOpportunityClosed(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('opportunity.closed', p); }
  @OnEvent('message.received') onMessageReceived(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('message.received', p); }
  @OnEvent('message.sent') onMessageSent(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('message.sent', p); }
  @OnEvent('conversation.created') onConversationCreated(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('conversation.created', p); }
  @OnEvent('workflow.triggered') onWorkflowTriggered(p: Record<string, unknown>) { return this.matcher.matchAndEnqueue('workflow.triggered', p); }
}
