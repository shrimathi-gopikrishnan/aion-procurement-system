import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ComponentsModule } from './modules/components/components.module';
import { DefectsModule } from './modules/defects/defects.module';
import { MaintenanceOrdersModule } from './modules/maintenance-orders/maintenance-orders.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchaseRequisitionsModule } from './modules/purchase-requisitions/purchase-requisitions.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiModule } from './ai/ai.module';

import { User } from './database/entities/user.entity';
import { Component } from './database/entities/component.entity';
import { Defect } from './database/entities/defect.entity';
import { MaintenanceOrder } from './database/entities/maintenance-order.entity';
import { Decision } from './database/entities/decision.entity';
import { Inventory } from './database/entities/inventory.entity';
import { Reservation } from './database/entities/reservation.entity';
import { PurchaseRequisition } from './database/entities/purchase-requisition.entity';
import { PrItem } from './database/entities/pr-item.entity';
import { Vendor } from './database/entities/vendor.entity';
import { VendorItem } from './database/entities/vendor-item.entity';
import { PurchaseOrder } from './database/entities/purchase-order.entity';
import { PoItem } from './database/entities/po-item.entity';
import { GoodsReceipt } from './database/entities/goods-receipt.entity';
import { GrnItem } from './database/entities/grn-item.entity';
import { Invoice } from './database/entities/invoice.entity';
import { Approval } from './database/entities/approval.entity';
import { AuditLog } from './database/entities/audit-log.entity';
import { Notification } from './database/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: process.env.DB_PATH || './data/aion.db',
      autoSave: true,
      entities: [
        User, Component, Defect, MaintenanceOrder, Decision,
        Inventory, Reservation, PurchaseRequisition, PrItem,
        Vendor, VendorItem, PurchaseOrder, PoItem,
        GoodsReceipt, GrnItem, Invoice, Approval, AuditLog, Notification,
      ],
      synchronize: true,
      logging: false,
    }),
    EventEmitterModule.forRoot({ wildcard: true, maxListeners: 20 }),
    AiModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    ComponentsModule,
    DefectsModule,
    MaintenanceOrdersModule,
    WorkflowModule,
    InventoryModule,
    PurchaseRequisitionsModule,
    VendorsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    InvoicesModule,
    DashboardModule,
    ChatModule,
  ],
})
export class AppModule {}
