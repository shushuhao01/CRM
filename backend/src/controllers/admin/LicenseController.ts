/**
 * 授权管理控制器
 *
 * 功能：
 * 1. 授权CRUD操作
 * 2. 授权激活/停用
 * 3. 授权验证
 * 4. 授权日志查询
 * 5. 授权统计
 */

import { Request, Response } from 'express';
import { licenseService } from '../../services/LicenseService';

import { log } from '../../config/logger';
/**
 * 创建授权
 * POST /api/admin/licenses
 */
export const createLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerName,
      customerContact,
      customerPhone,
      customerEmail,
      licenseType,
      maxUsers,
      maxStorageGb,
      features,
      expiresAt,
      notes
    } = req.body;

    // 验证必填字段
    if (!customerName) {
      res.status(400).json({
        success: false,
        message: '客户名称不能为空'
      });
      return;
    }

    if (!licenseType || !['trial', 'perpetual', 'annual', 'monthly'].includes(licenseType)) {
      res.status(400).json({
        success: false,
        message: '授权类型无效'
      });
      return;
    }

    // 创建授权
    const license = await licenseService.createLicense({
      customerName,
      customerContact,
      customerPhone,
      customerEmail,
      licenseType,
      maxUsers,
      maxStorageGb,
      features,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
      createdBy: (req as any).adminUser?.id
    });

    res.json({
      success: true,
      message: '授权创建成功',
      data: license
    });
  } catch (error: any) {
    log.error('创建授权失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '创建授权失败'
    });
  }
};

/**
 * 获取授权列表
 * GET /api/admin/licenses
 */
export const getLicenseList = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page,
      pageSize,
      keyword,
      status,
      licenseType,
      sortBy,
      sortOrder
    } = req.query;

    const result = await licenseService.getLicenseList({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword: keyword as string,
      status: status as string,
      licenseType: licenseType as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    res.json({
      success: true,
      data: {
        list: result.list,
        total: result.total,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20
      }
    });
  } catch (error: any) {
    log.error('获取授权列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取授权列表失败'
    });
  }
};

/**
 * 获取授权详情
 * GET /api/admin/licenses/:id
 */
export const getLicenseDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const license = await licenseService.getLicenseById(id);

    if (!license) {
      res.status(404).json({
        success: false,
        message: '授权不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: license
    });
  } catch (error: any) {
    log.error('获取授权详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取授权详情失败'
    });
  }
};

/**
 * 更新授权
 * PUT /api/admin/licenses/:id
 */
export const updateLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 不允许直接修改某些字段
    delete updateData.id;
    delete updateData.licenseKey;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // 转换日期字段
    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    }

    const license = await licenseService.updateLicense(id, updateData);

    res.json({
      success: true,
      message: '授权更新成功',
      data: license
    });
  } catch (error: any) {
    log.error('更新授权失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新授权失败'
    });
  }
};

/**
 * 删除授权
 * DELETE /api/admin/licenses/:id
 */
export const deleteLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await licenseService.deleteLicense(id);

    res.json({
      success: true,
      message: '授权删除成功'
    });
  } catch (error: any) {
    log.error('删除授权失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除授权失败'
    });
  }
};

/**
 * 激活授权
 * POST /api/admin/licenses/:id/activate
 */
export const activateLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { machineId } = req.body;

    const license = await licenseService.activateLicense(id, machineId);

    res.json({
      success: true,
      message: '授权激活成功',
      data: license
    });
  } catch (error: any) {
    log.error('激活授权失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '激活授权失败'
    });
  }
};

/**
 * 停用授权
 * POST /api/admin/licenses/:id/deactivate
 */
export const deactivateLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const license = await licenseService.deactivateLicense(id, reason);

    res.json({
      success: true,
      message: '授权停用成功',
      data: license
    });
  } catch (error: any) {
    log.error('停用授权失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '停用授权失败'
    });
  }
};

/**
 * 续期授权
 * POST /api/admin/licenses/:id/renew
 */
export const renewLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { expiresAt } = req.body;

    if (!expiresAt) {
      res.status(400).json({
        success: false,
        message: '到期时间不能为空'
      });
      return;
    }

    const license = await licenseService.renewLicense(id, new Date(expiresAt));

    res.json({
      success: true,
      message: '授权续期成功',
      data: license
    });
  } catch (error: any) {
    log.error('续期授权失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '续期授权失败'
    });
  }
};

/**
 * 验证授权
 * POST /api/admin/licenses/verify
 */
export const verifyLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { licenseKey, machineId } = req.body;

    if (!licenseKey) {
      res.status(400).json({
        success: false,
        message: '授权码不能为空'
      });
      return;
    }

    const result = await licenseService.verifyLicense(licenseKey, machineId);

    res.json({
      success: result.valid,
      message: result.message,
      data: result.license
    });
  } catch (error: any) {
    log.error('验证授权失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '验证授权失败'
    });
  }
};

/**
 * 获取授权日志
 * GET /api/admin/licenses/:id/logs
 */
export const getLicenseLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page, pageSize } = req.query;

    const result = await licenseService.getLicenseLogs(id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });

    res.json({
      success: true,
      data: {
        list: result.list,
        total: result.total,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20
      }
    });
  } catch (error: any) {
    log.error('获取授权日志失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取授权日志失败'
    });
  }
};

/**
 * 获取授权统计
 * GET /api/admin/licenses/statistics
 */
export const getLicenseStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const statistics = await licenseService.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    log.error('获取授权统计失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取授权统计失败'
    });
  }
};
