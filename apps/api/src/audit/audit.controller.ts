import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'PROJECT_ENGINEER')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findRecent(@Query('take') take?: string) {
    const parsed = take ? Math.min(parseInt(take, 10) || 100, 500) : 100;
    return this.audit.findRecent(parsed);
  }
}
