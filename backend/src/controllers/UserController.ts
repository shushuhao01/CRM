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

  /**
   * 用户登录
   */
  login = catchAsync(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // 查找用户
    const user = await this.userRepository.findOne({
      where: { username }
    });

    console.log('[Login Debug] 查询到的用户对象:', user);
    console.log('[Login Debug] 用户对象的keys:', user ? Object.keys(user) : 'null');

    if (!user) {
      // 记录登录失败日志（失败不影响错误返回）
      try {
        await this.logOperation({
          action: 'login',
          module: 'auth',
          description: `用户登录失败: 用户名不存在 - ${username}`,
          result: 'failed',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('[Login] 记录日志失败:', logError);
      }

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
    console.log('[Login Debug] 开始验证密码');
    console.log('[Login Debug] 用户名:', username);
    console.log('[Login Debug] 输入密码:', password);
    console.log('[Login Debug] 数据库密码哈希:', user.password);
    console.log('[Login Debug] 密码哈希长度:', user.password?.length);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('[Login Debug] 密码验证结果:', isPasswordValid);

    if (!isPasswordValid) {
      // 增加登录失败次数
      user.loginFailCount += 1;

      // 如果失败次数超过5次，锁定账户
      if (user.loginFailCount >= 5) {
        user.status = 'locked';
        user.lockedAt = new Date();
      }

      await this.userRepository.save(user);

      // 记录登录失败日志（失败不影响错误返回）
      try {
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
      } catch (logError) {
        console.error('[Login] 记录日志失败:', logError);
      }

      throw new BusinessError('用户名或密码错误', 'INVALID_CREDENTIALS');
    }

    // 登录成功，重置失败次数
    try {
      user.loginFailCount = 0;
      user.loginCount = user.loginCount + 1;
      user.lastLoginAt = new Date();
      user.lastLoginIp = req.ip || '';
      await this.userRepository.save(user);
    } catch (saveError) {
      console.error('[Login] 保存用户信息失败，但继续登录流程:', saveError);
    }

    // 生成JWT令牌
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId
    };

    const tokens = JwtConfig.generateTokenPair(tokenPayload);

    // 记录登录成功日志（失败不影响登录）
    try {
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
    } catch (logError) {
      console.error('[Login] 记录日志失败，但继续登录流程:', logError);
    }

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

    // 生成用户ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建用户 - 确保所有必需字段都有值
    const user = this.userRepository.create({
      id: userId,
      username,
      password: hashedPassword,
      name: realName,  // name 是必需字段
      realName,
      email: email || null,
      phone: phone || null,
      role,
      roleId: role,  // roleId 是必需字段，使用 role 值
      departmentId: departmentId || null,
      status: 'active',
      loginFailCount: 0,
      loginCount: 0
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

    // User实体没有department关联，直接查询用户表
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.realName',
        'user.name',
        'user.email',
        'user.phone',
        'user.avatar',
        'user.role',
        'user.roleId',
        'user.status',
        'user.departmentId',
        'user.departmentName',
        'user.position',
        'user.lastLoginAt',
        'user.lastLoginIp',
        'user.createdAt',
        'user.updatedAt'
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
        items: users,  // 前端期望 items 字段
        users,         // 保持兼容
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
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
   * 获取用户详情
   */
  getUserById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const { password: _, ...userInfo } = user;

    res.json({
      success: true,
      data: userInfo
    });
  });

  /**
   * 更新用户信息
   */
  updateUser = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { realName, name, email, phone, role, roleId, departmentId, position, employeeNumber, status, remark } = req.body;

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 更新字段
    if (realName !== undefined) user.realName = realName;
    if (name !== undefined) user.name = name || realName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (roleId !== undefined) user.role = roleId; // roleId 也映射到 role 字段
    if (departmentId !== undefined) user.departmentId = departmentId ? String(departmentId) : null;
    if (position !== undefined) user.position = position;
    if (employeeNumber !== undefined) user.employeeNumber = employeeNumber;
    if (status !== undefined) user.status = status;
    if (remark !== undefined) user.remark = remark;

    const updatedUser = await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: 'update_user',
      module: 'user',
      description: `更新用户信息: ${user.username}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const { password: _, ...userInfo } = updatedUser;

    res.json({
      success: true,
      message: '用户更新成功',
      data: userInfo
    });
  });

  /**
   * 删除用户
   */
  deleteUser = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 不允许删除超级管理员
    if (user.role === 'super_admin' || user.username === 'superadmin') {
      throw new BusinessError('不能删除超级管理员账户');
    }

    await this.userRepository.remove(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: 'delete_user',
      module: 'user',
      description: `删除用户: ${user.username}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '用户删除成功'
    });
  });

  /**
   * 更新用户状态（启用/禁用/锁定）
   */
  updateUserStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { status } = req.body;

    if (!['active', 'inactive', 'locked'].includes(status)) {
      throw new ValidationError('无效的状态值');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    user.status = status;
    if (status === 'locked') {
      user.lockedAt = new Date();
    } else if (status === 'active') {
      user.lockedAt = null;
      user.loginFailCount = 0;
    }

    const updatedUser = await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: 'update_user_status',
      module: 'user',
      description: `更新用户状态: ${user.username} -> ${status}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const { password: _, ...userInfo } = updatedUser;

    res.json({
      success: true,
      message: '用户状态更新成功',
      data: userInfo
    });
  });

  /**
   * 更新用户在职状态
   */
  updateEmploymentStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { employmentStatus } = req.body;

    if (!['active', 'resigned'].includes(employmentStatus)) {
      throw new ValidationError('无效的在职状态值');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    user.employmentStatus = employmentStatus;
    if (employmentStatus === 'resigned') {
      user.resignedAt = new Date();
    }

    const updatedUser = await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: 'update_employment_status',
      module: 'user',
      description: `更新用户在职状态: ${user.username} -> ${employmentStatus}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const { password: _, ...userInfo } = updatedUser;

    res.json({
      success: true,
      message: '在职状态更新成功',
      data: userInfo
    });
  });

  /**
   * 重置用户密码
   */
  resetUserPassword = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { newPassword } = req.body;

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 生成临时密码或使用提供的密码
    const tempPassword = newPassword || Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    user.password = hashedPassword;
    user.mustChangePassword = true;
    user.loginFailCount = 0;
    if (user.status === 'locked') {
      user.status = 'active';
      user.lockedAt = null;
    }

    await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: 'reset_password',
      module: 'user',
      description: `重置用户密码: ${user.username}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '密码重置成功',
      data: {
        tempPassword: newPassword ? undefined : tempPassword
      }
    });
  });

  /**
   * 记录操作日志
   */
  private async logOperation(data: {
    userId?: string;
    username?: string;
    action: string;
    module: string;
    description: string;
    result?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      // 只记录到文件日志，不写数据库
      operationLogger.info('操作日志', data);
    } catch (error) {
      logger.error('记录操作日志失败:', error);
    }
  }
}
