import { Request, Response } from 'express';
import { privateCustomerService } from '../../services/PrivateCustomerService';

export class PrivateCustomerController {
  /**
   * 获取私有客户列表
   */
  async getList(req: Request, res: Response) {
    try {
      const { page, pageSize, keyword, industry, status, licenseStatus } = req.query;

      const result = await privateCustomerService.getList({
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 10,
        keyword: keyword as string,
        industry: industry as string,
        status: status as string,
        licenseStatus: licenseStatus as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取客户列表失败',
      });
    }
  }

  /**
   * 获取私有客户详情
   */
  async getDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await privateCustomerService.getDetail(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '获取客户详情失败',
      });
    }
  }

  /**
   * 创建私有客户
   */
  async create(req: Request, res: Response) {
    try {
      const data = req.body;

      // 验证必填字段
      if (!data.customerName) {
        return res.status(400).json({
          success: false,
          message: '客户名称不能为空',
        });
      }

      if (!data.licenseType) {
        return res.status(400).json({
          success: false,
          message: '授权类型不能为空',
        });
      }

      const result = await privateCustomerService.create(data);

      res.json({
        success: true,
        data: result,
        message: '创建成功',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '创建客户失败',
      });
    }
  }

  /**
   * 更新私有客户信息
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const result = await privateCustomerService.update(id, data);

      res.json({
        success: true,
        data: result,
        message: '更新成功',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '更新客户失败',
      });
    }
  }

  /**
   * 删除私有客户
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await privateCustomerService.delete(id);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '删除客户失败',
      });
    }
  }

  /**
   * 获取客户的所有授权
   */
  async getLicenses(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page, pageSize } = req.query;

      const result = await privateCustomerService.getLicenses(id, {
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 10,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取授权列表失败',
      });
    }
  }

  /**
   * 为客户生成新授权
   */
  async generateLicense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const result = await privateCustomerService.generateLicense(id, data);

      res.json({
        success: true,
        data: result,
        message: '生成授权成功',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '生成授权失败',
      });
    }
  }
}

export const privateCustomerController = new PrivateCustomerController();
