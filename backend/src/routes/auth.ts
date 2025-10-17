import { Router } from 'express';
import Joi from 'joi';
import { UserController } from '../controllers/UserController';
import { validate, commonValidations } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// 登录验证规则
const loginSchema = {
  body: Joi.object({
    username: commonValidations.username,
    password: Joi.string().min(1).max(128).required().messages({
      'string.base': '密码必须是字符串',
      'string.min': '密码不能为空',
      'string.max': '密码最多128个字符',
      'any.required': '密码是必需的'
    })
  })
};

// 刷新令牌验证规则
const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.base': '刷新令牌必须是字符串',
      'any.required': '刷新令牌是必需的'
    })
  })
};

// 修改密码验证规则
const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.base': '当前密码必须是字符串',
      'any.required': '当前密码是必需的'
    }),
    newPassword: commonValidations.password
  })
};

// 更新用户信息验证规则
const updateUserSchema = {
  body: Joi.object({
    realName: Joi.string().min(1).max(50).optional().messages({
      'string.base': '真实姓名必须是字符串',
      'string.min': '真实姓名不能为空',
      'string.max': '真实姓名最多50个字符'
    }),
    email: commonValidations.optionalEmail,
    phone: commonValidations.phone.optional(),
    avatar: Joi.string().uri().max(200).optional().messages({
      'string.base': '头像必须是字符串',
      'string.uri': '头像必须是有效的URL',
      'string.max': '头像URL最多200个字符'
    })
  })
};

/**
 * @route POST /api/v1/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login', validate(loginSchema), userController.login);

/**
 * @route POST /api/v1/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 */
router.post('/refresh', validate(refreshTokenSchema), userController.refreshToken);

/**
 * @route GET /api/v1/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me', authenticateToken, userController.getCurrentUser);

/**
 * @route PUT /api/v1/auth/me
 * @desc 更新当前用户信息
 * @access Private
 */
router.put('/me', authenticateToken, validate(updateUserSchema), userController.updateCurrentUser);

/**
 * @route PUT /api/v1/auth/password
 * @desc 修改密码
 * @access Private
 */
router.put('/password', authenticateToken, validate(changePasswordSchema), userController.changePassword);

/**
 * @route POST /api/v1/auth/logout
 * @desc 用户登出（客户端处理，服务端记录日志）
 * @access Private
 */
router.post('/logout', authenticateToken, (req, res) => {
  // 在实际应用中，这里可以将令牌加入黑名单
  // 目前只是返回成功响应，客户端负责清除令牌
  res.json({
    success: true,
    message: '登出成功'
  });
});

export default router;
