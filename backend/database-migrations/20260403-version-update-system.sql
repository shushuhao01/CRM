-- ============================================================
-- 版本更新提醒与一键更新系统 - 数据库迁移
-- 日期: 2026-04-03
-- 说明: 扩展 versions 表、新增 update_tasks 表和 migration_history 表
-- ============================================================

-- 1. 扩展 versions 表
ALTER TABLE versions
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'url' COMMENT '更新源类型: url/upload/git' AFTER download_url,
  ADD COLUMN IF NOT EXISTS git_repo_url VARCHAR(500) NULL COMMENT 'Git仓库地址' AFTER source_type,
  ADD COLUMN IF NOT EXISTS git_branch VARCHAR(100) DEFAULT 'main' COMMENT 'Git分支' AFTER git_repo_url,
  ADD COLUMN IF NOT EXISTS git_tag VARCHAR(100) NULL COMMENT 'Git标签' AFTER git_branch,
  ADD COLUMN IF NOT EXISTS package_path VARCHAR(500) NULL COMMENT '上传包服务器路径' AFTER git_tag,
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) DEFAULT 'all' COMMENT '目标受众: all/saas/private' AFTER package_path,
  ADD COLUMN IF NOT EXISTS release_notes_html TEXT NULL COMMENT '富文本更新说明(HTML)' AFTER changelog;

-- 2. 创建 update_tasks 表
CREATE TABLE IF NOT EXISTS update_tasks (
  id VARCHAR(36) PRIMARY KEY,
  version_id VARCHAR(36) NOT NULL COMMENT '目标版本ID',
  customer_id VARCHAR(36) NULL COMMENT '私有客户ID（null=管理后台自身）',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '更新状态: pending/backing_up/downloading/installing/building/migrating/restarting/success/failed/rolled_back',
  current_step VARCHAR(50) NULL COMMENT '当前执行步骤',
  progress INT DEFAULT 0 COMMENT '进度百分比(0-100)',
  logs LONGTEXT NULL COMMENT '执行日志(JSON数组)',
  backup_path VARCHAR(500) NULL COMMENT '备份目录路径',
  error_message TEXT NULL COMMENT '错误信息',
  from_version VARCHAR(20) NULL COMMENT '更新前版本号',
  to_version VARCHAR(20) NULL COMMENT '目标版本号',
  triggered_by VARCHAR(36) NULL COMMENT '操作人ID',
  started_at DATETIME NULL COMMENT '开始时间',
  completed_at DATETIME NULL COMMENT '完成时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_update_tasks_version_id (version_id),
  INDEX idx_update_tasks_customer_id (customer_id),
  INDEX idx_update_tasks_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='版本更新任务记录';

-- 3. 创建 migration_history 表
CREATE TABLE IF NOT EXISTS migration_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(200) NOT NULL UNIQUE COMMENT '迁移文件名',
  checksum VARCHAR(64) NULL COMMENT '文件校验值',
  execution_time INT NULL COMMENT '执行耗时(ms)',
  success TINYINT DEFAULT 1 COMMENT '是否成功',
  error_message TEXT NULL COMMENT '错误信息',
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据库迁移历史';

