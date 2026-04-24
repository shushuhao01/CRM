/**
 * 话术实体
 * V4.0新增: 话术库管理，支持快捷短语、附件和AI改写
 * V5.0增强: 支持个人/公共话术，颜色标识，排序
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_scripts')
@Index('IDX_ws_tenant_category', ['tenantId', 'categoryId'])
@Index('IDX_ws_created_by', ['createdBy'])
export class WecomScript {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '快捷短语' })
  shortcut: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON附件列表' })
  attachments: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON标签' })
  tags: string;

  @Column({ type: 'varchar', length: 20, default: 'public', comment: 'public=全员可见 personal=仅自己' })
  scope: string;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true, comment: '创建人用户ID' })
  createdBy: string;

  @Column({ name: 'created_by_name', type: 'varchar', length: 100, nullable: true })
  createdByName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '颜色标识' })
  color: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;

  @Column({ name: 'ai_rewrite_enabled', type: 'boolean', default: false })
  aiRewriteEnabled: boolean;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
