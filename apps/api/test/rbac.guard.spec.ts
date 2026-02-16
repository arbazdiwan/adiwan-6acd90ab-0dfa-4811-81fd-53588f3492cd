import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from '../src/rbac/rbac.guard';
import { Role, Permission } from '@task-management/data';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let reflector: Reflector;

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn() as any,
    } as any;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RbacGuard(reflector);
  });

  it('should allow access when no roles or permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: Role.VIEWER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Owner when Admin role is required', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([Role.ADMIN]) // roles
      .mockReturnValueOnce(undefined); // permissions
    const context = createMockContext({
      role: Role.OWNER,
      organizationId: 'org-1',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny Viewer when Admin role is required', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([Role.ADMIN]) // roles
      .mockReturnValueOnce(undefined); // permissions
    const context = createMockContext({
      role: Role.VIEWER,
      organizationId: 'org-1',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow when user has required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined) // roles
      .mockReturnValueOnce([Permission.TASK_CREATE]); // permissions
    const context = createMockContext({
      role: Role.ADMIN,
      organizationId: 'org-1',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny Viewer trying to create tasks', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined) // roles
      .mockReturnValueOnce([Permission.TASK_CREATE]); // permissions
    const context = createMockContext({
      role: Role.VIEWER,
      organizationId: 'org-1',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny when no user is in request', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([Role.ADMIN])
      .mockReturnValueOnce(undefined);
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow Owner to read audit logs', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([Role.ADMIN]) // roles
      .mockReturnValueOnce([Permission.AUDIT_READ]); // permissions
    const context = createMockContext({
      role: Role.OWNER,
      organizationId: 'org-1',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny Viewer from reading audit logs', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([Role.ADMIN]) // roles
      .mockReturnValueOnce([Permission.AUDIT_READ]); // permissions
    const context = createMockContext({
      role: Role.VIEWER,
      organizationId: 'org-1',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
