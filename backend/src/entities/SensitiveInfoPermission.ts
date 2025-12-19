import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sensitive_info_permissions')
export class SensitiveInfoPermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'info_type', length: 50 })
  infoType!: string;

  @Column({ name: 'role_code', length: 50 })
  roleCode!: string;

  @Column({ name: 'has_permission', type: 'tinyint', default: 0 })
  hasPermission!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
