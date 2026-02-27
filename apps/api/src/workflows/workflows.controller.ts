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
  ParseBoolPipe,
  Optional,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { ListRunsDto } from './dto/list-runs.dto';

interface AuthUser {
  accountId: string;
  userId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  // ─── Workflows ────────────────────────────────────────────────────────────

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('isActive') isActive?: string,
  ) {
    const active =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.workflows.list(user.accountId, active);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workflows.findOne(user.accountId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkflowDto) {
    return this.workflows.create(user.accountId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflows.update(user.accountId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workflows.remove(user.accountId, id);
  }

  @Post(':id/activate')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workflows.activate(user.accountId, id);
  }

  @Post(':id/deactivate')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workflows.deactivate(user.accountId, id);
  }

  // ─── Triggers ─────────────────────────────────────────────────────────────

  @Post(':id/triggers')
  addTrigger(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTriggerDto,
  ) {
    return this.workflows.addTrigger(user.accountId, id, dto);
  }

  @Delete(':id/triggers/:tid')
  removeTrigger(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('tid') tid: string,
  ) {
    return this.workflows.removeTrigger(user.accountId, id, tid);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  @Post(':id/actions')
  addAction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateActionDto,
  ) {
    return this.workflows.addAction(user.accountId, id, dto);
  }

  @Put(':id/actions/:aid')
  updateAction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('aid') aid: string,
    @Body() dto: UpdateActionDto,
  ) {
    return this.workflows.updateAction(user.accountId, id, aid, dto);
  }

  @Delete(':id/actions/:aid')
  removeAction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('aid') aid: string,
  ) {
    return this.workflows.removeAction(user.accountId, id, aid);
  }

  // ─── Runs ─────────────────────────────────────────────────────────────────

  @Get(':id/runs')
  listRuns(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ListRunsDto,
  ) {
    return this.workflows.listRuns(user.accountId, id, query);
  }

  @Get(':id/runs/:runId')
  findRun(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('runId') runId: string,
  ) {
    return this.workflows.findRun(user.accountId, id, runId);
  }
}
