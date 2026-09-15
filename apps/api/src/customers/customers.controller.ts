import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'PROJECT_ENGINEER')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll() {
    return this.customers.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateCustomerDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.customers.create(dto, actor);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.customers.update(id, dto, actor);
  }
}
