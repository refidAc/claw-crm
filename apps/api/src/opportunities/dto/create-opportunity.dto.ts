import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { OpportunityStatus } from '@crm/types';

export class CreateOpportunityDto {
  @ApiProperty() @IsString() contactId!: string;
  @ApiProperty() @IsString() pipelineId!: string;
  @ApiProperty() @IsString() stageId!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() value?: number;
  @ApiPropertyOptional({ enum: OpportunityStatus }) @IsEnum(OpportunityStatus) @IsOptional() status?: OpportunityStatus;
  @ApiPropertyOptional() @IsDateString() @IsOptional() closedAt?: string;
}
