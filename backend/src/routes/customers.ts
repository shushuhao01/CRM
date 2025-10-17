import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * 客户管理路由
 * TODO: 实现客户相关的CRUD操作
 */

// 所有客户路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/customers
 * @desc 获取客户列表
 * @access Private
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '客户管理功能开发中',
    data: []
  });
});

export default router;