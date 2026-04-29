/**
 * 企微服务商应用配置实体 (单例)
 * 存储第三方服务商应用的Suite配置信息
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_suite_configs')
export class WecomSuiteConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'suite_id', type: 'varchar', length: 100, nullable: true, comment: 'Suite ID' })
  suiteId: string;

  @Column({ name: 'suite_secret', type: 'varchar', length: 255, nullable: true, comment: 'Suite Secret' })
  suiteSecret: string;

  @Column({ name: 'suite_ticket', type: 'text', nullable: true, comment: '企微推送的suite_ticket' })
  suiteTicket: string;

  @Column({ name: 'suite_ticket_updated_at', type: 'datetime', nullable: true, comment: 'suite_ticket最后更新时间' })
  suiteTicketUpdatedAt: Date;

  @Column({ name: 'provider_corp_id', type: 'varchar', length: 100, nullable: true, comment: '服务商CorpID' })
  providerCorpId: string;

  @Column({ name: 'provider_secret', type: 'varchar', length: 255, nullable: true, comment: '服务商Secret' })
  providerSecret: string;

  @Column({ name: 'callback_token', type: 'varchar', length: 100, nullable: true, comment: '回调Token' })
  callbackToken: string;

  @Column({ name: 'callback_encoding_aes_key', type: 'varchar', length: 100, nullable: true, comment: '回调EncodingAESKey' })
  callbackEncodingAesKey: string;

  @Column({ name: 'app_name', type: 'varchar', length: 200, nullable: true, comment: '应用名称' })
  appName: string;

  @Column({ name: 'app_description', type: 'text', nullable: true, comment: '应用描述' })
  appDescription: string;

  @Column({ name: 'app_status', type: 'varchar', length: 20, default: 'offline', comment: '应用状态: online/offline' })
  appStatus: string;

  @Column({ name: 'permissions', type: 'text', nullable: true, comment: '权限范围(JSON数组)' })
  permissions: string;

  @Column({ name: 'chat_archive_rsa_private_key', type: 'text', nullable: true, comment: '会话存档RSA私钥(服务商级别，所有授权企业共用)' })
  chatArchiveRsaPrivateKey: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

