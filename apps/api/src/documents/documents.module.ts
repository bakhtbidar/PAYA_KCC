import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuditModule, CommonModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
