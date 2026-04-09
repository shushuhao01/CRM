import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { adminNotificationService } from '../services/AdminNotificationService';

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 业务错误类
export class BusinessError extends AppError {
  constructor(message: string, code: string = 'BUSINESS_ERROR') {
    super(message, 400, code);
  }
}

// 验证错误类
export class ValidationError extends AppError {
  public details: any;

  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

// 未找到错误类
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(`${resource}不存在`, 404, 'NOT_FOUND');
  }
}

// 权限错误类
export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'FORBIDDEN');
  }
}

// 未认证错误类
export class UnauthorizedError extends AppError {
  constructor(message: string = '未认证') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// 系统错误通知防抖（避免短时间内大量重复通知）
const recentSystemErrors = new Set<string>();

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = '服务器内部错误';
  let details: any = undefined;

  // 处理自定义错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;

    if (error instanceof ValidationError) {
      details = error.details;
    }
  }
  // 处理数据库错误
  else if (error.name === 'QueryFailedError') {
    statusCode = 400;
    code = 'DATABASE_ERROR';

    // MySQL错误处理
    const dbError = error as any;
    if (dbError.code === 'ER_DUP_ENTRY') {
      message = '数据重复，请检查唯一字段';
      code = 'DUPLICATE_ENTRY';
    } else if (dbError.code === 'ER_NO_REFERENCED_ROW_2') {
      message = '关联数据不存在';
      code = 'FOREIGN_KEY_ERROR';
    } else {
      message = '数据库操作失败';
    }
  }
  // 处理JSON解析错误
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'JSON格式错误';
  }
  // 处理其他已知错误
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = '数据验证失败';
  }

  // 🔒 过滤敏感信息，防止日志泄露Token/密码
  const safeHeaders = { ...req.headers };
  if (safeHeaders.authorization) safeHeaders.authorization = '[REDACTED]';
  if (safeHeaders.cookie) safeHeaders.cookie = '[REDACTED]';

  const safeBody = req.body ? { ...req.body } : undefined;
  if (safeBody) {
    const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'currentPassword', 'token', 'refreshToken', 'secret', 'captchaCode'];
    for (const field of sensitiveFields) {
      if (safeBody[field]) safeBody[field] = '[REDACTED]';
    }
  }

  // 记录错误日志
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      headers: safeHeaders,
      body: safeBody,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: (req as any).user || null
  };

  if (statusCode >= 500) {
    logger.error('服务器错误:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: logData.request,
      user: logData.user
    });

    // 通知管理员：系统异常（防抖：同一错误5分钟内只通知一次）
    const errorKey = `${error.name}:${error.message}`.slice(0, 100);
    if (!recentSystemErrors.has(errorKey)) {
      recentSystemErrors.add(errorKey);
      setTimeout(() => recentSystemErrors.delete(errorKey), 5 * 60 * 1000); // 5分钟后可再次通知
      adminNotificationService.notify('system_error', {
        title: `系统异常：${error.name || '未知错误'}`,
        content: `${req.method} ${req.url} 发生 ${statusCode} 错误：${error.message}`,
        extraData: { method: req.method, url: req.url, statusCode, errorName: error.name, ip: req.ip }
      }).catch(() => {}); // 静默
    }
  } else {
    logger.warn('客户端错误:', {
      error: {
        name: error.name,
        message: error.message,
        code: code
      },
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      user: (req as any).user || null
    });
  }

  // 构建响应
  const response: any = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  // 添加验证错误详情
  if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError('API端点');
  next(error);
};

/**
 * 异步错误捕获装饰器
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
