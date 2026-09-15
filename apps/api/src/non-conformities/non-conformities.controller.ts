import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NonConformitiesService } from './non-conformities.service';
import { UpdateNonConformityDto } from './dto/update-non-conformity.dto';

@Controller('non-conformities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NonConformitiesController {
  constructor(private readonly nonConformities: NonConformitiesService) {}

  @Get()
  list(
    @Query('restaurantId') restaurantId: string | undefined,
    @Query('equipmentId') equipmentId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.nonConformities.list({ restaurantId, equipmentId }, user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PROJECT_ENGINEER')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateNonConformityDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.nonConformities.updateStatus(id, dto.status, actor);
  }
}
