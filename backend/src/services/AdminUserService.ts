import { AppDataSource } from '../config/database';
import { AdminUser } from '../entities/AdminUser';
import { AdminOperationLog } from '../entities/AdminOperationLog';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export class AdminUserService {
  private adminUserRepository = AppDataSource.getRepository(AdminUser);
  private operationLogRepository = AppDataSource.getRepository(AdminOperationLog);

  /**
   * 获取管理员列表
   */
  async getAdminUsers(query: any) {
    const { page = 1, pageSize = 20, status, role, keyword } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.adminUserRepository.createQueryBuilder('admin');

    if (status) {
      queryBuilder.andWhere('admin.status = :status', { status });
    }

    if (role) {
      queryBuilder.andWhere('admin.role = :role', { role });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(admin.username LIKE :keyword OR admin.realName LIKE :keyword OR admin.email LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder.orderBy('admin.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // 不返回密码
    const safeList = list.map(user => {
      const { password, ...rest } = user as any;
      return rest;
    });

    return {
      list: safeList,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    };
  }

  /**
   * 获取管理员详情
   */
  async getAdminUserById(id: string) {
    const user = await this.adminUserRepository.findOne({
      where: { id }
    });

    if (!user) {
      throw new Error('管理员不存在');
    }

    // 不返回密码
    const { password, ...rest } = user as any;
    return rest;
  }

  /**
   * 创建管理员
   */
  async createAdminUser(data: any) {
    // 检查用户名是否已存在
    const existing = await this.adminUserRepository.findOne({
      where: { username: data.username }
    });

    if (existing) {
      throw new Error('用户名已存在');
    }

    if (!data.password) {
      throw new Error('密码不能为空');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = this.adminUserRepository.create({
      id: uuidv4(),
      username: data.username,
      password: hashedPassword,
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || 'operator',
      roleId: data.roleId || null,
      status: 'active'  // 🔥 必须显式设置，不能依赖数据库默认值
    });

    const savedUser = await this.adminUserRepository.save(user);

    // 不返回密码
    const { password, ...rest } = savedUser as any;
    return rest;
  }

  /**
   * 更新管理员
   */
  async updateAdminUser(id: string, data: any) {
    const user = await this.adminUserRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('管理员不存在');
    }

    // 不允许修改用户名和密码（通过专门的接口修改）
    delete data.username;
    delete data.password;

    // 如果修改了邮箱，检查是否重复
    if (data.email && data.email !== user.email) {
      const existing = await this.adminUserRepository.findOne({
        where: { email: data.email }
      });
      if (existing && existing.id !== id) {
        throw new Error('邮箱已被使用');
      }
    }

    Object.assign(user, data);
    const savedUser = await this.adminUserRepository.save(user);

    // 不返回密码
    const { password, ...rest } = savedUser as any;
    return rest;
  }

  /**
   * 删除管理员
   */
  async deleteAdminUser(id: string) {
    const user = await this.adminUserRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('管理员不存在');
    }

    // 不允许删除超级管理员
    if (user.role === 'super_admin') {
      throw new Error('不允许删除超级管理员');
    }

    await this.adminUserRepository.remove(user);
    return { success: true, message: '删除成功' };
  }

  /**
   * 修改密码
   */
  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await this.adminUserRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('管理员不存在');
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      throw new Error('原密码错误');
    }

    // 加密新密码
    user.password = await bcrypt.hash(newPassword, 10);
    await this.adminUserRepository.save(user);

    return { success: true, message: '密码修改成功' };
  }

  /**
   * 重置密码（管理员操作）
   */
  async resetPassword(id: string, newPassword: string) {
    const user = await this.adminUserRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('管理员不存在');
    }

    // 加密新密码
    user.password = await bcrypt.hash(newPassword, 10);
    await this.adminUserRepository.save(user);

    return { success: true, message: '密码重置成功' };
  }

  /**
   * 锁定用户
   */
  async lockUser(id: string) {
    const user = await this.adminUserRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('管理员不存在');
    }

    if (user.role === 'super_admin') {
      throw new Error('不允许锁定超级管理员');
    }

    user.status = 'locked';
    await this.adminUserRepository.save(user);

    return { success: true, message: '用户已锁定' };
  }

  /**
   * 解锁用户
   */
  async unlockUser(id: string) {
    const user = await this.adminUserRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('管理员不存在');
    }

    user.status = 'active';
    await this.adminUserRepository.save(user);

    return { success: true, message: '用户已解锁' };
  }

  /**
   * 记录操作日志
   */
  async logOperation(data: {
    adminId: string;
    adminName?: string;
    action: string;
    module?: string;
    targetType?: string;
    targetId?: string;
    detail?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const log = this.operationLogRepository.create({
      id: uuidv4(),
      ...data
    });

    await this.operationLogRepository.save(log);
  }

  /**
   * 获取操作日志
   */
  async getOperationLogs(query: any) {
    const { page = 1, pageSize = 50, adminId, action, module, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.operationLogRepository.createQueryBuilder('log');

    if (adminId) {
      queryBuilder.andWhere('log.adminId = :adminId', { adminId });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (module) {
      queryBuilder.andWhere('log.module = :module', { module });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    };
  }
}

export const adminUserService = new AdminUserService();
