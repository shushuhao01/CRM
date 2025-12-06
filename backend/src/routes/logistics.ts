import { Router, Request, Response } from 'express';
import { LogisticsController } from '../controllers/LogisticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const logisticsController = new LogisticsController();

// 应用认证中间件
router.use(authenticateToken);

// 获取物流列表
router.get('/list', (req, res) => logisticsController.getLogisticsList(req, res));

// 获取支持的快递公司列表
router.get('/companies', (req, res) => logisticsController.getSupportedCompanies(req, res));

// 创建物流跟踪
router.post('/tracking', (req, res) => logisticsController.createLogisticsTracking(req, res));

// 查询物流轨迹
router.get('/trace', (req, res) => logisticsController.getLogisticsTrace(req, res));

// 批量同步物流状态
router.post('/batch-sync', (req, res) => logisticsController.batchSyncLogistics(req, res));

// 更新物流状态
router.put('/tracking/:id', (req, res) => logisticsController.updateLogisticsStatus(req, res));

// 获取用户物流权限
router.get('/permission', (req: Request, res: Response) => {
  try {
    const user = (req as unknown).user;

    // 根据用户角色返回权限信息
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    const isManager = user?.role === 'manager' || user?.role === 'department_head';
    const isLogisticsStaff = user?.department === 'logistics';

    const permission = {
      canView: true,
      canUpdate: isAdmin || isManager || isLogisticsStaff,
      canBatchUpdate: isAdmin || isManager,
      canExport: isAdmin || isManager,
      role: user?.role || 'user',
      department: user?.department || ''
    };

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    console.error('获取物流权限失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物流权限失败'
    });
  }
});

// 获取物流状态更新页面的订单列表
router.get('/status-update/orders', async (req, res) => {
  try {
    const { tab = 'pending', page = 1, pageSize = 20, keyword, status, dateRange } = req.query;

    // 这里应该从数据库获取订单数据
    // 目前返回模拟数据结构
    res.json({
      success: true,
      data: {
        list: [],
        total: 0,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取物流状态更新订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
});

// 获取物流状态更新汇总数据
router.get('/status-update/summary', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pending: 0,
        updated: 0,
        todo: 0,
        total: 0
      }
    });
  } catch (error) {
    console.error('获取物流状态汇总失败:', error);
    res.status(500).json({
      success: false,
      message: '获取汇总数据失败'
    });
  }
});

// 获取物流汇总数据
router.get('/summary', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pending: 0,
        inTransit: 0,
        delivered: 0,
        exception: 0,
        total: 0
      }
    });
  } catch (error) {
    console.error('获取物流汇总失败:', error);
    res.status(500).json({
      success: false,
      message: '获取汇总数据失败'
    });
  }
});

// 更新订单物流状态
router.post('/order/status', async (req, res) => {
  try {
    const { orderNo, newStatus, remark } = req.body;

    // 这里应该更新数据库中的订单物流状态
    console.log('更新订单物流状态:', { orderNo, newStatus, remark });

    res.json({
      success: true,
      message: '物流状态更新成功'
    });
  } catch (error) {
    console.error('更新订单物流状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新物流状态失败'
    });
  }
});

// 批量更新订单物流状态
router.post('/order/batch-status', async (req, res) => {
  try {
    const { orderNos, newStatus, remark } = req.body;

    console.log('批量更新订单物流状态:', { orderNos, newStatus, remark });

    res.json({
      success: true,
      message: '批量更新成功',
      data: {
        successCount: orderNos?.length || 0,
        failCount: 0
      }
    });
  } catch (error) {
    console.error('批量更新订单物流状态失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败'
    });
  }
});

// 设置订单待办
router.post('/order/todo', async (req, res) => {
  try {
    const { orderNo, days, remark } = req.body;

    console.log('设置订单待办:', { orderNo, days, remark });

    res.json({
      success: true,
      message: '待办设置成功'
    });
  } catch (error) {
    console.error('设置订单待办失败:', error);
    res.status(500).json({
      success: false,
      message: '设置待办失败'
    });
  }
});

// 获取物流状态日志
router.get('/log', async (req, res) => {
  try {
    const { orderNo, page = 1, pageSize = 20 } = req.query;

    res.json({
      success: true,
      data: {
        list: [],
        total: 0,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取物流日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取日志失败'
    });
  }
});

// 导出物流状态数据
router.get('/export', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        url: '',
        filename: 'logistics_export.xlsx'
      }
    });
  } catch (error) {
    console.error('导出物流数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败'
    });
  }
});

export default router;
