import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity';
import { Component } from './component.entity';

@Entity('grn_items')
export class GrnItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  goodsReceiptId: number;

  @ManyToOne(() => GoodsReceipt, (gr) => gr.items, { eager: false })
  @JoinColumn({ name: 'goodsReceiptId' })
  goodsReceipt: GoodsReceipt;

  @Column()
  componentId: number;

  @ManyToOne(() => Component, { eager: true })
  @JoinColumn({ name: 'componentId' })
  component: Component;

  @Column()
  orderedQty: number;

  @Column()
  receivedQty: number;

  @Column({ default: 0 })
  rejectedQty: number;

  @Column({ nullable: true })
  condition: string;

  @Column({ nullable: true })
  notes: string;
}
