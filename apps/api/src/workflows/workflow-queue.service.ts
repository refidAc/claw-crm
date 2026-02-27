/**
 * WorkflowQueueService — creates Job/JobRun rows and enqueues BullMQ jobs.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

export interface WorkflowJobData {
  jobId: string;
  resumeAfterActionId?: string;
}

@Injectable()
export class WorkflowQueueService {
  private readonly logger = new Logger(WorkflowQueueService.name);

  constructor(
    @InjectQueue('workflows') private readonly queue: Queue<WorkflowJobData>,
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async enqueue(
    workflowId: string,
    triggerId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const accountId = String(payload['accountId'] ?? '');

    // Create Job row
    const job = await this.prisma.job.create({
      data: {
        accountId,
        workflowId,
        type: 'workflow',
        payload: payload as object,
        status: 'pending',
      },
    });

    // Create initial JobRun row
    const jobRun = await this.prisma.jobRun.create({
      data: {
        jobId: job.id,
        attempt: 1,
        status: 'pending',
      },
    });

    // Enqueue BullMQ job
    await this.queue.add(
      { jobId: job.id },
      {
        jobId: job.id, // BullMQ dedup key
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    // Emit workflow.triggered
    this.events.emit('workflow.triggered', {
      accountId,
      workflowId,
      triggerId,
      payload,
    });

    this.logger.log(
      `Enqueued workflow job=${job.id} run=${jobRun.id} workflow=${workflowId}`,
    );
  }
}
