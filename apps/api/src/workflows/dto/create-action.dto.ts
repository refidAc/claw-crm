import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export const ACTION_TYPES = [
  'send_email',
  'send_sms',
  'create_task',
  'add_note',
  'update_contact',
  'move_opportunity',
  'webhook',
  'wait',
  'branch',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export class ConditionConfigDto {
  @IsString()
  expression!: string;
}

export class DelayConfigDto {
  @IsString()
  @IsIn(['minutes', 'hours', 'days'])
  delayType!: string;

  @IsNumber()
  delayValue!: number;
}

export class CreateActionDto {
  @IsString()
  @IsIn(ACTION_TYPES)
  type!: ActionType;

  @IsNumber()
  order!: number;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => ConditionConfigDto)
  @IsOptional()
  condition?: ConditionConfigDto;

  @ValidateNested()
  @Type(() => DelayConfigDto)
  @IsOptional()
  delay?: DelayConfigDto;
}
