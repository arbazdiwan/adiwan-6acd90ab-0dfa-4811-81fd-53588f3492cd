import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@task-management/data';
import { User } from '../users/user.entity';
import { sanitizeText } from '../common/sanitize';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isValid = await this.usersService.validatePassword(
      password,
      user.password,
    );
    if (!isValid) return null;

    return user;
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    // Normalize email: lowercase + trim
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.validateUser(normalizedEmail, password);

    if (!user) {
      // Log failed login attempt (sanitize email to prevent log injection)
      await this.auditService.log({
        userId: 'unknown',
        action: AuditAction.LOGIN_FAILED,
        resource: 'auth',
        details: `Failed login attempt for email: ${sanitizeText(normalizedEmail)}`,
        ipAddress: ipAddress || null,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Log successful login
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      details: `User logged in: ${user.email}`,
      ipAddress: ipAddress || null,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async validateToken(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub);
  }
}
