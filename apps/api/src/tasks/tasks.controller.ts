import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RbacGuard } from '../rbac/rbac.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission, TaskStatus, TaskCategory } from '@task-management/data';
import { Request } from 'express';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsUUID,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

// Allowed characters: alphanumeric, spaces, common punctuation
const SAFE_TEXT = /^[a-zA-Z0-9\s.,\-:;!?'"()\/@#&+_=\[\]{}|~`$%^*\\n\\r]*$/;
const SAFE_TEXT_MSG = 'Contains disallowed characters';

export class TaskQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(SAFE_TEXT, { message: SAFE_TEXT_MSG })
  search?: string;
}

export class CreateTaskBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(SAFE_TEXT, { message: SAFE_TEXT_MSG })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Matches(SAFE_TEXT, { message: SAFE_TEXT_MSG })
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export class UpdateTaskBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(SAFE_TEXT, { message: SAFE_TEXT_MSG })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Matches(SAFE_TEXT, { message: SAFE_TEXT_MSG })
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}

@Controller('tasks')
@UseGuards(RbacGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequirePermissions(Permission.TASK_CREATE)
  async create(@Body() body: CreateTaskBodyDto, @Req() req: Request) {
    const user = req.user as any;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    return this.tasksService.create(body, user, ipAddress);
  }

  @Get()
  @RequirePermissions(Permission.TASK_READ)
  async findAll(
    @Req() req: Request,
    @Query() query: TaskQueryDto,
  ) {
    const user = req.user as any;
    return this.tasksService.findAllForUser(user, {
      status: query.status,
      category: query.category,
      search: query.search,
    });
  }

  @Put(':id')
  @RequirePermissions(Permission.TASK_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTaskBodyDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    return this.tasksService.update(id, body, user, ipAddress);
  }

  @Delete(':id')
  @RequirePermissions(Permission.TASK_DELETE)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    await this.tasksService.delete(id, user, ipAddress);
    return { message: 'Task deleted successfully' };
  }
}
