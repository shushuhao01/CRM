import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('versions')
export class Version {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  version!: string;

  @Column({ name: 'version_code', type: 'int' })
  versionCode!: number;

  @Column({ name: 'release_type', type: 'enum', enum: ['major', 'minor', 'patch', 'beta'], default: 'patch' })
  releaseType!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'all' })
  platform?: string;

  @Column({ type: 'text', nullable: true })
  changelog?: string;

  @Column({ name: 'download_url', type: 'varchar', length: 500, nullable: true })
  downloadUrl?: string;

  @Column({ name: 'source_type', type: 'varchar', length: 20, default: 'url' })
  sourceType?: string;

  @Column({ name: 'git_repo_url', type: 'varchar', length: 500, nullable: true })
  gitRepoUrl?: string;

  @Column({ name: 'git_branch', type: 'varchar', length: 100, nullable: true, default: 'main' })
  gitBranch?: string;

  @Column({ name: 'git_tag', type: 'varchar', length: 100, nullable: true })
  gitTag?: string;

  @Column({ name: 'package_path', type: 'varchar', length: 500, nullable: true })
  packagePath?: string;

  @Column({ name: 'target_audience', type: 'varchar', length: 20, default: 'all' })
  targetAudience?: string;

  @Column({ name: 'release_notes_html', type: 'text', nullable: true })
  releaseNotesHtml?: string;

  @Column({ name: 'file_size', type: 'varchar', length: 20, nullable: true })
  fileSize?: string;

  @Column({ name: 'file_hash', type: 'varchar', length: 64, nullable: true })
  fileHash?: string;

  @Column({ name: 'min_version', type: 'varchar', length: 20, nullable: true })
  minVersion?: string;

  @Column({ name: 'is_force_update', type: 'tinyint', default: 0 })
  isForceUpdate!: number;

  @Column({ type: 'enum', enum: ['draft', 'published', 'deprecated'], default: 'draft' })
  status!: string;

  @Column({ name: 'is_published', type: 'tinyint', default: 0 })
  isPublished!: number;

  @Column({ name: 'download_count', type: 'int', default: 0 })
  downloadCount!: number;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
