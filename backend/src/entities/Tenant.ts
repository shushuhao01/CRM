import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 租户实体
 * 用于SaaS多租户模式，管理不同租户的基本信息和配置
 * 适配Admin后台的tenants表结构
 */
@Entity('tenants')
export class Tenant {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Index('idx_code', { unique: true })
  @Column('varchar', { length: 50, unique: true })
  code: string;

  @Column('varchar', { length: 36, nullable: true, name: 'package_id' })
  packageId: string | null;

  @Column('varchar', { length: 100, nullable: true })
  contact: string | null;

  @Column('varchar', { length: 20, nullable: true })
  phone: string | null;

  @Column('varchar', { length: 100, nullable: true })
  email: string | null;

  @Column('int', { default: 10, name: 'max_users' })
  maxUsers: number;

  @Column('int', { default: 5, name: 'max_storage_gb' })
  maxStorageGb: number;

  @Column('int', { default: 0, name: 'user_count' })
  userCount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'used_storage_mb' })
  usedStorageMb: number;

  @Column('date', { nullable: true, name: 'expire_date' })
  expireDate: Date | null;

  @Index('idx_license_key')
  @Column('varchar', { length: 100, nullable: true, name: 'license_key' })
  licenseKey: string | null;

  @Column('varchar', { length: 20, default: 'pending', name: 'license_status' })
  licenseStatus: string;

  @Column('datetime', { nullable: true, name: 'activated_at' })
  activatedAt: Date | null;

  @Column('json', { nullable: true })
  features: any;

  @Column('varchar', { length: 100, nullable: true, name: 'database_name' })
  databaseName: string | null;

  @Column('text', { nullable: true })
  remark: string | null;

  @Index('idx_status')
  @Column('varchar', { length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 生成授权码
   * 格式: LIC-XXXXXXXXXXXXXXXXXXXX (20位大写字母数字)
   */
  static generateLicenseKey(): string {
    return `LIC-${uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase()}`;
  }

  /**
   * 生成短租户编码
   * 格式: T + 年月日 + 4位随机数 (例如: T20260303A1B2)
   */
  static generateShortCode(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2); // 26
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 03
    const day = now.getDate().toString().padStart(2, '0'); // 03
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4位随机字符
    return `T${year}${month}${day}${random}`;
  }

  /**
   * 检查租户是否过期
   */
  isExpired(): boolean {
    if (!this.expireDate) return false;
    return new Date(this.expireDate) < new Date();
  }

  /**
   * 检查租户是否可用
   * 状态为active且未过期且已激活
   */
  isAvailable(): boolean {
    return this.status === 'active' &&
           !this.isExpired() &&
           this.licenseStatus === 'active';
  }

  /**
   * 检查授权是否有效
   */
  isLicenseValid(): boolean {
    return this.licenseStatus === 'active' && !this.isExpired();
  }

  /**
   * 获取租户状态描述
   */
  getStatusText(): string {
    if (this.status === 'inactive') return '已禁用';
    if (this.isExpired()) return '已过期';
    if (this.licenseStatus === 'pending') return '待激活';
    if (this.licenseStatus === 'suspended') return '已暂停';
    if (this.status === 'active' && this.licenseStatus === 'active') return '正常';
    return this.status;
  }

  /**
   * 获取存储使用率（百分比）
   */
  getStorageUsagePercent(): number {
    if (this.maxStorageGb === 0) return 0;
    const maxStorageMb = this.maxStorageGb * 1024;
    return Math.round((this.usedStorageMb / maxStorageMb) * 100);
  }

  /**
   * 获取用户使用率（百分比）
   */
  getUserUsagePercent(): number {
    if (this.maxUsers === 0) return 0;
    return Math.round((this.userCount / this.maxUsers) * 100);
  }

  /**
   * 检查是否可以添加新用户
   */
  canAddUser(): boolean {
    return this.userCount < this.maxUsers;
  }

  /**
   * 检查存储空间是否充足
   * @param requiredMb 需要的存储空间（MB）
   */
  hasEnoughStorage(requiredMb: number): boolean {
    const maxStorageMb = this.maxStorageGb * 1024;
    return (this.usedStorageMb + requiredMb) <= maxStorageMb;
  }
}
