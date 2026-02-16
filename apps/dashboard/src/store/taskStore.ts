import { create } from 'zustand';
import { tasksApi } from '../api/client';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  category: 'work' | 'personal' | 'urgent' | 'other';
  position: number;
  startDate: string | null;
  dueDate: string | null;
  assigneeId: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string };
  createdBy?: { id: string; firstName: string; lastName: string };
}

interface TaskFilters {
  status?: string;
  category?: string;
  search?: string;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  filters: TaskFilters;
  fetchTasks: () => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    status?: string;
    category?: string;
    startDate?: string;
    dueDate?: string;
  }) => Promise<void>;
  updateTask: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setFilters: (filters: TaskFilters) => void;
  reorderTasks: (activeId: string, overId: string) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  filters: {},

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const response = await tasksApi.getAll(filters);
      set({ tasks: response.data, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  createTask: async (data) => {
    set({ error: null });
    try {
      await tasksApi.create(data);
      await get().fetchTasks();
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Failed to create task';
      set({ error: message });
      throw err;
    }
  },

  updateTask: async (id, data) => {
    set({ error: null });
    try {
      await tasksApi.update(id, data);
      await get().fetchTasks();
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Failed to update task';
      set({ error: message });
      throw err;
    }
  },

  deleteTask: async (id) => {
    set({ error: null });
    try {
      await tasksApi.delete(id);
      await get().fetchTasks();
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Failed to delete task';
      set({ error: message });
      throw err;
    }
  },

  setFilters: (filters) => {
    set({ filters });
  },

  reorderTasks: (activeId, overId) => {
    const { tasks } = get();
    const oldIndex = tasks.findIndex((t) => t.id === activeId);
    const newIndex = tasks.findIndex((t) => t.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newTasks = [...tasks];
    const [moved] = newTasks.splice(oldIndex, 1);
    newTasks.splice(newIndex, 0, moved);

    // Update positions
    const reordered = newTasks.map((t, i) => ({ ...t, position: i }));
    set({ tasks: reordered });

    // Persist new position to backend
    tasksApi.update(activeId, { position: newIndex }).catch(() => {
      // Revert on failure
      get().fetchTasks();
    });
  },
}));
