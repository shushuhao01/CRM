/**
 * SiteService - 官网管理服务
 *
 * 职责：
 * 1. ensureTables()  自动建表 + 补列（项目约定 synchronize:false，本方法即本功能的启动期迁移）
 * 2. 站点设置的读写（键值对）
 * 3. 访问统计聚合（PV/UV/独立IP/平均停留）
 * 4. SEO 主动推送（百度推送 / IndexNow）
 * 5. sitemap.xml 动态生成
 */
import { AppDataSource } from '../config/database';
import { SiteSetting, SiteVisitLog, SiteStatsDaily, SiteChannelStatsDaily } from '../entities/SiteEntities';
import { SITE_CONFIG } from '../config/sites';
import { log } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/** 站点设置默认值（getSettings 返回时合并，保证 IndexNow/SEO 推送开箱可用） */
const SITE_DEFAULTS: Record<string, string> = {
  indexNowKey: '6f3b4323a59949a79a5eca7d576dc4e0',
  baiduPushToken: '',
  seoPushEnabled: '1'
};

class SiteService {
  /** 已就绪的迁移 Promise（进程内仅执行一次，失败不缓存以便重试） */
  private tablesReady: Promise<void> | null = null;

  /**
   * 确保官网管理相关表存在且字段齐全 —— 服务启动后首次访问时自动建表/补列。
   * 项目约定 synchronize:false，本方法即本功能的"启动期迁移"，幂等可重复执行。
   */
  async ensureTables(): Promise<void> {
    if (!this.tablesReady) {
      this.tablesReady = this.doEnsureTables().catch((e: any) => {
        log.error('[Site] 自动迁移失败(下次调用重试):', e.message);
        this.tablesReady = null;
      });
    }
    return this.tablesReady;
  }

  private async doEnsureTables(): Promise<void> {
    const ds = AppDataSource;

    // 1. 官网文章/公告
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_articles\` (
        \`id\` VARCHAR(36) NOT NULL COMMENT '主键',
        \`type\` VARCHAR(20) NOT NULL DEFAULT 'article' COMMENT '内容类型: article=文章, notice=公告',
        \`title\` VARCHAR(200) NOT NULL COMMENT '标题',
        \`slug\` VARCHAR(200) NULL COMMENT 'URL别名(slug)',
        \`category\` VARCHAR(50) NULL COMMENT '分类',
        \`cover\` VARCHAR(500) NULL COMMENT '封面图URL',
        \`summary\` VARCHAR(500) NULL COMMENT '摘要',
        \`content\` LONGTEXT NULL COMMENT '正文内容(HTML/Markdown)',
        \`tags\` VARCHAR(500) NULL COMMENT '标签(逗号分隔)',
        \`author\` VARCHAR(100) NULL COMMENT '作者',
        \`source\` VARCHAR(100) NULL COMMENT '来源',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published',
        \`is_top\` TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶',
        \`is_recommend\` TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐',
        \`view_count\` INT NOT NULL DEFAULT 0 COMMENT '浏览量',
        \`sort\` INT NOT NULL DEFAULT 0 COMMENT '排序值(越大越靠前)',
        \`seo_title\` VARCHAR(200) NULL COMMENT 'SEO标题',
        \`seo_keywords\` VARCHAR(500) NULL COMMENT 'SEO关键词',
        \`seo_description\` VARCHAR(500) NULL COMMENT 'SEO描述',
        \`published_at\` DATETIME NULL COMMENT '发布时间',
        \`created_by\` VARCHAR(36) NULL COMMENT '创建者ID',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_site_articles_type_status\` (\`type\`, \`status\`),
        KEY \`IDX_site_articles_slug\` (\`slug\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网文章/公告'
    `);

    // 2. 官网客户案例
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_cases\` (
        \`id\` VARCHAR(36) NOT NULL COMMENT '主键',
        \`title\` VARCHAR(200) NOT NULL COMMENT '标题',
        \`slug\` VARCHAR(200) NULL COMMENT 'URL别名(slug)',
        \`client_name\` VARCHAR(200) NULL COMMENT '客户名称',
        \`industry\` VARCHAR(100) NULL COMMENT '所属行业',
        \`cover\` VARCHAR(500) NULL COMMENT '封面图URL',
        \`summary\` VARCHAR(500) NULL COMMENT '摘要',
        \`content\` LONGTEXT NULL COMMENT '案例详情(HTML/Markdown)',
        \`tags\` VARCHAR(500) NULL COMMENT '标签(逗号分隔)',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published',
        \`is_top\` TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶',
        \`is_recommend\` TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐',
        \`view_count\` INT NOT NULL DEFAULT 0 COMMENT '浏览量',
        \`sort\` INT NOT NULL DEFAULT 0 COMMENT '排序值',
        \`seo_title\` VARCHAR(200) NULL COMMENT 'SEO标题',
        \`seo_keywords\` VARCHAR(500) NULL COMMENT 'SEO关键词',
        \`seo_description\` VARCHAR(500) NULL COMMENT 'SEO描述',
        \`published_at\` DATETIME NULL COMMENT '发布时间',
        \`created_by\` VARCHAR(36) NULL COMMENT '创建者ID',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_site_cases_slug\` (\`slug\`),
        KEY \`IDX_site_cases_industry\` (\`industry\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网客户案例'
    `);

    // 3. 官网帮助文档
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_docs\` (
        \`id\` VARCHAR(36) NOT NULL COMMENT '主键',
        \`title\` VARCHAR(200) NOT NULL COMMENT '标题',
        \`slug\` VARCHAR(200) NULL COMMENT 'URL别名(slug)',
        \`category\` VARCHAR(100) NULL COMMENT '分类/分组',
        \`parent_id\` VARCHAR(36) NULL COMMENT '父级文档ID(目录)',
        \`summary\` VARCHAR(500) NULL COMMENT '摘要',
        \`content\` LONGTEXT NULL COMMENT '文档内容(HTML/Markdown)',
        \`sort\` INT NOT NULL DEFAULT 0 COMMENT '排序值',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published',
        \`view_count\` INT NOT NULL DEFAULT 0 COMMENT '浏览量',
        \`seo_title\` VARCHAR(200) NULL COMMENT 'SEO标题',
        \`seo_keywords\` VARCHAR(500) NULL COMMENT 'SEO关键词',
        \`seo_description\` VARCHAR(500) NULL COMMENT 'SEO描述',
        \`published_at\` DATETIME NULL COMMENT '发布时间',
        \`created_by\` VARCHAR(36) NULL COMMENT '创建者ID',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_site_docs_slug\` (\`slug\`),
        KEY \`IDX_site_docs_category\` (\`category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网帮助文档'
    `);

    // 4. 站点设置（键值对）
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_settings\` (
        \`id\` VARCHAR(36) NOT NULL COMMENT '主键',
        \`setting_key\` VARCHAR(100) NOT NULL COMMENT '配置键',
        \`setting_value\` LONGTEXT NULL COMMENT '配置值',
        \`group_name\` VARCHAR(50) NULL COMMENT '分组',
        \`remark\` VARCHAR(255) NULL COMMENT '备注',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_site_settings_key\` (\`setting_key\`),
        KEY \`IDX_site_settings_group\` (\`group_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网站点设置'
    `);

    // 5. 官网导航菜单
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_navs\` (
        \`id\` VARCHAR(36) NOT NULL COMMENT '主键',
        \`parent_id\` VARCHAR(36) NULL COMMENT '父级菜单ID',
        \`name\` VARCHAR(100) NOT NULL COMMENT '菜单名称',
        \`url\` VARCHAR(500) NULL COMMENT '跳转地址',
        \`icon\` VARCHAR(100) NULL COMMENT '图标',
        \`target\` VARCHAR(20) NOT NULL DEFAULT '_self' COMMENT '打开方式: _self/_blank',
        \`group_name\` VARCHAR(50) NOT NULL DEFAULT 'header' COMMENT '位置分组: header/footer',
        \`sort\` INT NOT NULL DEFAULT 0 COMMENT '排序值',
        \`is_visible\` TINYINT NOT NULL DEFAULT 1 COMMENT '是否显示',
        \`is_external\` TINYINT NOT NULL DEFAULT 0 COMMENT '是否外链',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_site_navs_group\` (\`group_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网导航菜单'
    `);

    // 6. 官网访问日志
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_visit_log\` (
        \`id\` VARCHAR(36) NOT NULL COMMENT '主键',
        \`visit_date\` DATE NULL COMMENT '访问日期(YYYY-MM-DD)',
        \`visit_hour\` TINYINT NOT NULL DEFAULT 0 COMMENT '访问小时(0-23)',
        \`path\` VARCHAR(500) NOT NULL COMMENT '访问路径',
        \`visitor_id\` VARCHAR(64) NULL COMMENT '访问者标识(cookie)',
        \`channel_code\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '渠道编码',
        \`ip\` VARCHAR(64) NULL COMMENT 'IP地址',
        \`user_agent\` VARCHAR(500) NULL COMMENT 'User-Agent',
        \`referer\` VARCHAR(500) NULL COMMENT '来源页',
        \`source\` VARCHAR(32) NULL COMMENT '来源分类',
        \`device\` VARCHAR(20) NULL COMMENT '设备类型',
        \`browser\` VARCHAR(50) NULL COMMENT '浏览器',
        \`os\` VARCHAR(50) NULL COMMENT '操作系统',
        \`country\` VARCHAR(100) NULL COMMENT '国家',
        \`province\` VARCHAR(100) NULL COMMENT '省份',
        \`city\` VARCHAR(100) NULL COMMENT '城市',
        \`isp\` VARCHAR(64) NULL COMMENT '运营商(ISP)',
        \`page_type\` VARCHAR(50) NULL COMMENT '页面类型',
        \`page_id\` VARCHAR(36) NULL COMMENT '关联内容ID',
        \`duration\` INT NOT NULL DEFAULT 0 COMMENT '停留时长(秒)',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_site_visit_log_path\` (\`path\`(191)),
        KEY \`IDX_site_visit_log_visitor\` (\`visitor_id\`),
        KEY \`IDX_site_visit_log_date\` (\`visit_date\`),
        KEY \`IDX_site_visit_log_channel\` (\`channel_code\`),
        KEY \`IDX_site_visit_log_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网访问日志'
    `);

    // 7. 官网访问日统计
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_stats_daily\` (
        \`id\` VARCHAR(36) NOT NULL COMMENT '主键',
        \`stat_date\` DATE NOT NULL COMMENT '统计日期',
        \`pv\` INT NOT NULL DEFAULT 0 COMMENT '页面浏览量(PV)',
        \`uv\` INT NOT NULL DEFAULT 0 COMMENT '独立访客数(UV)',
        \`ip_count\` INT NOT NULL DEFAULT 0 COMMENT '独立IP数',
        \`new_visitors\` INT NOT NULL DEFAULT 0 COMMENT '新访客数',
        \`avg_duration\` INT NOT NULL DEFAULT 0 COMMENT '平均停留时长(秒)',
        \`top_pages\` JSON NULL COMMENT '热门页面(JSON)',
        \`top_referers\` JSON NULL COMMENT '来源分布(JSON)',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_site_stats_daily_date\` (\`stat_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网访问日统计'
    `);

    // 8. 官网在线访客（实时在线统计）
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_online\` (
        \`visitor_id\` VARCHAR(64) NOT NULL COMMENT '访客标识',
        \`ip\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'IP地址',
        \`last_seen\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近活跃时间',
        PRIMARY KEY (\`visitor_id\`),
        KEY \`IDX_site_online_lastseen\` (\`last_seen\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网在线访客'
    `);

    // 9. 官网渠道链接（推广短链）
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_channel_link\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
        \`code\` VARCHAR(32) NOT NULL COMMENT '渠道编码',
        \`name\` VARCHAR(128) NOT NULL COMMENT '渠道名称',
        \`channel\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '渠道标识',
        \`target_path\` VARCHAR(255) NOT NULL DEFAULT '/' COMMENT '落地页路径',
        \`remark\` VARCHAR(512) NULL COMMENT '备注',
        \`enabled\` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用: 1=启用, 0=停用',
        \`click_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点击次数',
        \`unique_click_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '去重点击数',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_site_channel_link_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网渠道链接'
    `);

    // 10. 官网渠道点击明细
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_channel_click\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
        \`channel_code\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '渠道编码',
        \`ip\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'IP地址',
        \`user_agent\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'User-Agent',
        \`referer\` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '来源页',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点击时间',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_site_channel_click_code\` (\`channel_code\`),
        KEY \`IDX_site_channel_click_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网渠道点击明细'
    `);

    // 11. 官网渠道日聚合统计
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_channel_stats_daily\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
        \`stat_date\` DATE NOT NULL COMMENT '统计日期',
        \`channel_code\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '渠道编码',
        \`downloads\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '下载点击',
        \`buy_clicks\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '购买点击',
        \`trial_clicks\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '免费试用点击',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_scsd_date_channel\` (\`stat_date\`, \`channel_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网渠道日聚合统计'
    `);

    // 12. 官网媒体库（富文本素材库）
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`site_media\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
        \`filename\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
        \`path\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '访问路径(URL)',
        \`size\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小(字节)',
        \`mime\` VARCHAR(64) NULL COMMENT 'MIME类型',
        \`width\` INT UNSIGNED NULL COMMENT '宽(像素)',
        \`height\` INT UNSIGNED NULL COMMENT '高(像素)',
        \`uploaded_by\` BIGINT UNSIGNED NULL COMMENT '上传者ID',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网媒体库'
    `);

    // 对照实体逐列补齐缺失字段（旧表升级兼容）
    await this.ensureColumns('site_articles', [
      { name: 'type', sql: "ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT 'article' COMMENT '内容类型: article=文章, notice=公告' AFTER `id`" },
      { name: 'slug', sql: "ADD COLUMN `slug` VARCHAR(200) NULL COMMENT 'URL别名(slug)' AFTER `title`" },
      { name: 'category', sql: "ADD COLUMN `category` VARCHAR(50) NULL COMMENT '分类' AFTER `slug`" },
      { name: 'cover', sql: "ADD COLUMN `cover` VARCHAR(500) NULL COMMENT '封面图URL' AFTER `category`" },
      { name: 'summary', sql: "ADD COLUMN `summary` VARCHAR(500) NULL COMMENT '摘要' AFTER `cover`" },
      { name: 'content', sql: "ADD COLUMN `content` LONGTEXT NULL COMMENT '正文内容(HTML/Markdown)' AFTER `summary`" },
      { name: 'tags', sql: "ADD COLUMN `tags` VARCHAR(500) NULL COMMENT '标签(逗号分隔)' AFTER `content`" },
      { name: 'author', sql: "ADD COLUMN `author` VARCHAR(100) NULL COMMENT '作者' AFTER `tags`" },
      { name: 'source', sql: "ADD COLUMN `source` VARCHAR(100) NULL COMMENT '来源' AFTER `author`" },
      { name: 'is_top', sql: "ADD COLUMN `is_top` TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶' AFTER `status`" },
      { name: 'is_recommend', sql: "ADD COLUMN `is_recommend` TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐' AFTER `is_top`" },
      { name: 'view_count', sql: "ADD COLUMN `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览量' AFTER `is_recommend`" },
      { name: 'sort', sql: "ADD COLUMN `sort` INT NOT NULL DEFAULT 0 COMMENT '排序值' AFTER `view_count`" },
      { name: 'seo_title', sql: "ADD COLUMN `seo_title` VARCHAR(200) NULL COMMENT 'SEO标题' AFTER `sort`" },
      { name: 'seo_keywords', sql: "ADD COLUMN `seo_keywords` VARCHAR(500) NULL COMMENT 'SEO关键词' AFTER `seo_title`" },
      { name: 'seo_description', sql: "ADD COLUMN `seo_description` VARCHAR(500) NULL COMMENT 'SEO描述' AFTER `seo_keywords`" },
      { name: 'published_at', sql: "ADD COLUMN `published_at` DATETIME NULL COMMENT '发布时间' AFTER `seo_description`" },
      { name: 'created_by', sql: "ADD COLUMN `created_by` VARCHAR(36) NULL COMMENT '创建者ID' AFTER `published_at`" }
    ]);

    await this.ensureColumns('site_cases', [
      { name: 'slug', sql: "ADD COLUMN `slug` VARCHAR(200) NULL COMMENT 'URL别名(slug)' AFTER `title`" },
      { name: 'client_name', sql: "ADD COLUMN `client_name` VARCHAR(200) NULL COMMENT '客户名称' AFTER `slug`" },
      { name: 'industry', sql: "ADD COLUMN `industry` VARCHAR(100) NULL COMMENT '所属行业' AFTER `client_name`" },
      { name: 'cover', sql: "ADD COLUMN `cover` VARCHAR(500) NULL COMMENT '封面图URL' AFTER `industry`" },
      { name: 'summary', sql: "ADD COLUMN `summary` VARCHAR(500) NULL COMMENT '摘要' AFTER `cover`" },
      { name: 'content', sql: "ADD COLUMN `content` LONGTEXT NULL COMMENT '案例详情' AFTER `summary`" },
      { name: 'tags', sql: "ADD COLUMN `tags` VARCHAR(500) NULL COMMENT '标签(逗号分隔)' AFTER `content`" },
      { name: 'is_top', sql: "ADD COLUMN `is_top` TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶' AFTER `status`" },
      { name: 'is_recommend', sql: "ADD COLUMN `is_recommend` TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐' AFTER `is_top`" },
      { name: 'view_count', sql: "ADD COLUMN `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览量' AFTER `is_recommend`" },
      { name: 'sort', sql: "ADD COLUMN `sort` INT NOT NULL DEFAULT 0 COMMENT '排序值' AFTER `view_count`" },
      { name: 'seo_title', sql: "ADD COLUMN `seo_title` VARCHAR(200) NULL COMMENT 'SEO标题' AFTER `sort`" },
      { name: 'seo_keywords', sql: "ADD COLUMN `seo_keywords` VARCHAR(500) NULL COMMENT 'SEO关键词' AFTER `seo_title`" },
      { name: 'seo_description', sql: "ADD COLUMN `seo_description` VARCHAR(500) NULL COMMENT 'SEO描述' AFTER `seo_keywords`" },
      { name: 'published_at', sql: "ADD COLUMN `published_at` DATETIME NULL COMMENT '发布时间' AFTER `seo_description`" },
      { name: 'created_by', sql: "ADD COLUMN `created_by` VARCHAR(36) NULL COMMENT '创建者ID' AFTER `published_at`" }
    ]);

    await this.ensureColumns('site_docs', [
      { name: 'slug', sql: "ADD COLUMN `slug` VARCHAR(200) NULL COMMENT 'URL别名(slug)' AFTER `title`" },
      { name: 'category', sql: "ADD COLUMN `category` VARCHAR(100) NULL COMMENT '分类/分组' AFTER `slug`" },
      { name: 'parent_id', sql: "ADD COLUMN `parent_id` VARCHAR(36) NULL COMMENT '父级文档ID' AFTER `category`" },
      { name: 'summary', sql: "ADD COLUMN `summary` VARCHAR(500) NULL COMMENT '摘要' AFTER `parent_id`" },
      { name: 'content', sql: "ADD COLUMN `content` LONGTEXT NULL COMMENT '文档内容' AFTER `summary`" },
      { name: 'sort', sql: "ADD COLUMN `sort` INT NOT NULL DEFAULT 0 COMMENT '排序值' AFTER `content`" },
      { name: 'view_count', sql: "ADD COLUMN `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览量' AFTER `status`" },
      { name: 'seo_title', sql: "ADD COLUMN `seo_title` VARCHAR(200) NULL COMMENT 'SEO标题' AFTER `view_count`" },
      { name: 'seo_keywords', sql: "ADD COLUMN `seo_keywords` VARCHAR(500) NULL COMMENT 'SEO关键词' AFTER `seo_title`" },
      { name: 'seo_description', sql: "ADD COLUMN `seo_description` VARCHAR(500) NULL COMMENT 'SEO描述' AFTER `seo_keywords`" },
      { name: 'published_at', sql: "ADD COLUMN `published_at` DATETIME NULL COMMENT '发布时间' AFTER `seo_description`" },
      { name: 'created_by', sql: "ADD COLUMN `created_by` VARCHAR(36) NULL COMMENT '创建者ID' AFTER `published_at`" }
    ]);

    await this.ensureColumns('site_settings', [
      { name: 'setting_value', sql: "ADD COLUMN `setting_value` LONGTEXT NULL COMMENT '配置值' AFTER `setting_key`" },
      { name: 'group_name', sql: "ADD COLUMN `group_name` VARCHAR(50) NULL COMMENT '分组' AFTER `setting_value`" },
      { name: 'remark', sql: "ADD COLUMN `remark` VARCHAR(255) NULL COMMENT '备注' AFTER `group_name`" }
    ]);

    await this.ensureColumns('site_navs', [
      { name: 'parent_id', sql: "ADD COLUMN `parent_id` VARCHAR(36) NULL COMMENT '父级菜单ID' AFTER `id`" },
      { name: 'icon', sql: "ADD COLUMN `icon` VARCHAR(100) NULL COMMENT '图标' AFTER `url`" },
      { name: 'target', sql: "ADD COLUMN `target` VARCHAR(20) NOT NULL DEFAULT '_self' COMMENT '打开方式' AFTER `icon`" },
      { name: 'group_name', sql: "ADD COLUMN `group_name` VARCHAR(50) NOT NULL DEFAULT 'header' COMMENT '位置分组' AFTER `target`" },
      { name: 'sort', sql: "ADD COLUMN `sort` INT NOT NULL DEFAULT 0 COMMENT '排序值' AFTER `group_name`" },
      { name: 'is_visible', sql: "ADD COLUMN `is_visible` TINYINT NOT NULL DEFAULT 1 COMMENT '是否显示' AFTER `sort`" },
      { name: 'is_external', sql: "ADD COLUMN `is_external` TINYINT NOT NULL DEFAULT 0 COMMENT '是否外链' AFTER `is_visible`" }
    ]);

    await this.ensureColumns('site_visit_log', [
      { name: 'visitor_id', sql: "ADD COLUMN `visitor_id` VARCHAR(64) NULL COMMENT '访问者标识(cookie)' AFTER `path`" },
      { name: 'ip', sql: "ADD COLUMN `ip` VARCHAR(64) NULL COMMENT 'IP地址' AFTER `visitor_id`" },
      { name: 'user_agent', sql: "ADD COLUMN `user_agent` VARCHAR(500) NULL COMMENT 'User-Agent' AFTER `ip`" },
      { name: 'referer', sql: "ADD COLUMN `referer` VARCHAR(500) NULL COMMENT '来源页' AFTER `user_agent`" },
      { name: 'device', sql: "ADD COLUMN `device` VARCHAR(20) NULL COMMENT '设备类型' AFTER `referer`" },
      { name: 'browser', sql: "ADD COLUMN `browser` VARCHAR(50) NULL COMMENT '浏览器' AFTER `device`" },
      { name: 'os', sql: "ADD COLUMN `os` VARCHAR(50) NULL COMMENT '操作系统' AFTER `browser`" },
      { name: 'country', sql: "ADD COLUMN `country` VARCHAR(100) NULL COMMENT '国家' AFTER `os`" },
      { name: 'province', sql: "ADD COLUMN `province` VARCHAR(100) NULL COMMENT '省份' AFTER `country`" },
      { name: 'city', sql: "ADD COLUMN `city` VARCHAR(100) NULL COMMENT '城市' AFTER `province`" },
      { name: 'page_type', sql: "ADD COLUMN `page_type` VARCHAR(50) NULL COMMENT '页面类型' AFTER `city`" },
      { name: 'page_id', sql: "ADD COLUMN `page_id` VARCHAR(36) NULL COMMENT '关联内容ID' AFTER `page_type`" },
      { name: 'duration', sql: "ADD COLUMN `duration` INT NOT NULL DEFAULT 0 COMMENT '停留时长(秒)' AFTER `page_id`" },
      { name: 'isp', sql: "ADD COLUMN `isp` VARCHAR(64) NULL COMMENT '运营商(ISP)' AFTER `city`" },
      { name: 'source', sql: "ADD COLUMN `source` VARCHAR(32) NULL COMMENT '来源分类' AFTER `referer`" },
      { name: 'channel_code', sql: "ADD COLUMN `channel_code` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '渠道编码' AFTER `visitor_id`" },
      { name: 'visit_date', sql: "ADD COLUMN `visit_date` DATE NULL COMMENT '访问日期(YYYY-MM-DD)' AFTER `path`" },
      { name: 'visit_hour', sql: "ADD COLUMN `visit_hour` TINYINT NOT NULL DEFAULT 0 COMMENT '访问小时(0-23)' AFTER `visit_date`" }
    ]);

    await this.ensureColumns('site_stats_daily', [
      { name: 'ip_count', sql: "ADD COLUMN `ip_count` INT NOT NULL DEFAULT 0 COMMENT '独立IP数' AFTER `uv`" },
      { name: 'new_visitors', sql: "ADD COLUMN `new_visitors` INT NOT NULL DEFAULT 0 COMMENT '新访客数' AFTER `ip_count`" },
      { name: 'avg_duration', sql: "ADD COLUMN `avg_duration` INT NOT NULL DEFAULT 0 COMMENT '平均停留时长(秒)' AFTER `new_visitors`" },
      { name: 'top_pages', sql: "ADD COLUMN `top_pages` JSON NULL COMMENT '热门页面(JSON)' AFTER `avg_duration`" },
      { name: 'top_referers', sql: "ADD COLUMN `top_referers` JSON NULL COMMENT '来源分布(JSON)' AFTER `top_pages`" },
      { name: 'downloads', sql: "ADD COLUMN `downloads` INT NOT NULL DEFAULT 0 COMMENT '下载点击' AFTER `top_referers`" },
      { name: 'buy_clicks', sql: "ADD COLUMN `buy_clicks` INT NOT NULL DEFAULT 0 COMMENT '购买点击' AFTER `downloads`" },
      { name: 'trial_clicks', sql: "ADD COLUMN `trial_clicks` INT NOT NULL DEFAULT 0 COMMENT '免费试用点击' AFTER `buy_clicks`" }
    ]);

    await this.ensureColumns('site_channel_stats_daily', [
      { name: 'downloads', sql: "ADD COLUMN `downloads` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '下载点击' AFTER `channel_code`" },
      { name: 'buy_clicks', sql: "ADD COLUMN `buy_clicks` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '购买点击' AFTER `downloads`" },
      { name: 'trial_clicks', sql: "ADD COLUMN `trial_clicks` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '免费试用点击' AFTER `buy_clicks`" }
    ]);

    log.info('[Site] 表结构自检完成（自动建表+补列）');
  }

  /** 对照实体逐列补齐缺失字段（旧表升级兼容，并发场景去重容错） */
  private async ensureColumns(table: string, required: Array<{ name: string; sql: string }>): Promise<void> {
    try {
      const cols = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      const existing = new Set(cols.map((c: any) => c.COLUMN_NAME));
      for (const col of required.filter(c => !existing.has(c.name))) {
        try {
          await AppDataSource.query(`ALTER TABLE \`${table}\` ${col.sql}`);
          log.info(`[Site] 已补充 ${table}.${col.name}`);
        } catch (e: any) {
          if (!String(e.message || '').includes('Duplicate column name')) {
            log.warn(`[Site] 补列失败 ${table}.${col.name}:`, e.message);
          }
        }
      }
    } catch (e: any) {
      log.warn(`[Site] 列检查失败(${table}):`, e.message);
    }
  }

  // ==================== 站点设置 ====================

  /** 读取全部站点设置（键值对象） */
  async getSettings(): Promise<Record<string, string>> {
    await this.ensureTables();
    const repo = AppDataSource.getRepository(SiteSetting);
    const list = await repo.find();
    const map: Record<string, string> = {};
    for (const item of list) {
      map[item.settingKey] = item.settingValue ?? '';
    }
    return { ...SITE_DEFAULTS, ...map };
  }

  /** 批量保存站点设置（键值对象，存在则更新，不存在则新建） */
  async saveSettings(values: Record<string, any>): Promise<void> {
    await this.ensureTables();
    const repo = AppDataSource.getRepository(SiteSetting);
    const keys = Object.keys(values || {});
    for (const key of keys) {
      const raw = values[key];
      const value = raw === null || raw === undefined
        ? ''
        : (typeof raw === 'object' ? JSON.stringify(raw) : String(raw));
      const existing = await repo.findOne({ where: { settingKey: key } });
      if (existing) {
        existing.settingValue = value;
        await repo.save(existing);
      } else {
        await repo.save(repo.create({ id: uuidv4(), settingKey: key, settingValue: value } as any));
      }
    }
  }

  // ==================== 访问统计 ====================

  /** 按今日累计站点日统计（PV/UV/下载点击/购买点击/免费试用点击） */
  async bumpStat(field: 'pv' | 'uv' | 'downloads' | 'buyClicks' | 'trialClicks', delta = 1): Promise<void> {
    await this.ensureTables();
    const repo = AppDataSource.getRepository(SiteStatsDaily);
    const now = new Date();
    const statDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let row = await repo.findOne({ where: { statDate } });
    if (!row) {
      row = repo.create({ id: uuidv4(), statDate, pv: 0, uv: 0, ipCount: 0, newVisitors: 0, avgDuration: 0, downloads: 0, buyClicks: 0, trialClicks: 0 });
    }
    row[field] = (Number(row[field]) || 0) + delta;
    await repo.save(row);
  }

  /** 按今日累计渠道日统计（下载点击/购买点击/免费试用点击） */
  async bumpChannelStat(channelCode: string, field: 'downloads' | 'buyClicks' | 'trialClicks', delta = 1): Promise<void> {
    await this.ensureTables();
    const code = (channelCode || '').trim().toLowerCase().slice(0, 32);
    if (!code) return;
    const repo = AppDataSource.getRepository(SiteChannelStatsDaily);
    const now = new Date();
    const statDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let row = await repo.findOne({ where: { statDate, channelCode: code } });
    if (!row) {
      row = repo.create({ statDate, channelCode: code, downloads: 0, buyClicks: 0, trialClicks: 0 });
    }
    row[field] = (Number(row[field]) || 0) + delta;
    await repo.save(row);
  }

  /** 概览统计：累计 PV/UV、今日 PV/UV、近 N 日趋势 */
  async getStatsOverview(): Promise<any> {
    await this.ensureTables();
    const ds = AppDataSource;
    const today = new Date().toISOString().slice(0, 10);

    const totalRow = await ds.query(
      `SELECT COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv, COUNT(DISTINCT ip) AS ipCount FROM site_visit_log`
    ).catch(() => [{ pv: 0, uv: 0, ipCount: 0 }]);

    const todayRow = await ds.query(
      `SELECT COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv FROM site_visit_log WHERE DATE(created_at) = ?`,
      [today]
    ).catch(() => [{ pv: 0, uv: 0 }]);

    const trend = await ds.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv
       FROM site_visit_log
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`
    ).catch(() => []);

    const topPages = await ds.query(
      `SELECT path, COUNT(*) AS pv FROM site_visit_log
       GROUP BY path ORDER BY pv DESC LIMIT 10`
    ).catch(() => []);

    const topReferers = await ds.query(
      `SELECT referer, COUNT(*) AS pv FROM site_visit_log
       WHERE referer IS NOT NULL AND referer <> ''
       GROUP BY referer ORDER BY pv DESC LIMIT 10`
    ).catch(() => []);

    return {
      total: totalRow[0] || { pv: 0, uv: 0, ipCount: 0 },
      today: todayRow[0] || { pv: 0, uv: 0 },
      trend,
      topPages,
      topReferers
    };
  }

  /** 访问日志列表（分页） */
  async getVisitList(params: { page?: number; pageSize?: number; path?: string; startDate?: string; endDate?: string }): Promise<{ list: any[]; total: number }> {
    await this.ensureTables();
    const { page = 1, pageSize = 20, path, startDate, endDate } = params;
    const where: string[] = [];
    const args: any[] = [];
    if (path) { where.push('path LIKE ?'); args.push(`%${path}%`); }
    if (startDate) { where.push('created_at >= ?'); args.push(startDate); }
    if (endDate) { where.push('created_at <= ?'); args.push(`${endDate} 23:59:59`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRows = await AppDataSource.query(`SELECT COUNT(*) AS total FROM site_visit_log ${whereSql}`, args);
    const total = countRows[0]?.total || 0;

    const offset = (Number(page) - 1) * Number(pageSize);
    const list = await AppDataSource.query(
      `SELECT * FROM site_visit_log ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, Number(pageSize), offset]
    );
    return { list, total };
  }

  /** 渠道/来源分析 */
  async getAnalytics(): Promise<any> {
    await this.ensureTables();
    const ds = AppDataSource;

    const byDevice = await ds.query(
      `SELECT device, COUNT(*) AS pv FROM site_visit_log GROUP BY device ORDER BY pv DESC`
    ).catch(() => []);
    const byPageType = await ds.query(
      `SELECT page_type, COUNT(*) AS pv FROM site_visit_log GROUP BY page_type ORDER BY pv DESC`
    ).catch(() => []);
    const byReferer = await ds.query(
      `SELECT referer, COUNT(*) AS pv FROM site_visit_log
       WHERE referer IS NOT NULL AND referer <> ''
       GROUP BY referer ORDER BY pv DESC LIMIT 20`
    ).catch(() => []);

    // 来源域名归类（直接访问/搜索引擎/外部链接）
    const refererDomain = await ds.query(
      `SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(referer, '/', 3), '//', -1) AS domain, COUNT(*) AS pv
       FROM site_visit_log WHERE referer IS NOT NULL AND referer <> ''
       GROUP BY domain ORDER BY pv DESC LIMIT 20`
    ).catch(() => []);

    return { byDevice, byPageType, byReferer, refererDomain };
  }

  // ==================== sitemap.xml ====================

  /** 动态生成 sitemap.xml */
  async generateSitemap(): Promise<string> {
    await this.ensureTables();
    const base = SITE_CONFIG.WEBSITE_URL.replace(/\/$/, '');
    const urlEntries: string[] = [];

    const push = (loc: string, lastmod?: string, changefreq = 'weekly', priority = '0.8') => {
      const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
      urlEntries.push(
        `  <url>\n    <loc>${base}${loc}</loc>\n    ${lm}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
      );
    };

    // 静态页面
    push('/', undefined, 'daily', '1.0');
    push('/features', undefined, 'weekly', '0.9');
    push('/pricing', undefined, 'weekly', '0.9');
    push('/solutions', undefined, 'weekly', '0.8');
    push('/about', undefined, 'monthly', '0.6');
    push('/blog', undefined, 'daily', '0.9');
    push('/cases', undefined, 'daily', '0.8');
    push('/notice', undefined, 'daily', '0.7');
    push('/docs', undefined, 'weekly', '0.8');

    const nowStr = new Date().toISOString();

    // 文章
    const articles = await AppDataSource.query(
      `SELECT slug, id, updated_at, published_at FROM site_articles WHERE type = 'article' AND status = 'published' ORDER BY published_at DESC LIMIT 5000`
    ).catch(() => []);
    for (const a of articles) {
      push(`/blog/${a.slug || a.id}`, a.updated_at || a.published_at || nowStr, 'weekly', '0.7');
    }

    // 公告
    const notices = await AppDataSource.query(
      `SELECT slug, id, updated_at, published_at FROM site_articles WHERE type = 'notice' AND status = 'published' ORDER BY published_at DESC LIMIT 5000`
    ).catch(() => []);
    for (const n of notices) {
      push(`/notice/${n.slug || n.id}`, n.updated_at || n.published_at || nowStr, 'weekly', '0.6');
    }

    // 案例
    const cases = await AppDataSource.query(
      `SELECT slug, id, updated_at, published_at FROM site_cases WHERE status = 'published' ORDER BY published_at DESC LIMIT 5000`
    ).catch(() => []);
    for (const c of cases) {
      push(`/cases/${c.slug || c.id}`, c.updated_at || c.published_at || nowStr, 'weekly', '0.7');
    }

    // 文档
    const docs = await AppDataSource.query(
      `SELECT slug, id, updated_at, published_at FROM site_docs WHERE status = 'published' ORDER BY sort DESC LIMIT 5000`
    ).catch(() => []);
    for (const d of docs) {
      push(`/docs/${d.slug || d.id}`, d.updated_at || d.published_at || nowStr, 'weekly', '0.6');
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>`;
  }

  // ==================== SEO 主动推送 ====================

  /**
   * 百度主动推送
   * 需要 site_settings 中配置 baiduPushToken
   */
  async pushToBaidu(urls: string[]): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const settings = await this.getSettings();
      const token = settings.baiduPushToken;
      if (!token) {
        return { success: false, message: '未配置百度推送 Token（baiduPushToken）' };
      }
      const site = SITE_CONFIG.WEBSITE_URL.replace(/\/$/, '');
      const fullUrls = urls.map(u => (u.startsWith('http') ? u : `${site}${u.startsWith('/') ? '' : '/'}${u}`));
      const res = await fetch(
        `http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: fullUrls.join('\n'),
          signal: AbortSignal.timeout(10000)
        }
      );
      const data = await res.json().catch(() => ({}));
      if ((data as any).success || (data as any).remain !== undefined) {
        return { success: true, message: `百度推送成功(推送${fullUrls.length}条)`, data };
      }
      return { success: false, message: (data as any).message || '百度推送失败', data };
    } catch (e: any) {
      return { success: false, message: `百度推送异常: ${e.message}` };
    }
  }

  /**
   * IndexNow 推送（Bing/Yandex 等）
   * 需要 site_settings 中配置 indexNowKey
   */
  async pushToIndexNow(urls: string[]): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const settings = await this.getSettings();
      const key = settings.indexNowKey;
      if (!key) {
        return { success: false, message: '未配置 IndexNow Key（indexNowKey）' };
      }
      const site = SITE_CONFIG.WEBSITE_URL.replace(/\/$/, '');
      const host = site.replace(/^https?:\/\//, '');
      const fullUrls = urls.map(u => (u.startsWith('http') ? u : `${site}${u.startsWith('/') ? '' : '/'}${u}`));
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: fullUrls }),
        signal: AbortSignal.timeout(10000)
      });
      if (res.status >= 200 && res.status < 300) {
        return { success: true, message: `IndexNow 推送成功(推送${fullUrls.length}条)` };
      }
      return { success: false, message: `IndexNow 推送失败(HTTP ${res.status})` };
    } catch (e: any) {
      return { success: false, message: `IndexNow 推送异常: ${e.message}` };
    }
  }

  /**
   * 内容发布后自动推送单条 URL 到搜索引擎（百度 + IndexNow）
   * 受站点设置 seoPushEnabled 开关控制；失败仅记录日志，不影响主流程
   * @param urlPath 相对路径，如 /blog/xxx、/cases/xxx、/notice/xxx
   */
  async pushContentUrl(urlPath: string): Promise<void> {
    const p = (urlPath || '').trim();
    if (!p) return;
    try {
      const settings = await this.getSettings();
      if (settings.seoPushEnabled === '0') return;
      const [baidu, indexNow] = await Promise.allSettled([
        this.pushToBaidu([p]),
        this.pushToIndexNow([p])
      ]);
      if (baidu.status === 'fulfilled' && baidu.value.success) {
        log.info(`[Site] 百度推送成功: ${p}`);
      } else {
        const msg = baidu.status === 'fulfilled' ? baidu.value.message : (baidu.reason?.message || baidu.reason);
        log.warn(`[Site] 百度推送未成功: ${p} - ${msg}`);
      }
      if (indexNow.status === 'fulfilled' && indexNow.value.success) {
        log.info(`[Site] IndexNow 推送成功: ${p}`);
      } else {
        const msg = indexNow.status === 'fulfilled' ? indexNow.value.message : (indexNow.reason?.message || indexNow.reason);
        log.warn(`[Site] IndexNow 推送未成功: ${p} - ${msg}`);
      }
    } catch (e: any) {
      log.warn(`[Site] 内容推送异常: ${p} - ${e?.message || e}`);
    }
  }

  /** 记录一次访问日志（公开接口调用） */
  async trackVisit(data: {
    path: string;
    visitorId?: string;
    ip?: string;
    userAgent?: string;
    referer?: string;
    device?: string;
    browser?: string;
    os?: string;
    pageType?: string;
    pageId?: string;
  }): Promise<void> {
    await this.ensureTables();
    const logRepo = AppDataSource.getRepository(SiteVisitLog);
    await logRepo.save(logRepo.create({
      id: uuidv4(),
      path: (data.path || '/').substring(0, 500),
      visitorId: data.visitorId || null,
      ip: data.ip || null,
      userAgent: (data.userAgent || '').substring(0, 500) || null,
      referer: (data.referer || '').substring(0, 500) || null,
      device: data.device || null,
      browser: data.browser || null,
      os: data.os || null,
      pageType: data.pageType || null,
      pageId: data.pageId || null,
      duration: 0
    } as any));
  }
}

export const siteService = new SiteService();
export default siteService;
