import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ConversationStatus } from '@crm/types';

export class UpdateConversationDto {
  @ApiProperty({ enum: ConversationStatus, description: 'New conversation status' })
  @IsEnum(ConversationStatus)
  status!: ConversationStatus;
}
