import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { VendorItem } from './vendor-item.entity';

export enum VendorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLACKLISTED = 'blacklisted',
  PENDING_APPROVAL = 'pending_approval',
}

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'real', default: 3.0 })
  rating: number;

  @Column({ type: 'real', default: 0.8 })
  reliabilityScore: number;

  @Column({ type: 'real', default: 0 })
  onTimeDeliveryRate: number;

  @Column({ type: 'real', default: 0 })
  qualityScore: number;

  @Column({ type: 'varchar', default: VendorStatus.ACTIVE })
  status: VendorStatus;

  @Column({ default: false })
  isPreferred: boolean;

  @Column({ nullable: true })
  paymentTerms: string;

  @OneToMany(() => VendorItem, (vi) => vi.vendor, { cascade: true, eager: true })
  items: VendorItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
