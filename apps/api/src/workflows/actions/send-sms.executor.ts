import { Injectable, Logger } from '@nestjs/common';
import { ChannelAdapterFactory } from '../../channels/channel-adapter.factory';
import { ChannelType } from '@crm/types';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

@Injectable()
export class SendSmsActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(SendSmsActionExecutor.name);

  constructor(private readonly adapterFactory: ChannelAdapterFactory) {}

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const to = String(cfg['to'] ?? '');
    const body = String(cfg['body'] ?? '');

    if (!to) {
      this.logger.warn(`[job:${context.jobId}] send_sms: missing 'to' config`);
      return;
    }

    const adapter = this.adapterFactory.get(ChannelType.SMS);
    await adapter.send({ to, body });
    this.logger.log(`[job:${context.jobId}] send_sms → ${to}`);
  }
}
