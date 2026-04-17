import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Component } from './component.entity';

@Entity('pr_items')
export class PrItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  purchaseRequisitionId: number;

  purchaseRequisition: any;

  @Column()
  componentId: number;

  @ManyToOne(() => Component, { eager: true })
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
