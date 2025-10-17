import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { User } from '../entities/User';
import { Department } from '../entities/Department';
import { OperationLog } from '../entities/OperationLog';
import { JwtConfig } from '../config/jwt';
import { catchAsync, BusinessError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { logger, operationLogger } from '../config/logger';
import bcrypt from 'bcryptjs';

export class UserController {
  private get userRepository() {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new BusinessError('数据库连接未初始化');
    }
    return dataSource.getRepository(User);
  }

  private get departmentRepository() {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new BusinessError('数据库连接未初始化');
    }
    return dataSource.getRepository(Department);
  }

  private get operationLogRepository() {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new BusinessError('数据库连接未初始化');
    }
    return dataSource.getRepository(OperationLog);
  }

  /**
   * 用户登录
   */
  login = catchAsync(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // 查找用户
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['department']
    });

    if (!user) {
      // 记录登录失败日志
      await this.logOperation({
        action: 'login',
        module: 'auth',
        description: `用户登录失败: 用户名不存在 - ${username}`,
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      throw new BusinessError('用户名或密码错误', 'INVALID_CREDENTIALS');
    }

    // 检查账户状态
    if (user.status === 'locked') {
      throw new BusinessError('账户已被锁定，请联系管理员', 'ACCOUNT_LOCKED');
    }

    if (user.status === 'inactive') {
      throw new BusinessError('账户已被禁用，请联系管理员', 'ACCOUNT_DISABLED');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // 增加登录失败次数
      user.loginFailCount += 1;
      
      // 如果失败次数超过5次，锁定账户
      if (user.loginFailCount >= 5) {
        user.status = 'locked';
        user.lockedAt = new Date();
      }
      
      await this.userRepository.save(user);

      // 记录登录失败日志
      await this.logOperation({
        userId: user.id,
        username: user.username,
        action: 'login',
        module: 'auth',
        description: `用户登录失败: 密码错误 - ${username}`,
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      throw new BusinessError('用户名或密码错误', 'INVALID_CREDENTIALS');
    }

    // 登录成功，重置失败次数
    user.loginFailCount = 0;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || '';
    await this.userRepository.save(user);

    // 生成JWT令牌
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId
    };

    const tokens = JwtConfig.generateTokenPair(tokenPayload);

    // 记录登录成功日志
    await this.logOperation({
      userId: user.id,
      username: user.username,
      action: 'login',
      module: 'auth',
      description: `用户登录成功 - ${username}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 返回用户信息和令牌
    const { password: _, ...userInfo } = user;
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userInfo,
        tokens
      }
    });
  });

  /**
   * 刷新令牌
   */
  refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('刷新令牌不能为空');
    }

    // 验证刷新令牌
    const payload = JwtConfig.verifyRefreshToken(refreshToken);

    // 检查用户是否存在且状态正常
    const user = await this.userRepository.findOne({
      where: { id: payload.userId }
    });

    if (!user || user.status !== 'active') {
      throw new BusinessError('用户状态异常，请重新登录', 'USER_STATUS_INVALID');
    }

    // 生成新的令牌对
    const newTokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId
    };

    const tokens = JwtConfig.generateTokenPair(newTokenPayload);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: { tokens }
    });
  });

  /**
   * 获取当前用户信息
   */
  getCurrentUser = catchAsync(async (req: Request, res: Response) => {
    const user = req.currentUser!;
    
    res.json({
      success: true,
      data: user
    });
  });

  /**
   * 更新当前用户信息
   */
  updateCurrentUser = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { realName, email, phone, avatar } = req.body;

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户');
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email }
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BusinessError('邮箱已被其他用户使用', 'EMAIL_ALREADY_EXISTS');
      }
    }

    // 更新用户信息
    Object.assign(user, {
      realName: realName || user.realName,
      email: email || user.email,
      phone: phone || user.phone,
      avatar: avatar || user.avatar
    });

    await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user!.userId,
      username: req.user!.username,
      action: 'update',
      module: 'user',
      description: '更新个人信息',
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: user
    });
  });

  /**
   * 修改密码
   */
  changePassword = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BusinessError('当前密码错误', 'INVALID_CURRENT_PASSWORD');
    }

    // 检查新密码是否与当前密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BusinessError('新密码不能与当前密码相同', 'SAME_PASSWORD');
    }

    // 加密新密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user!.userId,
      username: req.user!.username,
      action: 'update',
      module: 'user',
      description: '修改密码',
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  });

  /**
   * 创建用户（管理员功能）
   */
  createUser = catchAsync(async (req: Request, res: Response) => {
    const { username, password, realName, email, phone, role, departmentId } = req.body;

    // 验证必填字段
    if (!username || !password || !realName || !role) {
      throw new ValidationError('用户名、密码、真实姓名和角色为必填项');
    }

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username }
    });

    if (existingUser) {
      throw new BusinessError('用户名已存在', 'USERNAME_EXISTS');
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email }
      });

      if (existingEmail) {
        throw new BusinessError('邮箱已存在', 'EMAIL_EXISTS');
      }
    }

    // 验证部门是否存在
    if (departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: departmentId }
      });

      if (!department) {
        throw new NotFoundError('指定的部门不存在');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      realName,
      email,
      phone,
      role,
      departmentId,
      status: 'active',
      loginFailCount: 0
    });

    const savedUser = await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: (req as any).user?.id,
      username: (req as any).user?.username,
      action: 'create',
      module: 'user',
      description: `创建用户: ${username} (${realName})`,
      result: 'success',
      details: { userId: savedUser.id, username, realName, role },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = savedUser;

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: {
        user: userWithoutPassword
      }
    });
  });

  /**
   * 获取用户列表（管理员功能）
   */
  getUsers = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search, departmentId, role, status } = req.query as any;

    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .select([
        'user.id',
        'user.username',
        'user.realName',
        'user.email',
        'user.phone',
        'user.avatar',
        'user.role',
        'user.status',
        'user.departmentId',
        'user.lastLoginAt',
        'user.lastLoginIp',
        'user.createdAt',
        'user.updatedAt',
        'department.id',
        'department.name'
      ]);

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(user.username LIKE :search OR user.realName LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (departmentId) {
      queryBuilder.andWhere('user.departmentId = :departmentId', { departmentId });
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 分页
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // 排序
    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  /**
   * 获取用户统计信息
   */
  getUserStatistics = catchAsync(async (req: Request, res: Response) => {
    // 获取总用户数
    const total = await this.userRepository.count();

    // 获取各状态用户数
    const active = await this.userRepository.count({ where: { status: 'active' } });
    const inactive = await this.userRepository.count({ where: { status: 'inactive' } });
    const locked = await this.userRepository.count({ where: { status: 'locked' } });

    // 获取各角色用户数
    const adminCount = await this.userRepository.count({ where: { role: 'admin' } });
    const managerCount = await this.userRepository.count({ where: { role: 'manager' } });
    const salesCount = await this.userRepository.count({ where: { role: 'sales' } });
    const serviceCount = await this.userRepository.count({ where: { role: 'service' } });

    // 获取各部门用户数
    const departmentStats = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.department', 'department')
      .select([
        'user.departmentId as departmentId',
        'department.name as departmentName',
        'COUNT(user.id) as count'
      ])
      .where('user.departmentId IS NOT NULL')
      .groupBy('user.departmentId')
      .addGroupBy('department.name')
      .getRawMany();

    const statistics = {
      total,
      active,
      inactive,
      locked,
      byRole: {
        admin: adminCount,
        manager: managerCount,
        sales: salesCount,
        service: serviceCount
      },
      byDepartment: departmentStats.map(stat => ({
        departmentId: parseInt(stat.departmentId),
        departmentName: stat.departmentName || '未知部门',
        count: parseInt(stat.count)
      }))
    };

    res.json({
      success: true,
      data: statistics
    });
  });

  /**
   * 记录操作日志
   */
  private async logOperation(data: {
    userId?: number;
    username?: string;
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'other';
    module: string;
    description: string;
    result: 'success' | 'failed' | 'warning';
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      const log = this.operationLogRepository.create(data);
      await this.operationLogRepository.save(log);
      
      // 同时记录到文件日志
      operationLogger.info('操作日志', data);
    } catch (error) {
      logger.error('记录操作日志失败:', error);
    }
  }
}