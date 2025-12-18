import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 客服权限配置实体
 * 用于存储客服人员的权限配置
 */
@Entity('customer_service_permissions')
export class CustomerServicePermission {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { name: 'user_id', length: 50, unique: true })
  userId: string;

  @Column('varchar', { name: 'customer_service_type', length: 30, default: 'general' })
  customerServiceType: string;

  @Column('varchar', { name: 'data_scope', length: 20, default: 'self' })
  dataScope: string;

  @Column('json', { name: 'department_ids', nullable: true })
  departmentIds: string[] | null;

  @Column('json', { name: 'custom_permissions', nullable: true })
  customPermissions: string[] | null;

  @Column('varchar', { name: 'permission_template', length: 50, nullable: true })
  permissionTemplate: string | null;

  @Column('enum', { enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Column('text', { nullable: true })
  remark: string | null;

  @Column('varchar', { name: 'created_by', length: 50, nullable: true })
  createdBy: string | null;

  @Column('varchar', { name: 'created_by_name', length: 50, nullable: true })
  createdByName: string | null;

  @Column('varchar', { name: 'updated_by', length: 50, nullable: true })
  updatedBy: string | null;

  @Column('varchar', { name: 'updated_by_name', length: 50, nullable: true })
  updatedByName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
