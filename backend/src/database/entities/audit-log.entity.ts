import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityType: string;

  @Column()
  entityId: number;

  @Column()
  action: string;

  @Column({ nullable: true })
  fromState: string;

  @Column({ nullable: true })
  toState: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column({ nullable: true })
  performedById: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
