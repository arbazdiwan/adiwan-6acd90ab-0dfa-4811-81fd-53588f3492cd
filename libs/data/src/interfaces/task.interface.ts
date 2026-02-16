export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal',
  URGENT = 'urgent',
  OTHER = 'other',
}

export interface ITask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  category: TaskCategory;
  position: number;
  startDate: Date | null;
  dueDate: Date | null;
  assigneeId: string;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
