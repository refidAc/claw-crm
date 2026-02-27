import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ChannelType, MessageDirection } from '@crm/types';

export class CreateConversationDto {
  @ApiProperty({ description: 'Contact ID to associate with this conversation' })
  @IsString()
  contactId!: string;

  @ApiPropertyOptional({ description: 'Subject / topic of conversation' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ enum: ChannelType, description: 'Primary channel for this conversation' })
  @IsEnum(ChannelType)
  @IsOptional()
  channelType?: ChannelType;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message body text' })
  @IsString()
  body!: string;

  @ApiProperty({ enum: ChannelType, description: 'Channel to send via' })
  @IsEnum(ChannelType)
  channel!: ChannelType;

  @ApiPropertyOptional({ enum: MessageDirection, description: 'Message direction (default: outbound)' })
  @IsEnum(MessageDirection)
  @IsOptional()
  direction?: MessageDirection;
}

// Legacy alias used in existing imports
export { SendMessageDto as CreateMessageDto };
