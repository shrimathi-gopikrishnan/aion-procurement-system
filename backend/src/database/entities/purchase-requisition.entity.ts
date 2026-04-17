import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn, OneToMany,
} from 'typeorm';
import { MaintenanceOrder } from './maintenance-order.entity';
import { User } from './user.entity';
import { PrItem } from './pr-item.entity';

export enum PrStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONVERTED_TO_PO = 'converted_to_po',
}

export enum PrPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('purchase_requisitions')
export class PurchaseRequisition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  prNumber: string;

  @Column({ nullable: true })
  maintenanceOrderId: number;

  @ManyToOne(() => MaintenanceOrder, { nullable: true, eager: false })
  @JoinColumn({ name: 'maintenanceOrderId' })
  maintenanceOrder: MaintenanceOrder;

  @Column({ type: 'varchar', default: PrStatus.DRAFT })
  status: PrStatus;

  @Column({ type: 'varchar', default: PrPriority.MEDIUM })
  priority: PrPriority;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ type: 'text', nullable: true })
  aiDraftNotes: string;

  @Column({ nullable: true })
  requiredByDate: Date;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ default: 1 })
  version: number;

  @OneToMany(() => PrItem, (item) => item.purchaseRequisition, { cascade: true, eager: true })
  items: PrItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
