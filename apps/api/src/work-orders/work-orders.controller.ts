import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { WorkOrdersService } from './work-orders.service';
import { AssignWorkOrderDto, QuickStartWorkOrderDto } from './dto/assign-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get('queue/me')
  myQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.workOrders.myQueue(user);
  }

  @Get()
  listForEquipment(
    @Query('equipmentId') equipmentId: string,
    @Query('status') status: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrders.listForEquipment(equipmentId, user, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workOrders.findOne(id, user);
  }

  @Post('assign')
  @Roles('ADMIN', 'PROJECT_ENGINEER')
  assign(@Body() dto: AssignWorkOrderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.workOrders.assign(dto, actor);
  }

  @Post('quick-start')
  @Roles('ADMIN', 'PROJECT_ENGINEER')
  quickStart(@Body() dto: QuickStartWorkOrderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.workOrders.quickStart(dto, actor);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteWorkOrderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.workOrders.complete(id, dto, actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkOrderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.workOrders.update(id, dto, actor);
  }
}
