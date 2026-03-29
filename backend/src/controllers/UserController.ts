import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { User } from '../entities/User';
import { Department } from '../entities/Department';
import { OperationLog } from '../entities/OperationLog';
import { CustomerServicePermission } from '../entities/CustomerServicePermission';
import { JwtConfig } from '../config/jwt';
import { catchAsync, BusinessError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { logger, operationLogger } from '../config/logger';
import bcrypt from 'bcryptjs';
import { getTenantRepo } from '../utils/tenantRepo';
import { deployConfig } from '../config/deploy';

export class UserController {
  private get userRepository() {
    return getTenantRepo(User);
  }

  private get departmentRepository() {
    return getTenantRepo(Department);
  }

  private get customerServicePermissionRepository() {
    return getTenantRepo(CustomerServicePermission);
  }

  /**
   * 获取用户的客服权限配置
   */
  private async getCustomerServicePermissions(userId: string): Promise<any | null> {
    try {
      const permission = await this.customerServicePermissionRepository.findOne({
        where: { userId, status: 'active' }
      });
      if (permission) {
        return {
          customerServiceType: permission.customerServiceType,
          dataScope: permission.dataScope,
          departmentIds: permission.departmentIds || [],
          customPermissions: permission.customPermissions || []
        };
      }
      return null;
    } catch (error) {
      logger.warn('获取客服权限失败:', error);
      return null;
    }
  }

  /**
   * 从请求中获取当前租户ID
   * 优先从JWT payload中获取，其次从请求体获取
   */
  private getTenantIdFromRequest(req: Request): string | null {
    return (req as any).tenantId || req.body?.tenantId || (req as any).user?.tenantId || null;
  }

  /**
   * 构建带有租户过滤的查询条件
   */
  private buildTenantWhere(req: Request, baseWhere: any = {}): any {
    const tenantId = this.getTenantIdFromRequest(req);
    if (tenantId) {
      return { ...baseWhere, tenantId };
    }
    return baseWhere;
  }

  /**
   * 用户登录
   * 🔥 租户隔离：SaaS模式下强制要求 tenantId，防止跨租户登录
   */
  login = catchAsync(async (req: Request, res: Response) => {
    const { username, password, tenantId } = req.body;

    // 🔥 SaaS模式下强制要求租户编码
    if (deployConfig.isSaaS() && !tenantId) {
      throw new ValidationError('SaaS模式下必须提供租户编码才能登录');
    }

    // 构建查询条件：按租户过滤
    // 🔥 登录时无JWT，TenantContext未设置，getTenantRepo的Proxy不会自动注入tenant_id
    // 因此必须在此处显式添加 tenantId 条件
    const whereClause: any = { username };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    // 查找用户（使用原始仓储，因登录时Proxy无租户上下文）
    const user = await this.userRepository.findOne({
      where: whereClause
    });

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
      } catch (_logError) {
        // 日志记录失败不影响主流程
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

    // 验证授权IP
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    // 处理IPv6格式的本地地址
    const normalizedIp = clientIp.replace(/^::ffff:/, '');

    if (user.authorizedIps && Array.isArray(user.authorizedIps) && user.authorizedIps.length > 0) {
      const isIpAuthorized = user.authorizedIps.some(ip =>
        ip === clientIp || ip === normalizedIp || clientIp.includes(ip)
      );
      if (!isIpAuthorized) {
        // 记录IP限制失败日志
        try {
          await this.logOperation({
            action: 'login',
            module: 'auth',
            description: `用户登录失败: IP未授权 - ${username} (IP: ${normalizedIp})`,
            result: 'failed',
            ipAddress: normalizedIp,
            userAgent: req.get('User-Agent')
          });
        } catch (_logError) {
          // 日志记录失败不影响主流程
        }
        throw new BusinessError('当前IP地址未授权登录，请联系管理员', 'IP_NOT_AUTHORIZED');
      }
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
      } catch (_logError) {
        // 日志记录失败不影响主流程
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
    } catch (_saveError) {
      // 保存失败不影响登录流程
    }

    // 生成JWT令牌
    // 🔥 修复：使用 roleId（角色代码如 department_manager）而不是 role（可能是中文角色名）
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.roleId || user.role,  // 优先使用 roleId
      departmentId: user.departmentId,
      tenantId: user.tenantId || undefined  // 租户ID（SaaS模式）
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
    } catch (_logError) {
      // 日志记录失败不影响登录流程
    }

    // 获取客服权限配置
    const customerServicePermissions = await this.getCustomerServicePermissions(user.id);

    // 🔥 获取用户角色的权限列表
    let rolePermissions: string[] = [];
    try {
      const dataSource = getDataSource();
      if (dataSource) {
        const roleCode = user.roleId || user.role;
        let roleQuery = 'SELECT permissions FROM roles WHERE code = ?';
        const roleParams: any[] = [roleCode];
        if (user.tenantId) {
          roleQuery += ' AND tenant_id = ?';
          roleParams.push(user.tenantId);
        }
        const [roleData] = await dataSource.query(roleQuery, roleParams);
        if (roleData && roleData.permissions) {
          rolePermissions = typeof roleData.permissions === 'string'
            ? JSON.parse(roleData.permissions)
            : roleData.permissions;
          console.log(`[Login] 从数据库加载角色权限: ${roleCode}, ${rolePermissions.length}个权限`);
        }
      }
    } catch (permError) {
      console.warn('[Login] 获取角色权限失败:', permError);
    }

    // 🔥 SaaS模式：获取租户授权的模块列表，供前端菜单过滤
    let tenantModules: string[] | null = null;
    if (user.tenantId) {
      try {
        const dataSource = getDataSource();
        if (dataSource) {
          const tenantRows = await dataSource.query(
            `SELECT t.features, t.package_id, p.modules as package_modules FROM tenants t
             LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.id = ?`,
            [user.tenantId]
          );
          if (tenantRows.length > 0) {
            const tenant = tenantRows[0];
            const validModuleIds = ['dashboard','customer','order','service-management','performance','logistics','service','data','finance','product','system'];
            // 尝试从features解析模块ID
            if (tenant.features) {
              try {
                const parsed = typeof tenant.features === 'string' ? JSON.parse(tenant.features) : tenant.features;
                if (Array.isArray(parsed) && parsed.some((f: string) => validModuleIds.includes(f))) {
                  tenantModules = parsed.filter((f: string) => validModuleIds.includes(f));
                }
              } catch { /* ignore */ }
            }
            // 回退到套餐模块
            if (!tenantModules && tenant.package_modules) {
              try {
                const pkgModules = typeof tenant.package_modules === 'string' ? JSON.parse(tenant.package_modules) : tenant.package_modules;
                if (Array.isArray(pkgModules) && pkgModules.length > 0) {
                  tenantModules = pkgModules;
                }
              } catch { /* ignore */ }
            }
            // 🔥 兜底：有套餐但无模块配置时，给默认核心模块
            if (!tenantModules && tenant.package_id) {
              tenantModules = ['dashboard', 'customer', 'order', 'system'];
            }
            // 🔥 自动同步修复：如果模块找到了但features为空，写回DB（一次性修复）
            if (tenantModules && tenantModules.length > 0 && !tenant.features) {
              dataSource.query('UPDATE tenants SET features = ? WHERE id = ?', [JSON.stringify(tenantModules), user.tenantId]).catch(() => {});
            }
          }
        }
      } catch (tenantModErr) {
        console.warn('[Login] 获取租户模块失败:', tenantModErr);
      }
    }

    // 返回用户信息和令牌
    const { password: _, ...userInfo } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          ...userInfo,
          customerServicePermissions,
          rolePermissions,  // 🔥 返回角色权限列表
          tenantModules     // 🔥 返回租户授权模块列表（SaaS模式）
        },
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
    // 🔥 租户隔离：使用JWT payload中的tenantId进行显式过滤
    // refreshToken接口无authenticateToken中间件，Proxy不会自动注入tenant_id
    const refreshWhere: any = { id: payload.userId };
    if (payload.tenantId) {
      refreshWhere.tenantId = payload.tenantId;
    }
    const user = await this.userRepository.findOne({
      where: refreshWhere
    });

    if (!user || user.status !== 'active') {
      throw new BusinessError('用户状态异常，请重新登录', 'USER_STATUS_INVALID');
    }

    // 生成新的令牌对
    // 🔥 修复：使用 roleId（角色代码如 department_manager）而不是 role（可能是中文角色名）
    const newTokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.roleId || user.role,  // 优先使用 roleId
      departmentId: user.departmentId,
      tenantId: user.tenantId || undefined  // 租户ID（SaaS模式）
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

    // 获取客服权限配置
    const customerServicePermissions = await this.getCustomerServicePermissions(user.id);

    res.json({
      success: true,
      data: {
        ...user,
        customerServicePermissions
      }
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
   * 检查用户名是否可用
   * 🔥 租户隔离：同租户下用户名唯一，不同租户可存在相同用户名
   */
  checkUsername = catchAsync(async (req: Request, res: Response) => {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      throw new ValidationError('用户名参数不能为空');
    }

    // 🔥 租户隔离：检查同租户下用户名是否已存在
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { username };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const existingUser = await this.userRepository.findOne({
      where: whereClause
    });

    res.json({
      success: true,
      data: {
        available: !existingUser,
        username
      }
    });
  });

  /**
   * 创建用户（管理员功能）
   * 🔥 租户隔离：用户名在同租户下唯一，自动设置tenant_id
   */
  createUser = catchAsync(async (req: Request, res: Response) => {
    const {
      username,
      password,
      realName,
      email,
      phone,
      role,
      departmentId,
      department,
      position,
      employeeNumber,
      remark
    } = req.body;

    // 验证必填字段
    if (!username || !password || !realName || !role) {
      throw new ValidationError('用户名、密码、真实姓名和角色为必填项');
    }

    // 🔥 租户隔离：检查同租户下用户名是否已存在
    const tenantId = this.getTenantIdFromRequest(req);
    const usernameWhereClause: any = { username };
    if (tenantId) {
      usernameWhereClause.tenantId = tenantId;
    }

    const existingUser = await this.userRepository.findOne({
      where: usernameWhereClause
    });

    if (existingUser) {
      throw new BusinessError('用户名已存在', 'USERNAME_EXISTS');
    }

    // 检查邮箱是否已存在（同租户下）
    if (email) {
      const emailWhereClause: any = { email };
      if (tenantId) {
        emailWhereClause.tenantId = tenantId;
      }
      const existingEmail = await this.userRepository.findOne({
        where: emailWhereClause
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

    // 🔥 租户隔离：创建用户时自动设置tenant_id
    const user = this.userRepository.create({
      id: userId,
      tenantId: tenantId || null,  // 🔥 关键：设置租户ID
      username,
      password: hashedPassword,
      name: realName,
      realName,
      email: email || null,
      phone: phone || null,
      role,
      roleId: role,
      departmentId: departmentId || null,
      departmentName: department || null,
      position: position || null,
      employeeNumber: employeeNumber || null,
      status: 'active',
      employmentStatus: 'active',
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
   * 获取同部门成员列表（所有登录用户可访问）
   * 🔥 租户隔离：只返回当前租户的用户
   */
  getDepartmentMembers = catchAsync(async (req: Request, res: Response) => {
    const currentUser = (req as any).user;

    if (!currentUser) {
      throw new BusinessError('用户未登录', 'UNAUTHORIZED');
    }

    const tenantId = this.getTenantIdFromRequest(req);

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
        'user.status',
        'user.employmentStatus',
        'user.departmentId',
        'user.departmentName',
        'user.position',
        'user.employeeNumber',
        'user.createdAt'
      ]);

    // 🔥 租户隔离过滤
    if (tenantId) {
      queryBuilder.andWhere('user.tenantId = :tenantId', { tenantId });
    }

    // 根据角色过滤数据
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
    const isManager = currentUser.role === 'department_manager';

    if (isAdmin) {
      // 管理员可以看到当前租户所有用户
    } else if (isManager || currentUser.role === 'sales_staff') {
      if (currentUser.departmentId) {
        queryBuilder.andWhere('user.departmentId = :departmentId', { departmentId: currentUser.departmentId });
      } else {
        return res.json({
          success: true,
          data: { items: [], users: [], total: 0 }
        });
      }
    }

    queryBuilder.andWhere('user.status = :status', { status: 'active' });

    const users = await queryBuilder.getMany();

    res.json({
      success: true,
      data: {
        items: users,
        users: users,
        total: users.length
      }
    });
  });

  /**
   * 获取用户列表（管理员功能）
   * 🔥 租户隔离：只返回当前租户的用户
   */
  getUsers = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search, departmentId, role, status } = req.query as any;
    const tenantId = this.getTenantIdFromRequest(req);

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
        'user.employmentStatus',
        'user.resignedAt',
        'user.departmentId',
        'user.departmentName',
        'user.position',
        'user.employeeNumber',
        'user.lastLoginAt',
        'user.lastLoginIp',
        'user.loginCount',
        'user.createdAt',
        'user.updatedAt'
      ]);

    // 🔥 租户隔离过滤
    if (tenantId) {
      queryBuilder.andWhere('user.tenantId = :tenantId', { tenantId });
    }

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
    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    // 计算在线状态：最近15分钟内有登录活动的用户视为在线
    const now = new Date();
    const onlineThreshold = 15 * 60 * 1000; // 15分钟

    const usersWithOnlineStatus = users.map(user => {
      let isOnline = false;
      if (user.lastLoginAt) {
        const lastLoginTime = new Date(user.lastLoginAt).getTime();
        isOnline = (now.getTime() - lastLoginTime) < onlineThreshold;
      }
      return {
        ...user,
        isOnline,
        loginCount: user.loginCount || 0
      };
    });

    res.json({
      success: true,
      data: {
        items: usersWithOnlineStatus,
        users: usersWithOnlineStatus,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  });

  /**
   * 获取用户统计信息
   * 🔥 租户隔离：只统计当前租户的用户
   */
  getUserStatistics = catchAsync(async (req: Request, res: Response) => {
    const tenantId = this.getTenantIdFromRequest(req);
    const tenantWhere: any = tenantId ? { tenantId } : {};

    const total = await this.userRepository.count({ where: tenantWhere });
    const active = await this.userRepository.count({ where: { ...tenantWhere, status: 'active' } });
    const inactive = await this.userRepository.count({ where: { ...tenantWhere, status: 'inactive' } });
    const locked = await this.userRepository.count({ where: { ...tenantWhere, status: 'locked' } });

    const adminCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'admin' } });
    const superAdminCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'super_admin' } });
    const managerCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'manager' } });
    const departmentManagerCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'department_manager' } });
    const salesCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'sales' } });
    const salesStaffCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'sales_staff' } });
    const serviceCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'service' } });
    const customerServiceCount = await this.userRepository.count({ where: { ...tenantWhere, role: 'customer_service' } });

    const deptQueryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.departmentId as departmentId',
        'user.departmentName as departmentName',
        'COUNT(user.id) as count'
      ])
      .where('user.departmentId IS NOT NULL');

    if (tenantId) {
      deptQueryBuilder.andWhere('user.tenantId = :tenantId', { tenantId });
    }

    const departmentStats = await deptQueryBuilder
      .groupBy('user.departmentId')
      .addGroupBy('user.departmentName')
      .getRawMany();

    const statistics = {
      total, active, inactive, locked,
      byRole: {
        admin: adminCount, super_admin: superAdminCount,
        manager: managerCount, department_manager: departmentManagerCount,
        sales: salesCount, sales_staff: salesStaffCount,
        service: serviceCount, customer_service: customerServiceCount
      },
      byDepartment: departmentStats.map(stat => ({
        departmentId: stat.departmentId,
        departmentName: stat.departmentName || '未知部门',
        count: parseInt(stat.count)
      }))
    };

    res.json({ success: true, data: statistics });
  });

  /**
   * 获取用户详情
   * 🔥 租户隔离：加上tenantId过滤
   */
  getUserById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where: whereClause
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
   * 🔥 租户隔离
   */
  updateUser = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const { realName, name, email, phone, role, roleId, departmentId, departmentName, position, employeeNumber, status, remark, authorizedIps } = req.body;

    const user = await this.userRepository.findOne({
      where: whereClause
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 更新字段
    if (realName !== undefined) user.realName = realName;
    if (name !== undefined) user.name = name || realName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;

    if (role !== undefined) {
      user.role = role;
      user.roleId = role;
    }
    if (roleId !== undefined) {
      user.role = roleId;
      user.roleId = roleId;
    }

    if (departmentId !== undefined) {
      user.departmentId = departmentId ? String(departmentId) : null;
      if (departmentName !== undefined) {
        user.departmentName = departmentName || null;
      } else if (departmentId) {
        try {
          const department = await this.departmentRepository.findOne({ where: { id: departmentId } });
          if (department) user.departmentName = department.name;
        } catch (error) {
          console.warn('[UserController] 获取部门名称失败:', error);
        }
      } else {
        user.departmentName = null;
      }
    }

    if (position !== undefined) user.position = position;
    if (employeeNumber !== undefined) user.employeeNumber = employeeNumber;
    if (status !== undefined) user.status = status;
    if (remark !== undefined) (user as any).remark = remark;
    if (authorizedIps !== undefined) {
      user.authorizedIps = Array.isArray(authorizedIps) && authorizedIps.length > 0 ? authorizedIps : null;
    }

    const updatedUser = await this.userRepository.save(user);

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

    res.json({ success: true, message: '用户更新成功', data: userInfo });
  });

  /**
   * 删除用户
   * 🔥 租户隔离
   */
  deleteUser = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({ where: whereClause });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

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

    res.json({ success: true, message: '用户删除成功' });
  });

  /**
   * 更新用户状态
   * 🔥 租户隔离
   */
  updateUserStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { status } = req.body;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    if (!['active', 'inactive', 'locked'].includes(status)) {
      throw new ValidationError('无效的状态值');
    }

    const user = await this.userRepository.findOne({ where: whereClause });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const nonDisableableUsers = ['superadmin', 'admin'];
    if (status !== 'active' && nonDisableableUsers.includes(user.username?.toLowerCase())) {
      throw new ValidationError('系统预设用户不可禁用');
    }

    user.status = status;
    if (status === 'locked') {
      user.lockedAt = new Date();
    } else if (status === 'active') {
      user.lockedAt = null;
      user.loginFailCount = 0;
    }

    const updatedUser = await this.userRepository.save(user);

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
    res.json({ success: true, message: '用户状态更新成功', data: userInfo });
  });

  /**
   * 更新用户在职状态
   * 🔥 租户隔离：添加显式 tenantId 过滤
   */
  updateEmploymentStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { employmentStatus } = req.body;
    const tenantId = this.getTenantIdFromRequest(req);

    if (!['active', 'resigned'].includes(employmentStatus)) {
      throw new ValidationError('无效的在职状态值');
    }

    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where: whereClause
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
   * 🔥 租户隔离：添加显式 tenantId 过滤，防止跨租户重置密码
   */
  resetUserPassword = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where: whereClause
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 生成临时密码或使用提供的密码
    const tempPassword = newPassword || Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    user.password = hashedPassword;
    (user as any).mustChangePassword = true;
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

  /**
   * 强制用户下线
   * 🔥 租户隔离：添加显式 tenantId 过滤
   */
  forceUserLogout = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where: whereClause
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // TODO: 实现真正的强制下线逻辑
    // 1. 清除用户的所有session
    // 2. 将用户的JWT token加入黑名单
    // 3. 通知客户端用户已被强制下线

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: 'force_logout',
      module: 'user',
      description: `强制用户下线: ${user.username}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '用户已强制下线'
    });
  });

  /**
   * 切换双因子认证
   * 🔥 租户隔离：添加显式 tenantId 过滤
   */
  toggleTwoFactor = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { enabled } = req.body;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where: whereClause
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // TODO: 实现真正的双因子认证逻辑
    // 这里只是模拟，实际需要集成TOTP或其他2FA方案

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: enabled ? 'enable_two_factor' : 'disable_two_factor',
      module: 'user',
      description: `${enabled ? '启用' : '禁用'}双因子认证: ${user.username}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `双因子认证${enabled ? '启用' : '禁用'}成功`
    });
  });

  /**
   * 解锁用户账户
   * 🔥 租户隔离：添加显式 tenantId 过滤
   */
  unlockAccount = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where: whereClause
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    if (user.status !== 'locked') {
      throw new BusinessError('用户账户未被锁定');
    }

    user.status = 'active';
    user.lockedAt = null;
    user.loginFailCount = 0;

    await this.userRepository.save(user);

    // 记录操作日志
    await this.logOperation({
      userId: req.user?.userId,
      username: req.user?.username,
      action: 'unlock_account',
      module: 'user',
      description: `解锁用户账户: ${user.username}`,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '账户解锁成功'
    });
  });

  /**
   * 获取用户权限详情
   * 🔥 租户隔离：添加显式 tenantId 过滤
   */
  getUserPermissions = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const tenantId = this.getTenantIdFromRequest(req);
    const whereClause: any = { id: userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where: whereClause
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 根据用户角色返回权限树
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isManager = user.role === 'manager' || isAdmin;

    const permissions = [
      {
        id: 'customer',
        name: '客户管理',
        type: 'menu',
        granted: true,
        children: [
          { id: 'customer.view', name: '查看客户', type: 'action', granted: true },
          { id: 'customer.create', name: '创建客户', type: 'action', granted: true },
          { id: 'customer.edit', name: '编辑客户', type: 'action', granted: isManager },
          { id: 'customer.delete', name: '删除客户', type: 'action', granted: isAdmin },
          { id: 'customer.export', name: '导出客户', type: 'action', granted: isManager }
        ]
      },
      {
        id: 'order',
        name: '订单管理',
        type: 'menu',
        granted: true,
        children: [
          { id: 'order.view', name: '查看订单', type: 'action', granted: true },
          { id: 'order.create', name: '创建订单', type: 'action', granted: true },
          { id: 'order.edit', name: '编辑订单', type: 'action', granted: isManager },
          { id: 'order.delete', name: '删除订单', type: 'action', granted: isAdmin },
          { id: 'order.audit', name: '审核订单', type: 'action', granted: isManager }
        ]
      },
      {
        id: 'system',
        name: '系统管理',
        type: 'menu',
        granted: isAdmin,
        children: [
          { id: 'system.user', name: '用户管理', type: 'action', granted: isAdmin },
          { id: 'system.role', name: '角色管理', type: 'action', granted: isAdmin },
          { id: 'system.permission', name: '权限管理', type: 'action', granted: user.role === 'super_admin' },
          { id: 'system.config', name: '系统配置', type: 'action', granted: user.role === 'super_admin' }
        ]
      }
    ];

    res.json({
      success: true,
      data: permissions
    });
  });
}
