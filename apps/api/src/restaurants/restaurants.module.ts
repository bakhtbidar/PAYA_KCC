import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [AuditModule, CommonModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
