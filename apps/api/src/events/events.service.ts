/**
 * EventsService — typed wrapper around EventEmitter2.
 * Use this everywhere instead of injecting EventEmitter2 directly.
 */
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CrmEventMap, CrmEventName } from './types';

@Injectable()
export class EventsService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<E extends CrmEventName>(event: E, payload: CrmEventMap[E]): boolean {
    return this.emitter.emit(event, payload);
  }
}
