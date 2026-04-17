import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { Component } from './component.entity';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  componentId: number;

  @ManyToOne(() => Component, { eager: true })
  @JoinColumn({ name: 'componentId' })
  component: Component;

  @Column({ default: 0 })
  quantityOnHand: number;

  @Column({ default: 0 })
  quantityReserved: number;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  unitOfMeasure: string;

  @Column({ type: 'real', nullable: true })
  unitCost: number;

  @Column({ default: 0 })
  reorderPoint: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  get quantityAvailable(): number {
    return this.quantityOnHand - this.quantityReserved;
  }
}
