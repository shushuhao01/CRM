/**
 * 企业微信配置实体
 * 支持多企业主体配置 + SaaS第三方应用/私有部署自建应用双模式
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import * as crypto from 'crypto';

const ENC_KEY = process.env.WECOM_ENCRYPT_KEY || 'crm_wecom_secret_key_32bytes_ok';
const ENC_IV = ENC_KEY.substring(0, 16);

const secretTransformer = {
  to(value: string | null): string | null {
    if (!value || value.startsWith('enc:')) return value;
    try {
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENC_KEY.padEnd(32, '0').substring(0, 32)), Buffer.from(ENC_IV));
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return 'enc:' + encrypted;
    } catch { return value; }
  },
  from(value: string | null): string | null {
    if (!value || !value.startsWith('enc:')) return value;
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENC_KEY.padEnd(32, '0').substring(0, 32)), Buffer.from(ENC_IV));
      let decrypted = decipher.update(value.substring(4), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch { return value; }
  }
};

@Entity('wecom_configs')
@Index('IDX_wecom_configs_tenant', ['tenantId'])
export class WecomConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'name', type: 'varchar', length: 100, comment: '配置名称' })
  name: string;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, unique: true, comment: '企业ID (CorpID)' })
  corpId: string;

  @Column({ name: 'corp_secret', type: 'varchar', length: 255, comment: '应用Secret', transformer: secretTransformer })
  corpSecret: string;

  @Column({ name: 'agent_id', type: 'int', nullable: true, comment: '应用AgentID' })
  agentId: number;

  @Column({ name: 'callback_token', type: 'varchar', length: 100, nullable: true, comment: '回调Token' })
  callbackToken: string;

  @Column({ name: 'encoding_aes_key', type: 'varchar', length: 100, nullable: true, comment: '回调EncodingAESKey' })
  encodingAesKey: string;

  @Column({ name: 'callback_url', type: 'varchar', length: 500, nullable: true, comment: '回调URL' })
  callbackUrl: string;

  @Column({ name: 'contact_secret', type: 'varchar', length: 255, nullable: true, comment: '通讯录同步Secret', transformer: secretTransformer })
  contactSecret: string;

  @Column({ name: 'external_contact_secret', type: 'varchar', length: 255, nullable: true, comment: '客户联系Secret', transformer: secretTransformer })
  externalContactSecret: string;

  @Column({ name: 'chat_archive_secret', type: 'varchar', length: 255, nullable: true, comment: '会话存档Secret', transformer: secretTransformer })
  chatArchiveSecret: string;

  @Column({ name: 'chat_archive_private_key', type: 'text', nullable: true, comment: '会话存档RSA私钥', transformer: secretTransformer })
  chatArchivePrivateKey: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ name: 'bind_operator', type: 'varchar', length: 50, nullable: true, comment: '绑定操作人' })
  bindOperator: string;

  @Column({ name: 'bind_time', type: 'datetime', nullable: true, comment: '绑定时间' })
  bindTime: Date;

  @Column({ name: 'last_api_call_time', type: 'datetime', nullable: true, comment: '最后API调用时间' })
  lastApiCallTime: Date;

  @Column({ name: 'api_call_count', type: 'int', default: 0, comment: 'API调用次数' })
  apiCallCount: number;

  @Column({ name: 'connection_status', type: 'varchar', length: 20, default: 'pending', comment: '连接状态' })
  connectionStatus: string;

  @Column({ name: 'last_error', type: 'text', nullable: true, comment: '最后错误信息' })
  lastError: string;

  @Column({ name: 'remark', type: 'text', nullable: true, comment: '备注' })
  remark: string;

  // ==================== V2.0 新增：双模式授权字段 ====================

  @Column({ name: 'auth_type', type: 'varchar', length: 20, default: 'self_built', comment: '授权类型: third_party/self_built' })
  authType: string;

  @Column({ name: 'permanent_code', type: 'text', nullable: true, comment: '第三方应用永久授权码(加密存储)', transformer: secretTransformer })
  permanentCode: string;

  @Column({ name: 'suite_id', type: 'varchar', length: 50, nullable: true, comment: '第三方应用SuiteID' })
  suiteId: string;

  @Column({ name: 'auth_corp_info', type: 'text', nullable: true, comment: '授权方企业信息(JSON)' })
  authCorpInfo: string;

  @Column({ name: 'auth_user_info', type: 'text', nullable: true, comment: '授权管理员信息(JSON)' })
  authUserInfo: string;

  @Column({ name: 'auth_scope', type: 'text', nullable: true, comment: '授权范围(JSON)' })
  authScope: string;

  @Column({ name: 'data_api_status', type: 'tinyint', default: 0, comment: '数据API授权状态: 0未授权 1已授权 2已过期' })
  dataApiStatus: number;

  @Column({ name: 'data_api_expire_time', type: 'datetime', nullable: true, comment: '数据API授权到期时间' })
  dataApiExpireTime: Date;

  @Column({ name: 'vas_chat_archive', type: 'boolean', default: false, comment: '是否开通会话存档增值服务' })
  vasChatArchive: boolean;

  @Column({ name: 'vas_expire_date', type: 'date', nullable: true, comment: '增值服务到期时间' })
  vasExpireDate: Date;

  @Column({ name: 'vas_user_count', type: 'int', default: 0, comment: '增值服务开通人数' })
  vasUserCount: number;

  // ==================== V4.0 新增：双模式授权增强字段 ====================

  @Column({ name: 'auth_mode', type: 'varchar', length: 20, default: 'self_built', comment: '授权模式: third_party/self_built' })
  authMode: string;

  @Column({ name: 'auth_corp_name', type: 'varchar', length: 200, nullable: true, comment: '授权企业名称' })
  authCorpName: string;

  @Column({ name: 'auth_admin_user_id', type: 'varchar', length: 100, nullable: true, comment: '授权管理员UserID' })
  authAdminUserId: string;

  @Column({ name: 'auth_time', type: 'datetime', nullable: true, comment: '授权时间' })
  authTime: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
