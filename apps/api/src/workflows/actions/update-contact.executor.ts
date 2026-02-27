import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

@Injectable()
export class UpdateContactActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(UpdateContactActionExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const contactId = String(cfg['contactId'] ?? (context.triggerPayload['contactId'] ?? ''));
    const fields = cfg['fields'] as Record<string, unknown> | undefined;

    if (!contactId) {
      this.logger.warn(`[job:${context.jobId}] update_contact: missing contactId`);
      return;
    }
    if (!fields || typeof fields !== 'object') {
      this.logger.warn(`[job:${context.jobId}] update_contact: missing 'fields' config`);
      return;
    }

    // Only allow known safe contact fields to prevent mass-assignment
    const allowedKeys = ['firstName', 'lastName', 'email', 'phone', 'status', 'tags'];
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(([k]) => allowedKeys.includes(k)),
    );

    await this.prisma.contact.update({
      where: { id: contactId },
      data: safeFields,
    });

    this.logger.log(`[job:${context.jobId}] update_contact → ${contactId} fields: ${Object.keys(safeFields).join(', ')}`);
  }
}
