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

  @Column({ name: 'redirect_domain', type: 'varchar', length: 255, nullable: true, comment: '授权完成回调域名(需与企微服务商后台配置一致，如: https://admin.yunkes.com)' })
  redirectDomain: string;

  @Column({ name: 'app_type', type: 'varchar', length: 20, default: 'web', comment: '应用类型: web(网页应用)/miniprogram(小程序应用)' })
  appType: string;

  @Column({ name: 'app_name', type: 'varchar', length: 200, nullable: true, comment: '应用名称' })
  appName: string;

  @Column({ name: 'app_description', type: 'text', nullable: true, comment: '应用描述' })
  appDescription: string;

  @Column({ name: 'app_status', type: 'varchar', length: 20, default: 'offline', comment: '应用状态: online/offline' })
  appStatus: string;

  @Column({ name: 'permissions', type: 'text', nullable: true, comment: '权限范围(JSON数组)' })
  permissions: string;

  @Column({ name: 'chat_archive_rsa_public_key', type: 'text', nullable: true, comment: '会话存档RSA公钥(租户复制到企微后台加密密钥处)' })
  chatArchiveRsaPublicKey: string;

  @Column({ name: 'chat_archive_rsa_private_key', type: 'text', nullable: true, comment: '会话存档RSA私钥(服务商级别，所有授权企业共用)' })
  chatArchiveRsaPrivateKey: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({ name: 'mp_app_id', type: 'varchar', length: 50, nullable: true, comment: '关联的微信小程序AppID' })
  mpAppId: string;

  @Column({ name: 'mp_app_secret', type: 'varchar', length: 255, nullable: true, comment: '微信小程序AppSecret(加密存储)' })
  mpAppSecret: string;

  @Column({ name: 'mp_form_secret', type: 'varchar', length: 100, nullable: true, comment: '表单签名密钥' })
  mpFormSecret: string;

  @Column({ name: 'mp_enabled', type: 'boolean', default: false, comment: '是否启用小程序资料收集' })
  mpEnabled: boolean;

  @Column({ name: 'mp_callback_token', type: 'varchar', length: 100, nullable: true, comment: '小程序消息推送Token' })
  mpCallbackToken: string;

  @Column({ name: 'mp_callback_encoding_aes_key', type: 'varchar', length: 100, nullable: true, comment: '小程序消息推送EncodingAESKey' })
  mpCallbackEncodingAesKey: string;

  @Column({ name: 'mp_config', type: 'text', nullable: true, comment: '小程序扩展配置(JSON)' })
  mpConfig: string;

  // ==================== Web登录授权配置 ====================

  @Column({ name: 'web_login_token', type: 'varchar', length: 100, nullable: true, comment: 'Web登录授权Token(与服务商后台登录授权配置一致)' })
  webLoginToken: string;

  @Column({ name: 'web_login_encoding_aes_key', type: 'varchar', length: 100, nullable: true, comment: 'Web登录授权EncodingAESKey(与服务商后台登录授权配置一致)' })
  webLoginEncodingAesKey: string;

  @Column({ name: 'web_login_redirect_domain', type: 'varchar', length: 255, nullable: true, comment: 'Web登录可信域名(如: crm.yunkes.com)' })
  webLoginRedirectDomain: string;

  @Column({ name: 'web_login_appid', type: 'varchar', length: 100, nullable: true, comment: 'Web登录授权AppID(服务商后台登录授权页面的SuiteID)' })
  webLoginAppId: string;

  @Column({ name: 'web_login_secret', type: 'varchar', length: 255, nullable: true, comment: 'Web登录授权Secret(服务商后台登录授权页面的Secret)' })
  webLoginSecret: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

