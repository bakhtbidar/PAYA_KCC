import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'GRANT_ACCESS'
  | 'REVOKE_ACCESS';

/**
 * Write-once audit trail. Callers hand-pick what goes into before/after so we
 * never accidentally persist secrets (password hashes, tokens) into the log.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    actorUserId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        before: params.before !== undefined ? JSON.stringify(params.before) : null,
        after: params.after !== undefined ? JSON.stringify(params.after) : null,
      },
    });
  }

  async findRecent(take = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
