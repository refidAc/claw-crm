import type { Action } from '@crm/db';

export interface WorkflowContext {
  accountId: string;
  jobId: string;
  jobRunId: string;
  triggerPayload: Record<string, unknown>;
  action: Action;
}

export interface IActionExecutor {
  execute(context: WorkflowContext): Promise<void>;
}
