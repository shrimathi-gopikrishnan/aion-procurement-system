import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { Component } from './component.entity';
import { User } from './user.entity';

export enum DefectSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DefectStatus {
  PENDING_REVIEW = 'pending_review',
  RESUBMIT_REQUESTED = 'resubmit_requested',
  RESUBMITTED = 'resubmitted',
  REVIEWED = 'reviewed',
  LINKED_TO_MO = 'linked_to_mo',
}

@Entity('defects')
export class Defect {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  componentId: number;

  @ManyToOne(() => Component, { nullable: true, eager: false })
  @JoinColumn({ name: 'componentId' })
  component: Component;

  @Column({ nullable: true })
  aiDetectedComponent: string;

  @Column({ nullable: true })
  damageType: string;

  @Column({ type: 'varchar', nullable: true })
  severity: DefectSeverity;

  @Column({ type: 'real', default: 0 })
  aiConfidence: number;

  @Column({ nullable: true })
  aiExplanation: string;

  @Column({ nullable: true })
  aiSuggestedAction: string;

  @Column({ nullable: true })
  repairOrReplace: string;

  @Column({ nullable: true })
  repairReplaceRationale: string;

  @Column({ type: 'real', nullable: true })
  riskScore: number;

  @Column({ nullable: true })
  rulesFired: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  imagePath: string;

  @Column({ type: 'varchar', default: DefectStatus.PENDING_REVIEW })
  status: DefectStatus;

  @Column({ nullable: true })
  supervisorNotes: string;

  @Column({ nullable: true })
  resubmitReason: string;

  @Column({ nullable: true })
  resubmitRequestedAt: Date;

  @Column({ nullable: true })
  resubmitRequestedById: number;

  @Column({ nullable: true })
  completionNote: string;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
