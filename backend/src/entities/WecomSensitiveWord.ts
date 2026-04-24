/**
 * 敏感词实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_sensitive_words')
@Index('IDX_wecom_sw_tenant_word', ['tenantId', 'word'], { unique: true })
@Index('IDX_wecom_sw_tenant', ['tenantId'])
@Index('IDX_wecom_sw_group', ['groupName'])
export class WecomSensitiveWord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', nullable: true, comment: '企微配置ID(NULL表示全局)' })
  wecomConfigId: number;

  @Column({ type: 'varchar', length: 200, comment: '敏感词' })
  word: string;

  @Column({ name: 'group_name', type: 'varchar', length: 100, default: 'custom', comment: '分组: porn/politics/violence/competitor/custom' })
  groupName: string;

  @Column({ type: 'varchar', length: 20, default: 'warning', comment: '级别: info/warning/danger/critical' })
  level: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

