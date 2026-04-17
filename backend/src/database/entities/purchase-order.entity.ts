import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn, OneToMany,
} from 'typeorm';
import { PurchaseRequisition } from './purchase-requisition.entity';
import { Vendor } from './vendor.entity';
import { User } from './user.entity';
import { PoItem } from './po-item.entity';

export enum PoStatus {
  CREATED = 'created',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT_TO_VENDOR = 'sent_to_vendor',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  poNumber: string;

  @Column({ nullable: true })
  purchaseRequisitionId: number;

  @ManyToOne(() => PurchaseRequisition, { nullable: true, eager: false })
  @JoinColumn({ name: 'purchaseRequisitionId' })
  purchaseRequisition: PurchaseRequisition;

  @Column()
  vendorId: number;

  @ManyToOne(() => Vendor, { eager: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ type: 'varchar', default: PoStatus.CREATED })
  status: PoStatus;

  @Column({ type: 'real', default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  deliveryAddress: string;

  @Column({ nullable: true })
  expectedDeliveryDate: Date;

  @Column({ nullable: true })
  paymentTerms: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => PoItem, (item) => item.purchaseOrder, { cascade: true, eager: true })
  items: PoItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
