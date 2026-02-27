import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStageDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsInt() @Min(0) order!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
}

export class CreatePipelineDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional({ type: [CreateStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  @IsOptional()
  stages?: CreateStageDto[];
}
