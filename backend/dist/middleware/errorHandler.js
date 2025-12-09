"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = exports.notFoundHandler = exports.errorHandler = exports.UnauthorizedError = exports.ForbiddenError = exports.NotFoundError = exports.ValidationError = exports.BusinessError = exports.AppError = void 0;
const logger_1 = require("../config/logger");
// 自定义错误类
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// 业务错误类
class BusinessError extends AppError {
    constructor(message, code = 'BUSINESS_ERROR') {
        super(message, 400, code);
    }
}
exports.BusinessError = BusinessError;
// 验证错误类
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
// 未找到错误类
class NotFoundError extends AppError {
    constructor(resource = '资源') {
        super(`${resource}不存在`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
// 权限错误类
class ForbiddenError extends AppError {
    constructor(message = '权限不足') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
// 未认证错误类
class UnauthorizedError extends AppError {
    constructor(message = '未认证') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * 全局错误处理中间件
 */
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = '服务器内部错误';
    let details = undefined;
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
        const dbError = error;
        if (dbError.code === 'ER_DUP_ENTRY') {
            message = '数据重复，请检查唯一字段';
            code = 'DUPLICATE_ENTRY';
        }
        else if (dbError.code === 'ER_NO_REFERENCED_ROW_2') {
            message = '关联数据不存在';
            code = 'FOREIGN_KEY_ERROR';
        }
        else {
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
            headers: req.headers,
            body: req.body,
            params: req.params,
            query: req.query,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        },
        user: req.user || null
    };
    if (statusCode >= 500) {
        logger_1.logger.error('服务器错误:', {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            request: logData.request,
            user: logData.user
        });
    }
    else {
        logger_1.logger.warn('客户端错误:', {
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
            user: req.user || null
        });
    }
    // 构建响应
    const response = {
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
exports.errorHandler = errorHandler;
/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError('API端点');
    next(error);
};
exports.notFoundHandler = notFoundHandler;
/**
 * 异步错误捕获装饰器
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.catchAsync = catchAsync;
//# sourceMappingURL=errorHandler.js.map