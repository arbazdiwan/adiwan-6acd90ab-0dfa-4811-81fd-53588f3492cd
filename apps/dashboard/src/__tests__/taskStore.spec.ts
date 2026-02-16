/**
 * Tests for the task Zustand store.
 * Validates CRUD operations, filtering, and reordering.
 */
import { useTaskStore, Task } from '../store/taskStore';

// Mock axios-based API client
jest.mock('../api/client', () => ({
  tasksApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { tasksApi } from '../api/client';

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Task One',
    description: 'First task',
    status: 'todo',
    category: 'work',
    position: 0,
    startDate: '2026-01-01',
    dueDate: '2026-01-15',
    assigneeId: 'user-1',
    organizationId: 'org-1',
    createdById: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Task Two',
    description: 'Second task',
    status: 'in_progress',
    category: 'personal',
    position: 1,
    startDate: null,
    dueDate: null,
    assigneeId: 'user-1',
    organizationId: 'org-1',
    createdById: 'user-1',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'task-3',
    title: 'Task Three',
    description: 'Third task',
    status: 'done',
    category: 'urgent',
    position: 2,
    startDate: '2026-01-01',
    dueDate: '2026-01-10',
    assigneeId: 'user-2',
    organizationId: 'org-1',
    createdById: 'user-1',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
  },
];

describe('TaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [],
      isLoading: false,
      error: null,
      filters: {},
    });
    jest.clearAllMocks();
  });

  describe('fetchTasks', () => {
    it('should fetch and store tasks', async () => {
      (tasksApi.getAll as jest.Mock).mockResolvedValue({ data: mockTasks });

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(3);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state while fetching', async () => {
      let resolveRequest: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      (tasksApi.getAll as jest.Mock).mockReturnValue(fetchPromise);

      const fetchCall = useTaskStore.getState().fetchTasks();

      expect(useTaskStore.getState().isLoading).toBe(true);

      resolveRequest!({ data: mockTasks });
      await fetchCall;

      expect(useTaskStore.getState().isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      (tasksApi.getAll as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Unauthorized' } },
      });

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.error).toBe('Unauthorized');
      expect(state.isLoading).toBe(false);
    });

    it('should pass filters to API', async () => {
      (tasksApi.getAll as jest.Mock).mockResolvedValue({ data: [] });

      useTaskStore.getState().setFilters({ status: 'todo', category: 'work' });
      await useTaskStore.getState().fetchTasks();

      expect(tasksApi.getAll).toHaveBeenCalledWith({
        status: 'todo',
        category: 'work',
      });
    });
  });

  describe('createTask', () => {
    it('should call API and refresh tasks', async () => {
      (tasksApi.create as jest.Mock).mockResolvedValue({ data: {} });
      (tasksApi.getAll as jest.Mock).mockResolvedValue({ data: mockTasks });

      await useTaskStore.getState().createTask({
        title: 'New Task',
        description: 'A new task',
        category: 'work',
      });

      expect(tasksApi.create).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'A new task',
        category: 'work',
      });
      // Should fetch tasks after creating
      expect(tasksApi.getAll).toHaveBeenCalled();
    });

    it('should set error on creation failure', async () => {
      (tasksApi.create as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Forbidden' } },
      });

      try {
        await useTaskStore.getState().createTask({ title: 'Test' });
      } catch {
        // Expected
      }

      expect(useTaskStore.getState().error).toBe('Forbidden');
    });
  });

  describe('updateTask', () => {
    it('should call API and refresh tasks', async () => {
      (tasksApi.update as jest.Mock).mockResolvedValue({ data: {} });
      (tasksApi.getAll as jest.Mock).mockResolvedValue({ data: mockTasks });

      await useTaskStore.getState().updateTask('task-1', { title: 'Updated' });

      expect(tasksApi.update).toHaveBeenCalledWith('task-1', { title: 'Updated' });
      expect(tasksApi.getAll).toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should call API and refresh tasks', async () => {
      (tasksApi.delete as jest.Mock).mockResolvedValue({ data: {} });
      (tasksApi.getAll as jest.Mock).mockResolvedValue({
        data: mockTasks.filter((t) => t.id !== 'task-1'),
      });

      await useTaskStore.getState().deleteTask('task-1');

      expect(tasksApi.delete).toHaveBeenCalledWith('task-1');
      expect(tasksApi.getAll).toHaveBeenCalled();
    });
  });

  describe('setFilters', () => {
    it('should update filter state', () => {
      useTaskStore.getState().setFilters({ status: 'done', search: 'test' });

      const state = useTaskStore.getState();
      expect(state.filters.status).toBe('done');
      expect(state.filters.search).toBe('test');
    });
  });

  describe('reorderTasks', () => {
    it('should move task to new position', () => {
      useTaskStore.setState({ tasks: [...mockTasks] });

      useTaskStore.getState().reorderTasks('task-3', 'task-1');

      const state = useTaskStore.getState();
      expect(state.tasks[0].id).toBe('task-3');
      expect(state.tasks[1].id).toBe('task-1');
      expect(state.tasks[2].id).toBe('task-2');
    });

    it('should update positions after reorder', () => {
      useTaskStore.setState({ tasks: [...mockTasks] });

      useTaskStore.getState().reorderTasks('task-3', 'task-1');

      const state = useTaskStore.getState();
      expect(state.tasks[0].position).toBe(0);
      expect(state.tasks[1].position).toBe(1);
      expect(state.tasks[2].position).toBe(2);
    });

    it('should call API to persist new position', () => {
      (tasksApi.update as jest.Mock).mockResolvedValue({ data: {} });
      useTaskStore.setState({ tasks: [...mockTasks] });

      useTaskStore.getState().reorderTasks('task-3', 'task-1');

      expect(tasksApi.update).toHaveBeenCalledWith('task-3', { position: 0 });
    });

    it('should not reorder if IDs are not found', () => {
      useTaskStore.setState({ tasks: [...mockTasks] });

      useTaskStore.getState().reorderTasks('nonexistent', 'task-1');

      // Tasks should be unchanged
      expect(useTaskStore.getState().tasks[0].id).toBe('task-1');
    });
  });
});
