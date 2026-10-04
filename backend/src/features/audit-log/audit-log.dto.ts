// AuditLog DTOs
import { z } from 'zod';

export interface GetApiAdminAuditLogRequestDto {
}

export interface GetApiAdminAuditLogResponseDto {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

export const PostApiAdminAuditLogRequestSchema = z.object({
  action: z.string().trim().min(1),
  userId: z.string().uuid(),
});

export interface PostApiAdminAuditLogRequestDto {
  action: string;
  userId: string;
}

export interface PostApiAdminAuditLogResponseDto {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}
