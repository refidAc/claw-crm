/**
 * Typed event payloads for the internal CRM event bus.
 * Every event carries accountId for multi-tenant scoping.
 */
import type { Contact } from '@crm/db';

// ─── Contact Events ───────────────────────────────────────────────────────────

export interface ContactCreatedPayload {
  accountId: string;
  contactId: string;
  contact: Partial<Contact>;
}

export interface ContactUpdatedPayload {
  accountId: string;
  contactId: string;
  changes: Record<string, unknown>;
}

export interface ContactDeletedPayload {
  accountId: string;
  contactId: string;
}

// ─── Opportunity Events ───────────────────────────────────────────────────────

export interface OpportunityCreatedPayload {
  accountId: string;
  opportunityId: string;
  pipelineId: string;
  stageId: string;
}

export interface OpportunityStageChangedPayload {
  accountId: string;
  opportunityId: string;
  fromStageId: string;
  toStageId: string;
}

export interface OpportunityClosedPayload {
  accountId: string;
  opportunityId: string;
  status: 'won' | 'lost';
}

// ─── Message Events ───────────────────────────────────────────────────────────

export interface MessageReceivedPayload {
  accountId: string;
  conversationId: string;
  messageId: string;
  channel: string;
  direction: string;
}

export interface MessageSentPayload {
  accountId: string;
  conversationId: string;
  messageId: string;
  channel: string;
}

// ─── Conversation Events ──────────────────────────────────────────────────────

export interface ConversationCreatedPayload {
  accountId: string;
  conversationId: string;
  contactId: string;
}

// ─── Workflow Events ──────────────────────────────────────────────────────────

export interface WorkflowTriggeredPayload {
  accountId: string;
  workflowId: string;
  triggerId: string;
  payload: Record<string, unknown>;
}

// ─── Job Events ───────────────────────────────────────────────────────────────

export interface JobCompletedPayload {
  accountId: string;
  jobId: string;
  jobRunId: string;
}

export interface JobFailedPayload {
  accountId: string;
  jobId: string;
  jobRunId: string;
  error: string;
}

// ─── Event Map ────────────────────────────────────────────────────────────────

export interface CrmEventMap {
  'contact.created': ContactCreatedPayload;
  'contact.updated': ContactUpdatedPayload;
  'contact.deleted': ContactDeletedPayload;
  'opportunity.created': OpportunityCreatedPayload;
  'opportunity.stage_changed': OpportunityStageChangedPayload;
  'opportunity.closed': OpportunityClosedPayload;
  'message.received': MessageReceivedPayload;
  'message.sent': MessageSentPayload;
  'conversation.created': ConversationCreatedPayload;
  'workflow.triggered': WorkflowTriggeredPayload;
  'job.completed': JobCompletedPayload;
  'job.failed': JobFailedPayload;
}

export type CrmEventName = keyof CrmEventMap;
