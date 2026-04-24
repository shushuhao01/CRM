/**
 * 企微群发消息任务实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_group_broadcasts')
@Index('IDX_wgb_tenant', ['tenantId'])
export class WecomGroupBroadcast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', nullable: true })
  wecomConfigId: number;

  @Column({ name: 'task_name', type: 'varchar', length: 100 })
  taskName: string;

  @Column({ type: 'varchar', length: 20, default: 'all', comment: 'all/specified/template' })
  target: string;

  @Column({ name: 'target_desc', type: 'varchar', length: 100, nullable: true })
  targetDesc: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON attachments' })
  attachments: string;

  @Column({ name: 'content_type', type: 'varchar', length: 50, default: '文本' })
  contentType: string;

  @Column({ name: 'send_mode', type: 'varchar', length: 20, default: 'now' })
  sendMode: string;

  @Column({ name: 'scheduled_time', type: 'datetime', nullable: true })
  scheduledTime: Date;

  @Column({ type: 'varchar', length: 20, default: 'draft', comment: 'draft/pending/sent/failed/cancelled' })
  status: string;

  @Column({ name: 'target_count', type: 'int', default: 0 })
  targetCount: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'fail_count', type: 'int', default: 0 })
  failCount: number;

  @Column({ name: 'specified_groups', type: 'text', nullable: true })
  specifiedGroups: string;

  @Column({ name: 'specified_templates', type: 'text', nullable: true })
  specifiedTemplates: string;

  @Column({ name: 'detail_results', type: 'text', nullable: true, comment: 'JSON array of per-group results' })
  detailResults: string;

  @Column({ name: 'wecom_msg_id', type: 'varchar', length: 100, nullable: true })
  wecomMsgId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

