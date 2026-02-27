/**
 * ContactsService — business logic for contact CRUD within an account.
 * All queries are scoped to accountId for multi-tenancy.
 * Emits typed CRM events on mutations.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ListContactsDto } from './dto/list-contacts.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async create(accountId: string, dto: CreateContactDto) {
    const contact = await this.prisma.contact.create({
      data: { ...dto, accountId },
      include: { company: true },
    });

    this.events.emit('contact.created', {
      accountId,
      contactId: contact.id,
      contact: { id: contact.id, firstName: contact.firstName, lastName: contact.lastName, email: contact.email ?? undefined },
    });

    return contact;
  }

  async findAll(accountId: string, query: ListContactsDto) {
    const { page = 1, limit = 20, search, companyId } = query;
    const skip = (page - 1) * limit;

    const where = {
      accountId,
      deletedAt: null,
      ...(companyId ? { companyId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(accountId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, accountId, deletedAt: null },
      include: {
        company: true,
        channelIdentities: true,
        tasks: { orderBy: { dueAt: 'asc' } },
        notes: { orderBy: { createdAt: 'desc' }, take: 10 },
        opportunities: {
          where: { deletedAt: null },
          include: { stage: true, pipeline: true },
        },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(accountId: string, id: string, dto: UpdateContactDto) {
    await this.findOne(accountId, id);
    const contact = await this.prisma.contact.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
      include: { company: true },
    });

    this.events.emit('contact.updated', {
      accountId,
      contactId: id,
      changes: dto as unknown as Record<string, unknown>,
    });

    return contact;
  }

  async remove(accountId: string, id: string) {
    await this.findOne(accountId, id);
    const contact = await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.events.emit('contact.deleted', { accountId, contactId: id });

    return contact;
  }
}
