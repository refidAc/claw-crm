import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
