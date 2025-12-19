import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { getDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';

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

    // 优先使用环境变量配置的日志路径，否则使用默认路径
    const logsDir = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs');

    logger.info('读取日志目录:', { logsDir, exists: fs.existsSync(logsDir) });

    // 🔥 读取所有常见的日志文件
    const logFiles = [
      path.join(logsDir, 'combined.log'),
      path.join(logsDir, 'error.log'),
      path.join(logsDir, 'operations.log'),
      path.join(logsDir, 'exceptions.log'),
      path.join(logsDir, 'out.log'),
      path.join(logsDir, 'access.log'),
      path.join(logsDir, 'performance.log'),
      path.join(logsDir, 'rejections.log')
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
              // 🔥 优先解析文本格式的日志（如：2025-12-19 09:41:55 [ERROR]: 消息内容）
              const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
              const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG)\]/i);

              if (timestampMatch && levelMatch) {
                const timestamp = timestampMatch[1];
                const level = levelMatch[1].toUpperCase();
                const messageStart = line.indexOf(']:');
                const message = messageStart > -1 ? line.substring(messageStart + 2).trim() : line;

                allLogs.push({
                  id: `${timestamp}_${Math.random().toString(36).substring(2, 11)}`,
                  timestamp,
                  level,
                  module: '系统',
                  message: message || '(无消息内容)',
                  details: line
                });
              }
              // 尝试解析JSON格式的日志
              else if (line.startsWith('{') && line.endsWith('}')) {
                try {
                  const logData = JSON.parse(line);

                  // 检查是否有必要的字段
                  if (logData.timestamp && logData.level && logData.message) {
                    allLogs.push({
                      id: `${logData.timestamp}_${Math.random().toString(36).substring(2, 11)}`,
                      timestamp: logData.timestamp,
                      level: logData.level.toUpperCase(),
                      module: logData.service || '系统',
                      message: logData.message,
                      details: JSON.stringify(logData, null, 2)
                    });
                  }
                  // 如果是错误日志但没有标准字段，也尝试解析
                  else if (logData.service || logData.code || logData.error) {
                    allLogs.push({
                      id: `json_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                      level: logData.fatal ? 'ERROR' : 'INFO',
                      module: logData.service || '系统',
                      message: logData.error || logData.code || JSON.stringify(logData),
                      details: JSON.stringify(logData, null, 2)
                    });
                  }
                } catch (_jsonError) {
                  // JSON解析失败，忽略
                }
              }
            } catch (_parseError) {
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

    const logsDir = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs');
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

/**
 * @route GET /api/v1/logs/operation-logs
 * @desc 获取操作日志（用于超管面板）
 * @access Private (Admin)
 */
router.get('/operation-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const action = req.query.action as string;
    const userId = req.query.userId as string;

    // 从操作日志文件读取数据
    const logsDir = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs');
    const operationsLogFile = path.join(logsDir, 'operations.log');

    let logs: any[] = [];

    if (fs.existsSync(operationsLogFile)) {
      const content = fs.readFileSync(operationsLogFile, 'utf8');
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
        } catch {
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

  } catch (error) {
    logger.error('获取操作日志失败', {
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

/**
 * @route GET /api/v1/logs/config
 * @desc 获取日志清理配置
 * @access Private (Admin only)
 */
router.get('/config', async (req, res) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) {
      res.status(500).json({ success: false, message: '数据库未连接' });
      return;
    }

    const configRepo = dataSource.getRepository(SystemConfig);
    const configs = await configRepo.find({
      where: [
        { configKey: 'log_auto_cleanup' },
        { configKey: 'log_retention_days' },
        { configKey: 'log_max_file_size_mb' },
        { configKey: 'log_cleanup_time' }
      ]
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.configKey] = config.configValue;
      return acc;
    }, {} as Record<string, string>);

    const logConfig = {
      autoCleanup: configMap['log_auto_cleanup'] === 'true',
      retentionDays: parseInt(configMap['log_retention_days'] || '7'),
      maxFileSizeMB: parseInt(configMap['log_max_file_size_mb'] || '20'),
      cleanupTime: configMap['log_cleanup_time'] || '03:00'
    };

    res.json({ success: true, data: logConfig });
  } catch (error) {
    logger.error('获取日志配置失败', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * @route POST /api/v1/logs/config
 * @desc 保存日志清理配置
 * @access Private (Admin only)
 */
router.post('/config', async (req, res) => {
  try {
    const { autoCleanup, retentionDays, maxFileSizeMB, cleanupTime } = req.body;

    const dataSource = getDataSource();
    if (!dataSource) {
      res.status(500).json({ success: false, message: '数据库未连接' });
      return;
    }

    const configRepo = dataSource.getRepository(SystemConfig);

    const configs = [
      { configKey: 'log_auto_cleanup', configValue: autoCleanup ? 'true' : 'false' },
      { configKey: 'log_retention_days', configValue: retentionDays?.toString() || '7' },
      { configKey: 'log_max_file_size_mb', configValue: maxFileSizeMB?.toString() || '20' },
      { configKey: 'log_cleanup_time', configValue: cleanupTime || '03:00' }
    ];

    for (const config of configs) {
      const existing = await configRepo.findOne({ where: { configKey: config.configKey } });
      if (existing) {
        existing.configValue = config.configValue;
        await configRepo.save(existing);
      } else {
        await configRepo.save({
          configKey: config.configKey,
          configValue: config.configValue,
          configGroup: 'logs',
          valueType: 'string' as const,
          description: `日志清理配置: ${config.configKey}`,
          isEnabled: true,
          isSystem: false,
          sortOrder: 0
        });
      }
    }

    logger.info('日志清理配置已保存', { autoCleanup, retentionDays, maxFileSizeMB, cleanupTime });
    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    logger.error('保存日志配置失败', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, message: '保存配置失败' });
  }
});

/**
 * @route GET /api/v1/logs/stats
 * @desc 获取日志统计信息
 * @access Private (Admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const logsDir = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs');

    if (!fs.existsSync(logsDir)) {
      res.json({
        success: true,
        data: { fileCount: 0, totalSize: '0 MB', oldestLog: '' }
      });
      return;
    }

    const files = fs.readdirSync(logsDir);
    const logFiles = files.filter(file => file.endsWith('.log'));

    let totalSizeBytes = 0;
    let oldestTime = Date.now();

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
      try {
        const stats = fs.statSync(filePath);
        totalSizeBytes += stats.size;

        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime();
        }
      } catch (_e) {
        // 忽略无法读取的文件
      }
    }

    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const oldestLog = logFiles.length > 0
      ? new Date(oldestTime).toLocaleDateString('zh-CN')
      : '';

    res.json({
      success: true,
      data: {
        fileCount: logFiles.length,
        totalSize: `${totalSizeMB} MB`,
        oldestLog
      }
    });
  } catch (error) {
    logger.error('获取日志统计失败', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

/**
 * @route DELETE /api/v1/logs/cleanup/:days
 * @desc 清理过期日志
 * @access Private (Admin only)
 */
router.delete('/cleanup/:days', async (req, res) => {
  try {
    const retentionDays = parseInt(req.params.days);
    if (isNaN(retentionDays) || retentionDays < 1) {
      res.status(400).json({ success: false, message: '保留天数参数无效' });
      return;
    }

    const logsDir = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs');

    if (!fs.existsSync(logsDir)) {
      res.json({ success: true, message: '日志目录不存在，无需清理' });
      return;
    }

    const files = fs.readdirSync(logsDir);
    const logFiles = files.filter(file => file.endsWith('.log'));

    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
      try {
        const stats = fs.statSync(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          deletedSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (_e) {
        // 忽略无法处理的文件
      }
    }

    const deletedSizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
    const message = `已清理 ${deletedCount} 个过期日志文件，释放空间 ${deletedSizeMB} MB`;

    logger.info('清理过期日志', { deletedCount, deletedSizeMB, retentionDays });
    res.json({ success: true, message });
  } catch (error) {
    logger.error('清理过期日志失败', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, message: '清理失败' });
  }
});

export default router;
