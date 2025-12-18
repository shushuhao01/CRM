"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/v1/logs/system:
 *   get:
 *     summary: 获取系统日志
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 返回日志条数限制
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: 日志级别过滤
 *     responses:
 *       200:
 *         description: 系统日志列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       level:
 *                         type: string
 *                       module:
 *                         type: string
 *                       message:
 *                         type: string
 *                       details:
 *                         type: string
 */
router.get('/system', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const levelFilter = req.query.level;
        logger_1.logger.info('获取系统日志', {
            limit,
            levelFilter,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        const logsDir = path_1.default.join(process.cwd(), 'logs');
        const logFiles = [
            path_1.default.join(logsDir, 'combined.log'),
            path_1.default.join(logsDir, 'error.log'),
            path_1.default.join(logsDir, 'operations.log')
        ];
        let allLogs = [];
        // 读取所有日志文件
        for (const logFile of logFiles) {
            if (fs_1.default.existsSync(logFile)) {
                try {
                    const content = fs_1.default.readFileSync(logFile, 'utf8');
                    const lines = content.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        try {
                            // 尝试解析JSON格式的日志
                            if (line.includes('{') && line.includes('}')) {
                                const jsonStart = line.indexOf('{');
                                const jsonPart = line.substring(jsonStart);
                                const logData = JSON.parse(jsonPart);
                                if (logData.timestamp && logData.level && logData.message) {
                                    allLogs.push({
                                        id: `${logData.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                                        timestamp: logData.timestamp,
                                        level: logData.level.toUpperCase(),
                                        module: logData.service || '系统',
                                        message: logData.message,
                                        details: JSON.stringify(logData, null, 2)
                                    });
                                }
                            }
                            else {
                                // 解析文本格式的日志
                                const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
                                const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG)\]/);
                                if (timestampMatch && levelMatch) {
                                    const timestamp = timestampMatch[1];
                                    const level = levelMatch[1];
                                    const messageStart = line.indexOf(']:') + 2;
                                    const message = line.substring(messageStart).trim();
                                    allLogs.push({
                                        id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                                        timestamp,
                                        level,
                                        module: '系统',
                                        message,
                                        details: line
                                    });
                                }
                            }
                        }
                        catch (_parseError) {
                            // 忽略解析错误的行
                        }
                    }
                }
                catch (fileError) {
                    logger_1.logger.warn(`读取日志文件失败: ${logFile}`, { error: fileError instanceof Error ? fileError.message : String(fileError) });
                }
            }
        }
        // 按时间戳排序（最新的在前）
        allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // 应用级别过滤
        if (levelFilter) {
            allLogs = allLogs.filter(log => log.level.toLowerCase() === levelFilter.toLowerCase());
        }
        // 限制返回数量
        allLogs = allLogs.slice(0, limit);
        res.json({
            success: true,
            data: allLogs,
            total: allLogs.length
        });
    }
    catch (error) {
        logger_1.logger.error('获取系统日志失败', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            message: '获取系统日志失败',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * @swagger
 * /api/v1/logs/clear:
 *   delete:
 *     summary: 清空系统日志
 *     tags: [Logs]
 *     responses:
 *       200:
 *         description: 清空成功
 */
router.delete('/clear', async (req, res) => {
    try {
        logger_1.logger.info('清空系统日志请求', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        const logsDir = path_1.default.join(process.cwd(), 'logs');
        const logFiles = [
            path_1.default.join(logsDir, 'combined.log'),
            path_1.default.join(logsDir, 'error.log'),
            path_1.default.join(logsDir, 'operations.log'),
            path_1.default.join(logsDir, 'access.log'),
            path_1.default.join(logsDir, 'performance.log')
        ];
        let clearedCount = 0;
        for (const logFile of logFiles) {
            if (fs_1.default.existsSync(logFile)) {
                try {
                    fs_1.default.writeFileSync(logFile, '');
                    clearedCount++;
                }
                catch (error) {
                    logger_1.logger.warn(`清空日志文件失败: ${logFile}`, { error: error instanceof Error ? error.message : String(error) });
                }
            }
        }
        logger_1.logger.info('系统日志已清空', { clearedFiles: clearedCount });
        res.json({
            success: true,
            message: `已清空 ${clearedCount} 个日志文件`,
            clearedFiles: clearedCount
        });
    }
    catch (error) {
        logger_1.logger.error('清空系统日志失败', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            message: '清空系统日志失败',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * @route GET /api/v1/logs/operation-logs
 * @desc 获取操作日志（用于超管面板）
 * @access Private (Admin)
 */
router.get('/operation-logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const action = req.query.action;
        const userId = req.query.userId;
        // 从操作日志文件读取数据
        const logsDir = path_1.default.join(process.cwd(), 'logs');
        const operationsLogFile = path_1.default.join(logsDir, 'operations.log');
        let logs = [];
        if (fs_1.default.existsSync(operationsLogFile)) {
            const content = fs_1.default.readFileSync(operationsLogFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            logs = lines.map((line, index) => {
                try {
                    const parsed = JSON.parse(line);
                    return {
                        id: index + 1,
                        createdAt: parsed.timestamp || new Date().toISOString(),
                        username: parsed.username || parsed.user || '系统',
                        action: parsed.action || parsed.level || 'info',
                        module: parsed.module || 'system',
                        description: parsed.message || parsed.description || '',
                        ip: parsed.ip || '-',
                        targetUser: parsed.targetUser || '-'
                    };
                }
                catch {
                    return {
                        id: index + 1,
                        createdAt: new Date().toISOString(),
                        username: '系统',
                        action: 'info',
                        module: 'system',
                        description: line,
                        ip: '-',
                        targetUser: '-'
                    };
                }
            }).reverse(); // 最新的在前面
        }
        // 应用过滤条件
        if (startDate) {
            logs = logs.filter(log => new Date(log.createdAt) >= new Date(startDate));
        }
        if (endDate) {
            logs = logs.filter(log => new Date(log.createdAt) <= new Date(endDate));
        }
        if (action) {
            logs = logs.filter(log => log.action.toLowerCase().includes(action.toLowerCase()));
        }
        if (userId) {
            logs = logs.filter(log => log.username.includes(userId));
        }
        // 分页
        const total = logs.length;
        const start = (page - 1) * pageSize;
        const paginatedLogs = logs.slice(start, start + pageSize);
        res.json({
            success: true,
            data: paginatedLogs,
            total,
            page,
            pageSize
        });
    }
    catch (error) {
        logger_1.logger.error('获取操作日志失败', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            message: '获取操作日志失败',
            data: [],
            total: 0
        });
    }
});
exports.default = router;
//# sourceMappingURL=logs.js.map