import winston from 'winston';
import path from 'path';
import { execSync } from 'child_process';

// Windows 终端: 设置控制台代码页为 UTF-8，解决中文和 emoji 乱码
// 必须用 stdio: 'pipe' 而非 'ignore'，否则 PowerShell 5.1 会白屏
if (process.platform === 'win32') {
  try { execSync('chcp 65001', { stdio: 'pipe' }); } catch { /* 非 Windows 忽略 */ }
}

// 日志级别
const logLevel = process.env.LOG_LEVEL || 'info';

// 日志格式（写入文件用）
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 创建日志目录
const logsDir = path.join(process.cwd(), 'logs');

// 创建 logger 实例
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'crm-api' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 20 * 1024 * 1024,
      maxFiles: 14,
      tailable: true
    }),
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 14,
      tailable: true
    }),
    // 访问日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 20 * 1024 * 1024,
      maxFiles: 7,
      tailable: true
    })
  ],
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ]
});

// 开发环境添加控制台输出（简洁格式，不输出 JSON 元数据噪音）
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (stack) {
          log += `\n${stack}`;
        }
        return log;
      })
    )
  }));
}

// 操作日志记录器
export const operationLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'operations.log'),
      maxsize: 50 * 1024 * 1024,
      maxFiles: 30,
      tailable: true
    })
  ]
});

// 性能日志记录器
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 7,
      tailable: true
    })
  ]
});

// ── Console 兼容包装器 ──────────────────────────────────
// 接受与 console.log 相同的可变参数，自动拼接并路由到 Winston
// 用法：import { log } from '../config/logger'
//       log.info('msg:', variable)

function formatArgs(args: unknown[]): string {
  return args
    .map(a =>
      a instanceof Error
        ? a.message
        : typeof a === 'object' && a !== null
          ? JSON.stringify(a)
          : String(a)
    )
    .join(' ');
}

export const log = {
  info: (...args: unknown[]) => {
    logger.info(formatArgs(args));
  },
  error: (...args: unknown[]) => {
    const errArg = args.find(a => a instanceof Error) as Error | undefined;
    const msg = formatArgs(args);
    if (errArg?.stack) {
      logger.error(msg, { stack: errArg.stack });
    } else {
      logger.error(msg);
    }
  },
  warn: (...args: unknown[]) => {
    logger.warn(formatArgs(args));
  },
  debug: (...args: unknown[]) => {
    logger.debug(formatArgs(args));
  },
};

// 导出默认 logger
export default logger;
