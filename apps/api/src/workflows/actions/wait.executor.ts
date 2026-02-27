import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

const DELAY_UNIT_MS: Record<string, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

@Injectable()
export class WaitActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(WaitActionExecutor.name);

  constructor(@InjectQueue('workflows') private readonly workflowQueue: Queue) {}

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const delayType = String(cfg['delayType'] ?? 'minutes');
    const delayValue = Number(cfg['delayValue'] ?? 1);

    const multiplier = DELAY_UNIT_MS[delayType] ?? DELAY_UNIT_MS['minutes'];
    const delayMs = delayValue * multiplier;

    // Enqueue a continuation job after the delay
    await this.workflowQueue.add(
      { jobId: context.jobId, resumeAfterActionId: context.action.id },
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(
      `[job:${context.jobId}] wait: scheduled continuation in ${delayValue} ${delayType} (${delayMs}ms)`,
    );
  }
}
