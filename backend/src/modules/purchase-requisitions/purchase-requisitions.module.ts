import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseRequisitionsController } from './purchase-requisitions.controller';
import { PurchaseRequisitionsService } from './purchase-requisitions.service';
import { PurchaseRequisition } from '../../database/entities/purchase-requisition.entity';
import { PrItem } from '../../database/entities/pr-item.entity';
import { MaintenanceOrder } from '../../database/entities/maintenance-order.entity';
import { Component } from '../../database/entities/component.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseRequisition, PrItem, MaintenanceOrder, Component, AuditLog])],
  controllers: [PurchaseRequisitionsController],
  providers: [PurchaseRequisitionsService],
  exports: [PurchaseRequisitionsService],
})
export class PurchaseRequisitionsModule {}
