import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { EquipmentModule } from './equipment/equipment.module';
import { DocumentsModule } from './documents/documents.module';
import { MaintenancePlansModule } from './maintenance-plans/maintenance-plans.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { NonConformitiesModule } from './non-conformities/non-conformities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    RestaurantsModule,
    EquipmentModule,
    DocumentsModule,
    MaintenancePlansModule,
    WorkOrdersModule,
    NonConformitiesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
