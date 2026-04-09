/**
 * 🔒 租户数据导出/导入 API（CRM前端使用）
 *
 * 安全设计：
 * - tenantId 从 JWT 中提取，不从 URL 参数获取，杜绝跨租户操作
 * - 仅管理员角色可操作
 * - 导出仅包含当前租户数据，导入仅影响当前租户数据
 *
 * 路由：
 * GET    /api/v1/tenant-data/exportable-tables           - 获取可导出的表列表
 * POST   /api/v1/tenant-data/export                      - 创建导出任务
 * GET    /api/v1/tenant-data/export/:jobId               - 查询导出进度
 * GET    /api/v1/tenant-data/export/:jobId/download      - 下载导出文件
 * POST   /api/v1/tenant-data/import                      - 创建导入任务
 * GET    /api/v1/tenant-data/import/:jobId               - 查询导入进度
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { TenantExportService } from '../services/TenantExportService';
import { TenantImportService } from '../services/TenantImportService';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

import { log } from '../config/logger';

const router = Router();

// 所有接口需要认证 + 管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== 导出文件上传配置 ====================
const uploadDir = path.join(process.cwd(), 'uploads', 'tenant-imports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, _file, cb) => {
    const uniqueName = `import_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JSON 格式文件'));
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// ==================== 辅助函数 ====================

/**
 * 🔒 从 JWT 安全提取 tenantId（不信任任何前端传入的 tenantId）
 */
function getTenantIdFromJWT(req: Request): string | null {
  return req.user?.tenantId || (req as any).tenantId || null;
}

// ==================== 导出接口 ====================

/**
 * 下载独立数据查看器（不需要登录也可提供，但这里走认证保护）
 * GET /api/v1/tenant-data/viewer
 * 返回一个自包含的 HTML 文件，可以离线打开 JSON 导出数据
 */
router.get('/viewer', (_req: Request, res: Response) => {
  const viewerPath = path.join(process.cwd(), 'public', 'crm-data-viewer.html');
  if (!fs.existsSync(viewerPath)) {
    return res.status(404).json({ success: false, message: '查看器文件不存在' });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="CRM数据查看器.html"');
  res.sendFile(viewerPath);
});

/**
 * 获取可导出的表列表
 * GET /api/v1/tenant-data/exportable-tables
 */
router.get('/exportable-tables', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: TenantExportService.getExportableTables()
  });
});

/**
 * 创建导出任务
 * POST /api/v1/tenant-data/export
 * Body: { tables?: string[], startDate?: string, endDate?: string }
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromJWT(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '无法获取租户信息，请重新登录' });
    }

    const { tables, startDate, endDate } = req.body;

    const job = await TenantExportService.createExportJob({
      tenantId,
      tables,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    log.info(`[TenantData] 租户 ${tenantId} 创建导出任务 ${job.id}`);

    res.json({
      success: true,
      message: '导出任务已创建',
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress
      }
    });
  } catch (error: any) {
    log.error('[TenantData] 创建导出任务失败:', error);
    res.status(500).json({ success: false, message: '创建导出任务失败', error: error.message });
  }
});

/**
 * 查询导出进度
 * GET /api/v1/tenant-data/export/:jobId
 */
router.get('/export/:jobId', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromJWT(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '无法获取租户信息' });
    }

    const { jobId } = req.params;
    const job = TenantExportService.getExportJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: '导出任务不存在' });
    }

    // 🔒 租户归属校验
    if (job.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: '无权访问此导出任务' });
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error: any) {
    log.error('[TenantData] 查询导出进度失败:', error);
    res.status(500).json({ success: false, message: '查询导出进度失败', error: error.message });
  }
});

/**
 * 下载导出文件
 * GET /api/v1/tenant-data/export/:jobId/download
 * Query: format=json（默认）| format=html（可浏览报告）
 */
router.get('/export/:jobId/download', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromJWT(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '无法获取租户信息' });
    }

    const { jobId } = req.params;
    const format = (req.query.format as string) || 'json';
    const job = TenantExportService.getExportJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: '导出任务不存在' });
    }

    // 🔒 租户归属校验
    if (job.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: '无权下载此导出文件' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '导出任务尚未完成',
        data: { status: job.status, progress: job.progress }
      });
    }

    // 根据 format 返回 JSON 或 HTML
    if (format === 'html') {
      const htmlPath = TenantExportService.getExportHtmlFilePath(jobId);
      if (!htmlPath || !fs.existsSync(htmlPath)) {
        return res.status(404).json({ success: false, message: 'HTML报告文件不存在' });
      }
      const fileName = path.basename(htmlPath);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.sendFile(htmlPath);
    }

    // 默认: JSON 格式
    const filePath = TenantExportService.getExportFilePath(jobId);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '导出文件不存在' });
    }

    const fileName = path.basename(filePath);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);

  } catch (error: any) {
    log.error('[TenantData] 下载导出文件失败:', error);
    res.status(500).json({ success: false, message: '下载导出文件失败', error: error.message });
  }
});

// ==================== 导入接口 ====================

/**
 * 创建导入任务
 * POST /api/v1/tenant-data/import
 * Body (multipart): file + conflictStrategy + clearBeforeImport
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromJWT(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '无法获取租户信息，请重新登录' });
    }

    const { conflictStrategy = 'skip', clearBeforeImport = false } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传导入文件（JSON格式）' });
    }

    if (!['skip', 'overwrite', 'error'].includes(conflictStrategy)) {
      return res.status(400).json({
        success: false,
        message: '无效的冲突处理策略，支持: skip（跳过）, overwrite（覆盖）, error（报错）'
      });
    }

    const job = await TenantImportService.createImportJob({
      tenantId,
      filePath: req.file.path,
      conflictStrategy,
      clearBeforeImport: clearBeforeImport === 'true' || clearBeforeImport === true
    });

    log.info(`[TenantData] 租户 ${tenantId} 创建导入任务 ${job.id}, 策略=${conflictStrategy}, 清空=${clearBeforeImport}`);

    res.json({
      success: true,
      message: '导入任务已创建',
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        totalRecords: job.totalRecords
      }
    });
  } catch (error: any) {
    log.error('[TenantData] 创建导入任务失败:', error);
    res.status(500).json({ success: false, message: '创建导入任务失败', error: error.message });
  }
});

/**
 * 查询导入进度
 * GET /api/v1/tenant-data/import/:jobId
 */
router.get('/import/:jobId', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromJWT(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '无法获取租户信息' });
    }

    const { jobId } = req.params;
    const job = TenantImportService.getImportJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: '导入任务不存在' });
    }

    // 🔒 租户归属校验
    if (job.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: '无权访问此导入任务' });
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        skippedRecords: job.skippedRecords,
        errorRecords: job.errorRecords,
        errors: job.errors.slice(0, 10),
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error: any) {
    log.error('[TenantData] 查询导入进度失败:', error);
    res.status(500).json({ success: false, message: '查询导入进度失败', error: error.message });
  }
});

export default router;

