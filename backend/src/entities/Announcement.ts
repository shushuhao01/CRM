import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 系统公告实体
 */
@Entity('announcements')
export class Announcement {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 200, comment: '公告标题' })
  title!: string;

  @Column({ type: 'text', comment: '公告内容' })
  content!: string;

  @Column({ type: 'varchar', length: 50, default: 'notice', comment: '公告类型' })
  @Index()
  type!: string;

  @Column({ type: 'varchar', length: 20, default: 'normal', comment: '优先级' })
  priority!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft', comment: '状态' })
  @Index()
  status!: string;

  @Column({ name: 'target_roles', type: 'json', nullable: true, comment: '目标角色列表' })
  targetRoles?: string[];

  @Column({ name: 'target_departments', type: 'json', nullable: true, comment: '目标部门列表' })
  targetDepartments?: string[];

  @Column({ name: 'start_time', type: 'timestamp', nullable: true, comment: '生效开始时间' })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true, comment: '生效结束时间' })
  endTime?: Date;

  @Column({ name: 'is_pinned', type: 'tinyint', default: 0, comment: '是否置顶' })
  isPinned!: number;

  @Column({ name: 'is_popup', type: 'tinyint', default: 0, comment: '是否弹窗显示' })
  isPopup!: number;

  @Column({ name: 'is_marquee', type: 'tinyint', default: 1, comment: '是否横幅滚动' })
  isMarquee!: number;

  @Column({ name: 'view_count', type: 'int', default: 0, comment: '查看次数' })
  viewCount!: number;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true, comment: '创建者ID' })
  createdBy?: string;

  @Column({ name: 'created_by_name', type: 'varchar', length: 100, nullable: true, comment: '创建者姓名' })
  createdByName?: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true, comment: '发布时间' })
  @Index()
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}

/**
 * 公告阅读记录实体
 */
@Entity('announcement_reads')
export class AnnouncementRead {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'announcement_id', type: 'varchar', length: 36, comment: '公告ID' })
  @Index()
  announcementId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, comment: '用户ID' })
  @Index()
  userId!: string;

  @CreateDateColumn({ name: 'read_at', comment: '阅读时间' })
  readAt!: Date;
}
