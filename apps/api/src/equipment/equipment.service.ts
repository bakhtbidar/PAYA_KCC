import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantScopeService } from '../common/tenant-scope.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6); // no ambiguous chars — printed on a physical sticker

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: TenantScopeService,
    private readonly config: ConfigService,
  ) {}

  listCategories() {
    return this.prisma.equipmentCategory.findMany({ orderBy: { name: 'asc' } });
  }

  listTypes(categoryId?: string) {
    return this.prisma.equipmentType.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOneForUser(id: string, user: AuthenticatedUser) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: { category: true, model: true, type: true, section: true, documents: true },
    });
    if (!equipment) throw new NotFoundException('Equipment not found');
    await this.scope.assertRestaurantAccess(user, equipment.restaurantId);
    return { ...equipment, qrCodeDataUrl: await this.qrCodeFor(equipment.assetTag) };
  }

  private async qrCodeFor(assetTag: string): Promise<string> {
    const baseUrl = this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:5173';
    return QRCode.toDataURL(`${baseUrl}/assets/${assetTag}`, { margin: 1, width: 256 });
  }

  async create(dto: CreateEquipmentDto, actor: AuthenticatedUser) {
    await this.scope.assertRestaurantAccess(actor, dto.restaurantId);

    if (dto.typeId) {
      const type = await this.prisma.equipmentType.findUnique({ where: { id: dto.typeId } });
      if (!type) throw new NotFoundException('Equipment type not found');
      if (type.categoryId !== dto.categoryId) {
        throw new NotFoundException('Equipment type does not belong to the selected category');
      }
    }

    let assetTag = `PAYA-${nanoid()}`;
    // astronomically unlikely to collide, but guard anyway since it's a unique physical sticker id
    while (await this.prisma.equipment.findUnique({ where: { assetTag } })) {
      assetTag = `PAYA-${nanoid()}`;
    }

    const equipment = await this.prisma.equipment.create({
      data: {
        restaurantId: dto.restaurantId,
        sectionId: dto.sectionId,
        categoryId: dto.categoryId,
        modelId: dto.modelId,
        typeId: dto.typeId,
        name: dto.name,
        serialNumber: dto.serialNumber,
        locationNote: dto.locationNote,
        installDate: dto.installDate ? new Date(dto.installDate) : undefined,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
        riskLevel: dto.riskLevel ?? 'GREEN',
        assetTag,
        registeredById: actor.userId,
      },
      include: { category: true, type: true, section: true },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'Equipment',
      entityId: equipment.id,
      after: { name: equipment.name, assetTag, restaurantId: dto.restaurantId },
    });

    return { ...equipment, qrCodeDataUrl: await this.qrCodeFor(assetTag) };
  }

  async update(id: string, dto: UpdateEquipmentDto, actor: AuthenticatedUser) {
    const before = await this.prisma.equipment.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Equipment not found');
    await this.scope.assertRestaurantAccess(actor, before.restaurantId);

    if (dto.typeId) {
      const type = await this.prisma.equipmentType.findUnique({ where: { id: dto.typeId } });
      if (!type) throw new NotFoundException('Equipment type not found');
      if (type.categoryId !== before.categoryId) {
        throw new NotFoundException('Equipment type does not belong to this asset\'s category');
      }
    }

    const equipment = await this.prisma.equipment.update({ where: { id }, data: dto });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'Equipment',
      entityId: id,
      before: { name: before.name, riskLevel: before.riskLevel, status: before.status, typeId: before.typeId },
      after: { name: equipment.name, riskLevel: equipment.riskLevel, status: equipment.status, typeId: equipment.typeId },
    });
    return equipment;
  }

  /**
   * "Remove" equipment. An asset with any maintenance history or attached documents is
   * retired, not destroyed — that history is the whole point of the audit trail. Only an
   * asset with nothing recorded against it yet is actually deleted.
   */
  async remove(id: string, actor: AuthenticatedUser) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new NotFoundException('Equipment not found');
    await this.scope.assertRestaurantAccess(actor, equipment.restaurantId);

    const [workOrderCount, documentCount] = await Promise.all([
      this.prisma.workOrder.count({ where: { equipmentId: id } }),
      this.prisma.document.count({ where: { equipmentId: id } }),
    ]);

    if (workOrderCount === 0 && documentCount === 0) {
      await this.prisma.equipment.delete({ where: { id } });
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'DELETE',
        entityType: 'Equipment',
        entityId: id,
        before: { name: equipment.name, assetTag: equipment.assetTag },
      });
      return { deleted: true, retired: false };
    }

    await this.prisma.equipment.update({ where: { id }, data: { status: 'RETIRED' } });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'Equipment',
      entityId: id,
      before: { status: equipment.status },
      after: { status: 'RETIRED', reason: 'remove requested; retired instead of deleted (has history)' },
    });
    return { deleted: false, retired: true };
  }
}
