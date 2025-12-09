"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceLogger = exports.operationLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// 日志级别
const logLevel = process.env.LOG_LEVEL || 'info';
// 日志格式
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
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
}));
// 创建日志目录
const logsDir = path_1.default.join(process.cwd(), 'logs');
// 创建logger实例
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: 'crm-api' },
    transports: [
        // 错误日志文件
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 14, // 保留14天
            tailable: true
        }),
        // 组合日志文件
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'combined.log'),
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 14, // 保留14天
            tailable: true
        }),
        // 访问日志文件
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'access.log'),
            level: 'http',
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 7, // 保留7天
            tailable: true
        })
    ],
    // 异常处理
    exceptionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'exceptions.log')
        })
    ],
    // 拒绝处理
    rejectionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'rejections.log')
        })
    ]
});
// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
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
        }))
    }));
}
// 操作日志记录器
exports.operationLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'operations.log'),
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 30, // 保留30天
            tailable: true
        })
    ]
});
// 性能日志记录器
exports.performanceLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'performance.log'),
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 7, // 保留7天
            tailable: true
        })
    ]
});
// 导出默认logger
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map