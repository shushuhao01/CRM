/**
 * 租户数据导入 API
 *
 * 路由：
 * POST   /api/admin/tenants/:id/import        - 创建导入任务
 * GET    /api/admin/tenants/:id/import/:jobId - 查询导入进度
 */

import { Router, Request, Response } from 'express';
import { TenantImportService } from '../../services/TenantImportService';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

import { log } from '../../config/logger';
const router = Router();

// 配置文件上传
const uploadDir = path.join(__dirname, '../../../uploads/tenant-imports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `import_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JSON 格式文件'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

/**
 * 创建导入任务
 * POST /api/admin/tenants/:id/import
 */
router.post('/:id/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id: tenantId } = req.params;
    const { conflictStrategy = 'skip' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传导入文件'
      });
    }

    // 验证冲突策略
    if (!['skip', 'overwrite', 'error'].includes(conflictStrategy)) {
      return res.status(400).json({
        success: false,
        message: '无效的冲突处理策略，支持: skip, overwrite, error'
      });
    }

    // 创建导入任务
    const job = await TenantImportService.createImportJob({
      tenantId,
      filePath: req.file.path,
      conflictStrategy
    });

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
    log.error('创建导入任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建导入任务失败',
      error: error.message
    });
  }
});

/**
 * 查询导入进度
 * GET /api/admin/tenants/:id/import/:jobId
 */
router.get('/:id/import/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = TenantImportService.getImportJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '导入任务不存在'
      });
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
        errors: job.errors.slice(0, 10), // 只返回前10条错误
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error: any) {
    log.error('查询导入进度失败:', error);
    res.status(500).json({
      success: false,
      message: '查询导入进度失败',
      error: error.message
    });
  }
});

export default router;
