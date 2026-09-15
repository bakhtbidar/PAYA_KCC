import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { NonConformitiesController } from './non-conformities.controller';
import { NonConformitiesService } from './non-conformities.service';

@Module({
  imports: [AuditModule, CommonModule],
  controllers: [NonConformitiesController],
  providers: [NonConformitiesService],
})
export class NonConformitiesModule {}
