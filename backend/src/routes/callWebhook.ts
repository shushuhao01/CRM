/**
 * 外呼服务商Webhook回调路由
 * 处理阿里云、腾讯云等服务商的通话状态回调
 */

import { Router, Request, Response } from 'express';
import { aliyunCallService } from '../services/AliyunCallService';

import { log } from '../config/logger';
const router = Router();

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

// ==================== 腾讯云回调 ====================

/**
 * 腾讯云通话回调
 * POST /api/v1/calls/webhook/tencent
 */
router.post('/tencent', async (req: Request, res: Response) => {
  try {
    const { EventType, Data } = req.body;

    log.info('[Webhook] 腾讯云回调:', { EventType });

    // TODO: 实现腾讯云回调处理
    // 根据EventType处理不同事件

    res.json({ success: true });
  } catch (error) {
    log.error('处理腾讯云回调失败:', error);
    res.status(500).json({ success: false, message: '处理回调失败' });
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
router.post('/sip/incoming', async (req: Request, res: Response) => {
  try {
    const { callerNumber, calledNumber, callId, trunkId, trunkName, secret: _secret } = req.body;

    log.info('[Webhook] SIP呼入通知:', { callerNumber, calledNumber, callId, trunkId });

    if (!callerNumber || !calledNumber) {
      return res.status(400).json({ success: false, message: '缺少主叫号码或被叫号码' });
    }

    // 可选: 验证webhook密钥
    // const expectedSecret = process.env.SIP_WEBHOOK_SECRET;
    // if (expectedSecret && secret !== expectedSecret) {
    //   return res.status(403).json({ success: false, message: '认证失败' });
    // }

    const { AppDataSource } = await import('../config/database');

    // 1. 根据主叫号码查找客户信息
    let customerId = null;
    let customerName = '未知来电';
    try {
      const customers = await AppDataSource.query(
        `SELECT id, name FROM customers WHERE phone = ? OR mobile = ? LIMIT 1`,
        [callerNumber, callerNumber]
      );
      if (customers.length > 0) {
        customerId = customers[0].id;
        customerName = customers[0].name;
      }
    } catch (err) {
      log.warn('[Webhook] 查询客户信息失败:', err);
    }

    // 2. 根据被叫号码(DID)或线路分配找到负责人
    let assignedUserId: string | null = null;
    let assignedUserName = '';
    try {
      // 先尝试通过线路分配找
      const assignments = await AppDataSource.query(
        `SELECT ula.user_id, u.name, u.real_name
         FROM user_line_assignments ula
         JOIN call_lines cl ON ula.line_id = cl.id
         LEFT JOIN users u ON ula.user_id = u.id
         WHERE (cl.caller_number = ? OR cl.line_number = ?) AND ula.is_active = 1
         ORDER BY ula.is_default DESC LIMIT 1`,
        [calledNumber, calledNumber]
      );
      if (assignments.length > 0) {
        assignedUserId = assignments[0].user_id;
        assignedUserName = assignments[0].real_name || assignments[0].name || '';
      }

      // 如果客户有专属销售，优先分配
      if (customerId) {
        const customerOwner = await AppDataSource.query(
          `SELECT sales_rep_id FROM customers WHERE id = ? LIMIT 1`,
          [customerId]
        );
        if (customerOwner.length > 0 && customerOwner[0].sales_rep_id) {
          assignedUserId = customerOwner[0].sales_rep_id;
          const userInfo = await AppDataSource.query(`SELECT name, real_name FROM users WHERE id = ? LIMIT 1`, [assignedUserId]);
          if (userInfo.length > 0) {
            assignedUserName = userInfo[0].real_name || userInfo[0].name || '';
          }
        }
      }
    } catch (err) {
      log.warn('[Webhook] 查询负责人失败:', err);
    }

    // 3. 创建呼入通话记录
    const internalCallId = callId || `SIP-IN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      await AppDataSource.query(
        `INSERT INTO call_records
         (id, customer_id, customer_name, customer_phone, call_type, call_status,
          call_method, caller_number, user_id, user_name, provider_call_id, start_time, created_at)
         VALUES (?, ?, ?, ?, 'inbound', 'ringing', 'sip', ?, ?, ?, ?, NOW(), NOW())`,
        [
          internalCallId,
          customerId,
          customerName,
          callerNumber,
          calledNumber,
          assignedUserId,
          assignedUserName,
          callId || null
        ]
      );
    } catch (err) {
      log.error('[Webhook] 创建呼入记录失败:', err);
    }

    // 4. 推送呼入通知到PC端（通过WebSocket）
    if (assignedUserId && (global as any).webSocketService) {
      (global as any).webSocketService.sendToUser(assignedUserId, 'CALL_INCOMING', {
        callId: internalCallId,
        callerNumber,
        calledNumber,
        customerName,
        customerId,
        trunkId,
        trunkName,
        timestamp: new Date().toISOString()
      });
      log.info(`[Webhook] 已推送呼入通知给用户 ${assignedUserId}`);
    }

    res.json({
      success: true,
      message: '呼入通知已处理',
      data: {
        callId: internalCallId,
        customerName,
        customerId,
        assignedUserId,
        assignedUserName
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
router.post('/sip/status', async (req: Request, res: Response) => {
  try {
    const { callId, event, duration, hangupCause, recordingUrl } = req.body;

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

    const updates: string[] = [`call_status = '${callStatus}'`, 'updated_at = NOW()'];
    const params: any[] = [];

    if (event === 'answered') {
      // 不需要额外更新，状态已设为connected
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

    params.push(callId);
    await AppDataSource.query(
      `UPDATE call_records SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 推送状态更新到PC端
    if ((global as any).webSocketService) {
      try {
        const records = await AppDataSource.query(
          `SELECT user_id FROM call_records WHERE id = ? LIMIT 1`, [callId]
        );
        if (records.length > 0 && records[0].user_id) {
          (global as any).webSocketService.sendToUser(
            records[0].user_id,
            `CALL_${event.toUpperCase()}`,
            { callId, event, duration, hangupCause }
          );
        }
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

export default router;
