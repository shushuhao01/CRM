import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('sender_addresses')
@Index('idx_sender_addresses_tenant_type', ['tenantId', 'type'])
@Index('idx_sender_addresses_tenant_default', ['tenantId', 'type', 'isDefault'])
export class SenderAddress {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ type: 'varchar', length: 20, default: 'sender', comment: '类型: sender=寄件人, return=退货地址' })
  type!: string;

  @Column({ type: 'varchar', length: 50, comment: '联系人姓名' })
  name!: string;

  @Column({ type: 'varchar', length: 20, comment: '联系电话' })
  phone!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '省' })
  province?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '市' })
  city?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '区' })
  district?: string;

  @Column({ type: 'varchar', length: 500, comment: '详细地址' })
  address!: string;

  @Column({ name: 'full_address', type: 'varchar', length: 600, nullable: true, comment: '完整地址(省市区+详细)' })
  fullAddress?: string;

  @Column({ name: 'is_default', type: 'tinyint', default: 0, comment: '是否默认: 0否 1是' })
  isDefault!: number;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder!: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;

  @Column({ name: 'linked_service_types', type: 'json', nullable: true, comment: '关联售后类型(退货地址用): ["return","exchange"]' })
  linkedServiceTypes?: string[];

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人' })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

