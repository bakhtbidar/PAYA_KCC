import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantScopeService } from '../common/tenant-scope.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateRestaurantDto, CreateSectionDto, UpdateRestaurantDto } from './dto/restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: TenantScopeService,
  ) {}

  async findAllForUser(user: AuthenticatedUser) {
    const ids = await this.scope.accessibleRestaurantIds(user);
    return this.prisma.restaurant.findMany({
      where: ids === null ? undefined : { id: { in: ids } },
      include: { customer: { select: { id: true, name: true } }, _count: { select: { equipment: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneForUser(id: string, user: AuthenticatedUser) {
    await this.scope.assertRestaurantAccess(user, id);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        sections: { orderBy: { sortOrder: 'asc' } },
        equipment: {
          orderBy: { name: 'asc' },
          include: { category: true, section: { select: { name: true } } },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async create(dto: CreateRestaurantDto, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const restaurant = await this.prisma.restaurant.create({ data: dto });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'Restaurant',
      entityId: restaurant.id,
      after: dto,
    });
    return restaurant;
  }

  async update(id: string, dto: UpdateRestaurantDto, actor: AuthenticatedUser) {
    const before = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Restaurant not found');
    const restaurant = await this.prisma.restaurant.update({ where: { id }, data: dto });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'Restaurant',
      entityId: id,
      before,
      after: restaurant,
    });
    return restaurant;
  }

  async addSection(restaurantId: string, dto: CreateSectionDto, actor: AuthenticatedUser) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const section = await this.prisma.restaurantSection.create({
      data: { restaurantId, name: dto.name, description: dto.description, sortOrder: dto.sortOrder ?? 0 },
    });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'RestaurantSection',
      entityId: section.id,
      after: dto,
    });
    return section;
  }

  /** Technicians who could be assigned a maintenance visit at this restaurant. */
  async listTechnicians(restaurantId: string, actor: AuthenticatedUser) {
    await this.scope.assertRestaurantAccess(actor, restaurantId);
    const grants = await this.prisma.restaurantUserAccess.findMany({
      where: { restaurantId, roleAtSite: 'TECHNICIAN' },
      include: { user: { select: { id: true, fullName: true, email: true, isActive: true } } },
    });
    const byId = new Map(grants.map((g) => [g.user.id, g.user]));
    return [...byId.values()].filter((u) => u.isActive);
  }

  /**
   * "Remove" a restaurant. A restaurant with any real history (equipment or documents)
   * is deactivated, not destroyed — its compliance/maintenance trail has to survive. Only
   * a genuinely empty restaurant (nothing registered under it yet) is actually deleted.
   */
  async remove(id: string, actor: AuthenticatedUser) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const [equipmentCount, documentCount] = await Promise.all([
      this.prisma.equipment.count({ where: { restaurantId: id } }),
      this.prisma.document.count({ where: { restaurantId: id } }),
    ]);

    if (equipmentCount === 0 && documentCount === 0) {
      await this.prisma.restaurant.delete({ where: { id } });
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'DELETE',
        entityType: 'Restaurant',
        entityId: id,
        before: { name: restaurant.name },
      });
      return { deleted: true, deactivated: false };
    }

    await this.prisma.restaurant.update({ where: { id }, data: { isActive: false } });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'Restaurant',
      entityId: id,
      before: { isActive: true },
      after: { isActive: false, reason: 'remove requested; deactivated instead of deleted (has history)' },
    });
    return { deleted: false, deactivated: true };
  }
}
