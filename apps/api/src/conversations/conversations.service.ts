/**
 * ConversationsService — full implementation of conversations + unified inbox.
 *
 * Message sending flow:
 *   POST /conversations/:id/messages
 *     → create Message (status: queued)
 *     → emit message.received
 *     → enqueue BullMQ job (send-message)
 *     → return message optimistically
 *
 * The ConversationProcessor picks up the job, calls the channel adapter,
 * updates the message status, and emits message.sent.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateConversationDto, SendMessageDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { MessageDirection } from '@crm/types';
import type { SendMessageJobPayload } from './conversation.processor';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @InjectQueue('conversations') private readonly conversationsQueue: Queue,
  ) {}

  // ─── Conversations CRUD ───────────────────────────────────────────────────

  async create(accountId: string, dto: CreateConversationDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, accountId, deletedAt: null },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const conv = await this.prisma.conversation.create({
      data: {
        accountId,
        contactId: dto.contactId,
        subject: dto.subject,
        status: 'open',
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    this.events.emit('conversation.created', {
      accountId,
      conversationId: conv.id,
      contactId: conv.contactId,
    });

    return conv;
  }

  async findAll(accountId: string, query: ListConversationsDto) {
    const { page = 1, limit = 20, status, contactId } = query;
    const skip = (page - 1) * limit;

    const where = {
      accountId,
      deletedAt: null as null,
      ...(status ? { status } : {}),
      ...(contactId ? { contactId } : {}),
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, body: true, createdAt: true, channel: true, status: true },
          },
          _count: {
            select: {
              messages: {
                where: { status: { not: 'read' }, direction: MessageDirection.INBOUND },
              },
            },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    // Shape into unified inbox format
    const data = conversations.map((conv) => {
      const lastMessage = conv.messages[0] ?? null;
      return {
        id: conv.id,
        accountId: conv.accountId,
        subject: conv.subject,
        status: conv.status,
        channelType: lastMessage?.channel ?? null,
        contact: conv.contact,
        lastMessagePreview: lastMessage?.body?.substring(0, 100) ?? null,
        lastMessageAt: lastMessage?.createdAt ?? null,
        unreadCount: conv._count.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(accountId: string, id: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, accountId, deletedAt: null },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async update(accountId: string, id: string, dto: UpdateConversationDto) {
    await this.findOne(accountId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { status: dto.status, updatedAt: new Date() },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async remove(accountId: string, id: string) {
    await this.findOne(accountId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async listMessages(accountId: string, conversationId: string, query: ListMessagesDto) {
    const conv = await this.findOne(accountId, conversationId);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: conv.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.message.count({ where: { conversationId: conv.id } }),
    ]);

    return { data: messages, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async sendMessage(accountId: string, conversationId: string, dto: SendMessageDto) {
    const conv = await this.findOne(accountId, conversationId);

    // Resolve recipient address from contact's channel identities
    const identity = await this.prisma.channelIdentity.findFirst({
      where: { accountId, contactId: conv.contactId, type: dto.channel },
      orderBy: { isPrimary: 'desc' },
    });

    if (!identity) {
      throw new BadRequestException(
        `Contact has no ${dto.channel} identity. Add a ChannelIdentity first.`,
      );
    }

    // Create the message immediately (optimistic / queued)
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        body: dto.body,
        channel: dto.channel,
        direction: dto.direction ?? MessageDirection.OUTBOUND,
        status: 'queued',
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Emit message.received event
    this.events.emit('message.received', {
      accountId,
      conversationId,
      messageId: message.id,
      channel: dto.channel,
      direction: dto.direction ?? MessageDirection.OUTBOUND,
    });

    // Enqueue the actual send job
    const jobPayload: SendMessageJobPayload = {
      messageId: message.id,
      conversationId,
      accountId,
      channel: dto.channel,
      to: identity.value,
      body: dto.body,
      subject: conv.subject ?? undefined,
    };

    await this.conversationsQueue.add('send-message', jobPayload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    return message;
  }
}
