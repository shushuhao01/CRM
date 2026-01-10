/**
 * 企微微信客服账号实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_service_accounts')
export class WecomServiceAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, comment: '企业ID' })
  corpId: string;

  @Column({ name: 'open_kf_id', type: 'varchar', length: 100, nullable: true, comment: '客服账号ID' })
  openKfId: string;

  @Column({ type: 'varchar', length: 100, comment: '客服名称' })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '客服头像' })
  avatar: string;

  @Column({ name: 'servicer_user_ids', type: 'text', nullable: true, comment: '接待人员UserID列表(JSON)' })
  servicerUserIds: string;

  @Column({ name: 'welcome_msg', type: 'text', nullable: true, comment: '欢迎语' })
  welcomeMsg: string;

  @Column({ name: 'service_time_start', type: 'varchar', length: 50, nullable: true, comment: '接待时间开始' })
  serviceTimeStart: string;

  @Column({ name: 'service_time_end', type: 'varchar', length: 50, nullable: true, comment: '接待时间结束' })
  serviceTimeEnd: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ name: 'today_service_count', type: 'int', default: 0, comment: '今日接待数' })
  todayServiceCount: number;

  @Column({ name: 'total_service_count', type: 'int', default: 0, comment: '累计接待数' })
  totalServiceCount: number;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
