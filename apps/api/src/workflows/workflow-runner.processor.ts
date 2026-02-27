/**
 * WorkflowRunnerProcessor — BullMQ processor for the 'workflows' queue.
 * This is the heart of the workflow engine.
 */
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job as BullJob } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { ActionExecutorService } from './action-executor.service';
import { evaluateExpression } from './condition-evaluator';
import type { WorkflowJobData } from './workflow-queue.service';

@Processor('workflows')
export class WorkflowRunnerProcessor {
  private readonly logger = new Logger(WorkflowRunnerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly executor: ActionExecutorService,
  ) {}

  @Process()
  async process(bullJob: BullJob<WorkflowJobData>): Promise<void> {
    const { jobId, resumeAfterActionId } = bullJob.data;
    this.logger.log(`Processing workflow job=${jobId} attempt=${bullJob.attemptsMade + 1}`);

    // ── 1. Load Job row ──────────────────────────────────────────────────────
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        workflow: {
          include: {
            actions: {
              orderBy: { order: 'asc' },
              include: { conditions: true, delays: true },
            },
          },
        },
        runs: { orderBy: { attempt: 'desc' }, take: 1 },
      },
    });

    if (!job || !job.workflow) {
      this.logger.error(`Job ${jobId} or its workflow not found — skipping`);
      return;
    }

    const latestRun = job.runs[0];
    if (!latestRun) {
      this.logger.error(`No JobRun found for job ${jobId} — skipping`);
      return;
    }

    // ── 2. Mark run as running ───────────────────────────────────────────────
    await this.prisma.jobRun.update({
      where: { id: latestRun.id },
      data: { status: 'running', startedAt: new Date() },
    });

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'running' },
    });

    const triggerPayload = job.payload as Record<string, unknown>;
    const actions = job.workflow.actions;

    // ── 3. Determine starting action ─────────────────────────────────────────
    let startIndex = 0;
    if (resumeAfterActionId) {
      const idx = actions.findIndex((a: { id: string }) => a.id === resumeAfterActionId);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }

    // ── 4. Execute actions in order ──────────────────────────────────────────
    try {
      for (let i = startIndex; i < actions.length; i++) {
        const action = actions[i];

        // Evaluate condition gate (if any)
        if (action.conditions.length > 0) {
          const condition = action.conditions[0];
          const pass = evaluateExpression(condition.expression, {
            accountId: job.accountId,
            jobId,
            triggerPayload,
          });

          if (!pass) {
            this.logger.log(
              `[job:${jobId}] action ${action.id} (${action.type}) skipped — condition false`,
            );
            continue;
          }
        }

        // Execute action
        await this.executor.execute({
          accountId: job.accountId,
          jobId,
          jobRunId: latestRun.id,
          triggerPayload,
          action,
        });

        // Handle wait action — stop and resume later
        if (action.type === 'wait') {
          this.logger.log(`[job:${jobId}] paused at wait action ${action.id}`);
          // The WaitActionExecutor already enqueued a delayed continuation job
          // Update job/run status to 'waiting'
          await this.prisma.job.update({ where: { id: jobId }, data: { status: 'waiting' } });
          await this.prisma.jobRun.update({
            where: { id: latestRun.id },
            data: { status: 'waiting' },
          });
          return;
        }

        // Handle branch action — jump to next action id
        if (action.type === 'branch') {
          const cfg = action.config as Record<string, unknown>;
          const branchResult = cfg['_branchResult'] as boolean | undefined;
          const nextId = branchResult
            ? (cfg['trueBranchActionId'] as string | undefined)
            : (cfg['falseBranchActionId'] as string | undefined);

          if (nextId) {
            const nextIdx = actions.findIndex((a: { id: string }) => a.id === nextId);
            if (nextIdx >= 0) {
              i = nextIdx - 1; // will be incremented by loop
              this.logger.log(`[job:${jobId}] branch → ${nextId}`);
            }
          }
        }
      }

      // ── 5. Mark completed ──────────────────────────────────────────────────
      await this.prisma.job.update({ where: { id: jobId }, data: { status: 'completed' } });
      await this.prisma.jobRun.update({
        where: { id: latestRun.id },
        data: { status: 'completed', finishedAt: new Date() },
      });

      this.events.emit('job.completed', {
        accountId: job.accountId,
        jobId,
        jobRunId: latestRun.id,
      });

      this.logger.log(`[job:${jobId}] completed`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      await this.prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
      await this.prisma.jobRun.update({
        where: { id: latestRun.id },
        data: { status: 'failed', error: errorMsg, finishedAt: new Date() },
      });

      this.events.emit('job.failed', {
        accountId: job.accountId,
        jobId,
        jobRunId: latestRun.id,
        error: errorMsg,
      });

      this.logger.error(`[job:${jobId}] failed: ${errorMsg}`);

      // Re-throw so BullMQ can retry
      throw err;
    }
  }
}
