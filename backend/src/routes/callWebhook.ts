/**
 * 外呼服务商Webhook回调路由
 * 处理阿里云、腾讯云等服务商的通话状态回调
 */

import { Router, Request, Response } from 'express';
import { aliyunCallService } from '../services/AliyunCallService';

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

    console.log('[Webhook] 阿里云通话状态回调:', { event, callId, duration });

    // 解析自定义标签获取内部callId
    let internalCallId = callId;
    if (tags) {
      try {
        const tagData = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (tagData.callId) {
          internalCallId = tagData.callId;
        }
      } catch (e) {
        console.warn('解析tags失败:', e);
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
    console.error('处理阿里云状态回调失败:', error);
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

    console.log('[Webhook] 阿里云录音回调:', { callId, recordingUrl });

    // 解析自定义标签获取内部callId
    let internalCallId = callId;
    if (tags) {
      try {
        const tagData = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (tagData.callId) {
          internalCallId = tagData.callId;
        }
      } catch (e) {
        console.warn('解析tags失败:', e);
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
    console.error('处理阿里云录音回调失败:', error);
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

    console.log('[Webhook] 腾讯云回调:', { EventType });

    // TODO: 实现腾讯云回调处理
    // 根据EventType处理不同事件

    res.json({ success: true });
  } catch (error) {
    console.error('处理腾讯云回调失败:', error);
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

    console.log('[Webhook] 容联云回调:', { action, callSid, state });

    // TODO: 实现容联云回调处理

    res.json({ success: true });
  } catch (error) {
    console.error('处理容联云回调失败:', error);
    res.status(500).json({ success: false, message: '处理回调失败' });
  }
});

// ==================== 通用测试回调 ====================

/**
 * 测试回调接口
 * POST /api/v1/calls/webhook/test
 */
router.post('/test', async (req: Request, res: Response) => {
  console.log('[Webhook] 测试回调:', req.body);
  res.json({
    success: true,
    message: '回调接收成功',
    receivedAt: new Date().toISOString(),
    data: req.body
  });
});

export default router;
