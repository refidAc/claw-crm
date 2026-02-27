import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto, SendMessageDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import type { User } from '@crm/db';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  // ─── Conversations ────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  create(@CurrentUser() user: User, @Body() dto: CreateConversationDto) {
    return this.service.create(user.accountId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List conversations (unified inbox)' })
  @ApiResponse({ status: 200, description: 'Paginated conversation list with inbox enrichment' })
  findAll(@CurrentUser() user: User, @Query() query: ListConversationsDto) {
    return this.service.findAll(user.accountId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation with its messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation detail' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.findOne(user.accountId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update conversation status (open/closed/snoozed)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation updated' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.service.update(user.accountId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.accountId, id);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  @Get(':id/messages')
  @ApiOperation({ summary: 'List messages in a conversation (paginated)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Paginated message list' })
  listMessages(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.service.listMessages(user.accountId, id, query);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message queued and returned optimistically' })
  @ApiResponse({ status: 400, description: 'Contact missing channel identity' })
  sendMessage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(user.accountId, id, dto);
  }
}
