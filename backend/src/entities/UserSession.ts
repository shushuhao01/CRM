import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 用户会话实体
 * 用于在线席位制，追踪用户登录会话和活跃状态
 * "在线"定义：持有有效JWT且在最近30分钟内有API活动
 */
@Entity('user_sessions')
export class UserSession {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Index('idx_user_sessions_user_id')
  @Column('varchar', { length: 36, name: 'user_id' })
  userId: string;

  @Index('idx_user_sessions_tenant_id')
  @Column('varchar', { length: 36, name: 'tenant_id' })
  tenantId: string;

  @Index('idx_user_sessions_session_token')
  @Column('varchar', { length: 512, name: 'session_token', comment: 'JWT token标识(jti或token hash)' })
  sessionToken: string;

  @Column('varchar', { length: 50, nullable: true, name: 'device_type', comment: '设备类型: web/mobile/app' })
  deviceType: string | null;

  @Column('varchar', { length: 255, nullable: true, name: 'device_info', comment: '设备信息(User-Agent)' })
  deviceInfo: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'ip_address', comment: '登录IP' })
  ipAddress: string | null;

  @Index('idx_user_sessions_last_active')
  @Column('datetime', { name: 'last_active_at', comment: '最后活跃时间' })
  lastActiveAt: Date;

  @Column('datetime', { nullable: true, name: 'logged_out_at', comment: '主动登出时间' })
  loggedOutAt: Date | null;

  @Index('idx_user_sessions_status')
  @Column('varchar', { length: 20, default: 'active', comment: '会话状态: active/expired/logged_out' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
