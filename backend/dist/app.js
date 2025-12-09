"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
// Trigger restart
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const logger_1 = require("./config/logger");
const errorHandler_1 = require("./middleware/errorHandler");
// 路由导入
const auth_1 = __importDefault(require("./routes/auth"));
// import mockAuthRoutes from './routes/mockAuth'; // 文件已删除
const users_1 = __importDefault(require("./routes/users"));
const profile_1 = __importDefault(require("./routes/profile"));
const customers_1 = __importDefault(require("./routes/customers"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const system_1 = __importDefault(require("./routes/system"));
const sdk_1 = __importDefault(require("./routes/sdk"));
const mobile_sdk_1 = __importDefault(require("./routes/mobile-sdk"));
const qr_connection_1 = __importDefault(require("./routes/qr-connection"));
const alternative_connection_1 = __importDefault(require("./routes/alternative-connection"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const calls_1 = __importDefault(require("./routes/calls"));
const logs_1 = __importDefault(require("./routes/logs"));
const message_1 = __importDefault(require("./routes/message"));
const performance_1 = __importDefault(require("./routes/performance"));
const logistics_1 = __importDefault(require("./routes/logistics"));
const roles_1 = __importDefault(require("./routes/roles"));
const permissions_1 = __importDefault(require("./routes/permissions"));
const sfExpress_1 = __importDefault(require("./routes/sfExpress"));
const ytoExpress_1 = __importDefault(require("./routes/ytoExpress"));
const services_1 = __importDefault(require("./routes/services"));
const data_1 = __importDefault(require("./routes/data"));
const assignment_1 = __importDefault(require("./routes/assignment"));
const sms_1 = __importDefault(require("./routes/sms"));
const customerShare_1 = __importDefault(require("./routes/customerShare"));
// 加载环境变量
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);
// 安全中间件
if (process.env.HELMET_ENABLED !== 'false') {
    const allowedOrigins = (process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']).map(o => o.trim());
    const apiOrigin = `http://localhost:${process.env.PORT || 3000}`;
    app.use((0, helmet_1.default)({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                // 允许前端与后端进行连接（XHR/Fetch/WebSocket），避免 CSP 导致的 net::ERR_FAILED
                connectSrc: ["'self'", apiOrigin, ...allowedOrigins, "ws:", "wss:"],
            },
        },
    }));
}
// CORS配置
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
}));
// 压缩中间件
if (process.env.COMPRESSION_ENABLED !== 'false') {
    app.use((0, compression_1.default)());
}
// 通用限流中间件 - 开发环境使用更宽松的限制
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000'), // 限制每个IP 15分钟内最多5000个请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试',
        code: 'TOO_MANY_REQUESTS'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // 跳过健康检查端点
        return req.path === '/health' || req.path.includes('/health');
    }
});
// 登录专用限流中间件 - 更严格但合理的限制
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
    max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '50'), // 限制每个IP 15分钟内最多50次登录尝试
    message: {
        success: false,
        message: '登录尝试过于频繁，请15分钟后再试',
        code: 'TOO_MANY_LOGIN_ATTEMPTS'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // 开发环境跳过登录限流
        return process.env.NODE_ENV === 'development';
    }
});
app.use(generalLimiter);
// 请求日志中间件
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => {
            logger_1.logger.http(message.trim());
        }
    }
}));
// 解析中间件
app.use(express_1.default.json({
    limit: process.env.UPLOAD_MAX_SIZE || '10mb',
    type: ['application/json', 'text/plain']
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: process.env.UPLOAD_MAX_SIZE || '10mb'
}));
// 静态文件服务
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'CRM API服务运行正常',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});
// API健康检查端点
app.get(`${API_PREFIX}/health`, (req, res) => {
    res.json({
        success: true,
        message: 'CRM API服务运行正常',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});
// 根路径处理 - 返回API信息
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'CRM API服务',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        apiPrefix: API_PREFIX,
        endpoints: {
            health: '/health',
            apiHealth: `${API_PREFIX}/health`,
            auth: `${API_PREFIX}/auth`,
            users: `${API_PREFIX}/users`,
            customers: `${API_PREFIX}/customers`,
            products: `${API_PREFIX}/products`,
            orders: `${API_PREFIX}/orders`,
            dashboard: `${API_PREFIX}/dashboard`
        },
        timestamp: new Date().toISOString()
    });
});
// 注册路由
// 开发环境下不应用登录限流器
if (process.env.NODE_ENV === 'development') {
    app.use(`${API_PREFIX}/auth`, auth_1.default);
    // app.use(`${API_PREFIX}/mock-auth`, mockAuthRoutes); // Mock路由已删除
}
else {
    app.use(`${API_PREFIX}/auth`, loginLimiter, auth_1.default);
    // app.use(`${API_PREFIX}/mock-auth`, loginLimiter, mockAuthRoutes); // Mock路由已删除
}
app.use(`${API_PREFIX}/users`, users_1.default);
app.use(`${API_PREFIX}/profile`, profile_1.default);
app.use(`${API_PREFIX}/customers`, customers_1.default);
app.use(`${API_PREFIX}/products`, products_1.default);
app.use(`${API_PREFIX}/orders`, orders_1.default);
app.use(`${API_PREFIX}/system`, system_1.default);
app.use(`${API_PREFIX}/sdk`, sdk_1.default);
app.use(`${API_PREFIX}/mobile-sdk`, mobile_sdk_1.default);
app.use(`${API_PREFIX}/qr-connection`, qr_connection_1.default);
app.use(`${API_PREFIX}/alternative-connection`, alternative_connection_1.default);
app.use(`${API_PREFIX}/dashboard`, dashboard_1.default);
app.use(`${API_PREFIX}/calls`, calls_1.default);
app.use(`${API_PREFIX}/logs`, logs_1.default);
app.use(`${API_PREFIX}/message`, message_1.default);
app.use(`${API_PREFIX}/performance`, performance_1.default);
app.use(`${API_PREFIX}/logistics`, logistics_1.default);
app.use(`${API_PREFIX}/roles`, roles_1.default);
app.use(`${API_PREFIX}/permissions`, permissions_1.default);
app.use(`${API_PREFIX}/sf-express`, sfExpress_1.default);
app.use(`${API_PREFIX}/yto-express`, ytoExpress_1.default);
app.use(`${API_PREFIX}/services`, services_1.default);
app.use(`${API_PREFIX}/data`, data_1.default);
app.use(`${API_PREFIX}/assignment`, assignment_1.default);
app.use(`${API_PREFIX}/sms`, sms_1.default);
app.use(`${API_PREFIX}/customer-share`, customerShare_1.default);
// 404处理
app.use(errorHandler_1.notFoundHandler);
// 全局错误处理
app.use(errorHandler_1.errorHandler);
// 启动服务器
const startServer = async () => {
    try {
        // 初始化数据库连接
        await (0, database_1.initializeDatabase)();
        logger_1.logger.info('✅ 数据库初始化完成');
        // 启动HTTP服务器
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`🚀 CRM API服务已启动`);
            logger_1.logger.info(`📍 服务地址: http://localhost:${PORT}`);
            logger_1.logger.info(`🔗 API前缀: ${API_PREFIX}`);
            logger_1.logger.info(`🌍 运行环境: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
        });
        // 优雅关闭处理
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
            server.close(async () => {
                logger_1.logger.info('HTTP服务器已关闭');
                try {
                    await (0, database_1.closeDatabase)();
                    logger_1.logger.info('数据库连接已关闭');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.error('关闭数据库连接时出错:', error);
                    process.exit(1);
                }
            });
            // 强制关闭超时
            setTimeout(() => {
                logger_1.logger.error('强制关闭服务器');
                process.exit(1);
            }, 10000);
        };
        // 监听关闭信号
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // 未捕获异常处理
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('未捕获的异常:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('未处理的Promise拒绝:', { reason, promise });
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('启动服务器失败:', error);
        process.exit(1);
    }
};
// 启动应用
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=app.js.map