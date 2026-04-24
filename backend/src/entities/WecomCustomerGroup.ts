/**
 * 企微客户群实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_customer_groups')
@Index('IDX_wecom_cg_config_chat', ['wecomConfigId', 'chatId'], { unique: true })
@Index('IDX_wecom_cg_tenant', ['tenantId'])
@Index('IDX_wecom_cg_owner', ['ownerUserId'])
export class WecomCustomerGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'chat_id', type: 'varchar', length: 100, comment: '群聊ID' })
  chatId: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '群名称' })
  name: string;

  @Column({ name: 'owner_user_id', type: 'varchar', length: 100, nullable: true, comment: '群主UserID' })
  ownerUserId: string;

  @Column({ name: 'owner_user_name', type: 'varchar', length: 100, nullable: true, comment: '群主姓名' })
  ownerUserName: string;

  @Column({ name: 'member_count', type: 'int', default: 0, comment: '群成员数量' })
  memberCount: number;

  @Column({ name: 'today_msg_count', type: 'int', default: 0, comment: '今日消息数' })
  todayMsgCount: number;

  @Column({ type: 'text', nullable: true, comment: '群公告' })
  notice: string;

  @Column({ name: 'create_time', type: 'datetime', nullable: true, comment: '群创建时间' })
  createTime: Date;

  @Column({ type: 'varchar', length: 20, default: 'normal', comment: '状态: normal/dismissed' })
  status: string;

  @Column({ name: 'member_list', type: 'text', nullable: true, comment: '群成员列表(JSON)' })
  memberList: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

