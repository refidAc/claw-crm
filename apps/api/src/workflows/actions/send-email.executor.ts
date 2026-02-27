import { Injectable, Logger } from '@nestjs/common';
import { ChannelAdapterFactory } from '../../channels/channel-adapter.factory';
import { ChannelType } from '@crm/types';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

@Injectable()
export class SendEmailActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(SendEmailActionExecutor.name);

  constructor(private readonly adapterFactory: ChannelAdapterFactory) {}

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const to = String(cfg['to'] ?? '');
    const subject = String(cfg['subject'] ?? '');
    const body = String(cfg['body'] ?? '');

    if (!to) {
      this.logger.warn(`[job:${context.jobId}] send_email: missing 'to' config`);
      return;
    }

    const adapter = this.adapterFactory.get(ChannelType.EMAIL);
    await adapter.send({ to, subject, body });
    this.logger.log(`[job:${context.jobId}] send_email → ${to}`);
  }
}
