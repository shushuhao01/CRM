/**
 * 知识库实体
 * V4.0新增: AI助手知识库管理
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_knowledge_bases')
@Index('IDX_wkb_tenant', ['tenantId'])
export class WecomKnowledgeBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'document_count', type: 'int', default: 0 })
  documentCount: number;

  @Column({ name: 'entry_count', type: 'int', default: 0 })
  entryCount: number;

  @Column({ name: 'total_size', type: 'bigint', default: 0 })
  totalSize: number;

  @Column({ name: 'index_status', type: 'varchar', length: 20, default: 'pending', comment: 'pending/indexing/indexed/failed' })
  indexStatus: string;

  @Column({ name: 'last_index_time', type: 'datetime', nullable: true })
  lastIndexTime: Date;

  @Column({ name: 'sync_crm_enabled', type: 'boolean', default: false })
  syncCrmEnabled: boolean;

  @Column({ name: 'sync_crm_sources', type: 'text', nullable: true, comment: 'JSON' })
  syncCrmSources: string;

  @Column({ name: 'sync_frequency', type: 'varchar', length: 20, default: 'manual', comment: 'daily/manual' })
  syncFrequency: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

