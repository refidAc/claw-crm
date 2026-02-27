/**
 * Workflow-related frontend types — mirrors the backend Prisma schema.
 */

export enum TriggerEventType {
  ContactCreated = 'contact.created',
  ContactUpdated = 'contact.updated',
  ContactDeleted = 'contact.deleted',
  OpportunityCreated = 'opportunity.created',
  OpportunityStageChanged = 'opportunity.stage_changed',
  OpportunityClosed = 'opportunity.closed',
  MessageReceived = 'message.received',
  MessageSent = 'message.sent',
  ConversationCreated = 'conversation.created',
  WorkflowTriggered = 'workflow.triggered',
  JobCompleted = 'job.completed',
  JobFailed = 'job.failed',
}

export enum ActionType {
  SendEmail = 'send_email',
  SendSms = 'send_sms',
  CreateTask = 'create_task',
  AddNote = 'add_note',
  UpdateContact = 'update_contact',
  MoveOpportunity = 'move_opportunity',
  Webhook = 'webhook',
  Wait = 'wait',
  Branch = 'branch',
}

export enum JobRunStatus {
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Waiting = 'waiting',
}

export interface TriggerFilter {
  key: string;
  value: string;
}

export interface Trigger {
  id: string;
  workflowId: string;
  eventType: TriggerEventType;
  filters: TriggerFilter[];
  createdAt: string;
  updatedAt: string;
}

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string;
  /** Serialized expression string */
  expression: string;
}

export enum ConditionOperator {
  Equals = 'equals',
  NotEquals = 'not_equals',
  Contains = 'contains',
  NotContains = 'not_contains',
  Gt = 'gt',
  Lt = 'lt',
  IsEmpty = 'is_empty',
  IsNotEmpty = 'is_not_empty',
}

export interface Delay {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

/** Config shapes per action type */
export interface SendEmailConfig {
  to: string;
  subject: string;
  body: string;
}

export interface SendSmsConfig {
  to: string;
  body: string;
}

export interface CreateTaskConfig {
  title: string;
  dueDateOffset: string;
  assignedUserId?: string;
}

export interface AddNoteConfig {
  body: string;
}

export interface UpdateContactConfig {
  fields: { field: string; value: string }[];
}

export interface MoveOpportunityConfig {
  pipelineId: string;
  stageId: string;
}

export interface WebhookConfig {
  url: string;
  body?: string;
}

export interface WaitConfig {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface BranchConfig {
  expression: string;
  trueLabel: string;
  falseLabel: string;
}

export type ActionConfig =
  | SendEmailConfig
  | SendSmsConfig
  | CreateTaskConfig
  | AddNoteConfig
  | UpdateContactConfig
  | MoveOpportunityConfig
  | WebhookConfig
  | WaitConfig
  | BranchConfig;

export interface Action {
  id: string;
  workflowId: string;
  type: ActionType;
  order: number;
  config: ActionConfig;
  condition?: string | null;
  delayAmount?: number | null;
  delayUnit?: 'minutes' | 'hours' | 'days' | null;
  parentActionId?: string | null;
  branchPath?: 'true' | 'false' | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string | null;
  _count?: {
    triggers: number;
    actions: number;
    runs: number;
  };
}

export interface WorkflowWithDetails extends Workflow {
  triggers: Trigger[];
  actions: Action[];
}

export interface ActionStepResult {
  actionId: string;
  actionType: ActionType;
  status: 'completed' | 'skipped' | 'failed';
  error?: string;
  executedAt: string;
}

export interface JobRun {
  id: string;
  workflowId: string;
  status: JobRunStatus;
  triggeredAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  triggerPayload?: Record<string, unknown>;
  stepResults?: ActionStepResult[];
  error?: string | null;
}

export interface WorkflowContext {
  workflowId: string;
  triggerPayload: Record<string, unknown>;
  contact?: Record<string, unknown>;
  opportunity?: Record<string, unknown>;
}
