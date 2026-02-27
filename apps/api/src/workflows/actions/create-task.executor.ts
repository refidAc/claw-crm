import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

@Injectable()
export class CreateTaskActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(CreateTaskActionExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const title = String(cfg['title'] ?? 'Workflow Task');
    const contactId = String(cfg['contactId'] ?? (context.triggerPayload['contactId'] ?? ''));
    const dueDate = cfg['dueDate'] ? new Date(String(cfg['dueDate'])) : undefined;
    const assignedUserId = cfg['assignedUserId'] ? String(cfg['assignedUserId']) : undefined;

    const task = await this.prisma.task.create({
      data: {
        accountId: context.accountId,
        title,
        contactId: contactId || undefined,
        dueAt: dueDate,
        assignedUserId,
      },
    });

    this.logger.log(`[job:${context.jobId}] create_task → ${task.id}`);
  }
}
