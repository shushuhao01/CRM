/**
 * 知识条目实体
 * V4.0新增: 知识库中的单个条目
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_knowledge_entries')
@Index('IDX_wke_tenant_kb', ['tenantId', 'knowledgeBaseId'])
export class WecomKnowledgeEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'knowledge_base_id', type: 'int' })
  knowledgeBaseId: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON' })
  tags: string;

  @Column({ name: 'source_type', type: 'varchar', length: 20, default: 'manual', comment: 'manual/document/crm_sync' })
  sourceType: string;

  @Column({ name: 'source_file', type: 'varchar', length: 500, nullable: true })
  sourceFile: string;

  @Column({ type: 'text', nullable: true })
  embedding: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

