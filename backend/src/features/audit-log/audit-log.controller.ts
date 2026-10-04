import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { AuditLogService } from './audit-log.service';
import {
  GetApiAdminAuditLogResponseDto,
  PostApiAdminAuditLogRequestSchema,
  PostApiAdminAuditLogResponseDto,
} from './audit-log.dto';

@ApiTags('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/audit-log')
export class AuditLogController {
  constructor(private readonly auditlog: AuditLogService) {}

  /** GET /api/admin/audit-log — AuditEntry records, oldest first. */
  @Get()
  async getApiAdminAuditLog(): Promise<GetApiAdminAuditLogResponseDto[]> {
    return this.auditlog.list();
  }

  /** POST /api/admin/audit-log — record an AuditEntry; 201 with the created record. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async postApiAdminAuditLog(@Body() body: unknown): Promise<PostApiAdminAuditLogResponseDto> {
    const parsed = PostApiAdminAuditLogRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    }
    return this.auditlog.create(parsed.data);
  }
}
