/**
 * 统计数据控制器
 */
import { Request, Response } from 'express';
import { statisticsService } from '../../services/StatisticsService';

export class StatisticsController {
  /**
   * 获取仪表盘统计
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const stats = await statisticsService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('[StatisticsController] Get dashboard failed:', error);
      res.status(500).json({ success: false, message: '获取仪表盘数据失败' });
    }
  }

  /**
   * 获取租户统计
   */
  async getTenants(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, packageId } = req.query;
      const stats = await statisticsService.getTenantStats({
        startDate: startDate as string,
        endDate: endDate as string,
        packageId: packageId as string
      });
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('[StatisticsController] Get tenants failed:', error);
      res.status(500).json({ success: false, message: '获取租户统计失败' });
    }
  }

  /**
   * 获取收入统计
   */
  async getRevenue(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const stats = await statisticsService.getRevenueStats({
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as 'day' | 'month' | 'year'
      });
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('[StatisticsController] Get revenue failed:', error);
      res.status(500).json({ success: false, message: '获取收入统计失败' });
    }
  }

  /**
   * 获取用户统计
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const stats = await statisticsService.getUserStats({
        startDate: startDate as string,
        endDate: endDate as string
      });
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('[StatisticsController] Get users failed:', error);
      res.status(500).json({ success: false, message: '获取用户统计失败' });
    }
  }

  /**
   * 获取趋势分析
   */
  async getTrend(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const stats = await statisticsService.getTrendAnalysis(Number(days));
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('[StatisticsController] Get trend failed:', error);
      res.status(500).json({ success: false, message: '获取趋势分析失败' });
    }
  }
}

export const statisticsController = new StatisticsController();
