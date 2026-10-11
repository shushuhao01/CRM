import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 官网内容实体集合
 * 用于「官网管理」功能：文章/公告、案例、帮助文档、站点设置、导航菜单、访问统计
 * 项目约定 synchronize:false，表结构由 SiteService.ensureTables() 自动建表+补列
 */

/**
 * 官网文章/公告实体
 * type='article' 为博客文章，type='notice' 为站点公告
 */
@Entity('site_articles')
@Index('IDX_site_articles_type_status', ['type', 'status'])
export class SiteArticle {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 20, default: 'article', comment: '内容类型: article=文章, notice=公告' })
  @Index()
  type!: string;

  @Column({ type: 'varchar', length: 200, comment: '标题' })
  title!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: 'URL别名(slug)' })
  @Index()
  slug?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '分类' })
  @Index()
  category?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '封面图URL' })
  cover?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '摘要' })
  summary?: string;

  @Column({ type: 'longtext', nullable: true, comment: '正文内容(HTML/Markdown)' })
  content?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '标签(逗号分隔)' })
  tags?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '作者' })
  author?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '来源' })
  source?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft', comment: '状态: draft/published' })
  @Index()
  status!: string;

  @Column({ name: 'is_top', type: 'tinyint', default: 0, comment: '是否置顶' })
  isTop!: number;

  @Column({ name: 'is_recommend', type: 'tinyint', default: 0, comment: '是否推荐' })
  isRecommend!: number;

  @Column({ name: 'view_count', type: 'int', default: 0, comment: '浏览量' })
  viewCount!: number;

  @Column({ type: 'int', default: 0, comment: '排序值(越大越靠前)' })
  sort!: number;

  @Column({ name: 'seo_title', type: 'varchar', length: 200, nullable: true, comment: 'SEO标题' })
  seoTitle?: string;

  @Column({ name: 'seo_keywords', type: 'varchar', length: 500, nullable: true, comment: 'SEO关键词' })
  seoKeywords?: string;

  @Column({ name: 'seo_description', type: 'varchar', length: 500, nullable: true, comment: 'SEO描述' })
  seoDescription?: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true, comment: '发布时间' })
  @Index()
  publishedAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true, comment: '创建者ID' })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}

/**
 * 官网客户案例实体
 */
@Entity('site_cases')
export class SiteCase {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 200, comment: '标题' })
  title!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: 'URL别名(slug)' })
  @Index()
  slug?: string;

  @Column({ name: 'client_name', type: 'varchar', length: 200, nullable: true, comment: '客户名称' })
  clientName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '所属行业' })
  @Index()
  industry?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '封面图URL' })
  cover?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '摘要' })
  summary?: string;

  @Column({ type: 'longtext', nullable: true, comment: '案例详情(HTML/Markdown)' })
  content?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '标签(逗号分隔)' })
  tags?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft', comment: '状态: draft/published' })
  @Index()
  status!: string;

  @Column({ name: 'is_top', type: 'tinyint', default: 0, comment: '是否置顶' })
  isTop!: number;

  @Column({ name: 'is_recommend', type: 'tinyint', default: 0, comment: '是否推荐' })
  isRecommend!: number;

  @Column({ name: 'view_count', type: 'int', default: 0, comment: '浏览量' })
  viewCount!: number;

  @Column({ type: 'int', default: 0, comment: '排序值' })
  sort!: number;

  @Column({ name: 'seo_title', type: 'varchar', length: 200, nullable: true, comment: 'SEO标题' })
  seoTitle?: string;

  @Column({ name: 'seo_keywords', type: 'varchar', length: 500, nullable: true, comment: 'SEO关键词' })
  seoKeywords?: string;

  @Column({ name: 'seo_description', type: 'varchar', length: 500, nullable: true, comment: 'SEO描述' })
  seoDescription?: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true, comment: '发布时间' })
  @Index()
  publishedAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true, comment: '创建者ID' })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}

/**
 * 官网帮助文档实体
 */
@Entity('site_docs')
export class SiteDoc {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 200, comment: '标题' })
  title!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: 'URL别名(slug)' })
  @Index()
  slug?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '分类/分组' })
  @Index()
  category?: string;

  @Column({ name: 'parent_id', type: 'varchar', length: 36, nullable: true, comment: '父级文档ID(目录)' })
  parentId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '摘要' })
  summary?: string;

  @Column({ type: 'longtext', nullable: true, comment: '文档内容(HTML/Markdown)' })
  content?: string;

  @Column({ type: 'int', default: 0, comment: '排序值' })
  sort!: number;

  @Column({ type: 'varchar', length: 20, default: 'draft', comment: '状态: draft/published' })
  @Index()
  status!: string;

  @Column({ name: 'view_count', type: 'int', default: 0, comment: '浏览量' })
  viewCount!: number;

  @Column({ name: 'seo_title', type: 'varchar', length: 200, nullable: true, comment: 'SEO标题' })
  seoTitle?: string;

  @Column({ name: 'seo_keywords', type: 'varchar', length: 500, nullable: true, comment: 'SEO关键词' })
  seoKeywords?: string;

  @Column({ name: 'seo_description', type: 'varchar', length: 500, nullable: true, comment: 'SEO描述' })
  seoDescription?: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true, comment: '发布时间' })
  publishedAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true, comment: '创建者ID' })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}

/**
 * 官网站点设置实体（键值对存储，含 SEO 配置）
 */
@Entity('site_settings')
export class SiteSetting {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'setting_key', type: 'varchar', length: 100, comment: '配置键' })
  @Index({ unique: true })
  settingKey!: string;

  @Column({ name: 'setting_value', type: 'longtext', nullable: true, comment: '配置值' })
  settingValue?: string;

  @Column({ name: 'group_name', type: 'varchar', length: 50, nullable: true, comment: '分组' })
  @Index()
  groupName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}

/**
 * 官网导航菜单实体
 */
@Entity('site_navs')
export class SiteNav {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'parent_id', type: 'varchar', length: 36, nullable: true, comment: '父级菜单ID' })
  parentId?: string;

  @Column({ type: 'varchar', length: 100, comment: '菜单名称' })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '跳转地址' })
  url?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '图标' })
  icon?: string;

  @Column({ type: 'varchar', length: 20, default: '_self', comment: '打开方式: _self/_blank' })
  target!: string;

  @Column({ name: 'group_name', type: 'varchar', length: 50, default: 'header', comment: '位置分组: header/footer' })
  @Index()
  groupName!: string;

  @Column({ type: 'int', default: 0, comment: '排序值' })
  sort!: number;

  @Column({ name: 'is_visible', type: 'tinyint', default: 1, comment: '是否显示' })
  isVisible!: number;

  @Column({ name: 'is_external', type: 'tinyint', default: 0, comment: '是否外链' })
  isExternal!: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}

/**
 * 官网访问日志实体
 */
@Entity('site_visit_log')
export class SiteVisitLog {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 500, comment: '访问路径' })
  @Index()
  path!: string;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '访问者标识(cookie)' })
  @Index()
  visitorId?: string;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: 'IP地址' })
  ip?: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true, comment: 'User-Agent' })
  userAgent?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '来源页' })
  referer?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '设备类型: pc/mobile' })
  device?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '浏览器' })
  browser?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '操作系统' })
  os?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '国家' })
  country?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '省份' })
  province?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '城市' })
  city?: string;

  @Column({ name: 'page_type', type: 'varchar', length: 50, nullable: true, comment: '页面类型' })
  pageType?: string;

  @Column({ name: 'page_id', type: 'varchar', length: 36, nullable: true, comment: '关联内容ID' })
  pageId?: string;

  @Column({ type: 'int', default: 0, comment: '停留时长(秒)' })
  duration!: number;

  @CreateDateColumn({ name: 'created_at', comment: '访问时间' })
  @Index()
  createdAt!: Date;
}

/**
 * 官网访问日统计实体
 */
@Entity('site_stats_daily')
export class SiteStatsDaily {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'stat_date', type: 'date', comment: '统计日期' })
  @Index({ unique: true })
  statDate!: string;

  @Column({ type: 'int', default: 0, comment: '页面浏览量(PV)' })
  pv!: number;

  @Column({ type: 'int', default: 0, comment: '独立访客数(UV)' })
  uv!: number;

  @Column({ name: 'ip_count', type: 'int', default: 0, comment: '独立IP数' })
  ipCount!: number;

  @Column({ name: 'new_visitors', type: 'int', default: 0, comment: '新访客数' })
  newVisitors!: number;

  @Column({ name: 'avg_duration', type: 'int', default: 0, comment: '平均停留时长(秒)' })
  avgDuration!: number;

  @Column({ name: 'top_pages', type: 'json', nullable: true, comment: '热门页面(JSON)' })
  topPages?: any;

  @Column({ name: 'top_referers', type: 'json', nullable: true, comment: '来源分布(JSON)' })
  topReferers?: any;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
