import winston from 'winston';
import path from 'path';

// 日志级别
const logLevel = process.env.LOG_LEVEL || 'info';

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // 添加堆栈信息（如果有错误）
    if (stack) {
      log += `\n${stack}`;
    }
    
    // 添加元数据
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// 创建日志目录
const logsDir = path.join(process.cwd(), 'logs');

// 创建logger实例
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'crm-api' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 14, // 保留14天
      tailable: true
    }),
    
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 14, // 保留14天
      tailable: true
    }),
    
    // 访问日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 7, // 保留7天
      tailable: true
    })
  ],
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        // 添加堆栈信息（如果有错误）
        if (stack) {
          log += `\n${stack}`;
        }
        
        // 添加元数据
        if (Object.keys(meta).length > 0) {
          log += `\n${JSON.stringify(meta, null, 2)}`;
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
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 30, // 保留30天
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
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 7, // 保留7天
      tailable: true
    })
  ]
});

// 导出默认logger
export default logger;