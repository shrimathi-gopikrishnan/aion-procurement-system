import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ApprovalEntityType {
  DEFECT = 'defect',
  MAINTENANCE_ORDER = 'maintenance_order',
  PURCHASE_REQUISITION = 'purchase_requisition',
  PURCHASE_ORDER = 'purchase_order',
  VENDOR_SELECTION = 'vendor_selection',
  INVOICE = 'invoice',
}

@Entity('approvals')
@Index(['entityType', 'entityId'])
export class Approval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityType: ApprovalEntityType;

  @Column()
  entityId: number;

  @Column({ nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ type: 'varchar', default: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ nullable: true })
  previousState: string;

  @Column({ nullable: true })
  newState: string;

  @CreateDateColumn()
  createdAt: Date;
}
