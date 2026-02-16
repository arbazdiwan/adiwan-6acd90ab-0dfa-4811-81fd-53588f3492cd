import { TaskStatus, TaskCategory } from '../interfaces/task.interface';

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  startDate?: string;
  dueDate?: string;
  assigneeId?: string;
}
