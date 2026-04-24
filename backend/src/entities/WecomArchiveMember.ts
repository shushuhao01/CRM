/**
 * 存档生效成员实体
 * 记录哪些企微账号被纳入会话存档范围
 * 收费以企微账号数量为准(非CRM成员数)
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_archive_members')
@Index('IDX_wecom_am_tenant_user', ['tenantId', 'wecomUserId'], { unique: true })
export class WecomArchiveMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 50, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_user_id', type: 'varchar', length: 100, comment: '企微成员userId' })
  wecomUserId: string;

  @Column({ name: 'wecom_user_name', type: 'varchar', length: 200, nullable: true, comment: '成员名称(冗余)' })
  wecomUserName: string;

  @Column({ name: 'crm_user_id', type: 'varchar', length: 50, nullable: true, comment: '关联CRM用户ID' })
  crmUserId: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用存档' })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '加入时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

