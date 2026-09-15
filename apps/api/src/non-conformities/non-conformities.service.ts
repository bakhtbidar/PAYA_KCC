import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantScopeService } from '../common/tenant-scope.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NonConformityStatus } from '../common/enums';

const listInclude = {
  equipment: { select: { name: true, assetTag: true } },
  reportedBy: { select: { fullName: true } },
} as const;

@Injectable()
export class NonConformitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: TenantScopeService,
  ) {}

  async list(params: { restaurantId?: string; equipmentId?: string }, user: AuthenticatedUser) {
    if (!params.restaurantId && !params.equipmentId) {
      throw new BadRequestException('restaurantId or equipmentId is required');
    }

    let restaurantId = params.restaurantId;
    if (params.equipmentId) {
      const equipment = await this.prisma.equipment.findUnique({ where: { id: params.equipmentId } });
      if (!equipment) throw new NotFoundException('Equipment not found');
      restaurantId = equipment.restaurantId;
    }
    await this.scope.assertRestaurantAccess(user, restaurantId!);

    return this.prisma.nonConformity.findMany({
      where: { restaurantId, ...(params.equipmentId ? { equipmentId: params.equipmentId } : {}) },
      include: listInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: NonConformityStatus, actor: AuthenticatedUser) {
    const nonConformity = await this.prisma.nonConformity.findUnique({ where: { id } });
    if (!nonConformity) throw new NotFoundException('Non-conformity not found');
    await this.scope.assertRestaurantAccess(actor, nonConformity.restaurantId);

    const updated = await this.prisma.nonConformity.update({
      where: { id },
      data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'NonConformity',
      entityId: id,
      before: { status: nonConformity.status },
      after: { status },
    });

    return updated;
  }
}
