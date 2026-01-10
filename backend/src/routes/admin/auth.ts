/**
 * Admin Auth Routes - 管理后台认证
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { AdminUser } from '../../entities/AdminUser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// 管理员登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const adminRepo = AppDataSource.getRepository(AdminUser);
    const admin = await adminRepo.findOne({ where: { username } });

    if (!admin) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    if (admin.status !== 'active') {
      return res.status(401).json({ success: false, message: '账号已被禁用' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 更新登录信息
    const clientIp = req.ip || req.socket.remoteAddress || '';
    await adminRepo.update(admin.id, {
      lastLoginAt: new Date(),
      lastLoginIp: clientIp
    });

    // 生成 token
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role,
        isAdmin: true
      },
      process.env.JWT_SECRET || 'admin-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role
        }
      }
    });
  } catch (error: any) {
    console.error('[Admin Auth] Login failed:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 获取当前管理员信息
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const adminRepo = AppDataSource.getRepository(AdminUser);
    const admin = await adminRepo.findOne({ where: { id: adminUser.adminId } });

    if (!admin) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt
      }
    });
  } catch (error: any) {
    console.error('[Admin Auth] Get profile failed:', error);
    res.status(500).json({ success: false, message: '获取信息失败' });
  }
});

// 修改密码
router.put('/password', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请输入旧密码和新密码' });
    }

    const adminRepo = AppDataSource.getRepository(AdminUser);
    const admin = await adminRepo.findOne({ where: { id: adminUser.adminId } });

    if (!admin) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: '旧密码错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await adminRepo.update(admin.id, { password: hashedPassword });

    res.json({ success: true, message: '密码修改成功' });
  } catch (error: any) {
    console.error('[Admin Auth] Change password failed:', error);
    res.status(500).json({ success: false, message: '修改密码失败' });
  }
});

// 获取管理员用户列表（仅超级管理员）
router.get('/users', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const adminRepo = AppDataSource.getRepository(AdminUser);
    const users = await adminRepo.find({
      select: ['id', 'username', 'name', 'email', 'phone', 'role', 'status', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' }
    });

    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('[Admin Auth] Get users failed:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// 创建管理员用户（仅超级管理员）
router.post('/users', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { username, password, email, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const adminRepo = AppDataSource.getRepository(AdminUser);

    // 检查用户名是否已存在
    const existing = await adminRepo.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = adminRepo.create({
      username,
      password: hashedPassword,
      email,
      role: role || 'admin',
      status: 'active'
    });

    await adminRepo.save(newAdmin);

    res.json({ success: true, message: '创建成功', data: { id: newAdmin.id } });
  } catch (error: any) {
    console.error('[Admin Auth] Create user failed:', error);
    res.status(500).json({ success: false, message: '创建用户失败' });
  }
});

// 更新管理员用户（仅超级管理员）
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { id } = req.params;
    const { status, role, email, phone, name, password } = req.body;

    const adminRepo = AppDataSource.getRepository(AdminUser);
    const user = await adminRepo.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 不能修改自己的状态
    if (id === adminUser.adminId && status === 'inactive') {
      return res.status(400).json({ success: false, message: '不能禁用自己的账号' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (name !== undefined) updateData.name = name;

    // 重置密码
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await adminRepo.update(id, updateData);

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('[Admin Auth] Update user failed:', error);
    res.status(500).json({ success: false, message: '更新用户失败' });
  }
});

// 删除管理员用户（仅超级管理员）
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { id } = req.params;

    // 不能删除自己
    if (id === adminUser.adminId) {
      return res.status(400).json({ success: false, message: '不能删除自己的账号' });
    }

    const adminRepo = AppDataSource.getRepository(AdminUser);
    const user = await adminRepo.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 不能删除超级管理员
    if (user.role === 'super_admin') {
      return res.status(400).json({ success: false, message: '不能删除超级管理员' });
    }

    await adminRepo.delete(id);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('[Admin Auth] Delete user failed:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

export default router;
