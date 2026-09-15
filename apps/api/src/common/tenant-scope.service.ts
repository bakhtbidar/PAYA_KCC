import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { STAFF_ROLES } from './enums';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

/**
 * App-layer tenant isolation (spec gap §2, Red).
 *
 * ADMIN / PROJECT_ENGINEER are PAYA staff and see every restaurant. Everyone else
 * (CUSTOMER, TECHNICIAN, AUTHORITY) is scoped to exactly the restaurants they have
 * an explicit RestaurantUserAccess grant for — never inferred, never "all in my org".
 *
 * This is the primary guarantee in dev (SQLite has no RLS). In production on
 * Postgres, infra/sql/001_row_level_security.sql enforces the same rule again at
 * the database level as a backstop, so a bug here can't leak cross-customer data.
 */
@Injectable()
export class TenantScopeService {
  constructor(private readonly prisma: PrismaService) {}

  isUnrestricted(user: AuthenticatedUser): boolean {
    return user.roles.some((r) => STAFF_ROLES.includes(r));
  }

  /** null = unrestricted (staff). Otherwise the exact set of restaurant ids the user may see. */
  async accessibleRestaurantIds(user: AuthenticatedUser): Promise<string[] | null> {
    if (this.isUnrestricted(user)) return null;
    const grants = await this.prisma.restaurantUserAccess.findMany({
      where: { userId: user.userId },
      select: { restaurantId: true },
    });
    return grants.map((g) => g.restaurantId);
  }

  /** Throws NotFound (never Forbidden) so we don't leak whether a restaurant exists to someone without access. */
  async assertRestaurantAccess(user: AuthenticatedUser, restaurantId: string): Promise<void> {
    const ids = await this.accessibleRestaurantIds(user);
    if (ids === null) return;
    if (!ids.includes(restaurantId)) {
      throw new NotFoundException('Restaurant not found');
    }
  }
}
