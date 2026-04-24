/**
 * 企微客户事件实体
 * V4.0新增: 记录客户生命周期事件（添加/删除/标签/入群/离群/CRM关联等）
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_customer_events')
@Index('IDX_wce_tenant_external_time', ['tenantId', 'externalUserId', 'eventTime'])
export class WecomCustomerEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int' })
  wecomConfigId: number;

  @Column({ name: 'external_user_id', type: 'varchar', length: 100 })
  externalUserId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 30, comment: 'add/delete/tag/link/group_join/group_leave/crm_link' })
  eventType: string;

  @Column({ name: 'event_detail', type: 'text', nullable: true, comment: 'JSON' })
  eventDetail: string;

  @Column({ name: 'operator_id', type: 'varchar', length: 100, nullable: true })
  operatorId: string;

  @Column({ name: 'event_time', type: 'datetime' })
  eventTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

