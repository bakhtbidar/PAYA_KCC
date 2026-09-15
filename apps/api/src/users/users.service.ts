import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GrantAccessDto } from './dto/grant-access.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

const userListSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  isActive: true,
  createdAt: true,
  roles: { select: { role: { select: { code: true, name: true } } } },
  restaurantAccess: {
    select: { restaurantId: true, roleAtSite: true, isPrimary: true, restaurant: { select: { name: true } } },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({ select: userListSelect, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userListSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with that email already exists');

    const roles = await this.prisma.role.findMany({ where: { code: { in: dto.roleCodes } } });
    if (roles.length !== dto.roleCodes.length) throw new NotFoundException('One or more roles not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      select: userListSelect,
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, fullName: user.fullName, roles: dto.roleCodes },
    });

    return user;
  }

  async grantRestaurantAccess(userId: string, dto: GrantAccessDto, actor: AuthenticatedUser) {
    const [user, restaurant] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.restaurant.findUnique({ where: { id: dto.restaurantId } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const access = await this.prisma.restaurantUserAccess.upsert({
      where: {
        restaurantId_userId_roleAtSite: {
          restaurantId: dto.restaurantId,
          userId,
          roleAtSite: dto.roleAtSite,
        },
      },
      update: { isPrimary: dto.isPrimary ?? false },
      create: { restaurantId: dto.restaurantId, userId, roleAtSite: dto.roleAtSite, isPrimary: dto.isPrimary ?? false },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'GRANT_ACCESS',
      entityType: 'RestaurantUserAccess',
      entityId: access.id,
      after: { userId, restaurantId: dto.restaurantId, roleAtSite: dto.roleAtSite },
    });

    return access;
  }

  async revokeRestaurantAccess(userId: string, accessId: string, actor: AuthenticatedUser) {
    const access = await this.prisma.restaurantUserAccess.findUnique({ where: { id: accessId } });
    if (!access || access.userId !== userId) throw new NotFoundException('Access grant not found');

    await this.prisma.restaurantUserAccess.delete({ where: { id: accessId } });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'REVOKE_ACCESS',
      entityType: 'RestaurantUserAccess',
      entityId: accessId,
      before: { userId: access.userId, restaurantId: access.restaurantId, roleAtSite: access.roleAtSite },
    });
  }
}
