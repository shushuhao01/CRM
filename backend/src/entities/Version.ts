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

  @Column({ type: 'text', nullable: true })
  changelog?: string;

  @Column({ name: 'download_url', type: 'varchar', length: 500, nullable: true })
  downloadUrl?: string;

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

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
