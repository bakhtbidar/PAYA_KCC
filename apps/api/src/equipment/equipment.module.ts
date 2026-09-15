import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({
  imports: [AuditModule, CommonModule],
  controllers: [EquipmentController],
  providers: [EquipmentService],
})
export class EquipmentModule {}
