import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [AuditModule, CommonModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
