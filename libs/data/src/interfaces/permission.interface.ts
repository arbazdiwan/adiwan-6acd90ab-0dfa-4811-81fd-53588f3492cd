export enum Permission {
  // Task permissions
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',

  // Audit permissions
  AUDIT_READ = 'audit:read',

  // User management
  USER_MANAGE = 'user:manage',

  // Organization management
  ORG_MANAGE = 'org:manage',
}

export interface IPermission {
  id: string;
  name: Permission;
  description: string;
}
