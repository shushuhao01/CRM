/**
 * 企微群模板实体
 * V4.0新增: 群模板管理，支持群名前缀、欢迎语、防骚扰规则等模板配置
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_group_templates')
@Index('IDX_wgt_tenant_config', ['tenantId', 'wecomConfigId'])
export class WecomGroupTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int' })
  wecomConfigId: number;

  @Column({ name: 'template_name', type: 'varchar', length: 100 })
  templateName: string;

  @Column({ name: 'group_name_prefix', type: 'varchar', length: 100, nullable: true })
  groupNamePrefix: string;

  @Column({ name: 'max_members', type: 'int', default: 200 })
  maxMembers: number;

  @Column({ name: 'owner_user_id', type: 'varchar', length: 100, nullable: true })
  ownerUserId: string;

  @Column({ name: 'welcome_enabled', type: 'boolean', default: false })
  welcomeEnabled: boolean;

  @Column({ name: 'welcome_text', type: 'text', nullable: true })
  welcomeText: string;

  @Column({ name: 'welcome_media_type', type: 'varchar', length: 20, default: 'none' })
  welcomeMediaType: string;

  @Column({ name: 'welcome_media_content', type: 'text', nullable: true, comment: 'JSON' })
  welcomeMediaContent: string;

  @Column({ name: 'anti_spam_enabled', type: 'boolean', default: false })
  antiSpamEnabled: boolean;

  @Column({ name: 'anti_spam_rules', type: 'text', nullable: true, comment: 'JSON' })
  antiSpamRules: string;

  @Column({ name: 'notice_template', type: 'text', nullable: true })
  noticeTemplate: string;

  @Column({ name: 'auto_tags', type: 'text', nullable: true, comment: 'JSON' })
  autoTags: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

