/**
 * 租户数据导出 API
 *
 * 路由：
 * POST   /api/admin/tenants/:id/export        - 创建导出任务
 * GET    /api/admin/tenants/:id/export/:jobId - 查询导出进度
 * GET    /api/admin/tenants/:id/export/:jobId/download - 下载导出文件
 */

import { Router, Request, Response } from 'express';
import { TenantExportService } from '../../services/TenantExportService';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

/**
 * 创建导出任务
 * POST /api/admin/tenants/:id/export
 */
router.post('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id: tenantId } = req.params;
    const { tables, startDate, endDate } = req.body;

    // 创建导出任务
    const job = await TenantExportService.createExportJob({
      tenantId,
      tables,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

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
    console.error('创建导出任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建导出任务失败',
      error: error.message
    });
  }
});

/**
 * 查询导出进度
 * GET /api/admin/tenants/:id/export/:jobId
 */
router.get('/:id/export/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = TenantExportService.getExportJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '导出任务不存在'
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
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error: any) {
    console.error('查询导出进度失败:', error);
    res.status(500).json({
      success: false,
      message: '查询导出进度失败',
      error: error.message
    });
  }
});

/**
 * 下载导出文件
 * GET /api/admin/tenants/:id/export/:jobId/download
 */
router.get('/:id/export/:jobId/download', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = TenantExportService.getExportJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '导出任务不存在'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '导出任务尚未完成',
        data: {
          status: job.status,
          progress: job.progress
        }
      });
    }

    const filePath = TenantExportService.getExportFilePath(jobId);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '导出文件不存在'
      });
    }

    // 设置下载响应头
    const fileName = path.basename(filePath);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // 发送文件
    res.sendFile(filePath);

  } catch (error: any) {
    console.error('下载导出文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载导出文件失败',
      error: error.message
    });
  }
});

export default router;
