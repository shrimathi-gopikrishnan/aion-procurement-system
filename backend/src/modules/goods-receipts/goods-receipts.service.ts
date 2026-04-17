import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoodsReceipt, GrnStatus } from '../../database/entities/goods-receipt.entity';
import { GrnItem } from '../../database/entities/grn-item.entity';
import { PurchaseOrder, PoStatus } from '../../database/entities/purchase-order.entity';
import { PoItem } from '../../database/entities/po-item.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @InjectRepository(GoodsReceipt) private repo: Repository<GoodsReceipt>,
    @InjectRepository(GrnItem) private itemRepo: Repository<GrnItem>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PoItem) private poItemRepo: Repository<PoItem>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    private eventEmitter: EventEmitter2,
  ) {}

  private generateGrnNumber() {
    return `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }

  findAll() {
    return this.repo.find({
      relations: ['purchaseOrder', 'purchaseOrder.vendor', 'items', 'items.component', 'receivedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const grn = await this.repo.findOne({
      where: { id },
      relations: ['purchaseOrder', 'purchaseOrder.vendor', 'purchaseOrder.items', 'items', 'items.component', 'receivedBy'],
    });
    if (!grn) throw new NotFoundException(`GRN #${id} not found`);
    if (grn.receivedBy) delete (grn.receivedBy as any).passwordHash;
    return grn;
  }

  async create(dto: {
    purchaseOrderId: number;
    deliveryNote?: string;
    notes?: string;
    items: Array<{ componentId: number; orderedQty: number; receivedQty: number; rejectedQty?: number; condition?: string; notes?: string }>;
    receivedById: number;
  }) {
    const po = await this.poRepo.findOne({ where: { id: dto.purchaseOrderId }, relations: ['items'] });
    if (!po) throw new NotFoundException('Purchase Order not found');
    if (po.status === PoStatus.CANCELLED) throw new BadRequestException('Cannot receive goods for a cancelled PO');

    const grn = this.repo.create({
      grnNumber: this.generateGrnNumber(),
      purchaseOrderId: dto.purchaseOrderId,
      deliveryNote: dto.deliveryNote,
      notes: dto.notes,
      receivedById: dto.receivedById,
      receivedAt: new Date(),
      status: GrnStatus.DRAFT,
    });
    const savedGrn = await this.repo.save(grn);

    for (const item of dto.items) {
      await this.itemRepo.save(
        this.itemRepo.create({
          goodsReceiptId: savedGrn.id,
          componentId: item.componentId,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          rejectedQty: item.rejectedQty || 0,
          condition: item.condition,
          notes: item.notes,
        }),
      );

      const accepted = item.receivedQty - (item.rejectedQty || 0);
      if (accepted > 0) {
        let inv = await this.inventoryRepo.findOne({ where: { componentId: item.componentId } });
        if (!inv) inv = this.inventoryRepo.create({ componentId: item.componentId, quantityOnHand: 0, quantityReserved: 0 });
        inv.quantityOnHand += accepted;
        await this.inventoryRepo.save(inv);
      }

      const poItem = po.items.find((pi) => pi.componentId === item.componentId);
      if (poItem) {
        poItem.receivedQty = (poItem.receivedQty || 0) + item.receivedQty;
        await this.poItemRepo.save(poItem);
      }
    }

    const totalOrdered = dto.items.reduce((s, i) => s + i.orderedQty, 0);
    const totalReceived = dto.items.reduce((s, i) => s + i.receivedQty, 0);
    savedGrn.status = totalReceived >= totalOrdered ? GrnStatus.COMPLETE : GrnStatus.PARTIAL;
    po.status = totalReceived >= totalOrdered ? PoStatus.FULLY_RECEIVED : PoStatus.PARTIALLY_RECEIVED;

    await this.repo.save(savedGrn);
    await this.poRepo.save(po);
    this.eventEmitter.emit('goods.received', { grnId: savedGrn.id, poId: dto.purchaseOrderId });
    return this.findOne(savedGrn.id);
  }
}
