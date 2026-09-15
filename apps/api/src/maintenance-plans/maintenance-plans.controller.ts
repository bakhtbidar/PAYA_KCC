import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaintenancePlansService } from './maintenance-plans.service';

@Controller('maintenance-plans')
@UseGuards(JwtAuthGuard)
export class MaintenancePlansController {
  constructor(private readonly plans: MaintenancePlansService) {}

  @Get('templates')
  listTemplates(@Query('equipmentTypeId') equipmentTypeId?: string) {
    return this.plans.listTemplates(equipmentTypeId);
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.plans.getTemplate(id);
  }
}
