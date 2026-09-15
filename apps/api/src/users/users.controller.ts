import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GrantAccessDto } from './dto/grant-access.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create(dto, actor);
  }

  @Post(':id/restaurant-access')
  grantAccess(@Param('id') id: string, @Body() dto: GrantAccessDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.grantRestaurantAccess(id, dto, actor);
  }

  @Delete(':id/restaurant-access/:accessId')
  revokeAccess(
    @Param('id') id: string,
    @Param('accessId') accessId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.revokeRestaurantAccess(id, accessId, actor);
  }
}
