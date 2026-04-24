/**
 * 企微客服会话记录实体
 * Phase 5: 微信客服增强
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_kf_sessions')
export class WecomKfSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'open_kf_id', type: 'varchar', length: 100, comment: '客服账号ID' })
  openKfId: string;

  @Column({ name: 'external_userid', type: 'varchar', length: 100, comment: '客户external_userid' })
  externalUserid: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true, comment: '客户名称' })
  customerName: string;

  @Column({ name: 'servicer_userid', type: 'varchar', length: 100, nullable: true, comment: '接待人员userid' })
  servicerUserid: string;

  @Column({ name: 'servicer_name', type: 'varchar', length: 200, nullable: true, comment: '接待人员名称' })
  servicerName: string;

  @Column({ name: 'session_status', type: 'varchar', length: 20, default: 'open', comment: '会话状态: open/closed/timeout' })
  sessionStatus: string;

  @Column({ name: 'msg_count', type: 'int', default: 0, comment: '消息总数' })
  msgCount: number;

  @Column({ name: 'first_response_time', type: 'int', nullable: true, comment: '首次响应时长(秒)' })
  firstResponseTime: number;

  @Column({ name: 'avg_response_time', type: 'int', nullable: true, comment: '平均响应时长(秒)' })
  avgResponseTime: number;

  @Column({ name: 'satisfaction', type: 'tinyint', nullable: true, comment: '满意度评分(1-5)' })
  satisfaction: number;

  @Column({ name: 'last_msg_content', type: 'text', nullable: true, comment: '最后一条消息内容' })
  lastMsgContent: string;

  @Column({ name: 'last_msg_time', type: 'datetime', nullable: true, comment: '最后消息时间' })
  lastMsgTime: Date;

  @Column({ name: 'session_start_time', type: 'datetime', nullable: true, comment: '会话开始时间' })
  sessionStartTime: Date;

  @Column({ name: 'session_end_time', type: 'datetime', nullable: true, comment: '会话结束时间' })
  sessionEndTime: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

