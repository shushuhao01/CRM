/**
 * 会话存档设置实体
 */
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_archive_settings')
@Index('IDX_wecom_as_tenant_config', ['tenantId', 'wecomConfigId'], { unique: true })
export class WecomArchiveSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'fetch_interval', type: 'int', default: 5, comment: '拉取间隔(分钟)' })
  fetchInterval: number;

  @Column({ name: 'fetch_mode', type: 'varchar', length: 20, default: 'default', comment: '拉取模式: default/pre_page/adaptive' })
  fetchMode: string;

  @Column({ name: 'retention_days', type: 'int', default: 180, comment: '保留天数' })
  retentionDays: number;

  @Column({ name: 'media_storage', type: 'varchar', length: 20, default: 'local', comment: '媒体存储方式: local/oss' })
  mediaStorage: string;

  @Column({ name: 'auto_inspect', type: 'boolean', default: false, comment: '是否自动质检' })
  autoInspect: boolean;

  @Column({ name: 'member_scope', type: 'text', nullable: true, comment: '存档成员范围(JSON)' })
  memberScope: string;

  @Column({ name: 'rsa_public_key', type: 'text', nullable: true, comment: 'RSA公钥' })
  rsaPublicKey: string;

  @Column({ name: 'visibility', type: 'varchar', length: 20, default: 'all', comment: '成员可见性: self/department/all' })
  visibility: string;

  @Column({ name: 'max_users', type: 'int', default: 0, comment: '购买的最大席位数' })
  maxUsers: number;

  @Column({ name: 'used_users', type: 'int', default: 0, comment: '已使用席位数' })
  usedUsers: number;

  @Column({ type: 'varchar', length: 20, default: 'inactive', comment: '状态: inactive/active/expired' })
  status: string;

  @Column({ name: 'expire_date', type: 'date', nullable: true, comment: '到期日期' })
  expireDate: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

