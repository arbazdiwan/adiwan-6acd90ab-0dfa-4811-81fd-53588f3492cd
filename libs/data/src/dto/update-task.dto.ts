import { TaskStatus, TaskCategory } from '../interfaces/task.interface';

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  startDate?: string | null;
  dueDate?: string | null;
  assigneeId?: string;
  position?: number;
}
