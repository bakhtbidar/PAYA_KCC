import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, CreateSectionDto, UpdateRestaurantDto } from './dto/restaurant.dto';

@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.restaurants.findAllForUser(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.restaurants.findOneForUser(id, user);
  }

  @Post()
  @Roles('ADMIN', 'PROJECT_ENGINEER')
  create(@Body() dto: CreateRestaurantDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.restaurants.create(dto, actor);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PROJECT_ENGINEER')
  update(@Param('id') id: string, @Body() dto: UpdateRestaurantDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.restaurants.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.restaurants.remove(id, actor);
  }

  @Post(':id/sections')
  @Roles('ADMIN', 'PROJECT_ENGINEER')
  addSection(@Param('id') id: string, @Body() dto: CreateSectionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.restaurants.addSection(id, dto, actor);
  }

  @Get(':id/technicians')
  @Roles('ADMIN', 'PROJECT_ENGINEER')
  listTechnicians(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.restaurants.listTechnicians(id, actor);
  }
}
