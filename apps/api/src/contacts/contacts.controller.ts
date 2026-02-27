/**
 * ContactsController — REST endpoints for contact management.
 * All routes are account-scoped via the authenticated user's accountId.
 */
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
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ListContactsDto } from './dto/list-contacts.dto';
import type { User } from '@crm/db';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  create(@CurrentUser() user: User, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user.accountId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contacts with pagination and search' })
  findAll(@CurrentUser() user: User, @Query() query: ListContactsDto) {
    return this.contactsService.findAll(user.accountId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contact with related data' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contactsService.findOne(user.accountId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(user.accountId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contactsService.remove(user.accountId, id);
  }
}
