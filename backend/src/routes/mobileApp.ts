/**
 * Mobile App Routes - CRM端移动应用下载接口
 * 提供移动应用下载列表和下载计数（需登录）
 */
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AppDataSource } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { log } from '../config/logger';

const router = Router();

/**
 * GET /mobile-app/list - 获取已启用的移动应用下载列表
 * 需要登录（所有已登录用户可见）
 */
router.get('/list', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // 检查表是否存在
    const tableExists = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'mobile_app_packages'`
    ).catch(() => [{ cnt: 0 }]);

    if (!tableExists[0]?.cnt) {
      return res.json({ success: true, data: [] });
    }

    // 每个平台只返回最新的已启用版本
    const packages = await AppDataSource.query(`
      SELECT p.* FROM mobile_app_packages p
      INNER JOIN (
        SELECT platform, MAX(id) as max_id
        FROM mobile_app_packages
        WHERE is_enabled = 1
        GROUP BY platform
      ) latest ON p.id = latest.max_id
      ORDER BY p.platform ASC
    `);

    const result = packages.map((pkg: any) => ({
      id: pkg.id,
      platform: pkg.platform,
      appName: pkg.app_name,
      version: pkg.version,
      fileSize: pkg.file_size,
      downloadCount: pkg.download_count,
      description: pkg.description,
      hasPackage: !!(pkg.package_url),
      hasExternalUrl: !!(pkg.external_url),
      externalUrl: pkg.external_url || '',
      downloadUrl: pkg.package_url
        ? `/api/v1/mobile-app/download/${pkg.id}`
        : (pkg.external_url || ''),
      updatedAt: pkg.updated_at
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[MobileApp] 获取下载列表失败:', error);
    res.status(500).json({ success: false, message: error.message || '获取失败' });
  }
});

/**
 * GET /mobile-app/download/:id - 下载安装包（增加下载计数）
 * 需要登录
 */
router.get('/download/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await AppDataSource.query(
      `SELECT * FROM mobile_app_packages WHERE id = ? AND is_enabled = 1`, [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '安装包不存在或已禁用' });
    }

    const pkg = rows[0];

    // 增加下载计数
    await AppDataSource.query(
      `UPDATE mobile_app_packages SET download_count = download_count + 1 WHERE id = ?`, [id]
    );

    if (pkg.external_url) {
      // 外部链接 → 重定向
      return res.redirect(pkg.external_url);
    }

    if (pkg.package_url) {
      // 本地文件 → 发送文件下载
      const filePath = path.join(process.cwd(), pkg.package_url);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(pkg.package_url);
        const filename = `${pkg.app_name || 'CRM-App'}-${pkg.version || 'latest'}${ext}`;
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        return res.sendFile(filePath);
      }
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    return res.status(404).json({ success: false, message: '未配置下载地址' });
  } catch (error: any) {
    log.error('[MobileApp] 下载失败:', error);
    res.status(500).json({ success: false, message: error.message || '下载失败' });
  }
});

export default router;
