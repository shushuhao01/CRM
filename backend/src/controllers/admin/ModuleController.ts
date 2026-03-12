import { Request, Response } from 'express';
import { moduleService } from '../../services/ModuleService';

export class ModuleController {
  /**
   * 获取模块列表
   */
  async getModules(req: Request, res: Response) {
    try {
      const result = await moduleService.getModules(req.query);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取模块列表失败'
      });
    }
  }

  /**
   * 获取模块详情
   */
  async getModuleById(req: Request, res: Response) {
    try {
      const module = await moduleService.getModuleById(req.params.id);
      res.json({
        success: true,
        data: module
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '模块不存在'
      });
    }
  }

  /**
   * 创建模块
   */
  async createModule(req: Request, res: Response) {
    try {
      const module = await moduleService.createModule(req.body);
      res.json({
        success: true,
        data: module,
        message: '创建成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '创建失败'
      });
    }
  }

  /**
   * 更新模块
   */
  async updateModule(req: Request, res: Response) {
    try {
      const module = await moduleService.updateModule(req.params.id, req.body);
      res.json({
        success: true,
        data: module,
        message: '更新成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '更新失败'
      });
    }
  }

  /**
   * 删除模块
   */
  async deleteModule(req: Request, res: Response) {
    try {
      const result = await moduleService.deleteModule(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '删除失败'
      });
    }
  }

  /**
   * 启用模块
   */
  async enableModule(req: Request, res: Response) {
    try {
      const result = await moduleService.enableModule(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '启用失败'
      });
    }
  }

  /**
   * 禁用模块
   */
  async disableModule(req: Request, res: Response) {
    try {
      const result = await moduleService.disableModule(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '禁用失败'
      });
    }
  }

  /**
   * 获取模块配置
   */
  async getModuleConfig(req: Request, res: Response) {
    try {
      const config = await moduleService.getModuleConfig(req.params.id);
      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '获取配置失败'
      });
    }
  }

  /**
   * 更新模块配置
   */
  async updateModuleConfig(req: Request, res: Response) {
    try {
      const result = await moduleService.updateModuleConfig(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '更新配置失败'
      });
    }
  }
}

export const moduleController = new ModuleController();
