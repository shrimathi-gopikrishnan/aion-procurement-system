import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { PoItem } from '../../database/entities/po-item.entity';
import { PurchaseRequisition } from '../../database/entities/purchase-requisition.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, PoItem, PurchaseRequisition, AuditLog])],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
