import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantScopeService } from '../common/tenant-scope.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { STAFF_ROLES } from '../common/enums';
import { AssignWorkOrderDto, QuickStartWorkOrderDto } from './dto/assign-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

const workOrderListInclude = {
  performedBy: { select: { id: true, fullName: true } },
  assignedBy: { select: { fullName: true } },
  template: { select: { name: true, code: true } },
  _count: { select: { nonConformities: true } },
} as const;

const workOrderDetailInclude = {
  equipment: { select: { id: true, name: true, assetTag: true, restaurantId: true } },
  performedBy: { select: { id: true, fullName: true, email: true } },
  assignedBy: { select: { fullName: true } },
  template: { select: { name: true, code: true } },
  tasks: true,
  nonConformities: { include: { reportedBy: { select: { fullName: true } } } },
} as const;

function isStaff(user: AuthenticatedUser): boolean {
  return user.roles.some((r) => STAFF_ROLES.includes(r));
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: TenantScopeService,
  ) {}

  async listForEquipment(equipmentId: string, user: AuthenticatedUser, status?: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException('Equipment not found');
    await this.scope.assertRestaurantAccess(user, equipment.restaurantId);

    return this.prisma.workOrder.findMany({
      where: { equipmentId, ...(status ? { status } : {}) },
      include: workOrderListInclude,
      orderBy: [{ completedAt: 'desc' }, { assignedAt: 'desc' }],
    });
  }

  /** "Message in his profile" — the technician's (or anyone's) queue of visits assigned to them. */
  async myQueue(user: AuthenticatedUser) {
    return this.prisma.workOrder.findMany({
      where: { performedByUserId: user.userId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      include: {
        ...workOrderListInclude,
        equipment: { select: { id: true, name: true, assetTag: true, restaurantId: true } },
        restaurant: { select: { name: true } },
      },
      orderBy: { assignedAt: 'asc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id }, include: workOrderDetailInclude });
    if (!workOrder) throw new NotFoundException('Work order not found');
    await this.scope.assertRestaurantAccess(user, workOrder.restaurantId);

    // taskOrder alone already encodes the source checklist's true section order (it's a
    // running counter across sections) — sorting by section name first would alphabetize
    // the sections instead of preserving document order.
    const tasks = [...workOrder.tasks].sort((a, b) => a.taskOrder - b.taskOrder);
    return { ...workOrder, tasks };
  }

  private async loadEquipmentAndTemplate(equipmentId: string, templateId: string, actor: AuthenticatedUser) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException('Equipment not found');
    await this.scope.assertRestaurantAccess(actor, equipment.restaurantId);

    const template = await this.prisma.maintenancePlanTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Maintenance plan template not found');
    if (template.equipmentTypeId !== equipment.typeId) {
      throw new BadRequestException("That checklist doesn't apply to this equipment's type");
    }
    return { equipment, template };
  }

  /** ADMIN/PROJECT_ENGINEER hands a checklist to a technician — they see it in their queue. */
  async assign(dto: AssignWorkOrderDto, actor: AuthenticatedUser) {
    const { equipment, template } = await this.loadEquipmentAndTemplate(dto.equipmentId, dto.templateId, actor);

    const technician = await this.prisma.user.findUnique({
      where: { id: dto.assignedToUserId },
      include: { roles: { include: { role: true } } },
    });
    if (!technician || !technician.isActive) throw new NotFoundException('Technician not found');
    if (!technician.roles.some((r) => r.role.code === 'TECHNICIAN')) {
      throw new BadRequestException('That user does not have the Technician role');
    }
    const hasAccess = await this.prisma.restaurantUserAccess.findFirst({
      where: { restaurantId: equipment.restaurantId, userId: technician.id },
    });
    if (!hasAccess) {
      throw new BadRequestException('That technician does not have access to this restaurant yet — grant access first');
    }

    const workOrder = await this.prisma.workOrder.create({
      data: {
        restaurantId: equipment.restaurantId,
        equipmentId: equipment.id,
        templateId: template.id,
        type: 'PREVENTIVE',
        status: 'ASSIGNED',
        performedByUserId: technician.id,
        assignedByUserId: actor.userId,
      },
      include: workOrderListInclude,
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'WorkOrder',
      entityId: workOrder.id,
      after: { equipmentId: equipment.id, templateId: template.id, assignedTo: technician.id, status: 'ASSIGNED' },
    });

    return workOrder;
  }

  /** ADMIN/PROJECT_ENGINEER performs a visit themselves — an assignment to self, ready to fill in immediately. */
  async quickStart(dto: QuickStartWorkOrderDto, actor: AuthenticatedUser) {
    const { equipment, template } = await this.loadEquipmentAndTemplate(dto.equipmentId, dto.templateId, actor);

    const workOrder = await this.prisma.workOrder.create({
      data: {
        restaurantId: equipment.restaurantId,
        equipmentId: equipment.id,
        templateId: template.id,
        type: 'PREVENTIVE',
        status: 'ASSIGNED',
        performedByUserId: actor.userId,
        assignedByUserId: actor.userId,
      },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'WorkOrder',
      entityId: workOrder.id,
      after: { equipmentId: equipment.id, templateId: template.id, assignedTo: actor.userId, status: 'ASSIGNED' },
    });

    return workOrder;
  }

  async complete(id: string, dto: CompleteWorkOrderDto, actor: AuthenticatedUser) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!workOrder) throw new NotFoundException('Work order not found');
    await this.scope.assertRestaurantAccess(actor, workOrder.restaurantId);

    if (workOrder.performedByUserId !== actor.userId && !isStaff(actor)) {
      throw new ForbiddenException('This maintenance visit was not assigned to you');
    }
    if (workOrder.status === 'COMPLETED') throw new ConflictException('This visit has already been completed');
    if (workOrder.status === 'CANCELLED') throw new ConflictException('This visit was cancelled');
    if (!workOrder.templateId) throw new BadRequestException('This work order has no checklist template');

    const template = await this.prisma.maintenancePlanTemplate.findUnique({
      where: { id: workOrder.templateId },
      include: { tasks: true },
    });
    if (!template) throw new NotFoundException('Maintenance plan template not found');
    const planTaskById = new Map(template.tasks.map((t) => [t.id, t]));

    await this.prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id },
        data: { status: 'COMPLETED', notes: dto.notes, completedAt: new Date() },
      });

      for (const answer of dto.tasks) {
        const planTask = planTaskById.get(answer.planTaskId);
        if (!planTask) continue; // ignore stale/unknown task ids rather than failing the whole visit

        await tx.workOrderTask.create({
          data: {
            workOrderId: id,
            planTaskId: planTask.id,
            section: planTask.section,
            taskOrder: planTask.taskOrder,
            description: planTask.description,
            expectedResultType: planTask.expectedResultType,
            unit: planTask.unit,
            optionsJson: planTask.optionsJson,
            resultBoolean: answer.resultBoolean,
            resultNumeric: answer.resultNumeric,
            resultText: answer.resultText,
            evidenceNote: answer.evidenceNote,
            isNonConformity: !!answer.isNonConformity,
          },
        });

        if (answer.isNonConformity) {
          await tx.nonConformity.create({
            data: {
              workOrderId: id,
              restaurantId: workOrder.restaurantId,
              equipmentId: workOrder.equipmentId,
              severity: answer.nonConformitySeverity ?? 'MEDIUM',
              description: answer.nonConformityDescription?.trim() || `Issue found: ${planTask.description}`,
              reportedByUserId: actor.userId,
            },
          });
        }
      }
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'WorkOrder',
      entityId: id,
      before: { status: workOrder.status },
      after: { status: 'COMPLETED', taskCount: dto.tasks.length },
    });

    return this.findOne(id, actor);
  }

  /** "Technician can modify the performed maintenance if he put something by wrong." */
  async update(id: string, dto: UpdateWorkOrderDto, actor: AuthenticatedUser) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id }, include: { tasks: true } });
    if (!workOrder) throw new NotFoundException('Work order not found');
    await this.scope.assertRestaurantAccess(actor, workOrder.restaurantId);

    if (workOrder.performedByUserId !== actor.userId && !isStaff(actor)) {
      throw new ForbiddenException('Only the technician who performed this visit, or an admin/engineer, can edit it');
    }
    if (workOrder.status !== 'COMPLETED') {
      throw new ConflictException('Only a completed visit can be corrected');
    }

    const taskIds = new Set(workOrder.tasks.map((t) => t.id));

    await this.prisma.$transaction(async (tx) => {
      if (dto.notes !== undefined) {
        await tx.workOrder.update({ where: { id }, data: { notes: dto.notes } });
      }
      for (const correction of dto.tasks) {
        if (!taskIds.has(correction.workOrderTaskId)) continue; // not a task on this work order — ignore
        await tx.workOrderTask.update({
          where: { id: correction.workOrderTaskId },
          data: {
            resultBoolean: correction.resultBoolean,
            resultNumeric: correction.resultNumeric,
            resultText: correction.resultText,
            evidenceNote: correction.evidenceNote,
          },
        });
      }
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'WorkOrder',
      entityId: id,
      before: { note: 'correction to previously completed visit' },
      after: { correctedTaskCount: dto.tasks.length },
    });

    return this.findOne(id, actor);
  }
}
