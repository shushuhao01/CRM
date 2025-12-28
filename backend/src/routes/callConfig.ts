/**
 * 外呼配置管理路由
 *
 * 架构说明：
 * 1. 系统外呼线路/网络电话 - 管理员配置，全局生效，可分配给成员
 * 2. 工作手机外呼 - 员工自己扫码绑定，个人配置
 * 3. 拨打时优先级：工作手机已绑定 > 选择管理员配置的可用线路
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { mobileWebSocketService } from '../services/MobileWebSocketService';

const router = Router();

// 统一成功响应格式
const successResponse = (data: any, message?: string) => ({
  code: 200,
  success: true,
  data,
  message: message || 'success'
});

// 统一错误响应格式
const errorResponse = (message: string, code = 500) => ({
  code,
  success: false,
  message
});

// ==================== 无需认证的接口 ====================

/**
 * APP扫码绑定工作手机（无需认证，通过connectionId验证）
 */
router.post('/work-phones/bind', async (req: Request, res: Response) => {
  try {
    const { connectionId, deviceInfo } = req.body;

    if (!connectionId || !deviceInfo) {
      return res.status(400).json(errorResponse('缺少必要参数', 400));
    }

    if (!deviceInfo.phoneNumber) {
      return res.status(400).json(errorResponse('手机号码不能为空', 400));
    }

    // 查找绑定记录
    const logs = await AppDataSource.query(
      `SELECT * FROM device_bind_logs WHERE connection_id = ? AND status = 'pending'`,
      [connectionId]
    );

    if (logs.length === 0) {
      return res.status(404).json(errorResponse('绑定请求不存在或已过期', 404));
    }

    const log = logs[0];
    const now = new Date();
    const expiresAt = new Date(log.expires_at);

    if (now > expiresAt) {
      await AppDataSource.query(`UPDATE device_bind_logs SET status = 'expired' WHERE id = ?`, [log.id]);
      return res.status(400).json(errorResponse('绑定请求已过期', 400));
    }

    // 检查手机号是否已绑定
    const existingPhones = await AppDataSource.query(
      `SELECT id FROM work_phones WHERE phone_number = ? AND status = 'active'`,
      [deviceInfo.phoneNumber]
    );

    if (existingPhones.length > 0) {
      return res.status(400).json(errorResponse('该手机号已绑定', 400));
    }

    // 创建工作手机记录（使用最基本的字段）
    const result = await AppDataSource.query(
      `INSERT INTO work_phones (
        phone_number, user_id, device_name, device_model, device_id,
        online_status, bind_time, connection_type, is_primary, status
      ) VALUES (?, ?, ?, ?, ?, 'online', NOW(), 'qrcode', 1, 'active')`,
      [
        deviceInfo.phoneNumber,
        log.user_id,
        deviceInfo.deviceName || '未知设备',
        deviceInfo.deviceModel || '',
        deviceInfo.deviceId || ''
      ]
    );

    // 更新绑定状态
    await AppDataSource.query(
      `UPDATE device_bind_logs SET status = 'connected', phone_id = ? WHERE id = ?`,
      [result.insertId, log.id]
    );

    res.json(successResponse({
      message: '绑定成功',
      phoneId: result.insertId
    }));
  } catch (error) {
    console.error('绑定工作手机失败:', error);
    res.status(500).json(errorResponse('绑定失败'));
  }
});

// ==================== 需要认证的接口 ====================
router.use(authenticateToken);

// ==================== 全局配置管理 (仅管理员) ====================

/**
 * 获取全局外呼配置
 */
router.get('/global', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role);

    const configs = await AppDataSource.query(
      `SELECT config_key, config_value, config_type, description FROM global_call_config`
    );

    const configObj: Record<string, any> = {};
    configs.forEach((c: any) => {
      let value = c.config_value;
      if (c.config_type === 'json') {
        try { value = JSON.parse(value); } catch (_e) { value = {}; }
      } else if (c.config_type === 'number') {
        value = Number(value);
      } else if (c.config_type === 'boolean') {
        value = value === 'true';
      }

      if (!isAdmin && ['aliyun_config', 'tencent_config', 'huawei_config'].includes(c.config_key)) {
        configObj[c.config_key] = { configured: Object.keys(value).length > 0 };
      } else {
        configObj[c.config_key] = value;
      }
    });

    res.json(successResponse(configObj));
  } catch (error) {
    console.error('获取全局配置失败:', error);
    res.status(500).json(errorResponse('获取配置失败'));
  }
});

/**
 * 更新全局外呼配置 (仅管理员)
 */
router.put('/global', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    if (!['super_admin', 'admin'].includes(currentUser?.role)) {
      return res.status(403).json(errorResponse('无权限修改全局配置', 403));
    }

    const configs = req.body;

    for (const [key, value] of Object.entries(configs)) {
      let configValue = value;
      let configType = 'string';

      if (typeof value === 'object') {
        configValue = JSON.stringify(value);
        configType = 'json';
      } else if (typeof value === 'number') {
        configValue = String(value);
        configType = 'number';
      } else if (typeof value === 'boolean') {
        configValue = value ? 'true' : 'false';
        configType = 'boolean';
      }

      await AppDataSource.query(
        `INSERT INTO global_call_config (config_key, config_value, config_type, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE config_value = ?, config_type = ?, updated_by = ?, updated_at = NOW()`,
        [key, configValue, configType, currentUser?.userId, configValue, configType, currentUser?.userId]
      );
    }

    res.json(successResponse(null, '配置已保存'));
  } catch (error) {
    console.error('更新全局配置失败:', error);
    res.status(500).json(errorResponse('保存配置失败'));
  }
});

// ==================== 外呼线路管理 (仅管理员) ====================

/**
 * 获取外呼线路列表
 */
router.get('/lines', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role);

    let query = `SELECT * FROM call_lines`;
    if (!isAdmin) {
      query += ` WHERE is_enabled = 1 AND status = 'active'`;
    }
    query += ` ORDER BY sort_order ASC, id ASC`;

    const lines = await AppDataSource.query(query);

    res.json(successResponse(lines.map((line: any) => {
      // config 字段可能已经是对象（MySQL JSON类型），也可能是字符串
      let configData = null;
      if (line.config) {
        if (typeof line.config === 'string') {
          try {
            configData = JSON.parse(line.config);
          } catch (_e) {
            configData = null;
          }
        } else {
          configData = line.config;
        }
      }

      return {
        id: line.id,
        name: line.name,
        provider: line.provider,
        type: line.type,
        callerNumber: line.caller_number || line.line_number,
        status: line.status,
        isEnabled: line.is_enabled === 1,
        maxConcurrent: line.max_concurrent,
        currentConcurrent: line.current_concurrent,
        dailyLimit: line.daily_limit,
        dailyUsed: line.daily_used,
        totalCalls: line.total_calls,
        successRate: line.success_rate,
        sortOrder: line.sort_order,
        description: line.description,
        config: isAdmin ? configData : undefined,
        createdAt: line.created_at,
        updatedAt: line.updated_at
      };
    })));
  } catch (error) {
    console.error('获取线路列表失败:', error);
    res.status(500).json(errorResponse('获取线路列表失败'));
  }
});

/**
 * 创建外呼线路 (仅管理员)
 */
router.post('/lines', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    if (!['super_admin', 'admin'].includes(currentUser?.role)) {
      return res.status(403).json(errorResponse('无权限创建线路', 403));
    }

    const { name, provider, type, callerNumber, config, maxConcurrent, dailyLimit, description, isEnabled } = req.body;

    if (!name || !provider) {
      return res.status(400).json(errorResponse('线路名称和服务商不能为空', 400));
    }

    const result = await AppDataSource.query(
      `INSERT INTO call_lines (name, provider, type, caller_number, config, max_concurrent, daily_limit, description, is_enabled, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [name, provider, type || 'voip', callerNumber || '', config ? JSON.stringify(config) : null,
       maxConcurrent || 10, dailyLimit || 1000, description || '', isEnabled !== false ? 1 : 0, currentUser?.userId]
    );

    res.status(201).json(successResponse({ id: result.insertId }, '线路创建成功'));
  } catch (error) {
    console.error('创建线路失败:', error);
    res.status(500).json(errorResponse('创建线路失败'));
  }
});

/**
 * 更新外呼线路 (仅管理员)
 */
router.put('/lines/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    if (!['super_admin', 'admin'].includes(currentUser?.role)) {
      return res.status(403).json(errorResponse('无权限修改线路', 403));
    }

    const { id } = req.params;
    const { name, provider, type, callerNumber, config, maxConcurrent, dailyLimit, description, isEnabled, status } = req.body;

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (provider !== undefined) { updates.push('provider = ?'); params.push(provider); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (callerNumber !== undefined) { updates.push('caller_number = ?'); params.push(callerNumber); }
    if (config !== undefined) { updates.push('config = ?'); params.push(JSON.stringify(config)); }
    if (maxConcurrent !== undefined) { updates.push('max_concurrent = ?'); params.push(maxConcurrent); }
    if (dailyLimit !== undefined) { updates.push('daily_limit = ?'); params.push(dailyLimit); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (isEnabled !== undefined) { updates.push('is_enabled = ?'); params.push(isEnabled ? 1 : 0); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    params.push(id);

    await AppDataSource.query(`UPDATE call_lines SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json(successResponse(null, '线路更新成功'));
  } catch (error) {
    console.error('更新线路失败:', error);
    res.status(500).json(errorResponse('更新线路失败'));
  }
});

/**
 * 删除外呼线路 (仅管理员)
 */
router.delete('/lines/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    if (!['super_admin', 'admin'].includes(currentUser?.role)) {
      return res.status(403).json(errorResponse('无权限删除线路', 403));
    }

    const { id } = req.params;

    const assignments = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM user_line_assignments WHERE line_id = ? AND is_active = 1`,
      [id]
    );

    if (assignments[0].count > 0) {
      return res.status(400).json(errorResponse('该线路已分配给用户，请先取消分配', 400));
    }

    await AppDataSource.query(`DELETE FROM call_lines WHERE id = ?`, [id]);

    res.json(successResponse(null, '线路删除成功'));
  } catch (error) {
    console.error('删除线路失败:', error);
    res.status(500).json(errorResponse('删除线路失败'));
  }
});

// ==================== 用户线路分配 (仅管理员) ====================

/**
 * 获取用户线路分配列表
 */
router.get('/assignments', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { userId, lineId } = req.query;

    let query = `
      SELECT a.*, u.name as user_name, u.real_name, l.name as line_name, l.provider, l.caller_number as line_caller_number
      FROM user_line_assignments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN call_lines l ON a.line_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!['super_admin', 'admin'].includes(currentUser?.role)) {
      query += ` AND a.user_id = ?`;
      params.push(currentUser?.userId || currentUser?.id);
    } else {
      if (userId) { query += ` AND a.user_id = ?`; params.push(userId); }
      if (lineId) { query += ` AND a.line_id = ?`; params.push(lineId); }
    }

    query += ` ORDER BY a.is_default DESC, a.created_at DESC`;

    const assignments = await AppDataSource.query(query, params);

    res.json(successResponse(assignments.map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      userName: a.real_name || a.user_name,
      lineId: a.line_id,
      lineName: a.line_name,
      provider: a.provider,
      callerNumber: a.caller_number || a.line_caller_number,
      isDefault: a.is_default === 1,
      dailyLimit: a.daily_limit,
      isActive: a.is_active === 1,
      assignedBy: a.assigned_by,
      assignedAt: a.assigned_at,
      createdAt: a.created_at
    }))));
  } catch (error) {
    console.error('获取线路分配失败:', error);
    res.status(500).json(errorResponse('获取线路分配失败'));
  }
});

/**
 * 分配线路给用户 (仅管理员)
 */
router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    if (!['super_admin', 'admin'].includes(currentUser?.role)) {
      return res.status(403).json(errorResponse('无权限分配线路', 403));
    }

    const { userId, lineId, callerNumber, isDefault, dailyLimit } = req.body;

    if (!userId || !lineId) {
      return res.status(400).json(errorResponse('用户ID和线路ID不能为空', 400));
    }

    if (isDefault) {
      await AppDataSource.query(`UPDATE user_line_assignments SET is_default = 0 WHERE user_id = ?`, [userId]);
    }

    await AppDataSource.query(
      `INSERT INTO user_line_assignments (user_id, line_id, caller_number, is_default, daily_limit, assigned_by, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE caller_number = ?, is_default = ?, daily_limit = ?, is_active = 1, assigned_by = ?, assigned_at = NOW()`,
      [userId, lineId, callerNumber || null, isDefault ? 1 : 0, dailyLimit || 0, currentUser?.userId,
       callerNumber || null, isDefault ? 1 : 0, dailyLimit || 0, currentUser?.userId]
    );

    res.json(successResponse(null, '线路分配成功'));
  } catch (error) {
    console.error('分配线路失败:', error);
    res.status(500).json(errorResponse('分配线路失败'));
  }
});

/**
 * 取消用户线路分配 (仅管理员)
 */
router.delete('/assignments/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    if (!['super_admin', 'admin'].includes(currentUser?.role)) {
      return res.status(403).json(errorResponse('无权限取消分配', 403));
    }

    const { id } = req.params;
    await AppDataSource.query(`DELETE FROM user_line_assignments WHERE id = ?`, [id]);

    res.json(successResponse(null, '分配已取消'));
  } catch (error) {
    console.error('取消分配失败:', error);
    res.status(500).json(errorResponse('取消分配失败'));
  }
});

// ==================== 用户可用线路查询 ====================

/**
 * 获取当前用户可用的外呼线路
 */
router.get('/my-lines', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    // 确保 userId 是字符串类型，与数据库中的 varchar 类型匹配
    const userIdStr = String(userId);

    console.log('[my-lines] userId:', userIdStr);

    const assignments = await AppDataSource.query(
      `SELECT a.*, l.name, l.provider, l.type, l.caller_number as line_caller_number, l.status, l.is_enabled
       FROM user_line_assignments a
       JOIN call_lines l ON a.line_id = l.id
       WHERE a.user_id = ? AND a.is_active = 1 AND l.is_enabled = 1 AND l.status = 'active'
       ORDER BY a.is_default DESC, l.sort_order ASC`,
      [userIdStr]
    );

    console.log('[my-lines] assignments:', assignments.length);

    const workPhones = await AppDataSource.query(
      `SELECT * FROM work_phones WHERE user_id = ? AND status IN ('active', 'online')`,
      [userIdStr]
    );
    console.log('[my-lines] workPhones:', workPhones.length, workPhones.map((p: any) => ({ id: p.id, status: p.status, device_id: p.device_id })));

    res.json(successResponse({
      assignedLines: assignments.map((a: any) => ({
        id: a.line_id,
        name: a.name,
        provider: a.provider,
        type: a.type,
        callerNumber: a.caller_number || a.line_caller_number,
        isDefault: a.is_default === 1,
        dailyLimit: a.daily_limit
      })),
      workPhones: workPhones.map((p: any) => ({
        id: p.id,
        phoneNumber: p.phone_number,
        deviceName: p.device_name,
        deviceModel: p.device_model,
        onlineStatus: p.online_status,
        isPrimary: p.is_primary === 1,
        lastActiveAt: p.last_active_at
      })),
      hasAvailableMethod: assignments.length > 0 || workPhones.length > 0
    }));
  } catch (error) {
    console.error('获取可用线路失败:', error);
    res.status(500).json(errorResponse('获取可用线路失败'));
  }
});

// ==================== 用户个人偏好设置 ====================

/**
 * 获取用户个人外呼偏好
 */
router.get('/preference', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);

    const configs = await AppDataSource.query(`SELECT * FROM phone_configs WHERE user_id = ?`, [userIdStr]);

    if (configs.length === 0) {
      return res.json(successResponse({ preferMobile: false, defaultLineId: null }));
    }

    const config = configs[0];
    res.json(successResponse({
      preferMobile: config.prefer_mobile === 1,
      defaultLineId: config.default_line_id
    }));
  } catch (error) {
    console.error('获取用户偏好失败:', error);
    res.status(500).json(errorResponse('获取偏好失败'));
  }
});

/**
 * 更新用户个人外呼偏好
 */
router.put('/preference', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);
    const { preferMobile, defaultLineId } = req.body;

    await AppDataSource.query(
      `INSERT INTO phone_configs (user_id, prefer_mobile, default_line_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE prefer_mobile = ?, default_line_id = ?, updated_at = NOW()`,
      [userIdStr, preferMobile ? 1 : 0, defaultLineId || null, preferMobile ? 1 : 0, defaultLineId || null]
    );

    res.json(successResponse(null, '偏好设置已保存'));
  } catch (error) {
    console.error('更新用户偏好失败:', error);
    res.status(500).json(errorResponse('保存偏好失败'));
  }
});

// ==================== 工作手机管理 ====================

/**
 * 获取当前用户绑定的工作手机列表
 */
router.get('/work-phones', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);

    console.log('[work-phones] 获取工作手机列表, userId:', userIdStr);

    // 先查询所有记录（不带 status 条件）看看数据库里有什么
    const allPhones = await AppDataSource.query(
      `SELECT id, user_id, phone_number, device_id, status, online_status FROM work_phones WHERE user_id = ?`,
      [userIdStr]
    );
    console.log('[work-phones] 所有记录(不带status条件):', JSON.stringify(allPhones));

    // 查询 active 或 online 状态的记录
    const phones = await AppDataSource.query(
      `SELECT * FROM work_phones WHERE user_id = ? AND status IN ('active', 'online') ORDER BY is_primary DESC, created_at DESC`,
      [userIdStr]
    );

    console.log('[work-phones] 查询结果(status in active/online):', phones.length, '条记录');
    console.log('[work-phones] 详细数据:', JSON.stringify(phones));

    const result = phones.map((p: any) => {
      console.log('[work-phones] 原始记录 p.id:', p.id, 'typeof:', typeof p.id);
      const item = {
        id: p.id,  // 确保返回数据库的自增 ID
        phoneNumber: p.phone_number,
        deviceName: p.device_name,
        deviceModel: p.device_model,
        onlineStatus: p.online_status || 'offline',
        isPrimary: p.is_primary === 1,
        lastActiveAt: p.last_active_at,
        createdAt: p.created_at
      };
      console.log('[work-phones] 映射后的数据项:', JSON.stringify(item));
      return item;
    });

    console.log('[work-phones] 最终返回数据:', JSON.stringify(result));

    res.json(successResponse(result));
  } catch (error) {
    console.error('获取工作手机失败:', error);
    res.status(500).json(errorResponse('获取工作手机失败'));
  }
});

/**
 * 生成工作手机绑定二维码
 */
router.post('/work-phones/qrcode', async (req: Request, res: Response) => {
  try {
    const QRCode = require('qrcode');
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);

    const connectionId = `bind_${userIdStr}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await AppDataSource.query(
      `INSERT INTO device_bind_logs (user_id, connection_id, status, expires_at) VALUES (?, ?, 'pending', ?)`,
      [userIdStr, connectionId, expiresAt]
    );

    // 构建二维码数据
    const qrData = {
      type: 'work_phone_bind',
      connectionId,
      userId: userIdStr,
      serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
      expiresAt: expiresAt.getTime()
    };

    // 使用 qrcode 库生成真正的二维码
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json(successResponse({ qrCodeUrl, connectionId, expiresAt: expiresAt.toISOString() }));
  } catch (error) {
    console.error('生成绑定二维码失败:', error);
    res.status(500).json(errorResponse('生成二维码失败'));
  }
});

/**
 * 检查工作手机绑定状态
 */
router.get('/work-phones/bind-status/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;

    const logs = await AppDataSource.query(`SELECT * FROM device_bind_logs WHERE connection_id = ?`, [connectionId]);

    if (logs.length === 0) {
      return res.status(404).json(errorResponse('绑定请求不存在', 404));
    }

    const log = logs[0];
    const now = new Date();
    const expiresAt = new Date(log.expires_at);

    if (log.status === 'pending' && now > expiresAt) {
      await AppDataSource.query(`UPDATE device_bind_logs SET status = 'expired' WHERE id = ?`, [log.id]);
      return res.json(successResponse({ status: 'expired' }));
    }

    if (log.status === 'connected') {
      const phones = await AppDataSource.query(`SELECT * FROM work_phones WHERE id = ?`, [log.phone_id]);
      return res.json(successResponse({
        status: 'connected',
        phone: phones.length > 0 ? {
          id: phones[0].id,
          phoneNumber: phones[0].phone_number,
          deviceName: phones[0].device_name,
          deviceModel: phones[0].device_model
        } : null
      }));
    }

    res.json(successResponse({ status: log.status }));
  } catch (error) {
    console.error('检查绑定状态失败:', error);
    res.status(500).json(errorResponse('检查状态失败'));
  }
});

/**
 * 解绑工作手机
 */
router.delete('/work-phones/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);
    const { id } = req.params;

    console.log('[解绑工作手机] ========== 开始解绑 ==========');
    console.log('[解绑工作手机] 请求参数 id:', id, '类型:', typeof id);
    console.log('[解绑工作手机] 当前用户 userId:', userIdStr);

    // 先查询所有该用户的手机记录
    const allUserPhones = await AppDataSource.query(
      `SELECT id, user_id, device_id, phone_number, status FROM work_phones WHERE user_id = ?`,
      [userIdStr]
    );
    console.log('[解绑工作手机] 该用户所有手机记录:', JSON.stringify(allUserPhones));

    // 查询指定 ID 的记录（不带 user_id 条件）
    const phoneById = await AppDataSource.query(`SELECT id, user_id, device_id, phone_number, status FROM work_phones WHERE id = ?`, [id]);
    console.log('[解绑工作手机] 按 ID 查询结果(不带user_id):', JSON.stringify(phoneById));

    // 查询指定 ID 且属于当前用户的记录（包括 active 和 online 状态）
    const phones = await AppDataSource.query(
      `SELECT * FROM work_phones WHERE id = ? AND user_id = ? AND status IN ('active', 'online')`,
      [id, userIdStr]
    );
    console.log('[解绑工作手机] 按 ID+user_id+status 查询结果:', JSON.stringify(phones));

    if (phones.length === 0) {
      console.log('[解绑工作手机] 未找到匹配记录，返回 404');
      return res.status(404).json(errorResponse('手机不存在或无权操作', 404));
    }

    const phone = phones[0];

    // 🔥 修复：使用 UPDATE 而不是 DELETE，与 APP 端保持一致
    console.log('[解绑工作手机] 找到记录，更新状态为 inactive...');
    await AppDataSource.query(
      `UPDATE work_phones SET status = 'inactive', online_status = 'offline', updated_at = NOW() WHERE id = ?`,
      [id]
    );
    console.log('[解绑工作手机] 状态更新成功');

    // 记录解绑日志
    await AppDataSource.query(
      `INSERT INTO device_bind_logs (user_id, device_id, action, ip_address, remark)
       VALUES (?, ?, 'unbind', ?, 'CRM端主动解绑')`,
      [userIdStr, phone.device_id, req.ip || '']
    );

    // 🔥 通知 APP 设备已解绑
    if (global.webSocketService) {
      // sendToUser 需要 number 类型的 userId
      global.webSocketService.sendToUser(Number(userId), 'DEVICE_UNBIND', {
        deviceId: phone.device_id,
        reason: 'CRM端解绑'
      });
      console.log('[解绑工作手机] 已通知APP设备解绑');
    }

    res.json(successResponse(null, '解绑成功'));
  } catch (error) {
    console.error('解绑工作手机失败:', error);
    res.status(500).json(errorResponse('解绑失败'));
  }
});

/**
 * 设置主要工作手机
 */
router.put('/work-phones/:id/primary', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);
    const { id } = req.params;

    const phones = await AppDataSource.query(`SELECT * FROM work_phones WHERE id = ? AND user_id = ?`, [id, userIdStr]);

    if (phones.length === 0) {
      return res.status(404).json(errorResponse('手机不存在或无权操作', 404));
    }

    await AppDataSource.query(`UPDATE work_phones SET is_primary = 0 WHERE user_id = ?`, [userIdStr]);
    await AppDataSource.query(`UPDATE work_phones SET is_primary = 1 WHERE id = ?`, [id]);

    res.json(successResponse(null, '已设为主要手机'));
  } catch (error) {
    console.error('设置主要手机失败:', error);
    res.status(500).json(errorResponse('设置失败'));
  }
});

// ==================== 发起呼叫 ====================

/**
 * 通过工作手机发起呼叫
 * 后端会通过WebSocket通知APP发起呼叫
 */
router.post('/work-phones/call', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);
    const userName = currentUser?.name || currentUser?.username || '未知用户';
    const { workPhoneId, targetPhone, customerId, customerName, notes } = req.body;

    console.log('[work-phones/call] 发起呼叫请求:', { workPhoneId, targetPhone, customerId, customerName, userId: userIdStr });

    if (!workPhoneId || !targetPhone) {
      return res.status(400).json(errorResponse('缺少必要参数', 400));
    }

    // 验证工作手机归属
    const phones = await AppDataSource.query(
      `SELECT * FROM work_phones WHERE id = ? AND user_id = ?`,
      [workPhoneId, userIdStr]
    );

    console.log('[work-phones/call] 查询工作手机结果:', phones.length, '条');

    if (phones.length === 0) {
      return res.status(404).json(errorResponse('工作手机不存在或无权使用', 404));
    }

    const phone = phones[0];

    // 创建通话记录 - 使用 id 字段作为主键，call_status 使用 'calling'（拨号中）
    const callId = `WP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await AppDataSource.query(
      `INSERT INTO call_records (
        id, customer_id, customer_name, customer_phone, call_type, call_status,
        user_id, user_name, call_method, line_id, notes, start_time, created_at
      ) VALUES (?, ?, ?, ?, 'outbound', 'calling', ?, ?, 'mobile', ?, ?, NOW(), NOW())`,
      [callId, customerId || null, customerName || '未知客户', targetPhone, userIdStr, userName, String(workPhoneId), notes || null]
    );

    console.log('[work-phones/call] 通话记录已创建:', callId);

    // 通过WebSocket通知APP发起呼叫
    const deviceId = phone.device_id;
    console.log('[work-phones/call] 工作手机信息:', {
      phoneId: phone.id,
      phoneNumber: phone.phone_number,
      deviceId: deviceId,
      userId: userIdStr
    });

    if (deviceId) {
      // 检查设备是否在线
      const isOnline = mobileWebSocketService.isDeviceOnline(deviceId);
      console.log('[work-phones/call] 设备在线状态:', isOnline);

      const sent = mobileWebSocketService.sendDialCommand(deviceId, {
        callId,
        phoneNumber: targetPhone,
        customerName: customerName || '未知客户',
        customerId: customerId || undefined,
        source: 'pc_crm'
      });
      console.log('[work-phones/call] WebSocket通知发送结果:', sent ? '成功' : '失败', 'deviceId:', deviceId);

      if (!sent) {
        // 设备不在线，但通话记录已创建
        console.log('[work-phones/call] 设备不在线，无法发送拨号指令');
      }
    } else {
      console.log('[work-phones/call] 工作手机没有 device_id，无法发送拨号指令');
    }

    res.json(successResponse({
      callId,
      status: 'calling',
      deviceOnline: deviceId ? mobileWebSocketService.isDeviceOnline(deviceId) : false,
      message: `正在通过工作手机 ${phone.phone_number} 发起呼叫`
    }));
  } catch (error) {
    console.error('发起工作手机呼叫失败:', error);
    res.status(500).json(errorResponse('发起呼叫失败'));
  }
});

/**
 * 通过网络电话线路发起呼叫
 */
router.post('/lines/call', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);
    const userName = currentUser?.name || currentUser?.username || '未知用户';
    const { lineId, targetPhone, customerId, customerName, notes } = req.body;

    if (!lineId || !targetPhone) {
      return res.status(400).json(errorResponse('缺少必要参数', 400));
    }

    // 验证用户是否有权使用该线路
    const assignments = await AppDataSource.query(
      `SELECT ula.*, cl.name as line_name, cl.provider, cl.caller_number
       FROM user_line_assignments ula
       JOIN call_lines cl ON ula.line_id = cl.id
       WHERE ula.user_id = ? AND ula.line_id = ? AND ula.is_active = 1`,
      [userIdStr, lineId]
    );

    if (assignments.length === 0) {
      return res.status(403).json(errorResponse('无权使用该线路', 403));
    }

    const assignment = assignments[0];

    // 创建通话记录 - 使用 id 字段作为主键，call_status 使用 'calling'（拨号中）
    const callId = `NP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await AppDataSource.query(
      `INSERT INTO call_records (
        id, customer_id, customer_name, customer_phone, call_type, call_status,
        user_id, user_name, call_method, line_id, notes, start_time, created_at
      ) VALUES (?, ?, ?, ?, 'outbound', 'calling', ?, ?, 'voip', ?, ?, NOW(), NOW())`,
      [callId, customerId || null, customerName || '未知客户', targetPhone, userIdStr, userName, String(lineId), notes || null]
    );

    // TODO: 调用云通信服务发起呼叫
    // 根据线路的provider调用对应的云服务API
    // const aliyunService = require('../services/AliyunCallService').default;
    // await aliyunService.makeCall(assignment.caller_number, targetPhone, callId);

    res.json(successResponse({
      callId,
      status: 'calling',
      message: `正在通过线路 ${assignment.line_name} 发起呼叫`
    }));
  } catch (error) {
    console.error('发起网络电话呼叫失败:', error);
    res.status(500).json(errorResponse('发起呼叫失败'));
  }
});

/**
 * 结束通话
 */
router.post('/calls/:callId/end', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const userIdStr = String(userId);
    const { callId } = req.params;
    const { notes, duration } = req.body;

    console.log(`[CallConfig] 结束通话: callId=${callId}, userId=${userId}`);

    // 查找通话记录 - 使用 id 字段
    const calls = await AppDataSource.query(
      `SELECT * FROM call_records WHERE id = ? AND user_id = ?`,
      [callId, userIdStr]
    );

    if (calls.length === 0) {
      return res.status(404).json(errorResponse('通话记录不存在', 404));
    }

    // 更新通话记录 - 使用 id 字段
    await AppDataSource.query(
      `UPDATE call_records SET
        call_status = 'connected',
        end_time = NOW(),
        duration = ?,
        notes = COALESCE(?, notes),
        updated_at = NOW()
       WHERE id = ?`,
      [duration || 0, notes, callId]
    );

    // 通过 WebSocket 通知 APP 端结束通话
    try {
      const { mobileWebSocketService } = await import('../services/MobileWebSocketService');
      if (mobileWebSocketService && mobileWebSocketService.isInitialized()) {
        const sent = mobileWebSocketService.sendEndCallToUser(Number(userId), callId, 'crm_end');
        console.log(`[CallConfig] 已通知 ${sent} 个设备结束通话`);
      }
    } catch (wsError) {
      console.error('[CallConfig] 通知APP结束通话失败:', wsError);
    }

    res.json(successResponse(null, '通话已结束'));
  } catch (error) {
    console.error('结束通话失败:', error);
    res.status(500).json(errorResponse('结束通话失败'));
  }
});

export default router;
