/**
 * ActionExecutorService — factory/dispatcher.
 * Routes an Action to the correct executor by action.type.
 */
import { Injectable, Logger } from '@nestjs/common';
import { SendEmailActionExecutor } from './actions/send-email.executor';
import { SendSmsActionExecutor } from './actions/send-sms.executor';
import { CreateTaskActionExecutor } from './actions/create-task.executor';
import { AddNoteActionExecutor } from './actions/add-note.executor';
import { UpdateContactActionExecutor } from './actions/update-contact.executor';
import { MoveOpportunityActionExecutor } from './actions/move-opportunity.executor';
import { WebhookActionExecutor } from './actions/webhook.executor';
import { WaitActionExecutor } from './actions/wait.executor';
import { BranchActionExecutor } from './actions/branch.executor';
import type { IActionExecutor, WorkflowContext } from './actions/executor.interface';
import type { ActionType } from './dto/create-action.dto';

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  private readonly executors: Record<ActionType, IActionExecutor>;

  constructor(
    private readonly sendEmail: SendEmailActionExecutor,
    private readonly sendSms: SendSmsActionExecutor,
    private readonly createTask: CreateTaskActionExecutor,
    private readonly addNote: AddNoteActionExecutor,
    private readonly updateContact: UpdateContactActionExecutor,
    private readonly moveOpportunity: MoveOpportunityActionExecutor,
    private readonly webhook: WebhookActionExecutor,
    private readonly wait: WaitActionExecutor,
    private readonly branch: BranchActionExecutor,
  ) {
    this.executors = {
      send_email: this.sendEmail,
      send_sms: this.sendSms,
      create_task: this.createTask,
      add_note: this.addNote,
      update_contact: this.updateContact,
      move_opportunity: this.moveOpportunity,
      webhook: this.webhook,
      wait: this.wait,
      branch: this.branch,
    };
  }

  async execute(context: WorkflowContext): Promise<void> {
    const type = context.action.type as ActionType;
    const executor = this.executors[type];

    if (!executor) {
      this.logger.warn(`[job:${context.jobId}] unknown action type: ${type}`);
      throw new Error(`Unknown action type: ${type}`);
    }

    this.logger.debug(`[job:${context.jobId}] executing action ${context.action.id} (${type})`);
    await executor.execute(context);
  }
}
