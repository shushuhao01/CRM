import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './Tenant';

/**
 * 租户配置实体
 * 用于存储租户的个性化配置信息
 * 支持键值对存储，每个租户可以有多个配置项
 */
@Entity('tenant_settings')
@Index('uk_tenant_setting', ['tenantId', 'settingKey'], { unique: true })
@Index('idx_tenant_id', ['tenantId'])
export class TenantSettings {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36, name: 'tenant_id' })
  tenantId: string;

  @Column('varchar', { length: 100, name: 'setting_key' })
  settingKey: string;

  @Column('text', { nullable: true, name: 'setting_value' })
  settingValue: string | null;

  @Column('varchar', { length: 20, default: 'string', name: 'setting_type' })
  settingType: string;

  @Column('varchar', { length: 500, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联到租户
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  /**
   * 获取配置值（根据类型解析）
   */
  getValue(): any {
    if (!this.settingValue) return null;

    try {
      switch (this.settingType) {
        case 'json':
          return JSON.parse(this.settingValue);
        case 'number':
          return Number(this.settingValue);
        case 'boolean':
          return this.settingValue === 'true' || this.settingValue === '1';
        case 'array':
          return JSON.parse(this.settingValue);
        case 'string':
        default:
          return this.settingValue;
      }
    } catch (error) {
      console.error(`解析配置值失败 [${this.settingKey}]:`, error);
      return this.settingValue;
    }
  }

  /**
   * 设置配置值（根据类型序列化）
   */
  setValue(value: any): void {
    if (value === null || value === undefined) {
      this.settingValue = null;
      return;
    }

    try {
      switch (this.settingType) {
        case 'json':
        case 'array':
          this.settingValue = JSON.stringify(value);
          break;
        case 'number':
        case 'boolean':
        case 'string':
        default:
          this.settingValue = String(value);
          break;
      }
    } catch (error) {
      console.error(`序列化配置值失败 [${this.settingKey}]:`, error);
      this.settingValue = String(value);
    }
  }

  /**
   * 验证配置值类型
   */
  isValidType(): boolean {
    const validTypes = ['string', 'number', 'boolean', 'json', 'array'];
    return validTypes.includes(this.settingType);
  }
}
