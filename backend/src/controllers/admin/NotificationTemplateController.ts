/**
 * 通知模板控制器
 */

import { Request, Response } from 'express';
import { notificationTemplateService } from '../../services/NotificationTemplateService';

export class NotificationTemplateController {
  /**
   * 获取所有模板
   */
  async getAllTemplates(req: Request, res: Response) {
    try {
      const { category } = req.query;

      let templates;
      if (category) {
        templates = await notificationTemplateService.getTemplatesByCategory(category as string);
      } else {
        templates = await notificationTemplateService.getAllTemplates();
      }

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('[NotificationTemplate] 获取模板列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 获取单个模板
   */
  async getTemplate(req: Request, res: Response) {
    try {
      const { code } = req.params;

      const template = await notificationTemplateService.getTemplate(code);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error: any) {
      console.error('[NotificationTemplate] 获取模板失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 创建模板
   */
  async createTemplate(req: Request, res: Response) {
    try {
      const template = await notificationTemplateService.createTemplate(req.body);

      res.json({
        success: true,
        message: '创建成功',
        data: template
      });
    } catch (error: any) {
      console.error('[NotificationTemplate] 创建模板失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 更新模板
   */
  async updateTemplate(req: Request, res: Response) {
    try {
      const { code } = req.params;

      const template = await notificationTemplateService.updateTemplate(code, req.body);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }

      res.json({
        success: true,
        message: '更新成功',
        data: template
      });
    } catch (error: any) {
      console.error('[NotificationTemplate] 更新模板失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(req: Request, res: Response) {
    try {
      const { code } = req.params;

      const success = await notificationTemplateService.deleteTemplate(code);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: '模板不存在或无法删除'
        });
      }

      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error: any) {
      console.error('[NotificationTemplate] 删除模板失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 测试模板渲染
   */
  async testTemplate(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const { variables } = req.body;

      const result = await notificationTemplateService.testTemplate(code, variables);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[NotificationTemplate] 测试模板失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const { variables, options } = req.body;

      const result = await notificationTemplateService.sendByTemplate(code, variables, options);

      res.json(result);
    } catch (error: any) {
      console.error('[NotificationTemplate] 发送通知失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export const notificationTemplateController = new NotificationTemplateController();
