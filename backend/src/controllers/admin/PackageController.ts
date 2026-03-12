import { Request, Response } from 'express';
import { PackageService } from '../../services/PackageService';

export class PackageController {
  private packageService: PackageService;

  constructor() {
    this.packageService = new PackageService();
  }

  /**
   * 获取套餐列表
   * GET /api/v1/admin/packages
   */
  getPackages = async (req: Request, res: Response) => {
    try {
      const { type, status, page, pageSize } = req.query;

      const result = await this.packageService.getPackages({
        type: type as 'saas' | 'private' | undefined,
        status: status ? Number(status) : undefined,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 100
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('获取套餐列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取套餐列表失败'
      });
    }
  };

  /**
   * 获取套餐详情
   * GET /api/v1/admin/packages/:id
   */
  getPackageById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pkg = await this.packageService.getPackageById(Number(id));

      res.json({
        success: true,
        data: pkg
      });
    } catch (error: any) {
      console.error('获取套餐详情失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '套餐不存在'
      });
    }
  };

  /**
   * 创建套餐
   * POST /api/v1/admin/packages
   */
  createPackage = async (req: Request, res: Response) => {
    try {
      const data = req.body;

      // 验证必填字段
      if (!data.name || !data.code || !data.type) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段：name, code, type'
        });
      }

      // 验证套餐类型
      if (!['saas', 'private'].includes(data.type)) {
        return res.status(400).json({
          success: false,
          message: '套餐类型必须是 saas 或 private'
        });
      }

      // 验证计费周期
      if (data.billing_cycle && !['monthly', 'yearly', 'once'].includes(data.billing_cycle)) {
        return res.status(400).json({
          success: false,
          message: '计费周期必须是 monthly, yearly 或 once'
        });
      }

      const pkg = await this.packageService.createPackage(data);

      res.status(201).json({
        success: true,
        data: pkg,
        message: '创建成功'
      });
    } catch (error: any) {
      console.error('创建套餐失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '创建套餐失败'
      });
    }
  };

  /**
   * 更新套餐
   * PUT /api/v1/admin/packages/:id
   */
  updatePackage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      // 验证套餐类型
      if (data.type && !['saas', 'private'].includes(data.type)) {
        return res.status(400).json({
          success: false,
          message: '套餐类型必须是 saas 或 private'
        });
      }

      // 验证计费周期
      if (data.billing_cycle && !['monthly', 'yearly', 'once'].includes(data.billing_cycle)) {
        return res.status(400).json({
          success: false,
          message: '计费周期必须是 monthly, yearly 或 once'
        });
      }

      const pkg = await this.packageService.updatePackage(Number(id), data);

      res.json({
        success: true,
        data: pkg,
        message: '更新成功'
      });
    } catch (error: any) {
      console.error('更新套餐失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新套餐失败'
      });
    }
  };

  /**
   * 删除套餐
   * DELETE /api/v1/admin/packages/:id
   */
  deletePackage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.packageService.deletePackage(Number(id));

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('删除套餐失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '删除套餐失败'
      });
    }
  };

  /**
   * 切换套餐状态
   * POST /api/v1/admin/packages/:id/toggle-status
   */
  toggleStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pkg = await this.packageService.togglePackageStatus(Number(id));

      res.json({
        success: true,
        data: pkg,
        message: pkg.status ? '已启用' : '已禁用'
      });
    } catch (error: any) {
      console.error('切换套餐状态失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '操作失败'
      });
    }
  };

  /**
   * 获取推荐套餐
   * GET /api/v1/admin/packages/recommended
   */
  getRecommendedPackages = async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const packages = await this.packageService.getRecommendedPackages(
        type as 'saas' | 'private' | undefined
      );

      res.json({
        success: true,
        data: packages
      });
    } catch (error: any) {
      console.error('获取推荐套餐失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取推荐套餐失败'
      });
    }
  };

  /**
   * 获取可见套餐（用于官网展示）
   * GET /api/v1/admin/packages/visible
   */
  getVisiblePackages = async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const packages = await this.packageService.getVisiblePackages(
        type as 'saas' | 'private' | undefined
      );

      res.json({
        success: true,
        data: packages
      });
    } catch (error: any) {
      console.error('获取可见套餐失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取可见套餐失败'
      });
    }
  };
}
