import { Request, Response } from 'express';
import { JwtConfig } from '../config/jwt';
import { catchAsync } from '../middleware/errorHandler';

export class MockAuthController {
  /**
   * 模拟用户登录 - 用于测试前端登录流程
   */
  login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    // 模拟用户数据
    const mockUsers = [
      {
        id: 1,
        username: 'admin',
        password: 'admin123',
        realName: '系统管理员',
        email: 'admin@company.com',
        role: 'admin',
        status: 'active',
        department: {
          id: 1,
          name: '管理部'
        }
      },
      {
        id: 2,
        username: 'manager',
        password: 'manager123',
        realName: '部门经理',
        email: 'manager@company.com',
        role: 'department_manager',
        status: 'active',
        department: {
          id: 2,
          name: '销售部'
        }
      },
      {
        id: 3,
        username: 'sales001',
        password: 'sales123',
        realName: '销售员工',
        email: 'sales001@company.com',
        role: 'sales',
        status: 'active',
        department: {
          id: 2,
          name: '销售部'
        }
      },
      {
        id: 4,
        username: 'service001',
        password: 'service123',
        realName: '客服员工',
        email: 'service001@company.com',
        role: 'customer_service',
        status: 'active',
        department: {
          id: 3,
          name: '客服部'
        }
      }
    ];

    // 查找用户
    const user = mockUsers.find(u => u.username === username);

    if (!user || user.password !== password) {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 生成JWT token
    const accessToken = JwtConfig.generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    const refreshToken = JwtConfig.generateRefreshToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // 返回登录成功响应
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          email: user.email,
          phone: '', // 添加缺失的字段
          avatar: '', // 添加缺失的字段
          role: user.role,
          status: user.status,
          departmentId: user.department?.id,
          department: user.department,
          permissions: user.role === 'admin' ? ['*'] : ['read'], // 添加权限字段
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60 // 7天，以秒为单位
      }
    });
  });

  /**
   * 模拟获取当前用户信息
   */
  getCurrentUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // 从JWT中获取用户信息
    const userInfo = (req as any).user;

    if (!userInfo) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // 根据用户名获取详细信息
    const getUserDetails = (username: string, role: string) => {
      switch (username) {
        case 'admin':
          return {
            realName: '系统管理员',
            email: 'admin@company.com',
            department: { id: 1, name: '管理部' }
          };
        case 'manager':
          return {
            realName: '部门经理',
            email: 'manager@company.com',
            department: { id: 2, name: '销售部' }
          };
        case 'sales001':
          return {
            realName: '销售员工',
            email: 'sales001@company.com',
            department: { id: 2, name: '销售部' }
          };
        case 'service001':
          return {
            realName: '客服员工',
            email: 'service001@company.com',
            department: { id: 3, name: '客服部' }
          };
        default:
          return {
            realName: '未知用户',
            email: 'unknown@company.com',
            department: { id: 1, name: '未知部门' }
          };
      }
    };

    const userDetails = getUserDetails(userInfo.username, userInfo.role);

    // 模拟用户详细信息
    const mockUser = {
      id: userInfo.userId,
      username: userInfo.username,
      realName: userDetails.realName,
      email: userDetails.email,
      role: userInfo.role,
      status: 'active',
      department: userDetails.department
    };

    res.json({
      success: true,
      data: mockUser
    });
  });

  /**
   * 模拟登出
   */
  logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      message: '登出成功'
    });
  });

  /**
   * 模拟刷新token
   */
  refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: '缺少刷新token',
        code: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    try {
      // 验证刷新token
      const payload = JwtConfig.verifyRefreshToken(refreshToken);
      
      // 生成新的访问token
      const newAccessToken = JwtConfig.generateAccessToken({
        userId: payload.userId,
        username: payload.username,
        role: payload.role
      });

      const newRefreshToken = JwtConfig.generateRefreshToken({
        userId: payload.userId,
        username: payload.username,
        role: payload.role
      });

      // 模拟用户信息
      const getUserDetails = (username: string, role: string) => {
        switch (username) {
          case 'admin':
            return {
              realName: '系统管理员',
              email: 'admin@company.com',
              department: { id: 1, name: '管理部' }
            };
          case 'manager':
            return {
              realName: '部门经理',
              email: 'manager@company.com',
              department: { id: 2, name: '销售部' }
            };
          case 'sales001':
            return {
              realName: '销售员工',
              email: 'sales001@company.com',
              department: { id: 2, name: '销售部' }
            };
          case 'service001':
            return {
              realName: '客服员工',
              email: 'service001@company.com',
              department: { id: 3, name: '客服部' }
            };
          default:
            return {
              realName: '未知用户',
              email: 'unknown@company.com',
              department: { id: 1, name: '未知部门' }
            };
        }
      };

      const userDetails = getUserDetails(payload.username, payload.role);

      res.json({
        success: true,
        data: {
          user: {
            id: payload.userId,
            username: payload.username,
            realName: userDetails.realName,
            email: userDetails.email,
            phone: '',
            avatar: '',
            role: payload.role,
            status: 'active',
            departmentId: userDetails.department?.id,
            department: userDetails.department,
            permissions: payload.role === 'admin' ? ['*'] : ['read'],
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 7 * 24 * 60 * 60
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: '刷新token无效',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
  });

  /**
   * 模拟修改密码
   */
  changePassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { oldPassword, newPassword } = req.body;
    const userInfo = (req as any).user;

    if (!oldPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_PARAMETERS'
      });
      return;
    }

    // 模拟密码验证（在实际应用中应该验证旧密码）
    res.json({
      success: true,
      message: '密码修改成功'
    });
  });

  /**
   * 模拟更新用户信息
   */
  updateCurrentUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userInfo = (req as any).user;
    const updateData = req.body;

    if (!userInfo) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // 获取用户详细信息
    const getUserDetails = (username: string, role: string) => {
      switch (username) {
        case 'admin':
          return {
            realName: '系统管理员',
            email: 'admin@company.com',
            department: { id: 1, name: '管理部' }
          };
        case 'manager':
          return {
            realName: '部门经理',
            email: 'manager@company.com',
            department: { id: 2, name: '销售部' }
          };
        case 'sales001':
          return {
            realName: '销售员工',
            email: 'sales001@company.com',
            department: { id: 2, name: '销售部' }
          };
        case 'service001':
          return {
            realName: '客服员工',
            email: 'service001@company.com',
            department: { id: 3, name: '客服部' }
          };
        default:
          return {
            realName: '未知用户',
            email: 'unknown@company.com',
            department: { id: 1, name: '未知部门' }
          };
      }
    };

    const userDetails = getUserDetails(userInfo.username, userInfo.role);

    // 模拟更新后的用户信息
    const updatedUser = {
      id: userInfo.userId,
      username: userInfo.username,
      realName: updateData.realName || userDetails.realName,
      email: updateData.email || userDetails.email,
      phone: updateData.phone || '',
      avatar: updateData.avatar || '',
      role: userInfo.role,
      status: 'active',
      departmentId: userDetails.department?.id,
      department: userDetails.department,
      permissions: userInfo.role === 'admin' ? ['*'] : ['read'],
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: updatedUser,
      message: '用户信息更新成功'
    });
  });
}