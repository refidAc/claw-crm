import { IsString, IsNumber, IsObject, IsOptional, IsIn } from 'class-validator';
import { ACTION_TYPES } from './create-action.dto';
import type { ActionType } from './create-action.dto';

export class UpdateActionDto {
  @IsString()
  @IsIn(ACTION_TYPES)
  @IsOptional()
  type?: ActionType;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}
