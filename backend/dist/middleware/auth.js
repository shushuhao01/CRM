"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireManagerOrAdmin = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jwt_1 = require("../config/jwt");
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const logger_1 = require("../config/logger");
/**
 * JWT认证中间件
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    try {
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
        // 获取用户详细信息
        const dataSource = (0, database_1.getDataSource)();
        if (!dataSource) {
            return res.status(500).json({
                success: false,
                message: '数据库连接未初始化',
                code: 'DATABASE_NOT_INITIALIZED'
            });
        }
        const userRepository = dataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: payload.userId }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在',
                code: 'USER_NOT_FOUND'
            });
        }
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: '用户账户已被禁用',
                code: 'USER_DISABLED'
            });
        }
        req.currentUser = user;
        next();
    }
    catch (error) {
        logger_1.logger.error('JWT认证失败:', error);
        logger_1.logger.error('Token内容:', token?.substring(0, 50) + '...');
        if (error instanceof Error) {
            logger_1.logger.error('错误详情:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            if (error.message.includes('expired')) {
                return res.status(401).json({
                    success: false,
                    message: '访问令牌已过期',
                    code: 'TOKEN_EXPIRED',
                    error: error.message
                });
            }
            if (error.message.includes('invalid')) {
                return res.status(401).json({
                    success: false,
                    message: '访问令牌无效',
                    code: 'TOKEN_INVALID',
                    error: error.message
                });
            }
        }
        return res.status(401).json({
            success: false,
            message: '认证失败',
            code: 'AUTH_FAILED',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * 角色权限检查中间件
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: '未认证',
                code: 'UNAUTHENTICATED'
            });
        }
        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(userRole)) {
            logger_1.logger.warn(`用户 ${req.user.username} 尝试访问需要 ${allowedRoles.join('/')} 权限的资源，但用户角色为 ${userRole}`);
            return res.status(403).json({
                success: false,
                message: '权限不足',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * 管理员权限检查中间件
 * 支持的角色: admin, superadmin, super_admin
 */
exports.requireAdmin = (0, exports.requireRole)(['admin', 'superadmin', 'super_admin']);
/**
 * 管理员或经理权限检查中间件
 * 支持的角色: admin, super_admin, manager, department_manager
 */
exports.requireManagerOrAdmin = (0, exports.requireRole)([
    'admin',
    'super_admin',
    'superadmin',
    'manager',
    'department_manager'
]);
/**
 * 可选认证中间件（不强制要求认证）
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const payload = jwt_1.JwtConfig.verifyAccessToken(token);
            req.user = payload;
            // 获取用户详细信息
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                // 可选认证，数据库未初始化时继续执行
                return next();
            }
            const userRepository = dataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({
                where: { id: payload.userId }
            });
            if (user && user.status === 'active') {
                req.currentUser = user;
            }
        }
    }
    catch (error) {
        // 可选认证失败时不阻止请求继续
        logger_1.logger.debug('可选认证失败:', error);
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map