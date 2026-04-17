import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { Defect } from './defect.entity';
import { User } from './user.entity';

export enum MoStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum MoAction {
  REPAIR = 'repair',
  REPLACE = 'replace',
  PENDING = 'pending',
}

@Entity('maintenance_orders')
export class MaintenanceOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  moNumber: string;

  @Column({ nullable: true })
  defectId: number;

  @ManyToOne(() => Defect, { nullable: true, eager: false })
  @JoinColumn({ name: 'defectId' })
  defect: Defect;

  @Column({ type: 'varchar', default: MoStatus.DRAFT })
  status: MoStatus;

  @Column({ type: 'varchar', default: MoAction.PENDING })
  action: MoAction;

  @Column({ nullable: true })
  actionReason: string;

  @Column({ nullable: true })
  plannedWork: string;

  @Column({ nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  workflowState: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
