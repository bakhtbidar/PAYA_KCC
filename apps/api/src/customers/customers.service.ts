import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.customer.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { restaurants: true } } },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { restaurants: { orderBy: { name: 'asc' } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.create({ data: dto });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: customer.id,
      after: dto,
    });
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, actor: AuthenticatedUser) {
    const before = await this.prisma.customer.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Customer not found');
    const customer = await this.prisma.customer.update({ where: { id }, data: dto });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: id,
      before,
      after: customer,
    });
    return customer;
  }
}
