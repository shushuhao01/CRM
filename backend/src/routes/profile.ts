import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { JwtConfig } from '../config/jwt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Department } from '../entities/Department';

const router = Router();

// 获取用户仓库
const getUserRepository = () => AppDataSource.getRepository(User);
const getDepartmentRepository = () => AppDataSource.getRepository(Department);

// 配置multer用于头像上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

/**
 * 简化的认证中间件，不依赖数据库
 */
const simpleAuth = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失',
        code: 'TOKEN_MISSING'
      });
    }

    // 验证令牌
    const payload = JwtConfig.verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    // 仅开发环境输出错误详情
    if (process.env.NODE_ENV === 'development') {
      console.error('[Profile Auth] JWT认证失败:', error);
    }
    return res.status(401).json({
      success: false,
      message: 'JWT认证失败',
      code: 'TOKEN_INVALID'
    });
  }
};

/**
 * @route GET /api/v1/profile
 * @desc 获取当前用户资料（从数据库获取真实数据）
 * @access Private
 */
router.get('/', simpleAuth, async (req, res) => {
  try {
    // 从JWT token中获取用户ID
    const tokenUser = (req as any).user;
    if (!tokenUser) {
      return res.status(401).json({
        success: false,
        message: '用户认证信息无效',
        code: 'AUTH_INVALID'
      });
    }
    const userId = tokenUser.userId || tokenUser.id;

    // 从数据库获取完整的用户信息
    const userRepository = getUserRepository();
    const user = await userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 获取部门名称
    let departmentName = user.departmentName || '';
    if (!departmentName && user.departmentId) {
      try {
        const departmentRepository = getDepartmentRepository();
        const department = await departmentRepository.findOne({
          where: { id: user.departmentId }
        });
        departmentName = department?.name || '';
      } catch (e) {
        console.warn('获取部门信息失败:', e);
      }
    }

    // 获取角色显示名称
    const roleNameMap: Record<string, string> = {
      'super_admin': '超级管理员',
      'admin': '管理员',
      'department_manager': '部门经理',
      'sales_staff': '销售员',
      'customer_service': '客服'
    };
    const roleName = roleNameMap[user.role] || user.role;

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.realName || user.name || user.username,
        email: user.email || '',
        phone: user.phone || '',
        department: departmentName,
        departmentId: user.departmentId,
        role: roleName,
        roleCode: user.role,
        avatar: user.avatar || '',
        position: user.position || '',
        employeeNumber: user.employeeNumber || '',
        preferences: {
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          emailNotifications: true,
          browserNotifications: true,
          smsNotifications: false,
          pageSize: 20
        },
        lastLoginTime: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
        loginCount: user.loginCount || 0,
        createTime: user.createdAt ? user.createdAt.toISOString() : ''
      }
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户资料失败',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
});

/**
 * @route PUT /api/v1/profile
 * @desc 更新当前用户资料（更新到数据库）
 * @access Private
 */
router.put('/', simpleAuth, async (req, res) => {
  try {
    // 从JWT token中获取用户ID
    const tokenUser = (req as any).user;
    if (!tokenUser) {
      return res.status(401).json({
        success: false,
        message: '用户认证信息无效',
        code: 'AUTH_INVALID'
      });
    }
    const userId = tokenUser.userId || tokenUser.id;
    const updateData = req.body;

    // 从数据库获取用户
    const userRepository = getUserRepository();
    const user = await userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 更新允许修改的字段
    if (updateData.name !== undefined) {
      user.realName = updateData.name;
      user.name = updateData.name;
    }
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.avatar !== undefined) user.avatar = updateData.avatar;

    // 保存到数据库
    const updatedUser = await userRepository.save(user);

    // 获取部门名称
    let departmentName = updatedUser.departmentName || '';
    if (!departmentName && updatedUser.departmentId) {
      try {
        const departmentRepository = getDepartmentRepository();
        const department = await departmentRepository.findOne({
          where: { id: updatedUser.departmentId }
        });
        departmentName = department?.name || '';
      } catch (e) {
        console.warn('获取部门信息失败:', e);
      }
    }

    // 获取角色显示名称
    const roleNameMap: Record<string, string> = {
      'super_admin': '超级管理员',
      'admin': '管理员',
      'department_manager': '部门经理',
      'sales_staff': '销售员',
      'customer_service': '客服'
    };
    const roleName = roleNameMap[updatedUser.role] || updatedUser.role;

    console.log(`[Profile] 用户 ${updatedUser.username} 资料更新成功`);

    return res.json({
      success: true,
      message: '个人资料已更新',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.realName || updatedUser.name || updatedUser.username,
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        department: departmentName,
        role: roleName,
        avatar: updatedUser.avatar || '',
        preferences: {
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          emailNotifications: true,
          browserNotifications: true,
          smsNotifications: false,
          pageSize: 20
        },
        lastLoginTime: updatedUser.lastLoginAt ? updatedUser.lastLoginAt.toISOString() : '',
        createTime: updatedUser.createdAt ? updatedUser.createdAt.toISOString() : ''
      }
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新用户资料失败',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/profile/preferences
 * @desc 获取用户偏好设置
 * @access Private
 */
router.get('/preferences', simpleAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      emailNotifications: true,
      browserNotifications: true,
      smsNotifications: false,
      pageSize: 20
    }
  });
});

/**
 * @route PUT /api/v1/profile/preferences
 * @desc 更新用户偏好设置
 * @access Private
 */
router.put('/preferences', simpleAuth, (req, res) => {
  const preferences = req.body;

  // 这里应该保存到数据库，目前返回模拟数据
  res.json({
    success: true,
    message: '偏好设置已更新',
    data: preferences
  });
});

/**
 * @route POST /api/v1/profile/avatar
 * @desc 上传用户头像（保存文件并更新数据库）
 * @access Private
 */
router.post('/avatar', simpleAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件',
        code: 'NO_FILE_UPLOADED'
      });
    }

    // 从JWT token中获取用户ID
    const tokenUser = (req as any).user;
    if (!tokenUser) {
      return res.status(401).json({
        success: false,
        message: '用户认证信息无效',
        code: 'AUTH_INVALID'
      });
    }
    const userId = tokenUser.userId || tokenUser.id;

    // 生成头像URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // 更新数据库中的用户头像字段
    const userRepository = getUserRepository();
    const user = await userRepository.findOne({
      where: { id: userId }
    });

    if (user) {
      user.avatar = avatarUrl;
      await userRepository.save(user);
      console.log(`[Profile] 用户 ${user.username} 头像已更新: ${avatarUrl}`);
    }

    return res.json({
      success: true,
      message: '头像上传成功',
      data: {
        url: avatarUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('头像上传失败:', error);
    return res.status(500).json({
      success: false,
      message: '头像上传失败',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * @route PUT /api/v1/profile/password
 * @desc 修改用户密码（从数据库验证和更新）
 * @access Private
 */
router.put('/password', simpleAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 验证必填字段
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段',
        code: 'MISSING_FIELDS'
      });
    }

    // 验证新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '新密码和确认密码不一致',
        code: 'PASSWORD_MISMATCH'
      });
    }

    // 验证密码强度
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少为6位',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // 从JWT token中获取用户ID
    const tokenUser = (req as any).user;
    if (!tokenUser) {
      return res.status(401).json({
        success: false,
        message: '用户认证信息无效',
        code: 'AUTH_INVALID'
      });
    }
    const userId = tokenUser.userId || tokenUser.id;

    // 从数据库获取用户信息（包含密码）
    const userRepository = getUserRepository();
    const user = await userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 验证当前密码是否正确
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码不正确',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新数据库中的用户密码
    user.password = hashedPassword;
    await userRepository.save(user);

    console.log(`[Profile] 用户 ${user.username} 密码修改成功`);

    return res.json({
      success: true,
      message: '密码修改成功',
      data: {
        message: '密码已成功更新，下次登录请使用新密码'
      }
    });
  } catch (error) {
    console.error('密码修改失败:', error);
    return res.status(500).json({
      success: false,
      message: '密码修改失败',
      code: 'PASSWORD_UPDATE_ERROR'
    });
  }
});

export default router;
