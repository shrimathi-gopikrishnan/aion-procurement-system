import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn, OneToMany,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';
import { GrnItem } from './grn-item.entity';

export enum GrnStatus {
  DRAFT = 'draft',
  COMPLETE = 'complete',
  PARTIAL = 'partial',
  OVER_RECEIVED = 'over_received',
  EXCEPTION = 'exception',
}

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  grnNumber: string;

  @Column()
  purchaseOrderId: number;

  @ManyToOne(() => PurchaseOrder, { eager: true })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Column({ type: 'varchar', default: GrnStatus.DRAFT })
  status: GrnStatus;

  @Column({ nullable: true })
  deliveryNote: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  receivedById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'receivedById' })
  receivedBy: User;

  @Column({ nullable: true })
  receivedAt: Date;

  @OneToMany(() => GrnItem, (item) => item.goodsReceipt, { cascade: true, eager: true })
  items: GrnItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
