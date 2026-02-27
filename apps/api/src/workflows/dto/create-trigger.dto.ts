import { IsString, IsObject, IsOptional } from 'class-validator';
import type { CrmEventName } from '../../events/types';

export class CreateTriggerDto {
  @IsString()
  eventType!: CrmEventName;

  @IsObject()
  @IsOptional()
  filters?: Record<string, unknown>;
}
