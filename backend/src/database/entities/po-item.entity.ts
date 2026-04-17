import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Component } from './component.entity';

@Entity('po_items')
export class PoItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  purchaseOrderId: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { eager: false })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Column()
  componentId: number;

  @ManyToOne(() => Component, { eager: true })
  @JoinColumn({ name: 'componentId' })
  component: Component;

  @Column()
  quantity: number;

  @Column({ type: 'real' })
  unitPrice: number;

  @Column({ default: 0 })
  receivedQty: number;

  get lineTotal(): number {
    return this.quantity * this.unitPrice;
  }
}
