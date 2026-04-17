import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MaintenanceOrder } from '../../database/entities/maintenance-order.entity';
import { Defect } from '../../database/entities/defect.entity';
import { PurchaseRequisition } from '../../database/entities/purchase-requisition.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceOrder, Defect, PurchaseRequisition,
      PurchaseOrder, Inventory, AuditLog,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
