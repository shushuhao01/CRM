import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有客户分享路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/customer-share/history
 * @desc 获取分享历史
 */
router.get('/history', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      code: 200,
      data: { list: [], total: 0, page: 1, pageSize: 20 }
    });
  } catch (error) {
    console.error('获取分享历史失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取分享历史失败' });
  }
});

/**
 * @route POST /api/v1/customer-share/share
 * @desc 分享客户
 */
router.post('/share', async (req: Request, res: Response) => {
  try {
    const { customerId, sharedTo, timeLimit, remark } = req.body;

    if (!customerId || !sharedTo) {
      return res.status(400).json({ success: false, code: 400, message: '参数不完整' });
    }

    // 返回模拟成功响应
    res.status(201).json({
      success: true,
      code: 200,
      message: '客户分享成功',
      data: {
        id: `share_${Date.now()}`,
        customerId,
        sharedTo,
        timeLimit: timeLimit || 0,
        remark: remark || '',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('分享客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '分享客户失败' });
  }
});

/**
 * @route POST /api/v1/customer-share/recall
 * @desc 回收客户
 */
router.post('/recall', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.body;
    if (!shareId) {
      return res.status(400).json({ success: false, code: 400, message: '分享ID不能为空' });
    }
    res.json({ success: true, code: 200, message: '客户回收成功' });
  } catch (error) {
    console.error('回收客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '回收客户失败' });
  }
});

/**
 * @route GET /api/v1/customer-share/my-shared
 * @desc 获取我分享的客户
 */
router.get('/my-shared', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, code: 200, data: [] });
  } catch (error) {
    console.error('获取我分享的客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

/**
 * @route GET /api/v1/customer-share/shared-to-me
 * @desc 获取分享给我的客户
 */
router.get('/shared-to-me', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, code: 200, data: [] });
  } catch (error) {
    console.error('获取分享给我的客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

/**
 * @route GET /api/v1/customer-share/shareable-users
 * @desc 获取可分享的用户列表
 */
router.get('/shareable-users', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, code: 200, data: [] });
  } catch (error) {
    console.error('获取可分享用户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

export default router;
