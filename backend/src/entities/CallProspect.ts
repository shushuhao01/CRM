import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('call_prospects')
@Index('idx_prospect_tenant_phone', ['tenantId', 'phone'], { unique: true })
@Index('idx_prospect_tenant_status', ['tenantId', 'status'])
@Index('idx_prospect_tenant_assigned', ['tenantId', 'assignedTo'])
export class CallProspect {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 100, comment: '姓名' })
  name: string;

  @Column({ type: 'varchar', length: 20, comment: '手机号' })
  phone: string;

  @Column({ type: 'varchar', length: 10, nullable: true, comment: '性别' })
  gender: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '公司' })
  company: string | null;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '来源：manual/excel/other' })
  source: string | null;

  @Column({ type: 'json', nullable: true, comment: '标签' })
  tags: string[] | null;

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: '状态：pending/called/converted/invalid' })
  status: string;

  @Column({ name: 'call_count', type: 'int', default: 0, comment: '外呼次数' })
  callCount: number;

  @Column({ name: 'last_call_time', type: 'datetime', nullable: true, comment: '最后外呼时间' })
  lastCallTime: Date | null;

  @Column({ name: 'last_call_status', type: 'varchar', length: 20, nullable: true, comment: '最后外呼结果' })
  lastCallStatus: string | null;

  @Column({ name: 'assigned_to', type: 'varchar', length: 36, nullable: true, comment: '分配给（销售员ID）' })
  assignedTo: string | null;

  @Column({ name: 'assigned_name', type: 'varchar', length: 100, nullable: true, comment: '分配给（姓名）' })
  assignedName: string | null;

  @Column({ name: 'converted_customer_id', type: 'varchar', length: 36, nullable: true, comment: '转入后的客户ID' })
  convertedCustomerId: string | null;

  @Column({ name: 'converted_at', type: 'datetime', nullable: true, comment: '转入时间' })
  convertedAt: Date | null;

  @Column({ name: 'import_batch_id', type: 'varchar', length: 36, nullable: true, comment: '导入批次号' })
  importBatchId: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true, comment: '创建人ID' })
  createdBy: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 100, nullable: true, comment: '创建人姓名' })
  createdByName: string | null;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true, comment: '删除时间（软删除）' })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
