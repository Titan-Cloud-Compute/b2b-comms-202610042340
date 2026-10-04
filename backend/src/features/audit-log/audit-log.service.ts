import { Injectable } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiAdminAuditLogResponseDto,
  PostApiAdminAuditLogRequestDto,
  PostApiAdminAuditLogResponseDto,
} from './audit-log.dto';

interface AuditEntryRow {
  id: string;
  action: string;
  userId: string;
  createdAt: Date;
}

const toDto = (r: AuditEntryRow) => ({
  id: r.id,
  action: r.action,
  userId: r.userId,
  createdAt: r.createdAt.toISOString(),
});

@Injectable()
export class AuditLogService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['AuditEntry'] as const);
  }

  /** All AuditEntry records in chronological order (oldest first). */
  async list(): Promise<GetApiAdminAuditLogResponseDto[]> {
    const rows = await this.model('AuditEntry').findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toDto);
  }

  async create(input: PostApiAdminAuditLogRequestDto): Promise<PostApiAdminAuditLogResponseDto> {
    const row = await this.model('AuditEntry').create({
      data: { action: input.action, userId: input.userId },
    });
    return toDto(row);
  }
}
