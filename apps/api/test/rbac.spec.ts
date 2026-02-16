import { Role, Permission } from '@task-management/data';
import {
  hasPermission,
  isRoleAtLeast,
  getPermissionsForRole,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
} from '@task-management/auth';

describe('RBAC Logic', () => {
  describe('Role Hierarchy', () => {
    it('should define correct hierarchy levels', () => {
      expect(ROLE_HIERARCHY[Role.VIEWER]).toBe(1);
      expect(ROLE_HIERARCHY[Role.ADMIN]).toBe(2);
      expect(ROLE_HIERARCHY[Role.OWNER]).toBe(3);
    });

    it('Owner should be at least Admin', () => {
      expect(isRoleAtLeast(Role.OWNER, Role.ADMIN)).toBe(true);
    });

    it('Owner should be at least Viewer', () => {
      expect(isRoleAtLeast(Role.OWNER, Role.VIEWER)).toBe(true);
    });

    it('Admin should be at least Viewer', () => {
      expect(isRoleAtLeast(Role.ADMIN, Role.VIEWER)).toBe(true);
    });

    it('Viewer should NOT be at least Admin', () => {
      expect(isRoleAtLeast(Role.VIEWER, Role.ADMIN)).toBe(false);
    });

    it('Admin should NOT be at least Owner', () => {
      expect(isRoleAtLeast(Role.ADMIN, Role.OWNER)).toBe(false);
    });

    it('Same role should be at least itself', () => {
      expect(isRoleAtLeast(Role.VIEWER, Role.VIEWER)).toBe(true);
      expect(isRoleAtLeast(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(isRoleAtLeast(Role.OWNER, Role.OWNER)).toBe(true);
    });
  });

  describe('Permission Checks', () => {
    describe('Viewer permissions', () => {
      it('should have TASK_READ permission', () => {
        expect(hasPermission(Role.VIEWER, Permission.TASK_READ)).toBe(true);
      });

      it('should NOT have TASK_CREATE permission', () => {
        expect(hasPermission(Role.VIEWER, Permission.TASK_CREATE)).toBe(false);
      });

      it('should NOT have TASK_UPDATE permission', () => {
        expect(hasPermission(Role.VIEWER, Permission.TASK_UPDATE)).toBe(false);
      });

      it('should NOT have TASK_DELETE permission', () => {
        expect(hasPermission(Role.VIEWER, Permission.TASK_DELETE)).toBe(false);
      });

      it('should NOT have AUDIT_READ permission', () => {
        expect(hasPermission(Role.VIEWER, Permission.AUDIT_READ)).toBe(false);
      });

      it('should NOT have USER_MANAGE permission', () => {
        expect(hasPermission(Role.VIEWER, Permission.USER_MANAGE)).toBe(false);
      });
    });

    describe('Admin permissions', () => {
      it('should have TASK_READ permission (inherited from Viewer)', () => {
        expect(hasPermission(Role.ADMIN, Permission.TASK_READ)).toBe(true);
      });

      it('should have TASK_CREATE permission', () => {
        expect(hasPermission(Role.ADMIN, Permission.TASK_CREATE)).toBe(true);
      });

      it('should have TASK_UPDATE permission', () => {
        expect(hasPermission(Role.ADMIN, Permission.TASK_UPDATE)).toBe(true);
      });

      it('should have TASK_DELETE permission', () => {
        expect(hasPermission(Role.ADMIN, Permission.TASK_DELETE)).toBe(true);
      });

      it('should have AUDIT_READ permission', () => {
        expect(hasPermission(Role.ADMIN, Permission.AUDIT_READ)).toBe(true);
      });

      it('should NOT have USER_MANAGE permission', () => {
        expect(hasPermission(Role.ADMIN, Permission.USER_MANAGE)).toBe(false);
      });

      it('should NOT have ORG_MANAGE permission', () => {
        expect(hasPermission(Role.ADMIN, Permission.ORG_MANAGE)).toBe(false);
      });
    });

    describe('Owner permissions', () => {
      it('should have all Admin permissions', () => {
        const adminPerms = getPermissionsForRole(Role.ADMIN);
        adminPerms.forEach((perm) => {
          expect(hasPermission(Role.OWNER, perm)).toBe(true);
        });
      });

      it('should have USER_MANAGE permission', () => {
        expect(hasPermission(Role.OWNER, Permission.USER_MANAGE)).toBe(true);
      });

      it('should have ORG_MANAGE permission', () => {
        expect(hasPermission(Role.OWNER, Permission.ORG_MANAGE)).toBe(true);
      });
    });
  });

  describe('getPermissionsForRole', () => {
    it('Viewer should have 1 permission', () => {
      expect(getPermissionsForRole(Role.VIEWER)).toHaveLength(1);
    });

    it('Admin should have 5 permissions', () => {
      expect(getPermissionsForRole(Role.ADMIN)).toHaveLength(5);
    });

    it('Owner should have 7 permissions', () => {
      expect(getPermissionsForRole(Role.OWNER)).toHaveLength(7);
    });

    it('Role inheritance: Admin permissions should be a superset of Viewer', () => {
      const viewerPerms = getPermissionsForRole(Role.VIEWER);
      const adminPerms = getPermissionsForRole(Role.ADMIN);
      viewerPerms.forEach((perm) => {
        expect(adminPerms).toContain(perm);
      });
    });

    it('Role inheritance: Owner permissions should be a superset of Admin', () => {
      const adminPerms = getPermissionsForRole(Role.ADMIN);
      const ownerPerms = getPermissionsForRole(Role.OWNER);
      adminPerms.forEach((perm) => {
        expect(ownerPerms).toContain(perm);
      });
    });
  });
});
