import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { MaintenanceOrder } from '../../database/entities/maintenance-order.entity';
import { Defect } from '../../database/entities/defect.entity';
import { PurchaseRequisition } from '../../database/entities/purchase-requisition.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceOrder, Defect, PurchaseRequisition, PurchaseOrder, Invoice, Inventory, AuditLog])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
