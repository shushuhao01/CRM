/**
 * 话术分类实体
 * V4.0新增，V5.0增强: 支持颜色、创建人、公共/个人分类
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_script_categories')
@Index('IDX_wsc_tenant', ['tenantId'])
export class WecomScriptCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '分组颜色' })
  color: string;

  @Column({ type: 'varchar', length: 20, default: 'public', comment: 'public/personal' })
  scope: string;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
