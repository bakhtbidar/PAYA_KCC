import { Module } from '@nestjs/common';
import { TenantScopeService } from './tenant-scope.service';
import { StorageService } from './storage.service';

@Module({
  providers: [TenantScopeService, StorageService],
  exports: [TenantScopeService, StorageService],
})
export class CommonModule {}
