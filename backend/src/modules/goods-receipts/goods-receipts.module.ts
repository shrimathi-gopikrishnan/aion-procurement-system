import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceipt } from '../../database/entities/goods-receipt.entity';
import { GrnItem } from '../../database/entities/grn-item.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { PoItem } from '../../database/entities/po-item.entity';
import { Inventory } from '../../database/entities/inventory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GoodsReceipt, GrnItem, PurchaseOrder, PoItem, Inventory])],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
