import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { initializeDatabase, closeDatabase } from './config/database';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { webSocketService } from './services/WebSocketService';
import { mobileWebSocketService } from './services/MobileWebSocketService';

// 路由导入
import authRoutes from './routes/auth';
// import mockAuthRoutes from './routes/mockAuth'; // 文件已删除
import userRoutes from './routes/users';
import profileRoutes from './routes/profile';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import systemRoutes from './routes/system';
import sdkRoutes from './routes/sdk';
import mobileSdkRoutes from './routes/mobile-sdk';
import qrConnectionRoutes from './routes/qr-connection';
import alternativeConnectionRoutes from './routes/alternative-connection';
import dashboardRoutes from './routes/dashboard';
import callRoutes from './routes/calls';
import logsRoutes from './routes/logs';
import messageRoutes from './routes/message';
import performanceRoutes from './routes/performance';
import logisticsRoutes from './routes/logistics';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';
import sfExpressRoutes from './routes/sfExpress';
import ytoExpressRoutes from './routes/ytoExpress';
import serviceRoutes from './routes/services';
import dataRoutes from './routes/data';
import assignmentRoutes from './routes/assignment';
import smsRoutes from './routes/sms';
import customerShareRoutes from './routes/customerShare';
import performanceReportRoutes from './routes/performanceReport';
import customerServicePermissionRoutes from './routes/customerServicePermissions';
import timeoutReminderRoutes from './routes/timeoutReminder';
import sensitiveInfoPermissionRoutes from './routes/sensitiveInfoPermissions';
import messageCleanupRoutes from './routes/messageCleanup';
import mobileRoutes from './routes/mobile';
import callWebhookRoutes from './routes/callWebhook';
import callConfigRoutes from './routes/callConfig';
import financeRoutes from './routes/finance';
import codCollectionRoutes from './routes/codCollection';
import codApplicationRoutes from './routes/codApplication';
import valueAddedRoutes from './routes/valueAdded';
import licenseRoutes from './routes/license';
import tenantLicenseRoutes from './routes/tenantLicense';
import wecomRoutes from './routes/wecom';
import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';
import * as fs from 'fs';

// 根据NODE_ENV环境变量加载对应配置文件
// 生产环境(production): 加载 .env
// 开发环境(development): 优先加载 .env.local，如果不存在则加载 .env
const isProduction = process.env.NODE_ENV === 'production';
let envFile = '.env';
if (!isProduction) {
  // 开发环境：优先使用 .env.local
  const localEnvPath = path.join(__dirname, '../', '.env.local');
  if (fs.existsSync(localEnvPath)) {
    envFile = '.env.local';
  }
}
const envPath = path.join(__dirname, '../', envFile);
dotenv.config({ path: envPath });
console.log(`✅ 已加载${isProduction ? '生产' : '开发'}环境配置: ${envFile}`);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);

// 安全中间件
if (process.env.HELMET_ENABLED !== 'false') {
  const allowedOrigins = (process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']).map(o => o.trim())
  const apiOrigin = `http://localhost:${process.env.PORT || 3000}`
  app.use(helmet({
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
  }))
}

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
}));

// 压缩中间件
if (process.env.COMPRESSION_ENABLED !== 'false') {
  app.use(compression());
}

// 通用限流中间件 - 开发环境使用更宽松的限制
const generalLimiter = rateLimit({
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
    return req.path === '/health' || req.path.includes('/health')
  }
});

// 登录专用限流中间件 - 更严格但合理的限制
const loginLimiter = rateLimit({
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
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.http(message.trim());
    }
  }
}));

// 解析中间件
app.use(express.json({
  limit: process.env.UPLOAD_MAX_SIZE || '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({
  extended: true,
  limit: process.env.UPLOAD_MAX_SIZE || '10mb'
}));
// 支持XML格式的请求体（用于圆通等物流公司的回调）
app.use(express.text({
  limit: process.env.UPLOAD_MAX_SIZE || '10mb',
  type: ['application/xml', 'text/xml']
}));

// 静态文件服务
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/recordings', express.static(path.join(process.cwd(), 'recordings')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CRM API服务运行正常',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    onlineUsers: webSocketService.getOnlineUsersCount()
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
  app.use(`${API_PREFIX}/auth`, authRoutes);
  // app.use(`${API_PREFIX}/mock-auth`, mockAuthRoutes); // Mock路由已删除
} else {
  app.use(`${API_PREFIX}/auth`, loginLimiter, authRoutes);
  // app.use(`${API_PREFIX}/mock-auth`, loginLimiter, mockAuthRoutes); // Mock路由已删除
}
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/system`, systemRoutes);
app.use(`${API_PREFIX}/sdk`, sdkRoutes);
app.use(`${API_PREFIX}/mobile-sdk`, mobileSdkRoutes);
app.use(`${API_PREFIX}/qr-connection`, qrConnectionRoutes);
app.use(`${API_PREFIX}/alternative-connection`, alternativeConnectionRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/calls`, callRoutes);
app.use(`${API_PREFIX}/logs`, logsRoutes);
app.use(`${API_PREFIX}/message`, messageRoutes);
app.use(`${API_PREFIX}/performance-report`, performanceReportRoutes);
app.use(`${API_PREFIX}/performance`, performanceRoutes);
app.use(`${API_PREFIX}/logistics`, logisticsRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/permissions`, permissionRoutes);
app.use(`${API_PREFIX}/sf-express`, sfExpressRoutes);
app.use(`${API_PREFIX}/yto-express`, ytoExpressRoutes);
app.use(`${API_PREFIX}/services`, serviceRoutes);
app.use(`${API_PREFIX}/data`, dataRoutes);
app.use(`${API_PREFIX}/assignment`, assignmentRoutes);
app.use(`${API_PREFIX}/sms`, smsRoutes);
app.use(`${API_PREFIX}/customer-share`, customerShareRoutes);
app.use(`${API_PREFIX}/customer-service-permissions`, customerServicePermissionRoutes);
app.use(`${API_PREFIX}/timeout-reminder`, timeoutReminderRoutes);
app.use(`${API_PREFIX}/sensitive-info-permissions`, sensitiveInfoPermissionRoutes);
app.use(`${API_PREFIX}/message-cleanup`, messageCleanupRoutes);
app.use(`${API_PREFIX}/mobile`, mobileRoutes);
app.use(`${API_PREFIX}/calls/webhook`, callWebhookRoutes);
app.use(`${API_PREFIX}/call-config`, callConfigRoutes);
app.use(`${API_PREFIX}/finance`, financeRoutes);
app.use(`${API_PREFIX}/cod-collection`, codCollectionRoutes);
app.use(`${API_PREFIX}/cod-application`, codApplicationRoutes);
app.use(`${API_PREFIX}/value-added`, valueAddedRoutes);
app.use(`${API_PREFIX}/license`, licenseRoutes);
app.use(`${API_PREFIX}/tenant-license`, tenantLicenseRoutes);
app.use(`${API_PREFIX}/wecom`, wecomRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库连接
    await initializeDatabase();
    logger.info('✅ 数据库初始化完成');

    // 初始化录音存储服务
    const { recordingStorageService } = await import('./services/RecordingStorageService');
    await recordingStorageService.initialize();
    logger.info('✅ 录音存储服务初始化完成');

    // 启动HTTP服务器（使用httpServer以支持WebSocket）
    const server = httpServer.listen(PORT, () => {
      logger.info(`🚀 CRM API服务已启动`);
      logger.info(`📍 服务地址: http://localhost:${PORT}`);
      logger.info(`🔗 API前缀: ${API_PREFIX}`);
      logger.info(`🌍 运行环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 健康检查: http://localhost:${PORT}/health`);

      // 初始化WebSocket服务（异步）
      webSocketService.initialize(httpServer).then(() => {
        global.webSocketService = webSocketService;
        if (webSocketService.isInitialized()) {
          logger.info(`🔌 WebSocket实时推送服务已启动`);
        }

        // Socket.IO 初始化完成后，再初始化移动端 WebSocket 服务
        // 这样可以确保 Socket.IO 先注册 upgrade 处理器
        try {
          mobileWebSocketService.initialize(httpServer);
          (global as any).mobileWebSocketService = mobileWebSocketService;
          logger.info(`📱 移动端 WebSocket 服务已启动`);
        } catch (err: any) {
          logger.warn('移动端 WebSocket 服务启动失败:', err.message);
        }
      }).catch(err => {
        logger.warn('WebSocket服务启动失败:', err.message);
      });
    });

    // 🔥 启动定时任务：每天凌晨3点清理过期消息（超过30天）
    const scheduleMessageCleanup = () => {
      const cleanupExpiredMessages = async () => {
        try {
          const { AppDataSource } = await import('./config/database');
          const { SystemMessage } = await import('./entities/SystemMessage');

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
            logger.info(`🧹 [定时任务] 已清理 ${result.affected} 条过期消息（超过30天）`);
          }
        } catch (error) {
          logger.error('[定时任务] 清理过期消息失败:', error);
        }
      };

      // 立即执行一次清理
      cleanupExpiredMessages();

      // 每24小时执行一次（86400000毫秒）
      setInterval(cleanupExpiredMessages, 24 * 60 * 60 * 1000);
      logger.info('📅 [定时任务] 消息自动清理任务已启动（每24小时清理超过30天的消息）');
    };

    scheduleMessageCleanup();

    // 🔥 启动超时提醒服务
    const startTimeoutReminderService = async () => {
      try {
        const { timeoutReminderService } = await import('./services/TimeoutReminderService');

        // 从数据库读取配置，决定是否启用
        const { SystemConfig } = await import('./entities/SystemConfig');
        const { AppDataSource } = await import('./config/database');

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
            logger.info(`⏰ [定时任务] 超时提醒服务已启动（检测间隔：${intervalMinutes}分钟）`);
          } else {
            logger.info('⏰ [定时任务] 超时提醒服务已禁用');
          }
        } else {
          // 数据库未初始化，使用默认配置启动
          timeoutReminderService.start(30);
          logger.info('⏰ [定时任务] 超时提醒服务已启动（默认配置）');
        }
      } catch (error) {
        logger.error('[定时任务] 启动超时提醒服务失败:', error);
      }
    };

    startTimeoutReminderService();

    // 🔥 启动业绩报表定时发送服务
    const startPerformanceReportScheduler = async () => {
      try {
        const { performanceReportScheduler } = await import('./services/PerformanceReportScheduler');
        performanceReportScheduler.start();
        logger.info('📊 [定时任务] 业绩报表定时发送服务已启动');
      } catch (error) {
        logger.error('[定时任务] 启动业绩报表定时发送服务失败:', error);
      }
    };

    startPerformanceReportScheduler();

    // 🔥 启动消息清理定时服务
    const startMessageCleanupService = async () => {
      try {
        const { messageCleanupService } = await import('./services/MessageCleanupService');
        messageCleanupService.start();
        logger.info('🧹 [定时任务] 消息清理服务已启动');
      } catch (error) {
        logger.error('[定时任务] 启动消息清理服务失败:', error);
      }
    };

    startMessageCleanupService();

    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

      server.close(async () => {
        logger.info('HTTP服务器已关闭');

        try {
          await closeDatabase();
          logger.info('数据库连接已关闭');
          process.exit(0);
        } catch (error) {
          logger.error('关闭数据库连接时出错:', error);
          process.exit(1);
        }
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error('强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 启动应用
if (require.main === module) {
  startServer();
}

export default app;
