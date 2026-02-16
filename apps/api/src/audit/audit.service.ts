import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditAction, Role } from '@task-management/data';
import { OrganizationsService } from '../organizations/organizations.service';
import { ROLE_HIERARCHY } from '@task-management/auth';

interface CreateAuditLogParams {
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}

interface AuditQueryUser {
  id: string;
  role: Role;
  organizationId: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly orgsService: OrganizationsService,
  ) {}

  async log(params: CreateAuditLogParams): Promise<AuditLog> {
    const logEntry = new AuditLog();
    logEntry.userId = params.userId;
    logEntry.action = params.action;
    logEntry.resource = params.resource;
    logEntry.resourceId = params.resourceId ?? '';
    logEntry.details = params.details ?? '';
    logEntry.ipAddress = params.ipAddress ?? '';

    const saved = await this.auditLogRepo.save(logEntry);

    // Also log to console for file-based audit trail
    console.log(
      `[AUDIT] ${new Date().toISOString()} | ${params.action} | ${params.resource} | User: ${params.userId} | ${params.details || ''}`,
    );

    return saved as AuditLog;
  }

  /**
   * Fetch audit logs scoped to the requesting user's visibility:
   *
   *  - Owner (top-level org): sees all logs from own org + child orgs (all role levels)
   *  - Admin: sees logs ONLY within own org, and ONLY from users at or below Admin
   *    level (Admin + Viewer). Cannot see Owner-level actions.
   *  - Viewer: should never reach here (blocked by RBAC guard), but if they did
   *    they'd see nothing.
   *
   * This follows the standard hierarchical model:
   *   - Top-down org visibility (parent sees children, children are isolated)
   *   - Role-level filtering (you can only see logs from users at your level or below)
   */
  async findAll(
    requestingUser: AuditQueryUser,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<AuditLog>> {
    // Clamp pagination values
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);

    // 1. Get org IDs this user can see (top-down: parent sees children, child sees only self)
    const accessibleOrgIds = await this.orgsService.getAccessibleOrgIds(
      requestingUser.organizationId,
    );

    const queryBuilder = this.auditLogRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      // Scope to accessible organizations
      .where('user.organization_id IN (:...orgIds)', { orgIds: accessibleOrgIds });

    // 2. Role-level filtering: Admin can only see logs from users at or below their role level
    //    Owner sees everything in their org scope (no additional filter needed)
    if (requestingUser.role !== Role.OWNER) {
      const callerLevel = ROLE_HIERARCHY[requestingUser.role];

      // Get all roles that are at or below the caller's level
      const visibleRoles = Object.entries(ROLE_HIERARCHY)
        .filter(([_, level]) => level <= callerLevel)
        .map(([role]) => role);

      queryBuilder.andWhere('user.role IN (:...visibleRoles)', { visibleRoles });
    }

    // 3. Order and paginate
    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
