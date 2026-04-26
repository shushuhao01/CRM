/**
 * Admin Mobile App Config Routes - 移动应用管理
 * 管理后台: 上传/配置移动应用安装包, 统计下载量
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';

const router = Router();

// ==================== 确保数据库表存在 ====================
const ensureMobileAppTable = async () => {
  try {
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS mobile_app_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(20) NOT NULL COMMENT '平台: android/ios',
        app_name VARCHAR(100) DEFAULT '' COMMENT '应用名称',
        version VARCHAR(50) DEFAULT '' COMMENT '版本号',
        package_url VARCHAR(500) DEFAULT '' COMMENT '上传的安装包路径',
        external_url VARCHAR(500) DEFAULT '' COMMENT '外部下载地址',
        file_size BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
        file_hash VARCHAR(64) DEFAULT '' COMMENT '文件SHA256哈希',
        download_count INT DEFAULT 0 COMMENT '下载次数',
        is_enabled TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
        description TEXT COMMENT '版本说明',
        uploaded_by VARCHAR(100) DEFAULT '' COMMENT '上传者',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        KEY idx_platform (platform),
        KEY idx_enabled (is_enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='移动应用安装包管理'
    `);
    log.info('[MobileAppConfig] mobile_app_packages 表已就绪');
  } catch (error) {
    log.error('[MobileAppConfig] 创建表失败:', error);
  }
};

// 启动时确保表存在
ensureMobileAppTable();

// ==================== 文件上传配置 ====================
const uploadDir = path.join(process.cwd(), 'uploads', 'admin', 'mobile-app');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const mobileAppUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.apk', '.ipa', '.zip', '.gz', '.tgz', '.tar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 apk、ipa、zip、tar.gz、tgz 格式文件'));
    }
  }
});

// ==================== API 路由 ====================

/**
 * GET /mobile-app-config - 获取所有移动应用包列表
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const packages = await AppDataSource.query(
      `SELECT * FROM mobile_app_packages ORDER BY platform ASC, created_at DESC`
    );
    res.json({ success: true, data: packages });
  } catch (error: any) {
    log.error('[MobileAppConfig] 获取列表失败:', error);
    res.status(500).json({ success: false, message: error.message || '获取失败' });
  }
});

/**
 * GET /mobile-app-config/stats - 获取下载统计
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await AppDataSource.query(`
      SELECT
        platform,
        COUNT(*) as total_packages,
        SUM(download_count) as total_downloads,
        SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabled_count
      FROM mobile_app_packages
      GROUP BY platform
    `);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    log.error('[MobileAppConfig] 获取统计失败:', error);
    res.status(500).json({ success: false, message: error.message || '获取统计失败' });
  }
});

/**
 * POST /mobile-app-config - 创建/更新移动应用配置（通过外部URL）
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { platform, app_name, version, external_url, description, is_enabled } = req.body;

    if (!platform || !['android', 'ios'].includes(platform)) {
      return res.status(400).json({ success: false, message: '平台必须为 android 或 ios' });
    }

    const adminUser = (req as any).adminUser;
    const uploadedBy = adminUser?.username || 'admin';

    const id = await AppDataSource.query(
      `INSERT INTO mobile_app_packages (platform, app_name, version, external_url, description, is_enabled, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [platform, app_name || '', version || '', external_url || '', description || '', is_enabled !== false ? 1 : 0, uploadedBy]
    );

    res.json({
      success: true,
      message: '配置保存成功',
      data: { id: id.insertId }
    });
  } catch (error: any) {
    log.error('[MobileAppConfig] 保存配置失败:', error);
    res.status(500).json({ success: false, message: error.message || '保存失败' });
  }
});

/**
 * POST /mobile-app-config/upload - 上传移动应用安装包
 */
router.post('/upload', mobileAppUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的安装包文件' });
    }

    const { platform, app_name, version, description } = req.body;

    if (!platform || !['android', 'ios'].includes(platform)) {
      // 清理已上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '平台必须为 android 或 ios' });
    }

    const relativePath = `/uploads/admin/mobile-app/${req.file.filename}`;
    const adminUser = (req as any).adminUser;
    const uploadedBy = adminUser?.username || 'admin';

    // 计算文件hash
    const crypto = await import('crypto');
    const fileBuffer = fs.readFileSync(req.file.path);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const fileHash = hashSum.digest('hex');

    const result = await AppDataSource.query(
      `INSERT INTO mobile_app_packages (platform, app_name, version, package_url, file_size, file_hash, description, is_enabled, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [platform, app_name || '', version || '', relativePath, req.file.size, fileHash, description || '', uploadedBy]
    );

    res.json({
      success: true,
      message: '安装包上传成功',
      data: {
        id: result.insertId,
        url: relativePath,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        fileHash
      }
    });
  } catch (error: any) {
    log.error('[MobileAppConfig] 上传安装包失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/**
 * PUT /mobile-app-config/:id - 更新配置
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { app_name, version, external_url, description, is_enabled } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (app_name !== undefined) { updates.push('app_name = ?'); values.push(app_name); }
    if (version !== undefined) { updates.push('version = ?'); values.push(version); }
    if (external_url !== undefined) { updates.push('external_url = ?'); values.push(external_url); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (is_enabled !== undefined) { updates.push('is_enabled = ?'); values.push(is_enabled ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    values.push(id);
    await AppDataSource.query(
      `UPDATE mobile_app_packages SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    log.error('[MobileAppConfig] 更新失败:', error);
    res.status(500).json({ success: false, message: error.message || '更新失败' });
  }
});

/**
 * DELETE /mobile-app-config/:id - 删除配置
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 获取文件路径以便删除物理文件
    const rows = await AppDataSource.query(
      `SELECT package_url FROM mobile_app_packages WHERE id = ?`, [id]
    );

    if (rows.length > 0 && rows[0].package_url) {
      const filePath = path.join(process.cwd(), rows[0].package_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await AppDataSource.query(`DELETE FROM mobile_app_packages WHERE id = ?`, [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[MobileAppConfig] 删除失败:', error);
    res.status(500).json({ success: false, message: error.message || '删除失败' });
  }
});

export default router;
