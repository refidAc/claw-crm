import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto, CreateStageDto } from './dto/create-pipeline.dto';
import type { User } from '@crm/db';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pipeline with optional stages' })
  create(@CurrentUser() user: User, @Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(user.accountId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all pipelines' })
  findAll(@CurrentUser() user: User) {
    return this.pipelinesService.findAll(user.accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pipeline with stages and opportunities' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.pipelinesService.findOne(user.accountId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update pipeline name' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: Partial<CreatePipelineDto>) {
    return this.pipelinesService.update(user.accountId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a pipeline' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.pipelinesService.remove(user.accountId, id);
  }

  @Post(':id/stages')
  @ApiOperation({ summary: 'Add a stage to a pipeline' })
  addStage(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateStageDto) {
    return this.pipelinesService.addStage(id, user.accountId, dto.name, dto.order, dto.color);
  }

  @Delete(':id/stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a stage' })
  removeStage(@Param('stageId') stageId: string) {
    return this.pipelinesService.removeStage(stageId);
  }
}
