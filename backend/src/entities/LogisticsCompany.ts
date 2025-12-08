import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('logistics_companies')
export class LogisticsCompany {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'short_name', type: 'varchar', length: 50, nullable: true })
  shortName?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  website?: string;

  @Column({ name: 'tracking_url', type: 'varchar', length: 500, nullable: true })
  trackingUrl?: string;

  @Column({ name: 'api_url', type: 'varchar', length: 500, nullable: true })
  apiUrl?: string;

  @Column({ name: 'api_key', type: 'varchar', length: 200, nullable: true })
  apiKey?: string;

  @Column({ name: 'api_secret', type: 'varchar', length: 200, nullable: true })
  apiSecret?: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 100, nullable: true })
  contactEmail?: string;

  @Column({ name: 'service_area', type: 'text', nullable: true })
  serviceArea?: string;

  @Column({ name: 'price_info', type: 'json', nullable: true })
  priceInfo?: Record<string, unknown>;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status!: 'active' | 'inactive';

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
