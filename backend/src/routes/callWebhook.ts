/**
 * 外呼服务商Webhook回调路由
 * 处理阿里云、腾讯云等服务商的通话状态回调
 */

import { Router, Request, Response } from 'express';
import { aliyunCallService } from '../services/AliyunCallService';
// tenantRawSQL / getCurrentTenantIdSafe 用于后续路由扩展
import { tenantRawSQL as _tenantRawSQL, getCurrentTenantIdSafe as _getCurrentTenantIdSafe } from '../utils/tenantHelpers';
import crypto from 'crypto';

import { log } from '../config/logger';
const router = Router();

/**
 * SIP Webhook 密钥验证中间件
 * 支持两种传递方式：
 *   1. Header: X-Webhook-Secret
 *   2. Body:   secret 字段
 * 如果环境变量 SIP_WEBHOOK_SECRET 未设置则跳过验证（开发模式）
 */
function verifySipWebhookSecret(req: Request, res: Response, next: () => void) {
  const expectedSecret = process.env.SIP_WEBHOOK_SECRET;
  if (!expectedSecret) {
    // 未配置密钥，跳过验证（开发模式）
    return next();
  }

  const headerSecret = req.headers['x-webhook-secret'] as string;
  const bodySecret = req.body?.secret;
  const provided = headerSecret || bodySecret;

  if (!provided) {
    log.warn('[Webhook] SIP请求缺少密钥');
    return res.status(401).json({ success: false, message: 'Webhook密钥缺失' });
  }

  // 使用 timingSafeEqual 防止时序攻击
  try {
    const a = Buffer.from(String(provided));
    const b = Buffer.from(expectedSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      log.warn('[Webhook] SIP密钥验证失败');
      return res.status(403).json({ success: false, message: 'Webhook密钥验证失败' });
    }
  } catch {
    log.warn('[Webhook] SIP密钥验证异常');
    return res.status(403).json({ success: false, message: 'Webhook密钥验证失败' });
  }

  next();
}

// ==================== 阿里云回调 ====================

/**
 * 阿里云通话状态回调
 * POST /api/v1/calls/webhook/aliyun/status
 */
router.post('/aliyun/status', async (req: Request, res: Response) => {
  try {
    const {
      instanceId,
      callId,
      jobId,
      event,
      eventTime,
      caller,
      callee,
      agentId,
      releaseReason,
      duration,
      tags
    } = req.body;

    log.info('[Webhook] 阿里云通话状态回调:', { event, callId, duration });

    // 解析自定义标签获取内部callId
    let internalCallId = callId;
    if (tags) {
      try {
        const tagData = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (tagData.callId) {
          internalCallId = tagData.callId;
        }
      } catch (e) {
        log.warn('解析tags失败:', e);
      }
    }

    // 映射事件类型
    const statusMap: Record<string, string> = {
      'Dialing': 'dialing',
      'Ringing': 'ringing',
      'Answered': 'connected',
      'Released': 'released'
    };

    const status = statusMap[event] || event.toLowerCase();

    // 处理回调
    await aliyunCallService.handleStatusCallback({
      callId: internalCallId,
      providerCallId: callId,
      status: status as any,
      timestamp: eventTime,
      duration,
      releaseReason
    });

    res.json({ success: true });
  } catch (error) {
    log.error('处理阿里云状态回调失败:', error);
    res.status(500).json({ success: false, message: '处理回调失败' });
  }
});

/**
 * 阿里云录音完成回调
 * POST /api/v1/calls/webhook/aliyun/recording
 */
router.post('/aliyun/recording', async (req: Request, res: Response) => {
  try {
    const {
      instanceId,
      callId,
      recordingUrl,
      recordingDuration,
      recordingSize,
      recordingTime,
      tags
    } = req.body;

    log.info('[Webhook] 阿里云录音回调:', { callId, recordingUrl });

    // 解析自定义标签获取内部callId
    let internalCallId = callId;
    if (tags) {
      try {
        const tagData = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (tagData.callId) {
          internalCallId = tagData.callId;
        }
      } catch (e) {
        log.warn('解析tags失败:', e);
      }
    }

    // 处理录音回调
    await aliyunCallService.handleRecordingCallback({
      callId: internalCallId,
      recordingUrl,
      recordingDuration,
      recordingSize
    });

    res.json({ success: true });
  } catch (error) {
    log.error('处理阿里云录音回调失败:', error);
    res.status(500).json({ success: false, message: '处理回调失败' });
  }
});

/**
 * 阿里云 DID 呼入回调
 * POST /api/v1/calls/webhook/aliyun/incoming
 *
 * 支持常见字段：caller/callerNumber, callee/calledNumber, callId, tenantCode
 */
router.post('/aliyun/incoming', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const callerNumber = body.caller || body.callerNumber || body.from;
    const calledNumber = body.callee || body.calledNumber || body.to || body.didNumber;
    const callId = body.callId || body.jobId || body.sessionId;
    const tenantCode = body.tenantCode;

    log.info('[Webhook] 阿里云DID呼入:', { callerNumber, calledNumber, callId });

    if (!callerNumber || !calledNumber) {
      return res.status(400).json({ success: false, message: '缺少主叫或被叫号码' });
    }

    const result = await processCloudInboundNotification({
      callerNumber: String(callerNumber),
      calledNumber: String(calledNumber),
      callId: callId ? String(callId) : undefined,
      callSource: 'aliyun',
      tenantCode,
      providerCallId: callId ? String(callId) : undefined,
      trunkName: '阿里云DID'
    });

    res.json({ success: true, data: result });
  } catch (error) {
    log.error('处理阿里云DID呼入失败:', error);
    res.status(500).json({ success: false, message: '处理呼入失败' });
  }
});

// ==================== 腾讯云回调 ====================

/**
 * 腾讯云通话回调
 * POST /api/v1/calls/webhook/tencent
 */
router.post('/tencent', async (req: Request, res: Response) => {
  try {
    const { EventType, Data } = req.body;

    log.info('[Webhook] 腾讯云回调:', { EventType });

    // DID 呼入事件（腾讯云呼叫中心常见事件名）
    if (EventType === 'InboundCall' || EventType === 'inbound' || Data?.Direction === 'inbound') {
      const callerNumber = Data?.Caller || Data?.callerNumber || Data?.From;
      const calledNumber = Data?.Callee || Data?.calledNumber || Data?.To;
      const callId = Data?.CallId || Data?.SessionId;

      if (callerNumber && calledNumber) {
        const result = await processCloudInboundNotification({
          callerNumber: String(callerNumber),
          calledNumber: String(calledNumber),
          callId: callId ? String(callId) : undefined,
          callSource: 'tencent',
          tenantCode: Data?.tenantCode,
          providerCallId: callId ? String(callId) : undefined,
          trunkName: '腾讯云DID'
        });
        return res.json({ success: true, data: result });
      }
    }

    res.json({ success: true });
  } catch (error) {
    log.error('处理腾讯云回调失败:', error);
    res.status(500).json({ success: false, message: '处理回调失败' });
  }
});

/**
 * 腾讯云 DID 呼入专用回调
 * POST /api/v1/calls/webhook/tencent/incoming
 */
router.post('/tencent/incoming', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const data = body.Data || body;
    const callerNumber = data.Caller || data.callerNumber || data.from || body.callerNumber;
    const calledNumber = data.Callee || data.calledNumber || data.to || body.calledNumber;
    const callId = data.CallId || data.callId || body.callId;
    const tenantCode = data.tenantCode || body.tenantCode;

    log.info('[Webhook] 腾讯云DID呼入:', { callerNumber, calledNumber, callId });

    if (!callerNumber || !calledNumber) {
      return res.status(400).json({ success: false, message: '缺少主叫或被叫号码' });
    }

    const result = await processCloudInboundNotification({
      callerNumber: String(callerNumber),
      calledNumber: String(calledNumber),
      callId: callId ? String(callId) : undefined,
      callSource: 'tencent',
      tenantCode,
      providerCallId: callId ? String(callId) : undefined,
      trunkName: '腾讯云DID'
    });

    res.json({ success: true, data: result });
  } catch (error) {
    log.error('处理腾讯云DID呼入失败:', error);
    res.status(500).json({ success: false, message: '处理呼入失败' });
  }
});

// ==================== 容联云回调 ====================

/**
 * 容联云通话回调
 * POST /api/v1/calls/webhook/ronglian
 */
router.post('/ronglian', async (req: Request, res: Response) => {
  try {
    const { action, callSid, state, duration, recordUrl } = req.body;

    log.info('[Webhook] 容联云回调:', { action, callSid, state });

    // TODO: 实现容联云回调处理

    res.json({ success: true });
  } catch (error) {
    log.error('处理容联云回调失败:', error);
    res.status(500).json({ success: false, message: '处理回调失败' });
  }
});

// ==================== SIP/PBX 呼入回调 ====================

/**
 * SIP中继/PBX 呼入通知
 * POST /api/v1/calls/webhook/sip/incoming
 *
 * 当企业PBX或SIP中继线路收到来电时，通过此接口通知CRM系统
 * 请求体示例:
 * {
 *   "callerNumber": "13800138888",    // 主叫号码（客户号码）
 *   "calledNumber": "02188888888",    // 被叫号码（企业号码/DID）
 *   "callId": "sip-call-xxxxx",      // SIP通话ID
 *   "trunkId": "trunk-001",          // 中继线路ID
 *   "trunkName": "主线路",           // 中继线路名称
 *   "secret": "your-webhook-secret"  // 验证密钥（可选）
 * }
 */
router.post('/sip/incoming', verifySipWebhookSecret, async (req: Request, res: Response) => {
  try {
    const { callerNumber, calledNumber, callId, trunkId, trunkName, tenantCode } = req.body;

    log.info('[Webhook] SIP呼入通知:', { callerNumber, calledNumber, callId, trunkId, tenantCode });

    if (!callerNumber || !calledNumber) {
      return res.status(400).json({ success: false, message: '缺少主叫号码或被叫号码' });
    }

    const { AppDataSource } = await import('../config/database');

    // 多租户隔离：解析租户
    let tenantId: string | null = null;
    if (tenantCode) {
      try {
        const tenants = await AppDataSource.query(
          `SELECT id FROM tenants WHERE code = ? AND status = 'active' LIMIT 1`, [tenantCode]
        );
        if (tenants.length > 0) tenantId = tenants[0].id;
      } catch (_e) { /* 私有部署无tenants表，忽略 */ }
    }
    const tenantFilter = tenantId ? ' AND tenant_id = ?' : '';
    const tenantParams = tenantId ? [tenantId] : [];

    // 1. 根据主叫号码查找客户信息
    let customerId = null;
    let customerName = '未知来电';
    let customerLevel = null;
    let company = null;
    let lastCallTime = null;
    try {
      const crSubTenant = tenantId ? ' AND cr.tenant_id = c.tenant_id' : '';
      const customers = await AppDataSource.query(
        `SELECT c.id, c.name, c.level, c.company,
                (SELECT MAX(cr.start_time) FROM call_records cr WHERE cr.customer_id = c.id${crSubTenant}) as last_call
         FROM customers c
         WHERE (c.phone = ? OR c.mobile = ?)${tenantFilter}
         LIMIT 1`,
        [callerNumber, callerNumber, ...tenantParams]
      );
      if (customers.length > 0) {
        customerId = customers[0].id;
        customerName = customers[0].name;
        customerLevel = customers[0].level;
        company = customers[0].company;
        lastCallTime = customers[0].last_call;
      }
    } catch (err) {
      log.warn('[Webhook] 查询客户信息失败:', err);
    }

    // 2. 根据被叫号码(DID)或线路分配找到负责人
    let assignedUserId: string | null = null;
    let assignedUserName = '';
    try {
      // 先查呼入路由表
      const routes = await AppDataSource.query(
        `SELECT target_user_id FROM inbound_routes
         WHERE did_number = ? AND is_enabled = 1${tenantFilter}
         ORDER BY priority DESC LIMIT 1`,
        [calledNumber, ...tenantParams]
      );
      if (routes.length > 0 && routes[0].target_user_id) {
        assignedUserId = routes[0].target_user_id;
      }

      // 回退：通过线路分配找（添加租户过滤）
      if (!assignedUserId) {
        const assignments = await AppDataSource.query(
          `SELECT ula.user_id, u.name, u.real_name
           FROM user_line_assignments ula
           JOIN call_lines cl ON ula.line_id = cl.id
           LEFT JOIN users u ON ula.user_id = u.id
           WHERE (cl.caller_number = ? OR cl.line_number = ?) AND ula.is_active = 1${tenantFilter ? ' AND ula.tenant_id = ?' : ''}
           ORDER BY ula.is_default DESC LIMIT 1`,
          [calledNumber, calledNumber, ...tenantParams]
        );
        if (assignments.length > 0) {
          assignedUserId = assignments[0].user_id;
          assignedUserName = assignments[0].real_name || assignments[0].name || '';
        }
      }

      // 如果客户有专属销售，优先分配（添加租户过滤）
      if (customerId) {
        const customerOwner = await AppDataSource.query(
          `SELECT sales_rep_id FROM customers WHERE id = ?${tenantFilter} LIMIT 1`,
          [customerId, ...tenantParams]
        );
        if (customerOwner.length > 0 && customerOwner[0].sales_rep_id) {
          assignedUserId = customerOwner[0].sales_rep_id;
        }
      }

      // 获取被分配用户的姓名（添加租户过滤）
      if (assignedUserId && !assignedUserName) {
        const userInfo = await AppDataSource.query(
          `SELECT name, real_name FROM users WHERE id = ?${tenantFilter} LIMIT 1`, [assignedUserId, ...tenantParams]
        );
        if (userInfo.length > 0) {
          assignedUserName = userInfo[0].real_name || userInfo[0].name || '';
        }
      }

    } catch (err) {
      log.warn('[Webhook] 查询负责人失败:', err);
    }

    // 3. 创建呼入通话记录
    const internalCallId = callId || `SIP-IN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // 检查坐席状态：如果是busy则记录但不推送弹窗
    let agentBusy = false;
    try {
      if (assignedUserId) {
        const agentRows = await AppDataSource.query(
          `SELECT agent_status FROM users WHERE id = ?${tenantFilter} LIMIT 1`, [assignedUserId, ...tenantParams]
        );
        agentBusy = agentRows.length > 0 && agentRows[0].agent_status === 'busy';
      }
    } catch (_e) { /* ignore */ }

    try {
      await AppDataSource.query(
        `INSERT INTO call_records
         (id, customer_id, customer_name, customer_phone, call_type, call_status,
          call_method, call_direction, inbound_source, caller_number, user_id, user_name,
          provider_call_id, start_time, created_at, tenant_id)
         VALUES (?, ?, ?, ?, 'inbound', 'ringing', 'sip', 'in', 'sip', ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [
          internalCallId,
          customerId,
          customerName,
          callerNumber,
          calledNumber,
          assignedUserId || '',
          assignedUserName,
          callId || null,
          tenantId
        ]
      );
    } catch (err) {
      log.error('[Webhook] 创建呼入记录失败:', err);
    }

    // 4. 推送呼入通知到PC端（坐席非忙碌时才推送）
    if (assignedUserId && !agentBusy && (global as any).webSocketService) {
      (global as any).webSocketService.sendToUser(assignedUserId, 'CALL_INCOMING', {
        callId: internalCallId,
        callerNumber,
        calledNumber,
        callSource: 'sip',
        customerInfo: {
          customerId,
          customerName,
          customerLevel,
          company,
          lastCallTime,
          tags: []
        },
        deviceInfo: {
          trunkId,
          trunkName
        },
        timestamp: new Date().toISOString()
      });
      log.info(`[Webhook] 已推送呼入通知给用户 ${assignedUserId}`);
    } else if (agentBusy) {
      log.info(`[Webhook] 坐席忙碌，已创建记录 ${internalCallId} 但未推送弹窗`);
    }

    res.json({
      success: true,
      message: '呼入通知已处理',
      data: {
        callId: internalCallId,
        customerName,
        customerId,
        assignedUserId,
        assignedUserName,
        agentBusy
      }
    });
  } catch (error) {
    log.error('处理SIP呼入通知失败:', error);
    res.status(500).json({ success: false, message: '处理呼入通知失败' });
  }
});

/**
 * SIP通话状态更新
 * POST /api/v1/calls/webhook/sip/status
 *
 * PBX/SIP网关通话状态变化时的回调
 * {
 *   "callId": "SIP-IN-xxxx",
 *   "event": "answered" | "hangup" | "ringing" | "failed",
 *   "duration": 120,         // 通话时长(秒)
 *   "hangupCause": "normal", // 挂断原因
 *   "recordingUrl": "..."    // 录音文件URL(可选)
 * }
 */
router.post('/sip/status', verifySipWebhookSecret, async (req: Request, res: Response) => {
  try {
    const { callId, event, duration, hangupCause, recordingUrl, ringDuration } = req.body;

    log.info('[Webhook] SIP通话状态更新:', { callId, event, duration });

    if (!callId || !event) {
      return res.status(400).json({ success: false, message: '缺少callId或event' });
    }

    const { AppDataSource } = await import('../config/database');

    const statusMap: Record<string, string> = {
      'ringing': 'ringing',
      'answered': 'connected',
      'hangup': duration && duration > 0 ? 'connected' : 'missed',
      'failed': 'failed',
      'busy': 'busy',
      'no_answer': 'missed'
    };

    const callStatus = statusMap[event] || event;

    // 使用参数化查询避免 SQL 注入
    const updates: string[] = ['call_status = ?', 'updated_at = NOW()'];
    const params: any[] = [callStatus];

    if (event === 'answered') {
      updates.push('start_time = COALESCE(start_time, NOW())');
    } else if (event === 'hangup' || event === 'failed') {
      updates.push('end_time = NOW()');
      if (duration !== undefined) {
        updates.push('duration = ?');
        params.push(duration);
      }
      if (hangupCause) {
        updates.push('hangup_cause = ?');
        params.push(hangupCause);
      }
    }

    if (recordingUrl) {
      updates.push('recording_url = ?', 'has_recording = 1');
      params.push(recordingUrl);
    }

    if (ringDuration !== undefined) {
      updates.push('ring_duration = ?');
      params.push(ringDuration);
    }

    // 先查出该通话记录所属的租户和用户，确保后续操作在正确租户范围内
    let recordTenantId: string | null = null;
    let recordUserId: string | null = null;
    try {
      const existingRecords = await AppDataSource.query(
        `SELECT user_id, tenant_id FROM call_records WHERE id = ? LIMIT 1`, [callId]
      );
      if (existingRecords.length > 0) {
        recordTenantId = existingRecords[0].tenant_id;
        recordUserId = existingRecords[0].user_id;
      }
    } catch (_e) { /* ignore */ }

    // 🔒 租户隔离：更新时同时匹配 tenant_id
    const tenantUpdateCond = recordTenantId ? ' AND tenant_id = ?' : ' AND tenant_id IS NULL';
    const tenantUpdateParams = recordTenantId ? [recordTenantId] : [];
    params.push(callId, ...tenantUpdateParams);
    await AppDataSource.query(
      `UPDATE call_records SET ${updates.join(', ')} WHERE id = ?${tenantUpdateCond}`,
      params
    );

    // 推送状态更新到PC端
    if ((global as any).webSocketService && recordUserId) {
      try {
        (global as any).webSocketService.sendToUser(
          recordUserId,
          `CALL_${event.toUpperCase()}`,
          { callId, event, duration, hangupCause }
        );
      } catch (err) {
        log.warn('[Webhook] 推送状态更新失败:', err);
      }
    }

    res.json({ success: true, message: '状态已更新' });
  } catch (error) {
    log.error('处理SIP状态更新失败:', error);
    res.status(500).json({ success: false, message: '处理状态更新失败' });
  }
});

// ==================== 通用测试回调 ====================

/**
 * 测试回调接口
 * POST /api/v1/calls/webhook/test
 */
router.post('/test', async (req: Request, res: Response) => {
  log.info('[Webhook] 测试回调:', req.body);
  res.json({
    success: true,
    message: '回调接收成功',
    receivedAt: new Date().toISOString(),
    data: req.body
  });
});

/**
 * 云通信 DID 呼入统一处理（阿里云/腾讯云）
 */
async function processCloudInboundNotification(options: {
  callerNumber: string;
  calledNumber: string;
  callId?: string;
  callSource: 'aliyun' | 'tencent' | 'sip';
  tenantCode?: string;
  providerCallId?: string;
  trunkId?: string;
  trunkName?: string;
}) {
  const { callerNumber, calledNumber, callSource, tenantCode, providerCallId, trunkId, trunkName } = options;
  const { AppDataSource } = await import('../config/database');

  let tenantId: string | null = null;
  if (tenantCode) {
    try {
      const tenants = await AppDataSource.query(
        `SELECT id FROM tenants WHERE code = ? AND status = 'active' LIMIT 1`,
        [tenantCode]
      );
      if (tenants.length > 0) tenantId = tenants[0].id;
    } catch (_e) {
      // 私有部署无 tenants 表
    }
  }

  const tenantFilter = tenantId ? ' AND tenant_id = ?' : '';
  const tenantParams = tenantId ? [tenantId] : [];

  let customerId: string | null = null;
  let customerName = '未知来电';
  let customerLevel: string | null = null;
  let company: string | null = null;
  let lastCallTime: string | null = null;

  try {
    const crSubTenant = tenantId ? ' AND cr.tenant_id = c.tenant_id' : '';
    const customers = await AppDataSource.query(
      `SELECT c.id, c.name, c.level, c.company,
              (SELECT MAX(cr.start_time) FROM call_records cr WHERE cr.customer_id = c.id${crSubTenant}) as last_call
       FROM customers c
       WHERE (c.phone = ? OR c.mobile = ?)${tenantFilter}
       LIMIT 1`,
      [callerNumber, callerNumber, ...tenantParams]
    );
    if (customers.length > 0) {
      customerId = customers[0].id;
      customerName = customers[0].name;
      customerLevel = customers[0].level;
      company = customers[0].company;
      lastCallTime = customers[0].last_call;
    }
  } catch (err) {
    log.warn('[Webhook] 查询客户信息失败:', err);
  }

  let assignedUserId: string | null = null;
  let assignedUserName = '';

  try {
    const routes = await AppDataSource.query(
      `SELECT target_user_id FROM inbound_routes
       WHERE did_number = ? AND is_enabled = 1${tenantFilter}
       ORDER BY priority DESC LIMIT 1`,
      [calledNumber, ...tenantParams]
    );
    if (routes.length > 0 && routes[0].target_user_id) {
      assignedUserId = routes[0].target_user_id;
    }

    if (!assignedUserId) {
      const assignments = await AppDataSource.query(
        `SELECT ula.user_id, u.name, u.real_name
         FROM user_line_assignments ula
         JOIN call_lines cl ON ula.line_id = cl.id
         LEFT JOIN users u ON ula.user_id = u.id
         WHERE (cl.caller_number = ? OR cl.line_number = ?) AND ula.is_active = 1${tenantFilter ? ' AND ula.tenant_id = ?' : ''}
         ORDER BY ula.is_default DESC LIMIT 1`,
        [calledNumber, calledNumber, ...tenantParams]
      );
      if (assignments.length > 0) {
        assignedUserId = assignments[0].user_id;
        assignedUserName = assignments[0].real_name || assignments[0].name || '';
      }
    }

    if (!assignedUserId) {
      const phones = await AppDataSource.query(
        `SELECT user_id, phone_number, name FROM work_phones
         WHERE phone_number = ? AND status = 'active'${tenantFilter}
         LIMIT 1`,
        [calledNumber, ...tenantParams]
      );
      if (phones.length > 0) {
        assignedUserId = phones[0].user_id;
        assignedUserName = phones[0].name || '';
      }
    }

    if (customerId) {
      const customerOwner = await AppDataSource.query(
        `SELECT sales_rep_id FROM customers WHERE id = ?${tenantFilter} LIMIT 1`,
        [customerId, ...tenantParams]
      );
      if (customerOwner.length > 0 && customerOwner[0].sales_rep_id) {
        assignedUserId = customerOwner[0].sales_rep_id;
      }
    }

    if (assignedUserId && !assignedUserName) {
      const userInfo = await AppDataSource.query(
        `SELECT name, real_name FROM users WHERE id = ?${tenantFilter} LIMIT 1`,
        [assignedUserId, ...tenantParams]
      );
      if (userInfo.length > 0) {
        assignedUserName = userInfo[0].real_name || userInfo[0].name || '';
      }
    }
  } catch (err) {
    log.warn('[Webhook] 查询负责人失败:', err);
  }

  const prefix = callSource === 'aliyun' ? 'ALI-IN' : callSource === 'tencent' ? 'TX-IN' : 'SIP-IN';
  const internalCallId = options.callId || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  let agentBusy = false;
  try {
    if (assignedUserId) {
      const agentRows = await AppDataSource.query(
        `SELECT agent_status FROM users WHERE id = ?${tenantFilter} LIMIT 1`,
        [assignedUserId, ...tenantParams]
      );
      agentBusy = agentRows.length > 0 && agentRows[0].agent_status === 'busy';
    }
  } catch (_e) {
    // ignore
  }

  try {
    await AppDataSource.query(
      `INSERT INTO call_records
       (id, customer_id, customer_name, customer_phone, call_type, call_status,
        call_method, call_direction, inbound_source, caller_number, user_id, user_name,
        provider_call_id, start_time, created_at, tenant_id)
       VALUES (?, ?, ?, ?, 'inbound', 'ringing', ?, 'in', ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
      [
        internalCallId,
        customerId,
        customerName,
        callerNumber,
        callSource,
        callSource,
        calledNumber,
        assignedUserId || '',
        assignedUserName,
        providerCallId || null,
        tenantId
      ]
    );
  } catch (err) {
    log.error('[Webhook] 创建云通信呼入记录失败:', err);
  }

  if (assignedUserId && !agentBusy && (global as any).webSocketService) {
    (global as any).webSocketService.sendToUser(assignedUserId, 'CALL_INCOMING', {
      callId: internalCallId,
      callerNumber,
      calledNumber,
      callSource,
      customerInfo: {
        customerId,
        customerName,
        customerLevel,
        company,
        lastCallTime,
        tags: []
      },
      deviceInfo: {
        trunkId,
        trunkName
      },
      timestamp: new Date().toISOString()
    });
    log.info(`[Webhook] 已推送云通信呼入通知给用户 ${assignedUserId}`);
  }

  return {
    callId: internalCallId,
    customerName,
    customerId,
    assignedUserId,
    assignedUserName,
    agentBusy
  };
}

export default router;
