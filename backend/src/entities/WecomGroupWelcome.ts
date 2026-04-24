/**
 * 企微入群欢迎语实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_group_welcomes')
@Index('IDX_wgw_tenant', ['tenantId'])
export class WecomGroupWelcome {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', nullable: true })
  wecomConfigId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'all', comment: 'all/specified/template' })
  scope: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'media_type', type: 'varchar', length: 20, default: 'none' })
  mediaType: string;

  @Column({ name: 'link_title', type: 'varchar', length: 200, nullable: true })
  linkTitle: string;

  @Column({ name: 'link_url', type: 'varchar', length: 500, nullable: true })
  linkUrl: string;

  @Column({ name: 'specified_groups', type: 'text', nullable: true, comment: 'JSON array of chatIds' })
  specifiedGroups: string;

  @Column({ name: 'specified_templates', type: 'text', nullable: true, comment: 'JSON array of template IDs' })
  specifiedTemplates: string;

  @Column({ name: 'wecom_template_id', type: 'varchar', length: 100, nullable: true, comment: '企微欢迎语模板ID' })
  wecomTemplateId: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

