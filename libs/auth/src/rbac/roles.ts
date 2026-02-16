import { Role } from '@task-management/data';
import { Permission } from '@task-management/data';

const VIEWER_PERMISSIONS: Permission[] = [Permission.TASK_READ];

const ADMIN_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  Permission.TASK_CREATE,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
  Permission.AUDIT_READ,
];

const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  Permission.USER_MANAGE,
  Permission.ORG_MANAGE,
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.VIEWER]: VIEWER_PERMISSIONS,
  [Role.ADMIN]: ADMIN_PERMISSIONS,
  [Role.OWNER]: OWNER_PERMISSIONS,
};

/**
 * Role hierarchy - higher number = more privilege
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.VIEWER]: 1,
  [Role.ADMIN]: 2,
  [Role.OWNER]: 3,
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if roleA is equal or higher than roleB in the hierarchy
 */
export function isRoleAtLeast(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

/**
 * Get all permissions for a role (including inherited)
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
