/**
 * 企微服务商应用通知模板配置实体
 * 存储企微服务商后台申请的消息通知模板ID，用于向授权企业推送应用通知
 *
 * 通知范围(notifyScope):
 *  - self: 仅通知当事人(如客户的归属成员)
 *  - team: 通知当事人 + 部门经理
 *  - all:  通知当事人 + 部门经理 + 管理员
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

  @Column({ name: 'template_type', type: 'varchar', length: 50, nullable: false, comment: '模板类型: customer_delete_friend/acquisition_quota_low/member_delete_customer/abnormal_login/order_status/customer_follow_up/performance_report/custom' })
  templateType: string;

  @Column({ name: 'description', type: 'text', nullable: true, comment: '模板用途描述' })
  description: string;

  @Column({ name: 'template_content', type: 'text', nullable: true, comment: '模板内容/变量说明(JSON)' })
  templateContent: string;

  @Column({ name: 'template_variables', type: 'text', nullable: true, comment: '模板变量定义(JSON数组): [{key, label, sample}]' })
  templateVariables: string;

  @Column({ name: 'notify_scope', type: 'varchar', length: 20, default: 'all', comment: '通知范围: self(仅当事人)/team(当事人+部门经理)/all(当事人+部门经理+管理员)' })
  notifyScope: string;

  @Column({ name: 'suite_config_id', type: 'int', nullable: true, comment: '关联的服务商应用配置ID(WecomSuiteConfig.id)，为空表示所有应用通用' })
  suiteConfigId: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
