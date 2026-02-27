/**
 * OpportunitiesService — CRUD for deals within pipelines.
 * Emits typed CRM events on mutations (stage changes, closes, creates).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunityStatus } from '@crm/types';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async create(accountId: string, dto: CreateOpportunityDto) {
    const opp = await this.prisma.opportunity.create({
      data: {
        accountId,
        contactId: dto.contactId,
        pipelineId: dto.pipelineId,
        stageId: dto.stageId,
        title: dto.title,
        value: dto.value,
        status: dto.status ?? 'open',
        closedAt: dto.closedAt ? new Date(dto.closedAt) : undefined,
      },
      include: { contact: true, stage: true, pipeline: true },
    });

    this.events.emit('opportunity.created', {
      accountId,
      opportunityId: opp.id,
      pipelineId: opp.pipelineId,
      stageId: opp.stageId,
    });

    return opp;
  }

  async findAll(accountId: string, pipelineId?: string) {
    return this.prisma.opportunity.findMany({
      where: { accountId, deletedAt: null, ...(pipelineId ? { pipelineId } : {}) },
      include: { contact: true, stage: true, pipeline: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(accountId: string, id: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, accountId, deletedAt: null },
      include: { contact: true, stage: true, pipeline: true, tasks: true, notes: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async update(accountId: string, id: string, dto: Partial<CreateOpportunityDto>) {
    await this.findOne(accountId, id);
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        ...dto,
        closedAt: dto.closedAt ? new Date(dto.closedAt) : undefined,
        updatedAt: new Date(),
      },
      include: { contact: true, stage: true, pipeline: true },
    });
  }

  async remove(accountId: string, id: string) {
    await this.findOne(accountId, id);
    return this.prisma.opportunity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async moveStage(accountId: string, id: string, stageId: string) {
    const opp = await this.findOne(accountId, id);
    const fromStageId = opp.stageId;

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: { stageId, updatedAt: new Date() },
      include: { stage: true },
    });

    this.events.emit('opportunity.stage_changed', {
      accountId,
      opportunityId: id,
      fromStageId,
      toStageId: stageId,
    });

    return updated;
  }

  async close(accountId: string, id: string, status: OpportunityStatus.WON | OpportunityStatus.LOST) {
    await this.findOne(accountId, id);

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: { status, closedAt: new Date(), updatedAt: new Date() },
      include: { contact: true, stage: true, pipeline: true },
    });

    this.events.emit('opportunity.closed', {
      accountId,
      opportunityId: id,
      status,
    });

    return updated;
  }
}
