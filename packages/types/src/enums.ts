/**
 * Shared enums used across the CRM monorepo (API, web, workers).
 * Keep these in sync with Prisma schema string literals.
 */

export enum ChannelType {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PHONE = 'phone',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export enum OpportunityStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  SNOOZED = 'snoozed',
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TriggerEventType {
  CONTACT_CREATED = 'contact.created',
  CONTACT_UPDATED = 'contact.updated',
  OPPORTUNITY_CREATED = 'opportunity.created',
  OPPORTUNITY_STAGE_CHANGED = 'opportunity.stage_changed',
  OPPORTUNITY_WON = 'opportunity.won',
  OPPORTUNITY_LOST = 'opportunity.lost',
  CONVERSATION_CREATED = 'conversation.created',
  MESSAGE_RECEIVED = 'message.received',
  TASK_COMPLETED = 'task.completed',
  FORM_SUBMITTED = 'form.submitted',
}

export enum ActionType {
  SEND_EMAIL = 'send_email',
  SEND_SMS = 'send_sms',
  CREATE_TASK = 'create_task',
  ADD_NOTE = 'add_note',
  UPDATE_CONTACT = 'update_contact',
  MOVE_OPPORTUNITY = 'move_opportunity',
  WEBHOOK = 'webhook',
  WAIT = 'wait',
  BRANCH = 'branch',
}

export enum DelayType {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  UNTIL_DATE = 'until_date',
  UNTIL_TIME = 'until_time',
}

export enum EntityType {
  CONTACT = 'contact',
  COMPANY = 'company',
  OPPORTUNITY = 'opportunity',
  CONVERSATION = 'conversation',
  TASK = 'task',
  NOTE = 'note',
  WORKFLOW = 'workflow',
  JOB = 'job',
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum Plan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}
