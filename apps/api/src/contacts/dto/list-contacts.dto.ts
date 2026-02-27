import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListContactsDto {
  @ApiPropertyOptional({ default: 1 }) @IsInt() @Min(1) @Type(() => Number) @IsOptional() page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsInt() @Min(1) @Max(100) @Type(() => Number) @IsOptional() limit?: number = 20;
  @ApiPropertyOptional() @IsString() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() companyId?: string;
}
