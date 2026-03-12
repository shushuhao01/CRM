import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_configs')
export class ApiConfig {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 100, comment: 'API名称' })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true, comment: 'API代码' })
  code!: string;

  @Column({ type: 'text', nullable: true, comment: 'API描述' })
  description?: string;

  @Column({ type: 'varchar', length: 100, unique: true, name: 'api_key', comment: 'API密钥' })
  apiKey!: string;

  @Column({ type: 'varchar', length: 255, name: 'api_secret', comment: 'API密钥（加密）' })
  apiSecret!: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
    comment: '状态'
  })
  status!: 'active' | 'inactive';

  @Column({ type: 'int', default: 1000, name: 'rate_limit', comment: '速率限制（次/小时）' })
  rateLimit!: number;

  @Column({ type: 'text', nullable: true, name: 'allowed_ips', comment: '允许的IP（JSON数组）' })
  allowedIps?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at', comment: '过期时间' })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at', comment: '最后使用时间' })
  lastUsedAt?: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  // 辅助方法：获取允许的IP列表
  getAllowedIpList(): string[] {
    if (!this.allowedIps) return [];
    try {
      return JSON.parse(this.allowedIps);
    } catch {
      return [];
    }
  }

  // 辅助方法：设置允许的IP列表
  setAllowedIpList(ips: string[]): void {
    this.allowedIps = JSON.stringify(ips);
  }

  // 辅助方法：检查IP是否允许
  isIpAllowed(ip: string): boolean {
    const allowedList = this.getAllowedIpList();
    if (allowedList.length === 0) return true; // 如果没有限制，则允许所有IP
    return allowedList.includes(ip);
  }

  // 辅助方法：检查是否过期
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  // 辅助方法：检查是否激活
  isActive(): boolean {
    return this.status === 'active' && !this.isExpired();
  }
}
