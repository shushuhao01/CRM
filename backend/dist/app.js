"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const logger_1 = require("./config/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const WebSocketService_1 = require("./services/WebSocketService");
const MobileWebSocketService_1 = require("./services/MobileWebSocketService");
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
const performanceReport_1 = __importDefault(require("./routes/performanceReport"));
const customerServicePermissions_1 = __importDefault(require("./routes/customerServicePermissions"));
const timeoutReminder_1 = __importDefault(require("./routes/timeoutReminder"));
const sensitiveInfoPermissions_1 = __importDefault(require("./routes/sensitiveInfoPermissions"));
const messageCleanup_1 = __importDefault(require("./routes/messageCleanup"));
const mobile_1 = __importDefault(require("./routes/mobile"));
const callWebhook_1 = __importDefault(require("./routes/callWebhook"));
const callConfig_1 = __importDefault(require("./routes/callConfig"));
const finance_1 = __importDefault(require("./routes/finance"));
const codCollection_1 = __importDefault(require("./routes/codCollection"));
const codApplication_1 = __importDefault(require("./routes/codApplication"));
const valueAdded_1 = __importDefault(require("./routes/valueAdded"));
const license_1 = __importDefault(require("./routes/license"));
const tenantLicense_1 = __importDefault(require("./routes/tenantLicense"));
const wecom_1 = __importDefault(require("./routes/wecom"));
const admin_1 = __importDefault(require("./routes/admin"));
const public_1 = __importDefault(require("./routes/public"));
const fs = __importStar(require("fs"));
// 根据NODE_ENV环境变量加载对应配置文件
// 生产环境(production): 加载 .env
// 开发环境(development): 优先加载 .env.local，如果不存在则加载 .env
const isProduction = process.env.NODE_ENV === 'production';
let envFile = '.env';
if (!isProduction) {
    // 开发环境：优先使用 .env.local
    const localEnvPath = path_1.default.join(__dirname, '../', '.env.local');
    if (fs.existsSync(localEnvPath)) {
        envFile = '.env.local';
    }
}
const envPath = path_1.default.join(__dirname, '../', envFile);
dotenv_1.default.config({ path: envPath });
console.log(`✅ 已加载${isProduction ? '生产' : '开发'}环境配置: ${envFile}`);
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
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
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'), // 🔥 提高到每个IP 15分钟内最多10000个请求（约667次/分钟）
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
    max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '100'), // 🔥 提高到每个IP 15分钟内最多100次登录尝试
    message: {
        success: false,
        message: '登录尝试过于频繁，请15分钟后再试',
        code: 'TOO_MANY_LOGIN_ATTEMPTS'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req) => {
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
// 支持XML格式的请求体（用于圆通等物流公司的回调）
app.use(express_1.default.text({
    limit: process.env.UPLOAD_MAX_SIZE || '10mb',
    type: ['application/xml', 'text/xml']
}));
// 静态文件服务
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.use('/recordings', express_1.default.static(path_1.default.join(process.cwd(), 'recordings')));
// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'CRM API服务运行正常',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        onlineUsers: WebSocketService_1.webSocketService.getOnlineUsersCount()
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
app.use(`${API_PREFIX}/performance-report`, performanceReport_1.default);
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
app.use(`${API_PREFIX}/customer-service-permissions`, customerServicePermissions_1.default);
app.use(`${API_PREFIX}/timeout-reminder`, timeoutReminder_1.default);
app.use(`${API_PREFIX}/sensitive-info-permissions`, sensitiveInfoPermissions_1.default);
app.use(`${API_PREFIX}/message-cleanup`, messageCleanup_1.default);
app.use(`${API_PREFIX}/mobile`, mobile_1.default);
app.use(`${API_PREFIX}/calls/webhook`, callWebhook_1.default);
app.use(`${API_PREFIX}/call-config`, callConfig_1.default);
app.use(`${API_PREFIX}/finance`, finance_1.default);
app.use(`${API_PREFIX}/cod-collection`, codCollection_1.default);
app.use(`${API_PREFIX}/cod-application`, codApplication_1.default);
app.use(`${API_PREFIX}/value-added`, valueAdded_1.default);
app.use(`${API_PREFIX}/license`, license_1.default);
app.use(`${API_PREFIX}/tenant-license`, tenantLicense_1.default);
app.use(`${API_PREFIX}/wecom`, wecom_1.default);
app.use(`${API_PREFIX}/admin`, admin_1.default);
app.use(`${API_PREFIX}/public`, public_1.default);
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
        // 初始化录音存储服务
        const { recordingStorageService } = await Promise.resolve().then(() => __importStar(require('./services/RecordingStorageService')));
        await recordingStorageService.initialize();
        logger_1.logger.info('✅ 录音存储服务初始化完成');
        // 启动定时任务调度器
        const { schedulerService } = await Promise.resolve().then(() => __importStar(require('./services/SchedulerService')));
        schedulerService.start();
        logger_1.logger.info('✅ 定时任务调度器已启动');
        // 启动HTTP服务器（使用httpServer以支持WebSocket）
        const server = httpServer.listen(PORT, () => {
            logger_1.logger.info(`🚀 CRM API服务已启动`);
            logger_1.logger.info(`📍 服务地址: http://localhost:${PORT}`);
            logger_1.logger.info(`🔗 API前缀: ${API_PREFIX}`);
            logger_1.logger.info(`🌍 运行环境: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
            // 初始化WebSocket服务（异步）
            WebSocketService_1.webSocketService.initialize(httpServer).then(() => {
                global.webSocketService = WebSocketService_1.webSocketService;
                if (WebSocketService_1.webSocketService.isInitialized()) {
                    logger_1.logger.info(`🔌 WebSocket实时推送服务已启动`);
                }
                // Socket.IO 初始化完成后，再初始化移动端 WebSocket 服务
                // 这样可以确保 Socket.IO 先注册 upgrade 处理器
                try {
                    MobileWebSocketService_1.mobileWebSocketService.initialize(httpServer);
                    global.mobileWebSocketService = MobileWebSocketService_1.mobileWebSocketService;
                    logger_1.logger.info(`📱 移动端 WebSocket 服务已启动`);
                }
                catch (err) {
                    logger_1.logger.warn('移动端 WebSocket 服务启动失败:', err.message);
                }
            }).catch(err => {
                logger_1.logger.warn('WebSocket服务启动失败:', err.message);
            });
        });
        // 🔥 启动定时任务：每天凌晨3点清理过期消息（超过30天）
        const scheduleMessageCleanup = () => {
            const cleanupExpiredMessages = async () => {
                try {
                    const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('./config/database')));
                    const { SystemMessage } = await Promise.resolve().then(() => __importStar(require('./entities/SystemMessage')));
                    if (!AppDataSource?.isInitialized) {
                        return;
                    }
                    const messageRepo = AppDataSource.getRepository(SystemMessage);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const result = await messageRepo
                        .createQueryBuilder()
                        .delete()
                        .where('created_at < :date', { date: thirtyDaysAgo })
                        .execute();
                    if (result.affected && result.affected > 0) {
                        logger_1.logger.info(`🧹 [定时任务] 已清理 ${result.affected} 条过期消息（超过30天）`);
                    }
                }
                catch (error) {
                    logger_1.logger.error('[定时任务] 清理过期消息失败:', error);
                }
            };
            // 立即执行一次清理
            cleanupExpiredMessages();
            // 每24小时执行一次（86400000毫秒）
            setInterval(cleanupExpiredMessages, 24 * 60 * 60 * 1000);
            logger_1.logger.info('📅 [定时任务] 消息自动清理任务已启动（每24小时清理超过30天的消息）');
        };
        scheduleMessageCleanup();
        // 🔥 启动超时提醒服务
        const startTimeoutReminderService = async () => {
            try {
                const { timeoutReminderService } = await Promise.resolve().then(() => __importStar(require('./services/TimeoutReminderService')));
                // 从数据库读取配置，决定是否启用
                const { SystemConfig } = await Promise.resolve().then(() => __importStar(require('./entities/SystemConfig')));
                const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('./config/database')));
                if (AppDataSource?.isInitialized) {
                    const configRepo = AppDataSource.getRepository(SystemConfig);
                    const enabledConfig = await configRepo.findOne({
                        where: { configKey: 'timeout_reminder_enabled', configGroup: 'timeout_reminder' }
                    });
                    const intervalConfig = await configRepo.findOne({
                        where: { configKey: 'timeout_check_interval_minutes', configGroup: 'timeout_reminder' }
                    });
                    const isEnabled = enabledConfig?.configValue !== 'false';
                    const intervalMinutes = parseInt(intervalConfig?.configValue || '30', 10);
                    if (isEnabled) {
                        timeoutReminderService.start(intervalMinutes);
                        logger_1.logger.info(`⏰ [定时任务] 超时提醒服务已启动（检测间隔：${intervalMinutes}分钟）`);
                    }
                    else {
                        logger_1.logger.info('⏰ [定时任务] 超时提醒服务已禁用');
                    }
                }
                else {
                    // 数据库未初始化，使用默认配置启动
                    timeoutReminderService.start(30);
                    logger_1.logger.info('⏰ [定时任务] 超时提醒服务已启动（默认配置）');
                }
            }
            catch (error) {
                logger_1.logger.error('[定时任务] 启动超时提醒服务失败:', error);
            }
        };
        startTimeoutReminderService();
        // 🔥 启动业绩报表定时发送服务
        const startPerformanceReportScheduler = async () => {
            try {
                const { performanceReportScheduler } = await Promise.resolve().then(() => __importStar(require('./services/PerformanceReportScheduler')));
                performanceReportScheduler.start();
                logger_1.logger.info('📊 [定时任务] 业绩报表定时发送服务已启动');
            }
            catch (error) {
                logger_1.logger.error('[定时任务] 启动业绩报表定时发送服务失败:', error);
            }
        };
        startPerformanceReportScheduler();
        // 🔥 启动消息清理定时服务
        const startMessageCleanupService = async () => {
            try {
                const { messageCleanupService } = await Promise.resolve().then(() => __importStar(require('./services/MessageCleanupService')));
                messageCleanupService.start();
                logger_1.logger.info('🧹 [定时任务] 消息清理服务已启动');
            }
            catch (error) {
                logger_1.logger.error('[定时任务] 启动消息清理服务失败:', error);
            }
        };
        startMessageCleanupService();
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