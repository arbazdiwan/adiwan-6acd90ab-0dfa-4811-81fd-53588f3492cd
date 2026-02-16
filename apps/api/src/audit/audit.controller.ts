import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RbacGuard } from '../rbac/rbac.guard';
import { Roles } from '../rbac/roles.decorator';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Role, Permission } from '@task-management/data';
import { Request } from 'express';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@Controller('audit-log')
@UseGuards(RbacGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.AUDIT_READ)
  async getAuditLogs(
    @Req() req: Request,
    @Query() query: AuditLogQueryDto,
  ) {
    const user = req.user as any;

    return this.auditService.findAll(
      {
        id: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
      query.page ?? 1,
      query.limit ?? 20,
    );
  }
}
