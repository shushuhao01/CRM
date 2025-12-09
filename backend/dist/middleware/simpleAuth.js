"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTokenOptional = exports.authenticateTokenSimple = void 0;
const jwt_1 = require("../config/jwt");
const logger_1 = require("../config/logger");
/**
 * 简化的JWT认证中间件 - 不依赖数据库
 * 用于替代连接功能等不需要完整用户信息的场景
 */
const authenticateTokenSimple = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                success: false,
                message: '访问令牌缺失',
                code: 'TOKEN_MISSING'
            });
        }
        // 验证令牌
        const payload = jwt_1.JwtConfig.verifyAccessToken(token);
        req.user = payload;
        // 简单验证：只检查token是否有效，不查询数据库
        if (!payload.userId || !payload.username) {
            return res.status(401).json({
                success: false,
                message: '无效的访问令牌',
                code: 'INVALID_TOKEN'
            });
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('JWT认证失败:', error);
        if (error instanceof Error) {
            if (error.message.includes('expired')) {
                return res.status(401).json({
                    success: false,
                    message: '访问令牌已过期',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (error.message.includes('invalid')) {
                return res.status(401).json({
                    success: false,
                    message: '无效的访问令牌',
                    code: 'INVALID_TOKEN'
                });
            }
        }
        return res.status(401).json({
            success: false,
            message: '认证失败',
            code: 'AUTHENTICATION_FAILED'
        });
    }
};
exports.authenticateTokenSimple = authenticateTokenSimple;
/**
 * 可选的认证中间件 - 如果有token则验证，没有则跳过
 * 用于某些可以匿名访问但有token时需要验证的场景
 */
const authenticateTokenOptional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            // 没有token，跳过认证
            next();
            return;
        }
        // 有token，进行验证
        const payload = jwt_1.JwtConfig.verifyAccessToken(token);
        req.user = payload;
        next();
    }
    catch (error) {
        logger_1.logger.warn('可选认证失败，继续处理请求:', error);
        // 认证失败但不阻止请求继续
        next();
    }
};
exports.authenticateTokenOptional = authenticateTokenOptional;
//# sourceMappingURL=simpleAuth.js.map