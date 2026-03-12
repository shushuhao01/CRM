import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Module } from './Module';

@Entity('module_configs')
export class ModuleConfig {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'module_id', comment: '模块ID' })
  moduleId!: string;

  @Column({ type: 'varchar', length: 100, name: 'config_key', comment: '配置键' })
  configKey!: string;

  @Column({ type: 'text', nullable: true, name: 'config_value', comment: '配置值' })
  configValue?: string;

  @Column({
    type: 'enum',
    enum: ['string', 'number', 'boolean', 'json'],
    default: 'string',
    name: 'config_type',
    comment: '配置类型'
  })
  configType!: 'string' | 'number' | 'boolean' | 'json';

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '配置说明' })
  description?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;

  @ManyToOne(() => Module, module => module.configs)
  @JoinColumn({ name: 'module_id' })
  module?: Module;

  // 获取解析后的值
  getValue(): any {
    if (!this.configValue) return null;

    switch (this.configType) {
      case 'number':
        return Number(this.configValue);
      case 'boolean':
        return this.configValue === 'true';
      case 'json':
        try {
          return JSON.parse(this.configValue);
        } catch {
          return null;
        }
      default:
        return this.configValue;
    }
  }

  // 设置值（自动转换为字符串）
  setValue(value: any): void {
    if (value === null || value === undefined) {
      this.configValue = '';
      return;
    }

    switch (this.configType) {
      case 'json':
        this.configValue = JSON.stringify(value);
        break;
      default:
        this.configValue = String(value);
    }
  }
}
