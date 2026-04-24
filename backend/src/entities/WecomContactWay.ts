/**
 * 企微活码实体
 * V4.0新增: 联系我活码管理，支持单人/多人轮流/多人权重分配模式
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_contact_ways')
@Index('IDX_wcw_tenant_config', ['tenantId', 'wecomConfigId'])
@Index('IDX_wcw_config_id', ['configId'])
export class WecomContactWay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int' })
  wecomConfigId: number;

  @Column({ name: 'config_id', type: 'varchar', length: 100, nullable: true, comment: '企微返回的config_id' })
  configId: string;

  @Column({ type: 'varchar', length: 200, comment: '活码名称' })
  name: string;

  @Column({ type: 'int', default: 1, comment: '1=单人/多人 2=群聊' })
  type: number;

  @Column({ type: 'int', default: 2, comment: '1=小程序 2=二维码' })
  scene: number;

  @Column({ type: 'int', default: 0, comment: '样式0-3' })
  style: number;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '渠道标识' })
  state: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  remark: string;

  @Column({ name: 'skip_verify', type: 'boolean', default: true, comment: '跳过验证' })
  skipVerify: boolean;

  @Column({ name: 'user_ids', type: 'text', nullable: true, comment: 'JSON 接待成员列表' })
  userIds: string;

  @Column({ name: 'party_ids', type: 'text', nullable: true, comment: 'JSON 接待部门列表' })
  partyIds: string;

  @Column({ name: 'is_temp', type: 'boolean', default: false })
  isTemp: boolean;

  @Column({ name: 'qr_code', type: 'varchar', length: 500, nullable: true, comment: '二维码链接' })
  qrCode: string;

  @Column({ name: 'welcome_enabled', type: 'boolean', default: false })
  welcomeEnabled: boolean;

  @Column({ name: 'welcome_config', type: 'text', nullable: true, comment: 'JSON 欢迎语配置' })
  welcomeConfig: string;

  @Column({ name: 'auto_tags', type: 'text', nullable: true, comment: 'JSON 自动标签' })
  autoTags: string;

  @Column({ name: 'weight_mode', type: 'varchar', length: 20, default: 'single', comment: '分配模式: single/round_robin/weighted' })
  weightMode: string;

  @Column({ name: 'user_weights', type: 'text', nullable: true, comment: 'JSON 成员权重配置' })
  userWeights: string;

  @Column({ name: 'smart_rule_id', type: 'int', nullable: true })
  smartRuleId: number;

  @Column({ name: 'auto_group_enabled', type: 'boolean', default: false })
  autoGroupEnabled: boolean;

  @Column({ name: 'auto_group_config', type: 'text', nullable: true, comment: 'JSON' })
  autoGroupConfig: string;

  @Column({ name: 'total_add_count', type: 'int', default: 0 })
  totalAddCount: number;

  @Column({ name: 'total_loss_count', type: 'int', default: 0 })
  totalLossCount: number;

  @Column({ name: 'today_add_count', type: 'int', default: 0 })
  todayAddCount: number;

  @Column({ name: 'today_loss_count', type: 'int', default: 0 })
  todayLossCount: number;

  @Column({ name: 'abnormal_count', type: 'int', default: 0, comment: '异常数' })
  abnormalCount: number;

  @Column({ name: 'current_reception_count', type: 'int', default: 0, comment: '当前接待人数' })
  currentReceptionCount: number;

  @Column({ name: 'open_message_count', type: 'int', default: 0, comment: '开口消息数' })
  openMessageCount: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

