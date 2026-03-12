import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Version } from './Version';

@Entity('changelogs')
export class Changelog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'version_id', type: 'varchar', length: 36, comment: '版本ID' })
  versionId!: string;

  @Column({
    type: 'enum',
    enum: ['feature', 'bugfix', 'improvement', 'security', 'breaking'],
    default: 'feature',
    comment: '类型：feature-新功能，bugfix-修复，improvement-改进，security-安全，breaking-破坏性变更'
  })
  type!: 'feature' | 'bugfix' | 'improvement' | 'security' | 'breaking';

  @Column({ type: 'text', comment: '更新内容' })
  content!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序（数字越小越靠前）' })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: '更新时间' })
  updatedAt!: Date;

  // 关联版本
  @ManyToOne(() => Version, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version?: Version;
}
