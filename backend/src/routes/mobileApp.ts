/**
 * Mobile App Routes - CRM端移动应用下载接口
 * 提供移动应用下载列表（需登录）和下载文件（公开访问）
 * 私有部署模式下，若本地无数据则从中央服务器获取
 */
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AppDataSource } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { log } from '../config/logger';
import { getCentralAdminApiUrl } from '../config/centralServer';

const router = Router();

const isPrivateDeploy = () => (process.env.DEPLOY_MODE || 'private') !== 'saas';

async function fetchFromCentralServer(): Promise<any[]> {
  try {
    const adminApiUrl = getCentralAdminApiUrl();
    const url = `${adminApiUrl}/public/mobile-app-list`;
    log.info(`[MobileApp] 私有部署 - 从中央服务器获取应用列表: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timeout);
    if (!resp.ok) return [];
    const json = await resp.json() as any;
    const list = json?.data || json || [];
    if (!Array.isArray(list)) return [];
    return list.filter((pkg: any) => pkg.is_enabled !== 0 && pkg.is_enabled !== false).map((pkg: any) => ({
      id: pkg.id,
      platform: pkg.platform,
      appName: pkg.app_name || pkg.appName || 'CRM移动端',
      version: pkg.version || '-',
      fileSize: pkg.file_size || pkg.fileSize || 0,
      downloadCount: pkg.download_count || pkg.downloadCount || 0,
      description: pkg.description || '',
      hasPackage: !!(pkg.package_url || pkg.packageUrl),
      hasExternalUrl: !!(pkg.external_url || pkg.externalUrl),
      externalUrl: pkg.external_url || pkg.externalUrl || '',
      downloadUrl: pkg.external_url || pkg.externalUrl || pkg.package_url || pkg.packageUrl || '',
      updatedAt: pkg.updated_at || pkg.updatedAt,
    }));
  } catch (e: any) {
    log.warn('[MobileApp] 从中央服务器获取应用列表失败:', e.message);
    return [];
  }
}

/**
 * GET /mobile-app/list - 获取已启用的移动应用下载列表
 * 需要登录（所有已登录用户可见）
 */
router.get('/list', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tableExists = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'mobile_app_packages'`
    ).catch(() => [{ cnt: 0 }]);

    let packages: any[] = [];
    if (tableExists[0]?.cnt) {
      packages = await AppDataSource.query(`
        SELECT p.* FROM mobile_app_packages p
        INNER JOIN (
          SELECT platform, MAX(id) as max_id
          FROM mobile_app_packages
          WHERE is_enabled = 1
          GROUP BY platform
        ) latest ON p.id = latest.max_id
        ORDER BY p.platform ASC
      `);
    }

    if (packages.length > 0) {
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
      return res.json({ success: true, data: result });
    }

    if (isPrivateDeploy()) {
      const centralApps = await fetchFromCentralServer();
      if (centralApps.length > 0) {
        return res.json({ success: true, data: centralApps });
      }
    }

    res.json({ success: true, data: [] });
  } catch (error: any) {
    log.error('[MobileApp] 获取下载列表失败:', error);
    res.status(500).json({ success: false, message: error.message || '获取失败' });
  }
});

/**
 * GET /mobile-app/download/:id - 下载安装包（增加下载计数）
 * 公开访问，无需登录（浏览器直接下载时不带token）
 */
router.get('/download/:id', async (req: Request, res: Response) => {
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
