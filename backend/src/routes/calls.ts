import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';

const router = Router();

// 获取通话统计数据
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    logger.info('获取通话统计数据', {
      service: 'crm-api',
      startDate,
      endDate,
      groupBy
    });

    // 模拟通话统计数据
    const mockData = {
      success: true,
      data: {
        totalCalls: 1250,
        successfulCalls: 1180,
        failedCalls: 70,
        averageDuration: 180, // 秒
        statistics: [
          {
            date: '2025-10-04',
            totalCalls: 420,
            successfulCalls: 395,
            failedCalls: 25,
            averageDuration: 175
          },
          {
            date: '2025-10-05',
            totalCalls: 380,
            successfulCalls: 360,
            failedCalls: 20,
            averageDuration: 185
          }
        ]
      }
    };

    res.json(mockData);
  } catch (error) {
    logger.error('获取通话统计数据失败', {
      service: 'crm-api',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      message: '获取通话统计数据失败',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 获取通话记录列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    logger.info('获取通话记录列表', {
      service: 'crm-api',
      page,
      limit,
      status,
      startDate,
      endDate
    });

    // 模拟通话记录数据
    const mockData = {
      success: true,
      data: {
        total: 1250,
        page: Number(page),
        limit: Number(limit),
        records: [
          {
            id: '1',
            customerName: '张三',
            customerPhone: '13800138001',
            callType: 'outbound',
            status: 'completed',
            duration: 180,
            startTime: '2025-10-05T10:30:00Z',
            endTime: '2025-10-05T10:33:00Z',
            agentName: '李销售',
            notes: '客户咨询产品价格'
          },
          {
            id: '2',
            customerName: '李四',
            customerPhone: '13800138002',
            callType: 'inbound',
            status: 'completed',
            duration: 240,
            startTime: '2025-10-05T11:15:00Z',
            endTime: '2025-10-05T11:19:00Z',
            agentName: '王客服',
            notes: '售后服务咨询'
          }
        ]
      }
    };

    res.json(mockData);
  } catch (error) {
    logger.error('获取通话记录列表失败', {
      service: 'crm-api',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      message: '获取通话记录列表失败',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 导出通话记录
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, format = 'excel' } = req.query;

    logger.info('导出通话记录', {
      service: 'crm-api',
      startDate,
      endDate,
      status,
      format
    });

    res.json({
      success: true,
      data: {
        url: '',
        filename: `calls_export_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`
      }
    });
  } catch (error) {
    logger.error('导出通话记录失败', {
      service: 'crm-api',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      message: '导出通话记录失败',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
