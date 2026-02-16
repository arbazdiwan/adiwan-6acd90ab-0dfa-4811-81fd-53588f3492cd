import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from './task.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, Role, TaskStatus, TaskCategory } from '@task-management/data';
import { isRoleAtLeast } from '@task-management/auth';
import { sanitizeText, escapeLike } from '../common/sanitize';

interface CreateTaskParams {
  title: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  startDate?: string;
  dueDate?: string;
  assigneeId?: string;
}

interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  startDate?: string | null;
  dueDate?: string | null;
  assigneeId?: string;
  position?: number;
}

interface RequestUser {
  id: string;
  role: string;
  organizationId: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly orgsService: OrganizationsService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    params: CreateTaskParams,
    user: RequestUser,
    ipAddress?: string,
  ): Promise<Task> {
    // Get max position for ordering
    const maxPos = await this.taskRepo
      .createQueryBuilder('task')
      .where('task.organization_id = :orgId', { orgId: user.organizationId })
      .select('MAX(task.position)', 'max')
      .getRawOne();

    const task = this.taskRepo.create({
      title: sanitizeText(params.title),
      description: sanitizeText(params.description || ''),
      status: params.status || TaskStatus.TODO,
      category: params.category || TaskCategory.WORK,
      position: (maxPos?.max ?? -1) + 1,
      startDate: params.startDate || null,
      dueDate: params.dueDate || null,
      assigneeId: params.assigneeId || user.id,
      organizationId: user.organizationId,
      createdById: user.id,
    });

    const saved = await this.taskRepo.save(task);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.CREATE,
      resource: 'task',
      resourceId: saved.id,
      details: `Created task: ${sanitizeText(saved.title)}`,
      ipAddress,
    });

    return saved;
  }

  async findAllForUser(
    user: RequestUser,
    filters?: {
      status?: TaskStatus;
      category?: TaskCategory;
      search?: string;
    },
  ): Promise<Task[]> {
    // Get accessible organization IDs based on hierarchy
    const accessibleOrgIds = await this.orgsService.getAccessibleOrgIds(
      user.organizationId,
    );

    const queryBuilder = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .where('task.organization_id IN (:...orgIds)', { orgIds: accessibleOrgIds });

    // Viewers can only see tasks assigned to them
    if (user.role === Role.VIEWER) {
      queryBuilder.andWhere('task.assignee_id = :userId', {
        userId: user.id,
      });
    }

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.category) {
      queryBuilder.andWhere('task.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.search) {
      const safeSearch = escapeLike(sanitizeText(filters.search));
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${safeSearch}%` },
      );
    }

    queryBuilder.orderBy('task.position', 'ASC');

    return queryBuilder.getMany();
  }

  async findById(id: string): Promise<Task | null> {
    return this.taskRepo.findOne({
      where: { id },
      relations: ['assignee', 'createdBy', 'organization'],
    });
  }

  async update(
    id: string,
    params: UpdateTaskParams,
    user: RequestUser,
    ipAddress?: string,
  ): Promise<Task> {
    const task = await this.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check organization access
    const accessibleOrgIds = await this.orgsService.getAccessibleOrgIds(
      user.organizationId,
    );

    if (!accessibleOrgIds.includes(task.organizationId)) {
      throw new ForbiddenException(
        'You do not have access to this organization\'s tasks',
      );
    }

    // Viewers cannot update tasks
    if (user.role === Role.VIEWER) {
      throw new ForbiddenException('Viewers cannot update tasks');
    }

    // Admins can only update tasks in their organization hierarchy
    // Owners can update any task in their org hierarchy

    // Sanitize text fields before persisting
    const sanitized = { ...params };
    if (sanitized.title !== undefined) sanitized.title = sanitizeText(sanitized.title);
    if (sanitized.description !== undefined) sanitized.description = sanitizeText(sanitized.description);

    Object.assign(task, sanitized);
    const updated = await this.taskRepo.save(task);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.UPDATE,
      resource: 'task',
      resourceId: id,
      details: `Updated task: ${sanitizeText(task.title)} (fields: ${Object.keys(params).join(', ')})`,
      ipAddress,
    });

    return updated;
  }

  async delete(
    id: string,
    user: RequestUser,
    ipAddress?: string,
  ): Promise<void> {
    const task = await this.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check organization access
    const accessibleOrgIds = await this.orgsService.getAccessibleOrgIds(
      user.organizationId,
    );

    if (!accessibleOrgIds.includes(task.organizationId)) {
      throw new ForbiddenException(
        'You do not have access to this organization\'s tasks',
      );
    }

    // Only admins and owners can delete
    if (!isRoleAtLeast(user.role as Role, Role.ADMIN)) {
      throw new ForbiddenException('Insufficient role to delete tasks');
    }

    await this.taskRepo.remove(task);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.DELETE,
      resource: 'task',
      resourceId: id,
      details: `Deleted task: ${sanitizeText(task.title)}`,
      ipAddress,
    });
  }

  async reorder(
    taskId: string,
    newPosition: number,
    user: RequestUser,
  ): Promise<Task> {
    const task = await this.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    task.position = newPosition;
    return this.taskRepo.save(task);
  }
}
