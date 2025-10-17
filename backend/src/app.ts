import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { initializeDatabase, closeDatabase } from './config/database';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// 路由导入
import authRoutes from './routes/auth';
import mockAuthRoutes from './routes/mockAuth';
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

// 加载环境变量
dotenv.config();

const app = express();
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
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 5分钟（开发环境）
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 限制每个IP 5分钟内最多1000个请求（开发环境）
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
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '10'), // 限制每个IP 15分钟内最多10次登录尝试
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

// 静态文件服务
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
    environment: process.env.NODE_ENV || 'development',
    apiPrefix: API_PREFIX
  });
});

// 注册路由
// 开发环境下不应用登录限流器
if (process.env.NODE_ENV === 'development') {
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/mock-auth`, mockAuthRoutes);
} else {
  app.use(`${API_PREFIX}/auth`, loginLimiter, authRoutes);
  app.use(`${API_PREFIX}/mock-auth`, loginLimiter, mockAuthRoutes);
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
app.use(`${API_PREFIX}/performance`, performanceRoutes);
app.use(`${API_PREFIX}/logistics`, logisticsRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/permissions`, permissionRoutes);

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
    
    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info(`🚀 CRM API服务已启动`);
      logger.info(`📍 服务地址: http://localhost:${PORT}`);
      logger.info(`🔗 API前缀: ${API_PREFIX}`);
      logger.info(`🌍 运行环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
    });

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