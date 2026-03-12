import { Request, Response } from 'express';
import { adminUserService } from '../../services/AdminUserService';

export class AdminUserController {
  /**
   * 记录操作日志的辅助方法
   */
  private async logAction(req: Request, action: string, targetId?: string, detail?: string) {
    try {
      await adminUserService.logOperation({
        adminId: (req as any).adminUser?.id || '',
        adminName: (req as any).adminUser?.username,
        action,
        module: 'admin_users',
        targetType: 'admin_user',
        targetId,
        detail,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (error) {
      // 日志记录失败不影响主流程
      console.error('记录操作日志失败:', error);
    }
  }

  /**
   * 获取管理员列表
   */
  async getAdminUsers(req: Request, res: Response) {
    try {
      const result = await adminUserService.getAdminUsers(req.query);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取管理员列表失败'
      });
    }
  }

  /**
   * 获取管理员详情
   */
  async getAdminUserById(req: Request, res: Response) {
    try {
      const user = await adminUserService.getAdminUserById(req.params.id);
      res.json({
        success: true,
        data: user
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '管理员不存在'
      });
    }
  }

  /**
   * 创建管理员
   */
  async createAdminUser(req: Request, res: Response) {
    try {
      const user = await adminUserService.createAdminUser(req.body);
      await this.logAction(req, 'create', user.id, `创建管理员: ${req.body.username}`);

      res.json({
        success: true,
        data: user,
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
   * 更新管理员
   */
  async updateAdminUser(req: Request, res: Response) {
    try {
      const user = await adminUserService.updateAdminUser(req.params.id, req.body);
      await this.logAction(req, 'update', req.params.id, `更新管理员信息`);

      res.json({
        success: true,
        data: user,
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
   * 删除管理员
   */
  async deleteAdminUser(req: Request, res: Response) {
    try {
      const result = await adminUserService.deleteAdminUser(req.params.id);
      await this.logAction(req, 'delete', req.params.id, `删除管理员`);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '删除失败'
      });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await adminUserService.changePassword(req.params.id, oldPassword, newPassword);
      await this.logAction(req, 'change_password', req.params.id, `修改密码`);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '修改密码失败'
      });
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { newPassword } = req.body;
      const result = await adminUserService.resetPassword(req.params.id, newPassword);
      await this.logAction(req, 'reset_password', req.params.id, `重置密码`);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '重置密码失败'
      });
    }
  }

  /**
   * 锁定用户
   */
  async lockUser(req: Request, res: Response) {
    try {
      const result = await adminUserService.lockUser(req.params.id);
      await this.logAction(req, 'lock', req.params.id, `锁定用户`);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '锁定失败'
      });
    }
  }

  /**
   * 解锁用户
   */
  async unlockUser(req: Request, res: Response) {
    try {
      const result = await adminUserService.unlockUser(req.params.id);
      await this.logAction(req, 'unlock', req.params.id, `解锁用户`);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '解锁失败'
      });
    }
  }

  /**
   * 获取操作日志
   */
  async getOperationLogs(req: Request, res: Response) {
    try {
      const result = await adminUserService.getOperationLogs(req.query);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取操作日志失败'
      });
    }
  }
}

export const adminUserController = new AdminUserController();
