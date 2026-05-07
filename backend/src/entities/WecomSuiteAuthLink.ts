/**
 * 企微服务商应用授权链接记录
 * 每次生成授权链接时创建一条记录
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_suite_auth_links')
export class WecomSuiteAuthLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'suite_id', type: 'varchar', length: 100, comment: 'Suite ID' })
  suiteId: string;

  @Column({ name: 'pre_auth_code', type: 'varchar', length: 255, comment: '预授权码' })
  preAuthCode: string;

  @Column({ name: 'auth_url', type: 'text', comment: '完整授权链接' })
  authUrl: string;

  @Column({ name: 'redirect_uri', type: 'text', nullable: true, comment: '回调地址' })
  redirectUri: string;

  @Column({ name: 'state', type: 'varchar', length: 100, default: 'general', comment: '授权state参数' })
  state: string;

  @Column({ name: 'type', type: 'varchar', length: 20, default: 'general', comment: '类型: general/tenant' })
  type: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 100, nullable: true, comment: '指定租户ID(tenant类型时)' })
  tenantId: string;

  @Column({ name: 'expire_days', type: 'int', default: 7, comment: '有效天数' })
  expireDays: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending', comment: '状态: pending/authorized/expired/cancelled' })
  status: string;

  @Column({ name: 'auth_corp_id', type: 'varchar', length: 100, nullable: true, comment: '授权企业CorpID(授权成功后填入)' })
  authCorpId: string;

  @Column({ name: 'auth_corp_name', type: 'varchar', length: 200, nullable: true, comment: '授权企业名称' })
  authCorpName: string;

  @Column({ name: 'auth_time', type: 'datetime', nullable: true, comment: '授权完成时间' })
  authTime: Date;

  @Column({ name: 'remark', type: 'varchar', length: 500, nullable: true, comment: '备注' })
  remark: string;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true, comment: '创建人' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true, comment: '链接过期时间' })
  expiresAt: Date;
}
