import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private readonly equipment: EquipmentService) {}

  @Get('categories')
  listCategories() {
    return this.equipment.listCategories();
  }

  @Get('types')
  listTypes(@Query('categoryId') categoryId?: string) {
    return this.equipment.listTypes(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.equipment.findOneForUser(id, user);
  }

  @Post()
  @Roles('ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN')
  create(@Body() dto: CreateEquipmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.equipment.create(dto, actor);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN')
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.equipment.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.equipment.remove(id, actor);
  }
}
