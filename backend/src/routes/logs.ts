import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';

const router = Router();

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
    const limit = parseInt(req.query.limit as string) || 100;
    const levelFilter = req.query.level as string;
    
    logger.info('获取系统日志', {
      limit,
      levelFilter,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const logsDir = path.join(process.cwd(), 'logs');
    const logFiles = [
      path.join(logsDir, 'combined.log'),
      path.join(logsDir, 'error.log'),
      path.join(logsDir, 'operations.log')
    ];

    let allLogs: any[] = [];

    // 读取所有日志文件
    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        try {
          const content = fs.readFileSync(logFile, 'utf8');
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
              } else {
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
            } catch (parseError) {
              // 忽略解析错误的行
            }
          }
        } catch (fileError) {
          logger.warn(`读取日志文件失败: ${logFile}`, { error: fileError instanceof Error ? fileError.message : String(fileError) });
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

  } catch (error) {
    logger.error('获取系统日志失败', {
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
    logger.info('清空系统日志请求', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const logsDir = path.join(process.cwd(), 'logs');
    const logFiles = [
      path.join(logsDir, 'combined.log'),
      path.join(logsDir, 'error.log'),
      path.join(logsDir, 'operations.log'),
      path.join(logsDir, 'access.log'),
      path.join(logsDir, 'performance.log')
    ];

    let clearedCount = 0;
    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        try {
          fs.writeFileSync(logFile, '');
          clearedCount++;
        } catch (error) {
          logger.warn(`清空日志文件失败: ${logFile}`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    logger.info('系统日志已清空', { clearedFiles: clearedCount });

    res.json({
      success: true,
      message: `已清空 ${clearedCount} 个日志文件`,
      clearedFiles: clearedCount
    });

  } catch (error) {
      logger.error('清空系统日志失败', {
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

export default router;