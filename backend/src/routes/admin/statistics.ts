/**
 * 管理后台 - 统计数据API
 */
import { Router } from 'express';
import { statisticsController } from '../../controllers/admin/StatisticsController';

const router = Router();

// 仪表盘统计
router.get('/dashboard', (req, res) => statisticsController.getDashboard(req, res));

// 租户统计
router.get('/tenants', (req, res) => statisticsController.getTenants(req, res));

// 收入统计
router.get('/revenue', (req, res) => statisticsController.getRevenue(req, res));

// 用户统计
router.get('/users', (req, res) => statisticsController.getUsers(req, res));

// 趋势分析
router.get('/trend', (req, res) => statisticsController.getTrend(req, res));

export default router;
