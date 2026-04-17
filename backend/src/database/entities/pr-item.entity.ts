import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Component } from './component.entity';
import { PurchaseRequisition } from './purchase-requisition.entity';

@Entity('pr_items')
export class PrItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  purchaseRequisitionId: number;

  @ManyToOne(() => PurchaseRequisition, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseRequisitionId' })
  purchaseRequisition: PurchaseRequisition;

  @Column()
  componentId: number;

  @ManyToOne(() => Component, { eager: false })
  @JoinColumn({ name: 'componentId' })
  component: Component;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  unitOfMeasure: string;

  @Column({ type: 'real', nullable: true })
  estimatedUnitPrice: number;

  @Column({ nullable: true })
  notes: string;
}
