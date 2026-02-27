/**
 * PipelinesService — manages sales pipelines and their stages.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(accountId: string, dto: CreatePipelineDto) {
    return this.prisma.pipeline.create({
      data: {
        accountId,
        name: dto.name,
        stages: dto.stages
          ? { create: dto.stages.map((s) => ({ name: s.name, order: s.order, color: s.color ?? '#6366f1' })) }
          : undefined,
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(accountId: string) {
    return this.prisma.pipeline.findMany({
      where: { accountId },
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(accountId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, accountId },
      include: {
        stages: { orderBy: { order: 'asc' } },
        opportunities: { where: { deletedAt: null }, include: { contact: true, stage: true } },
      },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async update(accountId: string, id: string, dto: Partial<CreatePipelineDto>) {
    await this.findOne(accountId, id);
    return this.prisma.pipeline.update({
      where: { id },
      data: { name: dto.name },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(accountId: string, id: string) {
    await this.findOne(accountId, id);
    return this.prisma.pipeline.delete({ where: { id } });
  }

  async addStage(pipelineId: string, accountId: string, name: string, order: number, color?: string) {
    await this.findOne(accountId, pipelineId);
    return this.prisma.stage.create({
      data: { pipelineId, name, order, color: color ?? '#6366f1' },
    });
  }

  async removeStage(stageId: string) {
    return this.prisma.stage.delete({ where: { id: stageId } });
  }
}
