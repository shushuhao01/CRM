import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('outsource_companies')
export class OutsourceCompany {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { length: 200, name: 'company_name' })
  companyName: string;

  @Column('varchar', { length: 50, nullable: true, name: 'contact_person' })
  contactPerson: string | null;

  @Column('varchar', { length: 20, nullable: true, name: 'contact_phone' })
  contactPhone: string | null;

  @Column('varchar', { length: 100, nullable: true, name: 'contact_email' })
  contactEmail: string | null;

  @Column('varchar', { length: 500, nullable: true })
  address: string | null;

  @Column('varchar', { length: 20, default: 'active' })
  status: string;

  @Column('int', { default: 999, name: 'sort_order' })
  sortOrder: number;

  @Column('tinyint', { default: 0, name: 'is_default' })
  isDefault: number;

  @Column('int', { default: 0, name: 'total_orders' })
  totalOrders: number;

  @Column('int', { default: 0, name: 'valid_orders' })
  validOrders: number;

  @Column('int', { default: 0, name: 'invalid_orders' })
  invalidOrders: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, name: 'total_amount' })
  totalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, name: 'settled_amount' })
  settledAmount: number;

  @Column('text', { nullable: true })
  remark: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'created_by' })
  createdBy: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'created_by_name' })
  createdByName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
