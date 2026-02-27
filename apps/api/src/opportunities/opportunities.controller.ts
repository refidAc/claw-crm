import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunityStatus } from '@crm/types';
import type { User } from '@crm/db';

class CloseOpportunityDto {
  @ApiProperty({ enum: [OpportunityStatus.WON, OpportunityStatus.LOST] })
  @IsEnum([OpportunityStatus.WON, OpportunityStatus.LOST])
  status!: OpportunityStatus.WON | OpportunityStatus.LOST;
}

@ApiTags('opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an opportunity' })
  create(@CurrentUser() user: User, @Body() dto: CreateOpportunityDto) {
    return this.service.create(user.accountId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List opportunities, optionally filtered by pipeline' })
  @ApiQuery({ name: 'pipelineId', required: false })
  findAll(@CurrentUser() user: User, @Query('pipelineId') pipelineId?: string) {
    return this.service.findAll(user.accountId, pipelineId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.findOne(user.accountId, id);
  }

  @Put(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: Partial<CreateOpportunityDto>) {
    return this.service.update(user.accountId, id, dto);
  }

  @Put(':id/stage/:stageId')
  @ApiOperation({ summary: 'Move opportunity to a different stage' })
  moveStage(@CurrentUser() user: User, @Param('id') id: string, @Param('stageId') stageId: string) {
    return this.service.moveStage(user.accountId, id, stageId);
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Close an opportunity as won or lost' })
  close(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CloseOpportunityDto,
  ) {
    return this.service.close(user.accountId, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.accountId, id);
  }
}
