import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn,
} from 'typeorm';
import { MaintenanceOrder } from './maintenance-order.entity';
import { User } from './user.entity';

@Entity('decisions')
export class Decision {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  maintenanceOrderId: number;

  @ManyToOne(() => MaintenanceOrder, { eager: false })
  @JoinColumn({ name: 'maintenanceOrderId' })
  maintenanceOrder: MaintenanceOrder;

  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  aiRationale: string;

  @Column({ type: 'real', default: 0 })
  aiConfidence: number;

  @Column({ nullable: true })
  decidedById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'decidedById' })
  decidedBy: User;

  @Column({ default: false })
  isAiSuggested: boolean;

  @Column({ default: false })
  isHumanOverride: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
