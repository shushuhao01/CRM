import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true, comment: '配置键名' })
  configKey: string;

  @Column({ type: 'text', comment: '配置值' })
  configValue: string;

  @Column({ 
    type: 'varchar',
    length: 50,
    default: 'string',
    comment: '值类型'
  })
  valueType: 'string' | 'number' | 'boolean' | 'json' | 'text';

  @Column({ length: 100, comment: '配置分组' })
  configGroup: string;

  @Column({ length: 200, nullable: true, comment: '配置描述' })
  description?: string;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ type: 'boolean', default: false, comment: '是否为系统配置（不可删除）' })
  isSystem: boolean;

  @Column({ type: 'int', default: 0, comment: '排序权重' })
  sortOrder: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 获取解析后的值
  getParsedValue(): any {
    try {
      switch (this.valueType) {
        case 'number':
          return Number(this.configValue);
        case 'boolean':
          return this.configValue === 'true';
        case 'json':
          return JSON.parse(this.configValue);
        default:
          return this.configValue;
      }
    } catch (error) {
      return this.configValue;
    }
  }

  // 设置值（自动转换为字符串）
  setParsedValue(value: any): void {
    if (this.valueType === 'json') {
      this.configValue = JSON.stringify(value);
    } else {
      this.configValue = String(value);
    }
  }
}