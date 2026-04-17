import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { MaintenanceOrder } from './maintenance-order.entity';
import { Component } from './component.entity';

export enum ReservationStatus {
  RESERVED = 'reserved',
  PARTIAL = 'partial',
  FAILED = 'failed',
  RELEASED = 'released',
  CONSUMED = 'consumed',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  maintenanceOrderId: number;

  @ManyToOne(() => MaintenanceOrder, { eager: false })
  @JoinColumn({ name: 'maintenanceOrderId' })
  maintenanceOrder: MaintenanceOrder;

  @Column()
  componentId: number;

  @ManyToOne(() => Component, { eager: true })
  @JoinColumn({ name: 'componentId' })
  component: Component;

  @Column()
  requestedQty: number;

  @Column({ default: 0 })
  reservedQty: number;

  @Column({ type: 'varchar', default: ReservationStatus.RESERVED })
  status: ReservationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
