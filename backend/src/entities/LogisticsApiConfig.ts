import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('logistics_api_configs')
export class LogisticsApiConfig {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'company_code', type: 'varchar', length: 50, unique: true })
  companyCode!: string;

  @Column({ name: 'company_name', type: 'varchar', length: 100 })
  companyName!: string;

  @Column({ name: 'app_id', type: 'varchar', length: 200, nullable: true })
  appId?: string;

  @Column({ name: 'app_key', type: 'varchar', length: 200, nullable: true })
  appKey?: string;

  @Column({ name: 'app_secret', type: 'varchar', length: 500, nullable: true })
  appSecret?: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 200, nullable: true })
  customerId?: string;

  @Column({ name: 'api_url', type: 'varchar', length: 500, nullable: true })
  apiUrl?: string;

  @Column({ name: 'api_environment', type: 'enum', enum: ['sandbox', 'production'], default: 'sandbox' })
  apiEnvironment!: 'sandbox' | 'production';

  @Column({ name: 'extra_config', type: 'json', nullable: true })
  extraConfig?: Record<string, unknown>;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ name: 'last_test_time', type: 'datetime', nullable: true })
  lastTestTime?: Date;

  @Column({ name: 'last_test_result', type: 'tinyint', nullable: true })
  lastTestResult?: number;

  @Column({ name: 'last_test_message', type: 'varchar', length: 500, nullable: true })
  lastTestMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 50, nullable: true })
  updatedBy?: string;
}
