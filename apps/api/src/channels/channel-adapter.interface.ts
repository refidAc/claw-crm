/**
 * Common interface for all channel adapters.
 * Swap the stub implementation with real SDKs (SendGrid, Twilio, etc.)
 * without touching the consumer code.
 */
export interface SendMessageOptions {
  to: string;
  body: string;
  subject?: string; // email only
  from?: string;
}

export interface SendMessageResult {
  externalId?: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface IChannelAdapter {
  send(options: SendMessageOptions): Promise<SendMessageResult>;
}
