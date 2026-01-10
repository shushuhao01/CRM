import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('licenses')
export class License {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'license_key', type: 'varchar', length: 255, unique: true })
  licenseKey!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 100 })
  customerName!: string;

  @Column({ name: 'customer_contact', type: 'varchar', length: 100, nullable: true })
  customerContact?: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 20, nullable: true })
  customerPhone?: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 100, nullable: true })
  customerEmail?: string;

  @Column({ name: 'license_type', type: 'enum', enum: ['trial', 'perpetual', 'annual', 'monthly'], default: 'trial' })
  licenseType!: string;

  @Column({ name: 'max_users', type: 'int', default: 10 })
  maxUsers!: number;

  @Column({ name: 'max_storage_gb', type: 'int', default: 5 })
  maxStorageGb!: number;

  @Column({ type: 'json', nullable: true })
  features?: string[];

  @Column({ name: 'machine_id', type: 'varchar', length: 255, nullable: true })
  machineId?: string;

  @Column({ type: 'enum', enum: ['active', 'expired', 'revoked', 'pending'], default: 'pending' })
  status!: string;

  @Column({ name: 'activated_at', type: 'datetime', nullable: true })
  activatedAt?: Date;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
