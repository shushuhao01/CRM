import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('private_customers')
export class PrivateCustomer {
  @PrimaryColumn('varchar', { length: 36 })
  id: string = uuidv4();

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 100, nullable: true })
  contactPerson: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 100, nullable: true })
  contactEmail: string;

  @Column({ name: 'company_address', type: 'varchar', length: 500, nullable: true })
  companyAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string;

  @Column({ name: 'company_size', type: 'varchar', length: 50, nullable: true })
  companySize: string;

  @Column({ name: 'deployment_type', type: 'varchar', length: 50, default: 'on-premise' })
  deploymentType: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 虚拟字段：当前授权信息（不存储在数据库）
  currentLicense?: any;

  // 虚拟字段：授权数量
  licenseCount?: number;
}
