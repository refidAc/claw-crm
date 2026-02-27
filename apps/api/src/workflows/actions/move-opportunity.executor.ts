import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

@Injectable()
export class MoveOpportunityActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(MoveOpportunityActionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const opportunityId = String(cfg['opportunityId'] ?? (context.triggerPayload['opportunityId'] ?? ''));
    const toStageId = String(cfg['stageId'] ?? '');

    if (!opportunityId || !toStageId) {
      this.logger.warn(`[job:${context.jobId}] move_opportunity: missing opportunityId or stageId`);
      return;
    }

    const existing = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { stageId: true, pipelineId: true },
    });

    if (!existing) {
      this.logger.warn(`[job:${context.jobId}] move_opportunity: opportunity ${opportunityId} not found`);
      return;
    }

    await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: { stageId: toStageId },
    });

    this.events.emit('opportunity.stage_changed', {
      accountId: context.accountId,
      opportunityId,
      fromStageId: existing.stageId,
      toStageId,
    });

    this.logger.log(`[job:${context.jobId}] move_opportunity → ${opportunityId} stage: ${existing.stageId} → ${toStageId}`);
  }
}
