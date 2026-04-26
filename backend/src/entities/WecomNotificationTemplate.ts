/**
 * 企微服务商应用通知模板配置实体
 * 存储企微服务商后台申请的消息通知模板ID，用于向授权企业推送应用通知
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_notification_templates')
export class WecomNotificationTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id', type: 'varchar', length: 200, nullable: false, comment: '企微消息模板ID' })
  templateId: string;

  @Column({ name: 'template_name', type: 'varchar', length: 200, nullable: false, comment: '模板名称(自定义标签)' })
  templateName: string;

  @Column({ name: 'template_type', type: 'varchar', length: 50, nullable: false, comment: '模板类型: order/customer/follow_up/payment/custom' })
  templateType: string;

  @Column({ name: 'description', type: 'text', nullable: true, comment: '模板用途描述' })
  description: string;

  @Column({ name: 'template_content', type: 'text', nullable: true, comment: '模板内容/变量说明(JSON)' })
  templateContent: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
