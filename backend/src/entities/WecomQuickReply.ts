/**
 * 企微快捷回复实体
 * Phase 5: 微信客服增强 — 快捷回复库
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_quick_replies')
export class WecomQuickReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'category', type: 'varchar', length: 50, default: 'enterprise', comment: '类别: enterprise(企业)/personal(个人)' })
  category: string;

  @Column({ name: 'group_name', type: 'varchar', length: 100, nullable: true, comment: '分组名称' })
  groupName: string;

  @Column({ type: 'varchar', length: 200, comment: '快捷回复标题' })
  title: string;

  @Column({ type: 'text', comment: '回复内容' })
  content: string;

  @Column({ name: 'shortcut', type: 'varchar', length: 50, nullable: true, comment: '快捷键/关键词触发' })
  shortcut: string;

  @Column({ name: 'use_count', type: 'int', default: 0, comment: '使用次数' })
  useCount: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序序号' })
  sortOrder: number;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

