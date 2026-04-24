/**
 * 部门映射实体
 * V4.0新增: 企微部门与CRM部门的映射关系
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('wecom_department_mappings')
@Unique('UQ_wdm_tenant_config_dept', ['tenantId', 'wecomConfigId', 'wecomDeptId'])
@Index('IDX_wdm_tenant_config', ['tenantId', 'wecomConfigId'])
export class WecomDepartmentMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int' })
  wecomConfigId: number;

  @Column({ name: 'wecom_dept_id', type: 'int', comment: '企微部门ID' })
  wecomDeptId: number;

  @Column({ name: 'wecom_dept_name', type: 'varchar', length: 200, nullable: true })
  wecomDeptName: string;

  @Column({ name: 'wecom_parent_id', type: 'int', nullable: true })
  wecomParentId: number;

  @Column({ name: 'crm_dept_id', type: 'varchar', length: 50, nullable: true })
  crmDeptId: string;

  @Column({ name: 'crm_dept_name', type: 'varchar', length: 200, nullable: true })
  crmDeptName: string;

  @Column({ name: 'member_count', type: 'int', default: 0 })
  memberCount: number;

  @Column({ name: 'last_sync_time', type: 'datetime', nullable: true })
  lastSyncTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

