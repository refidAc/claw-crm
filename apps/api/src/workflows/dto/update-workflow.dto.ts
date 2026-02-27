import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateWorkflowDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
