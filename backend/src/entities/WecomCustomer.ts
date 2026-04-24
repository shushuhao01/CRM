/**
 * 企微客户信息实体
 * V2.0: 新增标签名称、手机号、渠道来源、消息统计等字段
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_customers')
@Index('IDX_wecom_customers_config_external', ['wecomConfigId', 'externalUserId'], { unique: true })
@Index('IDX_wecom_customers_config_follow_status', ['wecomConfigId', 'followUserId', 'status'])
@Index('IDX_wecom_customers_config_addtime', ['wecomConfigId', 'addTime'])
@Index('IDX_wecom_customers_tenant', ['tenantId'])
export class WecomCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, comment: '企业ID' })
  corpId: string;

  @Column({ name: 'external_user_id', type: 'varchar', length: 100, comment: '外部联系人UserID' })
  externalUserId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '客户昵称' })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '客户头像' })
  avatar: string;

  @Column({ type: 'int', default: 1, comment: '客户类型: 1=微信用户 2=企业微信用户' })
  type: number;

  @Column({ type: 'int', default: 0, comment: '性别: 0=未知 1=男 2=女' })
  gender: number;

  @Column({ name: 'corp_name', type: 'varchar', length: 200, nullable: true, comment: '企业名称(企微用户)' })
  corpName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '职位(企微用户)' })
  position: string;

  @Column({ name: 'follow_user_id', type: 'varchar', length: 100, nullable: true, comment: '添加此客户的成员UserID' })
  followUserId: string;

  @Column({ name: 'follow_user_name', type: 'varchar', length: 100, nullable: true, comment: '添加此客户的成员姓名' })
  followUserName: string;

  @Column({ name: 'follow_users', type: 'text', nullable: true, comment: '所有跟进人信息(JSON数组)，包含完整的follow_user列表' })
  followUsers: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '成员对客户的备注' })
  remark: string;

  @Column({ type: 'text', nullable: true, comment: '成员对客户的描述' })
  description: string;

  @Column({ name: 'add_time', type: 'datetime', nullable: true, comment: '添加时间' })
  addTime: Date;

  @Column({ name: 'add_way', type: 'int', nullable: true, comment: '添加方式' })
  addWay: number;

  @Column({ name: 'tag_ids', type: 'text', nullable: true, comment: '客户标签ID列表(JSON)' })
  tagIds: string;

  @Column({ type: 'varchar', length: 20, default: 'normal', comment: '状态: normal/deleted' })
  status: string;

  @Column({ name: 'delete_time', type: 'datetime', nullable: true, comment: '删除时间' })
  deleteTime: Date;

  @Column({ name: 'crm_customer_id', type: 'varchar', length: 50, nullable: true, comment: '关联的CRM客户ID' })
  crmCustomerId: string;

  @Column({ name: 'is_dealt', type: 'boolean', default: false, comment: '是否已成交' })
  isDealt: boolean;

  @Column({ name: 'last_chat_time', type: 'datetime', nullable: true, comment: '最后聊天时间' })
  lastChatTime: Date;

  // ==================== V2.0 新增字段 ====================

  @Column({ name: 'tag_names', type: 'text', nullable: true, comment: '客户标签名称列表(JSON)' })
  tagNames: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true, comment: '手机号' })
  phone: string;

  @Column({ name: 'state', type: 'varchar', length: 100, nullable: true, comment: '渠道来源标识' })
  state: string;

  @Column({ name: 'msg_sent_count', type: 'int', default: 0, comment: '发送消息数(同步时统计)' })
  msgSentCount: number;

  @Column({ name: 'msg_recv_count', type: 'int', default: 0, comment: '接收消息数(同步时统计)' })
  msgRecvCount: number;

  @Column({ name: 'last_msg_time', type: 'bigint', nullable: true, comment: '最后消息时间戳' })
  lastMsgTime: number;

  @Column({ name: 'active_days_7d', type: 'int', default: 0, comment: '近7天活跃天数' })
  activeDays7d: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
