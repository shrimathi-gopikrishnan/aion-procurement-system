import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceOrdersController } from './maintenance-orders.controller';
import { MaintenanceOrdersService } from './maintenance-orders.service';
import { MaintenanceOrder } from '../../database/entities/maintenance-order.entity';
import { Defect } from '../../database/entities/defect.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceOrder, Defect, AuditLog])],
  controllers: [MaintenanceOrdersController],
  providers: [MaintenanceOrdersService],
  exports: [MaintenanceOrdersService],
})
export class MaintenanceOrdersModule {}
