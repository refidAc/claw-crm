import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import type { CreateWorkflowDto } from './dto/create-workflow.dto';
import type { UpdateWorkflowDto } from './dto/update-workflow.dto';
import type { CreateTriggerDto } from './dto/create-trigger.dto';
import type { CreateActionDto } from './dto/create-action.dto';
import type { UpdateActionDto } from './dto/update-action.dto';
import type { ListRunsDto } from './dto/list-runs.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Workflows ────────────────────────────────────────────────────────────

  async list(accountId: string, isActive?: boolean) {
    return this.prisma.workflowDefinition.findMany({
      where: {
        accountId,
        deletedAt: null,
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: { triggers: true, _count: { select: { actions: true, jobs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(accountId: string, id: string) {
    const wf = await this.prisma.workflowDefinition.findFirst({
      where: { id, accountId, deletedAt: null },
      include: {
        triggers: true,
        actions: {
          orderBy: { order: 'asc' },
          include: { conditions: true, delays: true },
        },
      },
    });
    if (!wf) throw new NotFoundException(`Workflow ${id} not found`);
    return wf;
  }

  async create(accountId: string, dto: CreateWorkflowDto) {
    return this.prisma.workflowDefinition.create({
      data: { accountId, name: dto.name, description: dto.description },
    });
  }

  async update(accountId: string, id: string, dto: UpdateWorkflowDto) {
    await this.ensureExists(accountId, id);
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: dto,
    });
  }

  async remove(accountId: string, id: string) {
    await this.ensureExists(accountId, id);
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async activate(accountId: string, id: string) {
    await this.ensureExists(accountId, id);
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(accountId: string, id: string) {
    await this.ensureExists(accountId, id);
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Triggers ─────────────────────────────────────────────────────────────

  async addTrigger(accountId: string, workflowId: string, dto: CreateTriggerDto) {
    await this.ensureExists(accountId, workflowId);
    return this.prisma.trigger.create({
      data: {
        workflowId,
        eventType: dto.eventType,
        filters: dto.filters ?? {},
      },
    });
  }

  async removeTrigger(accountId: string, workflowId: string, triggerId: string) {
    await this.ensureExists(accountId, workflowId);
    const trigger = await this.prisma.trigger.findFirst({
      where: { id: triggerId, workflowId },
    });
    if (!trigger) throw new NotFoundException(`Trigger ${triggerId} not found`);
    return this.prisma.trigger.delete({ where: { id: triggerId } });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async addAction(accountId: string, workflowId: string, dto: CreateActionDto) {
    await this.ensureExists(accountId, workflowId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.$transaction(async (tx: any) => {
      const action = await tx.action.create({
        data: {
          workflowId,
          type: dto.type,
          order: dto.order,
          config: dto.config ?? {},
        },
      });

      if (dto.condition) {
        await tx.condition.create({
          data: {
            workflowId,
            actionId: action.id,
            expression: dto.condition.expression,
          },
        });
      }

      if (dto.delay) {
        await tx.delay.create({
          data: {
            workflowId,
            actionId: action.id,
            delayType: dto.delay.delayType,
            delayValue: dto.delay.delayValue,
          },
        });
      }

      return tx.action.findUnique({
        where: { id: action.id },
        include: { conditions: true, delays: true },
      });
    });
  }

  async updateAction(
    accountId: string,
    workflowId: string,
    actionId: string,
    dto: UpdateActionDto,
  ) {
    await this.ensureExists(accountId, workflowId);
    const action = await this.prisma.action.findFirst({
      where: { id: actionId, workflowId },
    });
    if (!action) throw new NotFoundException(`Action ${actionId} not found`);

    return this.prisma.action.update({
      where: { id: actionId },
      data: { ...(dto.type ? { type: dto.type } : {}), ...(dto.order !== undefined ? { order: dto.order } : {}), ...(dto.config ? { config: dto.config } : {}) },
    });
  }

  async removeAction(accountId: string, workflowId: string, actionId: string) {
    await this.ensureExists(accountId, workflowId);
    const action = await this.prisma.action.findFirst({
      where: { id: actionId, workflowId },
    });
    if (!action) throw new NotFoundException(`Action ${actionId} not found`);
    return this.prisma.action.delete({ where: { id: actionId } });
  }

  // ─── Runs ─────────────────────────────────────────────────────────────────

  async listRuns(accountId: string, workflowId: string, dto: ListRunsDto) {
    await this.ensureExists(accountId, workflowId);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.jobRun.findMany({
        where: { job: { workflowId, accountId } },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: { job: { select: { id: true, status: true, createdAt: true } } },
      }),
      this.prisma.jobRun.count({
        where: { job: { workflowId, accountId } },
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findRun(accountId: string, workflowId: string, runId: string) {
    await this.ensureExists(accountId, workflowId);
    const run = await this.prisma.jobRun.findFirst({
      where: { id: runId, job: { workflowId, accountId } },
      include: { job: true },
    });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    return run;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async ensureExists(accountId: string, id: string) {
    const wf = await this.prisma.workflowDefinition.findFirst({
      where: { id, accountId, deletedAt: null },
      select: { id: true },
    });
    if (!wf) throw new NotFoundException(`Workflow ${id} not found`);
    return wf;
  }
}
