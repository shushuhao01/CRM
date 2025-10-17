import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { JwtConfig } from '../config/jwt';

const router = Router();

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
    return res.status(401).json({
      success: false,
      message: 'JWT认证失败',
      code: 'TOKEN_INVALID'
    });
  }
};

/**
 * @route GET /api/v1/profile
 * @desc 获取当前用户资料
 * @access Private
 */
router.get('/', simpleAuth, (req, res) => {
  // 从JWT token中获取用户信息
  const user = (req as any).user;
  
  res.json({
    success: true,
    data: {
      id: user.id || '1',
      username: user.username || 'admin',
      name: user.name || '管理员',
      email: user.email || 'admin@example.com',
      phone: user.phone || '13800138000',
      department: user.department || '技术部',
      role: user.role || 'admin',
      avatar: user.avatar || '',
      preferences: {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        emailNotifications: true,
        browserNotifications: true,
        smsNotifications: false,
        pageSize: 20
      },
      lastLoginTime: new Date().toISOString(),
      createTime: user.createTime || new Date().toISOString()
    }
  });
});

/**
 * @route PUT /api/v1/profile
 * @desc 更新当前用户资料
 * @access Private
 */
router.put('/', simpleAuth, (req, res) => {
  const user = (req as any).user;
  const updateData = req.body;
  
  // 这里应该更新数据库，目前返回模拟数据
  res.json({
    success: true,
    message: '个人资料已更新',
    data: {
      id: user.id || '1',
      username: user.username || 'admin',
      name: updateData.name || user.name || '管理员',
      email: updateData.email || user.email || 'admin@example.com',
      phone: updateData.phone || user.phone || '13800138000',
      department: user.department || '技术部',
      role: user.role || 'admin',
      avatar: updateData.avatar || user.avatar || '',
      preferences: updateData.preferences || {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        emailNotifications: true,
        browserNotifications: true,
        smsNotifications: false,
        pageSize: 20
      },
      lastLoginTime: new Date().toISOString(),
      createTime: user.createTime || new Date().toISOString()
    }
  });
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
 * @desc 上传用户头像
 * @access Private
 */
router.post('/avatar', simpleAuth, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件',
        code: 'NO_FILE_UPLOADED'
      });
    }

    // 生成头像URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // 这里应该更新数据库中的用户头像字段
    // 目前返回模拟响应
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
 * @desc 修改用户密码
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
    
    // 这里应该验证当前密码是否正确
    // 目前模拟验证通过
    const user = (req as any).user;
    
    // 模拟密码验证（在实际应用中应该从数据库获取用户信息并验证）
    if (currentPassword !== 'admin123') { // 模拟当前密码
      return res.status(400).json({
        success: false,
        message: '当前密码不正确',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }
    
    // 加密新密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // 这里应该更新数据库中的用户密码
    // 目前返回模拟响应
    return res.json({
      success: true,
      message: '密码修改成功',
      data: {
        message: '密码已成功更新，请使用新密码登录'
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