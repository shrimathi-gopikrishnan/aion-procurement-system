import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceipt } from './goods-receipt.entity';
import { User } from './user.entity';

export enum InvoiceStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  EXCEPTION = 'exception',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ nullable: true })
  vendorInvoiceNumber: string;

  @Column()
  purchaseOrderId: number;

  @ManyToOne(() => PurchaseOrder, { eager: true })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Column({ nullable: true })
  goodsReceiptId: number;

  @ManyToOne(() => GoodsReceipt, { nullable: true, eager: true })
  @JoinColumn({ name: 'goodsReceiptId' })
  goodsReceipt: GoodsReceipt;

  @Column({ type: 'real' })
  amount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  invoiceDate: Date;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ type: 'varchar', default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Column({ nullable: true })
  matchNotes: string;

  @Column({ nullable: true })
  exceptionReason: string;

  @Column({ nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
