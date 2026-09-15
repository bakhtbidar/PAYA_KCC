import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenancePlansService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates(equipmentTypeId?: string) {
    return this.prisma.maintenancePlanTemplate.findMany({
      where: { isActive: true, ...(equipmentTypeId ? { equipmentTypeId } : {}) },
      select: { id: true, code: true, name: true, frequencyType: true, equipmentTypeId: true },
      orderBy: { code: 'asc' },
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.maintenancePlanTemplate.findUnique({
      where: { id },
      include: {
        equipmentType: { select: { id: true, name: true } },
        // taskOrder alone already encodes the source document's true order (it's assigned
        // as a running counter across sections at seed time) — sorting by section first
        // would alphabetize the sections and scramble that, e.g. putting equipment-specific
        // tasks before the "Visit preparation and safety checks" section that must come first.
        tasks: { orderBy: { taskOrder: 'asc' } },
      },
    });
    if (!template) throw new NotFoundException('Maintenance plan template not found');
    return template;
  }
}
