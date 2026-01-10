/**
 * 企微会话存档记录实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_chat_records')
@Index(['corpId', 'msgId'], { unique: true })
@Index(['corpId', 'fromUserId'])
export class WecomChatRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, comment: '企业ID' })
  corpId: string;

  @Column({ name: 'msg_id', type: 'varchar', length: 100, comment: '消息ID' })
  msgId: string;

  @Column({ name: 'msg_type', type: 'varchar', length: 50, comment: '消息类型' })
  msgType: string;

  @Column({ type: 'varchar', length: 20, comment: '消息动作: send/recall/switch' })
  action: string;

  @Column({ name: 'from_user_id', type: 'varchar', length: 100, comment: '发送者ID' })
  fromUserId: string;

  @Column({ name: 'from_user_name', type: 'varchar', length: 100, nullable: true, comment: '发送者姓名' })
  fromUserName: string;

  @Column({ name: 'to_user_ids', type: 'text', nullable: true, comment: '接收者ID列表(JSON)' })
  toUserIds: string;

  @Column({ name: 'room_id', type: 'varchar', length: 100, nullable: true, comment: '群聊ID' })
  roomId: string;

  @Column({ name: 'msg_time', type: 'bigint', comment: '消息时间戳(毫秒)' })
  msgTime: number;

  @Column({ type: 'text', nullable: true, comment: '消息内容(JSON)' })
  content: string;

  @Column({ name: 'media_key', type: 'varchar', length: 255, nullable: true, comment: '媒体文件ID' })
  mediaKey: string;

  @Column({ name: 'media_url', type: 'varchar', length: 500, nullable: true, comment: '媒体文件URL' })
  mediaUrl: string;

  @Column({ name: 'audit_remark', type: 'text', nullable: true, comment: '质检备注' })
  auditRemark: string;

  @Column({ name: 'audit_by', type: 'varchar', length: 50, nullable: true, comment: '质检人' })
  auditBy: string;

  @Column({ name: 'audit_time', type: 'datetime', nullable: true, comment: '质检时间' })
  auditTime: Date;

  @Column({ name: 'is_sensitive', type: 'boolean', default: false, comment: '是否标记敏感' })
  isSensitive: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;
}
