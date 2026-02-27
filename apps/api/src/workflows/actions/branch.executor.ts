import { Injectable, Logger } from '@nestjs/common';
import { evaluateExpression } from '../condition-evaluator';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

/**
 * BranchActionExecutor
 *
 * config shape:
 * {
 *   expression: "contact.email contains '@gmail.com'",
 *   trueBranchActionId: "ckxxx",   // next action id if true
 *   falseBranchActionId: "ckyyy",  // next action id if false
 * }
 *
 * The executor evaluates the condition and stores the result in
 * action.config so the WorkflowRunner can route to the correct branch.
 * The runner reads `_branchResult` from the action after execution.
 */
@Injectable()
export class BranchActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(BranchActionExecutor.name);

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const expression = String(cfg['expression'] ?? '');

    if (!expression) {
      this.logger.warn(`[job:${context.jobId}] branch: missing 'expression' config`);
      return;
    }

    const result = evaluateExpression(expression, {
      accountId: context.accountId,
      jobId: context.jobId,
      triggerPayload: context.triggerPayload,
    });

    // Write result back so the runner can read it
    (context.action.config as Record<string, unknown>)['_branchResult'] = result;

    const nextId = result
      ? cfg['trueBranchActionId']
      : cfg['falseBranchActionId'];

    this.logger.log(
      `[job:${context.jobId}] branch: expression="${expression}" → ${result} → nextActionId=${String(nextId ?? 'none')}`,
    );
  }
}
