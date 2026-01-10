/**
 * 企微客户信息实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_customers')
export class WecomCustomer {
  @PrimaryGeneratedColumn()
  id: number;

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

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
