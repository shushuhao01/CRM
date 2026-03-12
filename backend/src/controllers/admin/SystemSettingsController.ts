import { Request, Response } from 'express';
import { systemSettingsService } from '../../services/SystemSettingsService';
import { adminUserService } from '../../services/AdminUserService';

export class SystemSettingsController {
  /**
   * 获取系统设置
   */
  async getSettings(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const settings = await systemSettingsService.getSettings(category as string);
      res.json({
        success: true,
        data: settings
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取系统设置失败'
      });
    }
  }

  /**
   * 更新系统设置
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const { category = 'system', settings } = req.body;
      const result = await systemSettingsService.updateSettings(category, settings);

      // 记录操作日志
      await adminUserService.logOperation({
        adminId: (req as any).adminUser?.id || '',
        adminName: (req as any).adminUser?.username,
        action: 'update_settings',
        module: 'system_settings',
        detail: `更新系统设置: ${category}`,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '更新系统设置失败'
      });
    }
  }

  /**
   * 获取单个配置项
   */
  async getSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const value = await systemSettingsService.getSetting(key);
      res.json({
        success: true,
        data: value
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取配置失败'
      });
    }
  }

  /**
   * 设置单个配置项
   */
  async setSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value, category } = req.body;
      const result = await systemSettingsService.setSetting(key, value, category);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '设置配置失败'
      });
    }
  }
}

export const systemSettingsController = new SystemSettingsController();
