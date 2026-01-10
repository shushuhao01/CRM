/**
 * 企业微信配置实体
 * 支持多企业主体配置
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_configs')
export class WecomConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100, comment: '配置名称' })
  name: string;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, unique: true, comment: '企业ID (CorpID)' })
  corpId: string;

  @Column({ name: 'corp_secret', type: 'varchar', length: 255, comment: '应用Secret' })
  corpSecret: string;

  @Column({ name: 'agent_id', type: 'int', nullable: true, comment: '应用AgentID' })
  agentId: number;

  @Column({ name: 'callback_token', type: 'varchar', length: 100, nullable: true, comment: '回调Token' })
  callbackToken: string;

  @Column({ name: 'encoding_aes_key', type: 'varchar', length: 100, nullable: true, comment: '回调EncodingAESKey' })
  encodingAesKey: string;

  @Column({ name: 'callback_url', type: 'varchar', length: 500, nullable: true, comment: '回调URL' })
  callbackUrl: string;

  @Column({ name: 'contact_secret', type: 'varchar', length: 255, nullable: true, comment: '客户联系Secret' })
  contactSecret: string;

  @Column({ name: 'chat_archive_secret', type: 'varchar', length: 255, nullable: true, comment: '会话存档Secret' })
  chatArchiveSecret: string;

  @Column({ name: 'chat_archive_private_key', type: 'text', nullable: true, comment: '会话存档RSA私钥' })
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

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
