import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

@Injectable()
export class AddNoteActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(AddNoteActionExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const body = String(cfg['body'] ?? '');
    const contactId = String(cfg['contactId'] ?? (context.triggerPayload['contactId'] ?? ''));
    const opportunityId = cfg['opportunityId'] ? String(cfg['opportunityId']) : undefined;
    // authorId is required — fall back to a system user id from config or skip
    const authorId = String(cfg['authorId'] ?? '');

    if (!body) {
      this.logger.warn(`[job:${context.jobId}] add_note: missing 'body' config`);
      return;
    }
    if (!authorId) {
      this.logger.warn(`[job:${context.jobId}] add_note: missing 'authorId' config`);
      return;
    }

    const note = await this.prisma.note.create({
      data: {
        accountId: context.accountId,
        body,
        contactId: contactId || undefined,
        opportunityId,
        authorId,
      },
    });

    this.logger.log(`[job:${context.jobId}] add_note → ${note.id}`);
  }
}
