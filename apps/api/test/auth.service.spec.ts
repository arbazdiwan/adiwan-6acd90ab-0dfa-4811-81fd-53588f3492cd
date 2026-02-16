import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { AuditService } from '../src/audit/audit.service';
import { Role } from '@task-management/data';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let auditService: Partial<AuditService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: Role.ADMIN,
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: null as any,
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      validatePassword: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return access token and user on successful login', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBe('user-1');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('wrong@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should log successful login to audit', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(true);

      await authService.login('test@example.com', 'password123', '127.0.0.1');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'LOGIN',
          resource: 'auth',
        }),
      );
    });

    it('should log failed login to audit', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      try {
        await authService.login('wrong@example.com', 'password', '127.0.0.1');
      } catch {
        // Expected
      }

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          resource: 'auth',
        }),
      );
    });

    it('should sign JWT with correct payload', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(true);

      await authService.login('test@example.com', 'password123');

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@example.com',
        role: Role.ADMIN,
        organizationId: 'org-1',
      });
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token payload', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.validateToken({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'admin',
        organizationId: 'org-1',
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid user id', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue(null);

      const result = await authService.validateToken({
        sub: 'invalid-id',
        email: 'test@example.com',
        role: 'admin',
        organizationId: 'org-1',
      });

      expect(result).toBeNull();
    });
  });
});
