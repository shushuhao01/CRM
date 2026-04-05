import { Request, Response } from 'express';
import { ApiConfigService } from '../../services/ApiConfigService';
import { AppDataSource } from '../../config/database';

import { log } from '../../config/logger';
const apiConfigService = new ApiConfigService();

export class ApiConfigController {
  /**
   * 获取API配置列表
   */
  static async getApiConfigs(req: Request, res: Response): Promise<void> {
    try {
      // 先检查 api_configs 表是否存在
      try {
        await AppDataSource.query('SELECT 1 FROM api_configs LIMIT 1');
      } catch {
        // 表不存在，返回空列表
        res.json({
          success: true,
          message: '获取成功',
          data: [],
          total: 0
        });
        return;
      }

      const result = await apiConfigService.getApiConfigs(req.query);

      res.json({
        success: true,
        message: '获取成功',
        data: result.data,
        total: result.total
      });
    } catch (error: any) {
      log.error('获取API配置列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取API配置列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取API配置详情
   */
  static async getApiConfigById(req: Request, res: Response): Promise<void> {
    try {
      // 先检查表是否存在
      try {
        await AppDataSource.query('SELECT 1 FROM api_configs LIMIT 1');
      } catch {
        res.status(404).json({ success: false, message: 'API配置表尚未创建' });
        return;
      }

      const { id } = req.params;
      const apiConfig = await apiConfigService.getApiConfigById(id);

      if (!apiConfig) {
        res.status(404).json({
          success: false,
          message: 'API配置不存在'
        });
        return;
      }

      res.json({
        success: true,
        message: '获取成功',
        data: apiConfig
      });
    } catch (error: any) {
      log.error('获取API配置详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取API配置详情失败',
        error: error.message
      });
    }
  }

  /**
   * 创建API配置
   */
  static async createApiConfig(req: Request, res: Response): Promise<void> {
    try {
      const apiConfig = await apiConfigService.createApiConfig(req.body);

      res.json({
        success: true,
        message: 'API配置创建成功',
        data: apiConfig
      });
    } catch (error: any) {
      log.error('创建API配置失败:', error);
      res.status(500).json({
        success: false,
        message: '创建API配置失败',
        error: error.message
      });
    }
  }

  /**
   * 更新API配置
   */
  static async updateApiConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiConfig = await apiConfigService.updateApiConfig(id, req.body);

      res.json({
        success: true,
        message: 'API配置更新成功',
        data: apiConfig
      });
    } catch (error: any) {
      log.error('更新API配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新API配置失败',
        error: error.message
      });
    }
  }

  /**
   * 删除API配置
   */
  static async deleteApiConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await apiConfigService.deleteApiConfig(id);

      res.json({
        success: true,
        message: 'API配置删除成功'
      });
    } catch (error: any) {
      log.error('删除API配置失败:', error);
      res.status(500).json({
        success: false,
        message: '删除API配置失败',
        error: error.message
      });
    }
  }

  /**
   * 重新生成API密钥
   */
  static async regenerateKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiConfig = await apiConfigService.regenerateKey(id);

      res.json({
        success: true,
        message: 'API密钥重新生成成功',
        data: apiConfig
      });
    } catch (error: any) {
      log.error('重新生成API密钥失败:', error);
      res.status(500).json({
        success: false,
        message: '重新生成API密钥失败',
        error: error.message
      });
    }
  }

  /**
   * 获取API调用日志
   */
  static async getApiCallLogs(req: Request, res: Response): Promise<void> {
    try {
      // 先检查表是否存在
      try {
        await AppDataSource.query('SELECT 1 FROM api_call_logs LIMIT 1');
      } catch {
        res.json({ success: true, message: '获取成功', data: [], total: 0 });
        return;
      }

      const { id } = req.params;
      const query = { ...req.query, apiConfigId: id };
      const result = await apiConfigService.getApiCallLogs(query);

      res.json({
        success: true,
        message: '获取成功',
        data: result.data,
        total: result.total
      });
    } catch (error: any) {
      log.error('获取API调用日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取API调用日志失败',
        error: error.message
      });
    }
  }

  /**
   * 获取所有API调用日志
   */
  static async getAllApiCallLogs(req: Request, res: Response): Promise<void> {
    try {
      // 先检查表是否存在
      try {
        await AppDataSource.query('SELECT 1 FROM api_call_logs LIMIT 1');
      } catch {
        res.json({ success: true, message: '获取成功', data: [], total: 0 });
        return;
      }

      const result = await apiConfigService.getApiCallLogs(req.query);

      res.json({
        success: true,
        message: '获取成功',
        data: result.data,
        total: result.total
      });
    } catch (error: any) {
      log.error('获取API调用日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取API调用日志失败',
        error: error.message
      });
    }
  }

  /**
   * 获取API统计信息
   */
  static async getApiStatistics(req: Request, res: Response): Promise<void> {
    const emptyStats = {
      totalCalls: 0,
      successCalls: 0,
      successRate: 0,
      avgTime: 0,
      errorCount: 0
    };

    try {
      // 先检查表是否存在
      try {
        await AppDataSource.query('SELECT 1 FROM api_call_logs LIMIT 1');
      } catch {
        res.json({ success: true, message: '暂无统计数据', data: emptyStats });
        return;
      }

      const { id } = req.params;
      const statistics = await apiConfigService.getApiStatistics(id);

      res.json({
        success: true,
        message: '获取成功',
        data: statistics
      });
    } catch (error: any) {
      log.error('获取API统计信息失败:', error.message);
      // 返回空数据而非500错误，避免前端报错
      res.json({
        success: true,
        message: '暂无统计数据',
        data: emptyStats
      });
    }
  }

  /**
   * 获取全局API统计信息（无需指定ID）
   */
  static async getGlobalApiStatistics(req: Request, res: Response): Promise<void> {
    try {
      // 检查表是否存在
      let tableExists = true;
      try {
        await AppDataSource.query('SELECT 1 FROM api_call_logs LIMIT 1');
      } catch {
        tableExists = false;
      }

      if (!tableExists) {
        // 表不存在时返回空数据
        res.json({
          success: true,
          message: '获取成功',
          data: {
            totalCalls: 0,
            successCalls: 0,
            successRate: '0',
            avgTime: 0,
            errorCount: 0,
            activeApis: 0
          }
        });
        return;
      }

      // 使用正确的列名（匹配 ApiCallLog entity）
      const [totalResult] = await AppDataSource.query(
        'SELECT COUNT(*) as cnt FROM api_call_logs'
      );
      const totalCalls = Number(totalResult?.cnt) || 0;

      const [successResult] = await AppDataSource.query(
        'SELECT COUNT(*) as cnt FROM api_call_logs WHERE response_status >= 200 AND response_status < 300'
      );
      const successCalls = Number(successResult?.cnt) || 0;

      const [avgResult] = await AppDataSource.query(
        'SELECT AVG(response_time) as avgTime FROM api_call_logs WHERE response_time IS NOT NULL'
      );
      const avgTime = avgResult?.avgTime ? Math.round(Number(avgResult.avgTime)) : 0;

      const [errorResult] = await AppDataSource.query(
        'SELECT COUNT(*) as cnt FROM api_call_logs WHERE response_status >= 400 OR error_message IS NOT NULL'
      );
      const errorCalls = Number(errorResult?.cnt) || 0;

      const [activeResult] = await AppDataSource.query(
        'SELECT COUNT(DISTINCT api_config_id) as cnt FROM api_call_logs WHERE api_config_id IS NOT NULL'
      );
      const activeApis = Number(activeResult?.cnt) || 0;

      res.json({
        success: true,
        message: '获取成功',
        data: {
          totalCalls,
          successCalls,
          successRate: totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(1) : '0',
          avgTime,
          errorCount: errorCalls,
          activeApis
        }
      });
    } catch (error: any) {
      log.error('获取全局API统计信息失败:', error);
      // 返回空数据而非500错误
      res.json({
        success: true,
        message: '统计数据暂无',
        data: {
          totalCalls: 0,
          successCalls: 0,
          successRate: '0',
          avgTime: 0,
          errorCount: 0,
          activeApis: 0
        }
      });
    }
  }

  /**
   * 获取近7天调用趋势数据
   */
  static async getApiTrends(req: Request, res: Response): Promise<void> {
    try {
      let tableExists = true;
      try {
        await AppDataSource.query('SELECT 1 FROM api_call_logs LIMIT 1');
      } catch {
        tableExists = false;
      }

      const trends: { date: string; count: number; successCount: number; errorCount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        trends.push({ date: dateStr, count: 0, successCount: 0, errorCount: 0 });
      }

      if (tableExists) {
        try {
          const rows = await AppDataSource.query(
            `SELECT DATE(created_at) as call_date,
                    COUNT(*) as total,
                    SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN response_status >= 400 OR error_message IS NOT NULL THEN 1 ELSE 0 END) as error_count
             FROM api_call_logs
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)
             ORDER BY call_date`
          );

          for (const row of rows) {
            const dateStr = new Date(row.call_date).toISOString().slice(0, 10);
            const trend = trends.find(t => t.date === dateStr);
            if (trend) {
              trend.count = Number(row.total) || 0;
              trend.successCount = Number(row.success_count) || 0;
              trend.errorCount = Number(row.error_count) || 0;
            }
          }
        } catch (e) {
          // 查询失败保持0值
        }
      }

      res.json({
        success: true,
        data: trends
      });
    } catch (error: any) {
      log.error('获取API趋势失败:', error);
      res.json({ success: true, data: [] });
    }
  }
}
