import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from '../../database/entities/invoice.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { GoodsReceipt } from '../../database/entities/goods-receipt.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, PurchaseOrder, GoodsReceipt, AuditLog])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
