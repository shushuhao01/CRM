import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('license_logs')
export class LicenseLog {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'license_id', type: 'varchar', length: 36, nullable: true })
  licenseId?: string;

  @Column({ name: 'license_key', type: 'varchar', length: 255, nullable: true })
  licenseKey?: string;

  @Column({ type: 'enum', enum: ['verify', 'activate', 'renew', 'revoke', 'expire'] })
  action!: string;

  @Column({ name: 'machine_id', type: 'varchar', length: 255, nullable: true })
  machineId?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'enum', enum: ['success', 'failed'] })
  result!: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
