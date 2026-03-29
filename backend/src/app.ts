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
import { tenantContextMiddleware } from './utils/tenantContext';

// ·�ɵ���
import authRoutes from './routes/auth';
// import mockAuthRoutes from './routes/mockAuth'; // �ļ���ɾ��
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

// ����NODE_ENV�����������ض�Ӧ�����ļ�
// ��������(production): ���� .env
// ��������(development): ���ȼ��� .env.local���������������� .env
const isProduction = process.env.NODE_ENV === 'production';
let envFile = '.env';
if (!isProduction) {
  // ��������������ʹ�� .env.local
  const localEnvPath = path.join(__dirname, '../', '.env.local');
  if (fs.existsSync(localEnvPath)) {
    envFile = '.env.local';
  }
}
const envPath = path.join(__dirname, '../', envFile);
dotenv.config({ path: envPath });
console.log(`? �Ѽ���${isProduction ? '����' : '����'}��������: ${envFile}`);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// ���δ��������ڻ�ȡ��ʵIP��
app.set('trust proxy', 1);

// ��ȫ�м��
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
        // ����ǰ�����˽������ӣ�XHR/Fetch/WebSocket�������� CSP ���µ� net::ERR_FAILED
        connectSrc: ["'self'", apiOrigin, ...allowedOrigins, "ws:", "wss:"],
      },
    },
  }))
}

// CORS����
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
}));

// ѹ���м��
if (process.env.COMPRESSION_ENABLED !== 'false') {
  app.use(compression());
}

// ͨ�������м�� - ��������ʹ�ø����ɵ�����
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15����
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'), // ?? ��ߵ�ÿ��IP 15���������10000������Լ667��/���ӣ�
  message: {
    success: false,
    message: '�������Ƶ�������Ժ�����',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // �����������˵�
    return req.path === '/health' || req.path.includes('/health')
  }
});

// ��¼ר�������м�� - ���ϸ񵫺���������
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'), // 15����
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '100'), // ?? ��ߵ�ÿ��IP 15���������100�ε�¼����
  message: {
    success: false,
    message: '��¼���Թ���Ƶ������15���Ӻ�����',
    code: 'TOO_MANY_LOGIN_ATTEMPTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    // ��������������¼����
    return process.env.NODE_ENV === 'development';
  }
});

app.use(generalLimiter);

// ������־�м��
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.http(message.trim());
    }
  }
}));

// �����м��
app.use(express.json({
  limit: process.env.UPLOAD_MAX_SIZE || '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({
  extended: true,
  limit: process.env.UPLOAD_MAX_SIZE || '10mb'
}));
// ֧��XML��ʽ�������壨����Բͨ��������˾�Ļص���
app.use(express.text({
  limit: process.env.UPLOAD_MAX_SIZE || '10mb',
  type: ['application/xml', 'text/xml']
}));

// ��̬�ļ�����
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/recordings', express.static(path.join(process.cwd(), 'recordings')));

// �⻧�������м�� - ������·��֮ǰ����AsyncLocalStorage������
// authenticateToken�м������JWT��֤��ͨ��TenantContextManager.setContext()����tenantId
app.use(tenantContextMiddleware);

// �������˵�
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CRM API������������',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    onlineUsers: webSocketService.getOnlineUsersCount()
  });
});

// API�������˵�
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({
    success: true,
    message: 'CRM API������������',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ��·������ - ����API��Ϣ
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CRM API����',
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

// ע��·��
// ���������²�Ӧ�õ�¼������
if (process.env.NODE_ENV === 'development') {
  app.use(`${API_PREFIX}/auth`, authRoutes);
  // app.use(`${API_PREFIX}/mock-auth`, mockAuthRoutes); // Mock·����ɾ��
} else {
  app.use(`${API_PREFIX}/auth`, loginLimiter, authRoutes);
  // app.use(`${API_PREFIX}/mock-auth`, loginLimiter, mockAuthRoutes); // Mock·����ɾ��
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

// 404����
app.use(notFoundHandler);

// ȫ�ִ�����
app.use(errorHandler);

// ����������
const startServer = async () => {
  try {
    // ��ʼ�����ݿ�����
    await initializeDatabase();
    logger.info('? ���ݿ��ʼ�����');

    // ��ʼ��¼���洢����
    const { recordingStorageService } = await import('./services/RecordingStorageService');
    await recordingStorageService.initialize();
    logger.info('? ¼���洢�����ʼ�����');

    // ������ʱ���������
    const { schedulerService } = await import('./services/SchedulerService');
    schedulerService.start();
    logger.info('? ��ʱ���������������');

    // ����HTTP��������ʹ��httpServer��֧��WebSocket��
    const server = httpServer.listen(PORT, () => {
      logger.info(`?? CRM API����������`);
      logger.info(`?? �����ַ: http://localhost:${PORT}`);
      logger.info(`?? APIǰ׺: ${API_PREFIX}`);
      logger.info(`?? ���л���: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`?? �������: http://localhost:${PORT}/health`);

      // ��ʼ��WebSocket�����첽��
      webSocketService.initialize(httpServer).then(() => {
        global.webSocketService = webSocketService;
        if (webSocketService.isInitialized()) {
          logger.info(`?? WebSocketʵʱ���ͷ���������`);
        }

        // Socket.IO ��ʼ����ɺ��ٳ�ʼ���ƶ��� WebSocket ����
        // ��������ȷ�� Socket.IO ��ע�� upgrade ������
        try {
          mobileWebSocketService.initialize(httpServer);
          (global as any).mobileWebSocketService = mobileWebSocketService;
          logger.info(`?? �ƶ��� WebSocket ����������`);
        } catch (err: any) {
          logger.warn('�ƶ��� WebSocket ��������ʧ��:', err.message);
        }
      }).catch(err => {
        logger.warn('WebSocket��������ʧ��:', err.message);
      });
    });

    // ?? ������ʱ����ÿ���賿3������������Ϣ������30�죩
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
            logger.info(`?? [��ʱ����] ������ ${result.affected} ��������Ϣ������30�죩`);
          }
        } catch (error) {
          logger.error('[��ʱ����] ����������Ϣʧ��:', error);
        }
      };

      // ����ִ��һ������
      cleanupExpiredMessages();

      // ÿ24Сʱִ��һ�Σ�86400000���룩
      setInterval(cleanupExpiredMessages, 24 * 60 * 60 * 1000);
      logger.info('?? [��ʱ����] ��Ϣ�Զ�����������������ÿ24Сʱ��������30�����Ϣ��');
    };

    scheduleMessageCleanup();

    // ?? ������ʱ���ѷ���
    const startTimeoutReminderService = async () => {
      try {
        const { timeoutReminderService } = await import('./services/TimeoutReminderService');

        // �����ݿ��ȡ���ã������Ƿ�����
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
            logger.info(`? [��ʱ����] ��ʱ���ѷ������������������${intervalMinutes}���ӣ�`);
          } else {
            logger.info('? [��ʱ����] ��ʱ���ѷ����ѽ���');
          }
        } else {
          // ���ݿ�δ��ʼ����ʹ��Ĭ����������
          timeoutReminderService.start(30);
          logger.info('? [��ʱ����] ��ʱ���ѷ�����������Ĭ�����ã�');
        }
      } catch (error) {
        logger.error('[��ʱ����] ������ʱ���ѷ���ʧ��:', error);
      }
    };

    startTimeoutReminderService();

    // ?? ����ҵ��������ʱ���ͷ���
    const startPerformanceReportScheduler = async () => {
      try {
        const { performanceReportScheduler } = await import('./services/PerformanceReportScheduler');
        performanceReportScheduler.start();
        logger.info('?? [��ʱ����] ҵ��������ʱ���ͷ���������');
      } catch (error) {
        logger.error('[��ʱ����] ����ҵ��������ʱ���ͷ���ʧ��:', error);
      }
    };

    startPerformanceReportScheduler();

    // ?? ������Ϣ������ʱ����
    const startMessageCleanupService = async () => {
      try {
        const { messageCleanupService } = await import('./services/MessageCleanupService');
        messageCleanupService.start();
        logger.info('?? [��ʱ����] ��Ϣ��������������');
      } catch (error) {
        logger.error('[��ʱ����] ������Ϣ��������ʧ��:', error);
      }
    };

    startMessageCleanupService();

    // ���Źرմ���
    const gracefulShutdown = async (signal: string) => {
      logger.info(`�յ� ${signal} �źţ���ʼ���Źر�...`);

      server.close(async () => {
        logger.info('HTTP�������ѹر�');

        try {
          await closeDatabase();
          logger.info('���ݿ������ѹر�');
          process.exit(0);
        } catch (error) {
          logger.error('�ر����ݿ�����ʱ����:', error);
          process.exit(1);
        }
      });

      // ǿ�ƹرճ�ʱ
      setTimeout(() => {
        logger.error('ǿ�ƹرշ�����');
        process.exit(1);
      }, 10000);
    };

    // �����ر��ź�
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // δ�����쳣����
    process.on('uncaughtException', (error) => {
      logger.error('δ������쳣:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('δ������Promise�ܾ�:', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('����������ʧ��:', error);
    process.exit(1);
  }
};

// ����Ӧ��
if (require.main === module) {
  startServer();
}

export default app;
