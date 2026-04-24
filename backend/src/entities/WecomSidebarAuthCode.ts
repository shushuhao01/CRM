/**
 * 侧边栏授权码实体
 * V4.0新增: 管理侧边栏H5应用的授权码
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_sidebar_auth_codes')
@Index('IDX_wsac_tenant', ['tenantId'])
export class WecomSidebarAuthCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ type: 'varchar', length: 100, unique: true, comment: '授权码' })
  code: string;

  @Column({ name: 'code_type', type: 'varchar', length: 20, default: 'single', comment: 'single/multi/permanent' })
  codeType: string;

  @Column({ name: 'max_uses', type: 'int', default: 1 })
  maxUses: number;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'expire_at', type: 'datetime', nullable: true })
  expireAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

