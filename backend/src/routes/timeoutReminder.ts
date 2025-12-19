/**
 * 超时提醒API路由
 *
 * 提供超时提醒的手动触发和配置管理接口
 */

import { Router, Request, Response } from 'express';
import { timeoutReminderService } from '../services/TimeoutReminderService';
import { getDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';

const router = Router();

/**
 * @route GET /api/v1/timeout-reminder/config
 * @desc 获取超时提醒配置
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await timeoutReminderService.getCurrentConfig();

    // 获取启用状态
    const dataSource = getDataSource();
    let isEnabled = true;

    if (dataSource) {
      const configRepo = dataSource.getRepository(SystemConfig);
      const enabledConfig = await configRepo.findOne({
        where: { configKey: 'timeout_reminder_enabled', configGroup: 'timeout_reminder' }
      });
      isEnabled = enabledConfig?.configValue !== 'false';
    }

    res.json({
      success: true,
      data: {
        ...config,
        isEnabled
      }
    });
  } catch (error: any) {
    console.error('获取超时配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取超时配置失败: ' + error.message
    });
  }
});

/**
 * @route PUT /api/v1/timeout-reminder/config
 * @desc 更新超时提醒配置
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const {
      orderAuditTimeout,
      orderShipmentTimeout,
      afterSalesTimeout,
      orderFollowupDays,
      isEnabled,
      checkIntervalMinutes
    } = req.body;

    const dataSource = getDataSource();
    if (!dataSource) {
      res.status(500).json({ success: false, message: '数据库未连接' });
      return;
    }

    const configRepo = dataSource.getRepository(SystemConfig);

    // 更新配置
    const updates: Array<{ key: string; value: string }> = [];

    if (orderAuditTimeout !== undefined) {
      updates.push({ key: 'order_audit_timeout_hours', value: String(orderAuditTimeout) });
    }
    if (orderShipmentTimeout !== undefined) {
      updates.push({ key: 'order_shipment_timeout_hours', value: String(orderShipmentTimeout) });
    }
    if (afterSalesTimeout !== undefined) {
      updates.push({ key: 'after_sales_timeout_hours', value: String(afterSalesTimeout) });
    }
    if (orderFollowupDays !== undefined) {
      updates.push({ key: 'order_followup_days', value: String(orderFollowupDays) });
    }
    if (isEnabled !== undefined) {
      updates.push({ key: 'timeout_reminder_enabled', value: String(isEnabled) });
    }
    if (checkIntervalMinutes !== undefined) {
      updates.push({ key: 'timeout_check_interval_minutes', value: String(checkIntervalMinutes) });
    }

    for (const update of updates) {
      await configRepo.upsert({
        configKey: update.key,
        configValue: update.value,
        configGroup: 'timeout_reminder',
        valueType: update.key === 'timeout_reminder_enabled' ? 'boolean' : 'number',
        isEnabled: true,
        isSystem: true
      }, ['configKey', 'configGroup']);
    }

    res.json({
      success: true,
      message: '超时配置更新成功'
    });
  } catch (error: any) {
    console.error('更新超时配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新超时配置失败: ' + error.message
    });
  }
});

/**
 * @route POST /api/v1/timeout-reminder/check
 * @desc 手动触发超时检测
 */
router.post('/check', async (_req: Request, res: Response) => {
  try {
    console.log('[TimeoutReminder API] 手动触发超时检测');

    const result = await timeoutReminderService.manualCheck();

    res.json({
      success: true,
      message: '超时检测完成',
      data: {
        orderAuditTimeoutCount: result.orderAuditTimeout,
        orderShipmentTimeoutCount: result.orderShipmentTimeout,
        afterSalesTimeoutCount: result.afterSalesTimeout,
        orderFollowupCount: result.orderFollowup,
        totalSent: result.orderAuditTimeout + result.orderShipmentTimeout + result.afterSalesTimeout + result.orderFollowup
      }
    });
  } catch (error: any) {
    console.error('手动触发超时检测失败:', error);
    res.status(500).json({
      success: false,
      message: '超时检测失败: ' + error.message
    });
  }
});

/**
 * @route GET /api/v1/timeout-reminder/status
 * @desc 获取超时提醒服务状态
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const config = await timeoutReminderService.getCurrentConfig();

    res.json({
      success: true,
      data: {
        isRunning: true, // 服务启动后一直运行
        config,
        lastCheckTime: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: '获取服务状态失败: ' + error.message
    });
  }
});

export default router;
