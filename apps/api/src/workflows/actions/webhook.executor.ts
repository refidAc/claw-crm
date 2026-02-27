import { Injectable, Logger } from '@nestjs/common';
import type { IActionExecutor, WorkflowContext } from './executor.interface';

@Injectable()
export class WebhookActionExecutor implements IActionExecutor {
  private readonly logger = new Logger(WebhookActionExecutor.name);
  private readonly TIMEOUT_MS = 10_000;

  async execute(context: WorkflowContext): Promise<void> {
    const cfg = context.action.config as Record<string, unknown>;
    const url = String(cfg['url'] ?? '');

    if (!url) {
      this.logger.warn(`[job:${context.jobId}] webhook: missing 'url' config`);
      return;
    }

    const body = JSON.stringify({
      accountId: context.accountId,
      jobId: context.jobId,
      actionId: context.action.id,
      triggerPayload: context.triggerPayload,
      ...(typeof cfg['extraData'] === 'object' ? cfg['extraData'] as Record<string, unknown> : {}),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        // Log but do not throw — non-2xx is a soft failure
        this.logger.warn(
          `[job:${context.jobId}] webhook → ${url} responded ${response.status}`,
        );
      } else {
        this.logger.log(`[job:${context.jobId}] webhook → ${url} OK (${response.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[job:${context.jobId}] webhook → ${url} failed: ${msg}`);
      // Do not rethrow — webhook failures are non-fatal
    } finally {
      clearTimeout(timer);
    }
  }
}
