import { Router, Request, Response } from 'express';
import { privateCustomerController } from '../../controllers/admin/PrivateCustomerController';
import { AppDataSource } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

import { log } from '../../config/logger';
const router = Router();

// 获取私有客户列表
router.get('/', (req, res) => privateCustomerController.getList(req, res));

// 获取私有客户详情
router.get('/:id', (req, res) => privateCustomerController.getDetail(req, res));

// 创建私有客户
router.post('/', (req, res) => privateCustomerController.create(req, res));

// 更新私有客户信息
router.put('/:id', (req, res) => privateCustomerController.update(req, res));

// 删除私有客户
router.delete('/:id', (req, res) => privateCustomerController.delete(req, res));

// 获取客户的所有授权
router.get('/:id/licenses', (req, res) => privateCustomerController.getLicenses(req, res));

// 为客户生成新授权
router.post('/:id/licenses', (req, res) => privateCustomerController.generateLicense(req, res));

// 解锁私有客户管理员账号
router.post('/:id/unlock-admin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    const bcrypt = require('bcrypt');

    // 查找私有客户的授权记录
    const licenses = await AppDataSource.query(
      'SELECT id, license_key, customer_phone FROM licenses WHERE private_customer_id = ?',
      [id]
    );

    if (licenses.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该客户的授权记录' });
    }

    // 获取客户手机号（管理员账号）
    const customerPhone = licenses[0].customer_phone;
    if (!customerPhone) {
      return res.status(400).json({ success: false, message: '该客户没有关联的手机号' });
    }

    // 查找被锁定的管理员账号
    const lockedUsers = await AppDataSource.query(
      `SELECT id, username, password FROM users
       WHERE username = ? AND status = 'locked' AND role = 'admin'`,
      [customerPhone]
    );

    if (lockedUsers.length === 0) {
      return res.json({
        success: true,
        message: '该账号未被锁定',
        data: { unlockedCount: 0, username: customerPhone }
      });
    }

    let fixedPasswordCount = 0;
    const defaultPassword = 'Aa123456';

    // 检查并修复密码格式
    for (const user of lockedUsers) {
      // 检查密码格式是否为bcrypt
      const isBcryptFormat = user.password && user.password.startsWith('$2') && user.password.length === 60;

      if (!isBcryptFormat) {
        // 密码格式错误，重新生成bcrypt密码
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        await AppDataSource.query(
          `UPDATE users SET password = ? WHERE id = ?`,
          [hashedPassword, user.id]
        );
        fixedPasswordCount++;
        log.info(`[Admin Private Customers] Fixed password format for user: ${user.username}`);
      }
    }

    // 解锁该手机号对应的管理员账号（仅限私有部署）
    const result = await AppDataSource.query(
      `UPDATE users
       SET status = 'active', login_fail_count = 0, locked_at = NULL
       WHERE username = ? AND status = 'locked' AND role = 'admin' AND tenant_id IS NULL`,
      [customerPhone]
    );

    const affectedRows = result.affectedRows || 0;

    // 记录日志
    if (affectedRows > 0) {
      const logMessage = fixedPasswordCount > 0
        ? `管理员解锁账号: ${customerPhone}，密码已重置为 ${defaultPassword}`
        : `管理员解锁账号: ${customerPhone}`;

      await AppDataSource.query(
        `INSERT INTO license_logs (id, license_id, license_key, action, message, ip_address, result, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), licenses[0].id, licenses[0].license_key, 'unlock_admin',
         logMessage, req.ip, 'success']
      );
    }

    const responseMessage = fixedPasswordCount > 0
      ? `已解锁管理员账号 ${customerPhone}，密码已重置为 ${defaultPassword}`
      : `已解锁管理员账号 ${customerPhone}`;

    res.json({
      success: true,
      message: responseMessage,
      data: {
        unlockedCount: affectedRows,
        username: customerPhone,
        fixedPasswordCount,
        defaultPassword: fixedPasswordCount > 0 ? defaultPassword : undefined
      }
    });
  } catch (error: any) {
    log.error('[Admin Private Customers] Unlock admin failed:', error);
    res.status(500).json({ success: false, message: '解锁失败' });
  }
});

// 重置私有客户管理员密码
router.post('/:id/reset-admin-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');

    // 查找私有客户的授权记录
    const licenses = await AppDataSource.query(
      'SELECT id, license_key, customer_phone, customer_name FROM licenses WHERE private_customer_id = ?',
      [id]
    );

    if (licenses.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该客户的授权记录' });
    }

    const customerPhone = licenses[0].customer_phone;
    const customerName = licenses[0].customer_name;
    if (!customerPhone) {
      return res.status(400).json({ success: false, message: '该客户没有关联的手机号（管理员账号）' });
    }

    // 查找该客户的管理员账号（私有部署 tenant_id IS NULL）
    const adminUsers = await AppDataSource.query(
      `SELECT id, username, name, real_name FROM users
       WHERE username = ? AND role = 'admin' AND tenant_id IS NULL`,
      [customerPhone]
    );

    if (adminUsers.length === 0) {
      return res.status(404).json({ success: false, message: `未找到账号为 ${customerPhone} 的管理员用户` });
    }

    // 生成安全的随机临时密码：大写+小写+数字，8位
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    const randomBytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      tempPassword += chars[randomBytes[i] % chars.length];
    }
    // 确保包含大写、小写、数字
    tempPassword = 'A' + tempPassword.slice(1, 7) + '3';

    // 更新密码
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    for (const user of adminUsers) {
      await AppDataSource.query(
        `UPDATE users SET password = ?, status = 'active', login_fail_count = 0, locked_at = NULL WHERE id = ?`,
        [hashedPassword, user.id]
      );
    }

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO license_logs (id, license_id, license_key, action, message, ip_address, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), licenses[0].id, licenses[0].license_key, 'reset_password',
       `管理员重置密码: ${customerPhone}`, req.ip, 'success']
    );

    log.info(`[Admin Private Customers] Reset password for user: ${customerPhone}, by admin: ${adminUser?.username}`);

    res.json({
      success: true,
      message: '密码重置成功',
      data: {
        username: customerPhone,
        customerName: customerName || '',
        tempPassword,
        resetCount: adminUsers.length
      }
    });
  } catch (error: any) {
    log.error('[Admin Private Customers] Reset admin password failed:', error);
    res.status(500).json({ success: false, message: '重置密码失败' });
  }
});

export default router;
