import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from '../src/tasks/tasks.service';
import { Task } from '../src/tasks/task.entity';
import { OrganizationsService } from '../src/organizations/organizations.service';
import { AuditService } from '../src/audit/audit.service';
import { Role, TaskStatus, TaskCategory } from '@task-management/data';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: any;
  let orgsService: any;
  let auditService: any;

  const mockOwner = {
    id: 'owner-1',
    role: Role.OWNER,
    organizationId: 'org-1',
  };

  const mockAdmin = {
    id: 'admin-1',
    role: Role.ADMIN,
    organizationId: 'org-1',
  };

  const mockViewer = {
    id: 'viewer-1',
    role: Role.VIEWER,
    organizationId: 'org-1',
  };

  const createMockTask = () => ({
    id: 'task-1',
    title: 'Test Task',
    description: 'A test task',
    status: TaskStatus.TODO,
    category: TaskCategory.WORK,
    position: 0,
    assigneeId: 'admin-1',
    organizationId: 'org-1',
    createdById: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([createMockTask()]),
      getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
    };

    taskRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data, id: 'new-task-id' })),
      save: jest.fn().mockImplementation((task) => Promise.resolve({ ...createMockTask(), ...task })),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    orgsService = {
      getAccessibleOrgIds: jest.fn().mockResolvedValue(['org-1', 'org-2']),
    };

    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: OrganizationsService, useValue: orgsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    it('should create a task and log the action', async () => {
      const result = await service.create(
        { title: 'New Task', description: 'Description' },
        mockAdmin,
      );

      expect(taskRepo.create).toHaveBeenCalled();
      expect(taskRepo.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resource: 'task',
        }),
      );
      expect(result.title).toBe('New Task');
    });

    it('should set defaults for status and category', async () => {
      await service.create({ title: 'Task' }, mockAdmin);

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TaskStatus.TODO,
          category: TaskCategory.WORK,
        }),
      );
    });

    it('should assign task to creator if no assignee specified', async () => {
      await service.create({ title: 'Task' }, mockAdmin);

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: mockAdmin.id,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a task and log the action', async () => {
      taskRepo.findOne.mockResolvedValue(createMockTask());

      const result = await service.update(
        'task-1',
        { title: 'Updated Task' },
        mockAdmin,
      );

      expect(taskRepo.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resource: 'task',
          resourceId: 'task-1',
        }),
      );
    });

    it('should throw NotFoundException for non-existent task', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'Test' }, mockAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for Viewer trying to update', async () => {
      taskRepo.findOne.mockResolvedValue(createMockTask());

      await expect(
        service.update('task-1', { title: 'Test' }, mockViewer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when task is in different org', async () => {
      taskRepo.findOne.mockResolvedValue({
        ...createMockTask(),
        organizationId: 'other-org',
      });
      orgsService.getAccessibleOrgIds.mockResolvedValue(['org-1']);

      await expect(
        service.update('task-1', { title: 'Test' }, mockAdmin),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete a task and log the action', async () => {
      const task = createMockTask();
      taskRepo.findOne.mockResolvedValue(task);

      await service.delete('task-1', mockAdmin);

      expect(taskRepo.remove).toHaveBeenCalledWith(task);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          resource: 'task',
          resourceId: 'task-1',
        }),
      );
    });

    it('should throw NotFoundException for non-existent task', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent', mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for Viewer trying to delete', async () => {
      taskRepo.findOne.mockResolvedValue(createMockTask());

      await expect(service.delete('task-1', mockViewer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow Owner to delete tasks', async () => {
      taskRepo.findOne.mockResolvedValue(createMockTask());

      await expect(service.delete('task-1', mockOwner)).resolves.not.toThrow();
    });
  });

  describe('findAllForUser', () => {
    it('should get accessible org IDs for scoping', async () => {
      await service.findAllForUser(mockAdmin);

      expect(orgsService.getAccessibleOrgIds).toHaveBeenCalledWith('org-1');
    });

    it('should return tasks from accessible organizations', async () => {
      const result = await service.findAllForUser(mockAdmin);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Task');
    });
  });
});
