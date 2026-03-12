import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_code', length: 100, unique: true, comment: '模板代码' })
  templateCode: string;

  @Column({ name: 'template_name', length: 200, comment: '模板名称' })
  templateName: string;

  @Column({ name: 'template_type', length: 50, comment: '模板类型: email/sms/both' })
  templateType: 'email' | 'sms' | 'both';

  @Column({ length: 50, comment: '业务分类' })
  category: string;

  @Column({ length: 100, comment: '使用场景' })
  scene: string;

  @Column({ name: 'email_subject', length: 200, nullable: true, comment: '邮件主题' })
  emailSubject?: string;

  @Column({ name: 'email_content', type: 'text', nullable: true, comment: '邮件内容' })
  emailContent?: string;

  @Column({ name: 'sms_content', length: 500, nullable: true, comment: '短信内容' })
  smsContent?: string;

  @Column({ name: 'sms_template_code', length: 100, nullable: true, comment: '短信服务商模板代码' })
  smsTemplateCode?: string;

  @Column({ type: 'json', nullable: true, comment: '可用变量列表' })
  variables?: Record<string, string>;

  @Column({ name: 'variable_description', type: 'text', nullable: true, comment: '变量说明文档' })
  variableDescription?: string;

  @Column({ name: 'is_enabled', type: 'tinyint', default: 1, comment: '是否启用' })
  isEnabled: number;

  @Column({ name: 'is_system', type: 'tinyint', default: 0, comment: '是否系统模板' })
  isSystem: number;

  @Column({ length: 20, default: 'normal', comment: '优先级' })
  priority: 'low' | 'normal' | 'high' | 'urgent';

  @Column({ name: 'send_email', type: 'tinyint', default: 1, comment: '是否发送邮件' })
  sendEmail: number;

  @Column({ name: 'send_sms', type: 'tinyint', default: 0, comment: '是否发送短信' })
  sendSms: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
