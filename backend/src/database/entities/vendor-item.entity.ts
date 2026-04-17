import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { Component } from './component.entity';

@Entity('vendor_items')
export class VendorItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vendorId: number;

  @ManyToOne(() => Vendor, (v) => v.items, { eager: false })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column()
  componentId: number;

  @ManyToOne(() => Component, { eager: true })
  @JoinColumn({ name: 'componentId' })
  component: Component;

  @Column({ type: 'real' })
  price: number;

  @Column({ default: 7 })
  deliveryDays: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ default: true })
  isAvailable: boolean;
}
