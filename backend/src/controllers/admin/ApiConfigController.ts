import { Request, Response } from 'express';
import { ApiConfigService } from '../../services/ApiConfigService';
import { AppDataSource } from '../../config/database';

const apiConfigService = new ApiConfigService();

export class ApiConfigController {
  /**
   * 获取API配置列表
   */
  static async getApiConfigs(req: Request, res: Response): Promise<void> {
    try {
      const result = await apiConfigService.getApiConfigs(req.query);

      res.json({
        success: true,
        message: '获取成功',
        data: result.data,
        total: result.total
      });
    } catch (error: any) {
      console.error('获取API配置列表失败:', error);
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
      console.error('获取API配置详情失败:', error);
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
      console.error('创建API配置失败:', error);
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
      console.error('更新API配置失败:', error);
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
      console.error('删除API配置失败:', error);
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
      console.error('重新生成API密钥失败:', error);
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
      console.error('获取API调用日志失败:', error);
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
      const result = await apiConfigService.getApiCallLogs(req.query);

      res.json({
        success: true,
        message: '获取成功',
        data: result.data,
        total: result.total
      });
    } catch (error: any) {
      console.error('获取API调用日志失败:', error);
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
    try {
      const { id } = req.params;
      const statistics = await apiConfigService.getApiStatistics(id);

      res.json({
        success: true,
        message: '获取成功',
        data: statistics
      });
    } catch (error: any) {
      console.error('获取API统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取API统计信息失败',
        error: error.message
      });
    }
  }

  /**
   * 获取全局API统计信息（无需指定ID）
   */
  static async getGlobalApiStatistics(req: Request, res: Response): Promise<void> {
    try {
      // 使用 Raw SQL 查询，匹配实际数据库表结构
      const [totalResult] = await AppDataSource.query('SELECT COUNT(*) as cnt FROM api_call_logs');
      const totalCalls = totalResult?.cnt || 0;

      const [successResult] = await AppDataSource.query('SELECT COUNT(*) as cnt FROM api_call_logs WHERE success = 1');
      const successCalls = successResult?.cnt || 0;

      const [avgResult] = await AppDataSource.query('SELECT AVG(response_time) as avgTime FROM api_call_logs');
      const avgTime = avgResult?.avgTime ? Math.round(avgResult.avgTime) : 0;

      const [errorResult] = await AppDataSource.query('SELECT COUNT(*) as cnt FROM api_call_logs WHERE success = 0 OR error_message IS NOT NULL');
      const errorCalls = errorResult?.cnt || 0;

      const [activeResult] = await AppDataSource.query('SELECT COUNT(DISTINCT interface_code) as cnt FROM api_call_logs');
      const activeApis = activeResult?.cnt || 0;

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
      console.error('获取全局API统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取全局API统计信息失败',
        error: error.message
      });
    }
  }
}
