import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * 订单管理路由
 * TODO: 实现订单相关的CRUD操作
 */

// 所有订单路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/orders
 * @desc 获取订单列表
 * @access Private
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '订单管理功能开发中',
    data: []
  });
});

export default router;