/**
 * 质检记录实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_quality_inspections')
@Index('IDX_wecom_qi_tenant', ['tenantId'])
@Index('IDX_wecom_qi_status', ['status'])
@Index('IDX_wecom_qi_from_user', ['fromUserId'])
@Index('IDX_wecom_qi_inspected', ['inspectedAt'])
export class WecomQualityInspection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'session_key', type: 'varchar', length: 200, nullable: true, comment: '会话标识' })
  sessionKey: string;

  @Column({ name: 'from_user_id', type: 'varchar', length: 100, nullable: true, comment: '员工UserID' })
  fromUserId: string;

  @Column({ name: 'from_user_name', type: 'varchar', length: 100, nullable: true, comment: '员工姓名' })
  fromUserName: string;

  @Column({ name: 'to_user_id', type: 'varchar', length: 100, nullable: true, comment: '对方UserID' })
  toUserId: string;

  @Column({ name: 'to_user_name', type: 'varchar', length: 100, nullable: true, comment: '对方姓名' })
  toUserName: string;

  @Column({ name: 'room_id', type: 'varchar', length: 100, nullable: true, comment: '群聊ID(群聊场景)' })
  roomId: string;

  @Column({ name: 'message_count', type: 'int', default: 0, comment: '消息数量' })
  messageCount: number;

  @Column({ name: 'start_time', type: 'datetime', nullable: true, comment: '会话开始时间' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true, comment: '会话结束时间' })
  endTime: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: '状态: pending/normal/excellent/violation' })
  status: string;

  @Column({ name: 'violation_type', type: 'text', nullable: true, comment: '违规类型(JSON数组)' })
  violationType: string;

  @Column({ type: 'int', nullable: true, comment: '质检评分(0-100)' })
  score: number;

  @Column({ type: 'text', nullable: true, comment: '质检备注' })
  remark: string;

  @Column({ name: 'inspector_id', type: 'varchar', length: 50, nullable: true, comment: '质检员ID' })
  inspectorId: string;

  @Column({ name: 'inspector_name', type: 'varchar', length: 100, nullable: true, comment: '质检员姓名' })
  inspectorName: string;

  @Column({ name: 'inspected_at', type: 'datetime', nullable: true, comment: '质检时间' })
  inspectedAt: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;
}

