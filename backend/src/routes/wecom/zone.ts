/**
 * 企微数据与智能专区 - 回调接收路由
 *
 * 接收专区程序通过 spec_notify_app 发送的事件通知
 * 配置URL: https://crm.yunkes.com/api/wecom/zone/callback
 */
import { Router, Request, Response } from 'express';
import { log } from '../../config/logger';

const router = Router();

/**
 * 专区回调接收 - GET (验证URL有效性)
 */
router.get('/callback', (req: Request, res: Response) => {
  log.info('[WecomZone] Callback verify request received');
  res.send('ok');
});

/**
 * 专区回调接收 - POST
 * 当专区程序调用 spec_notify_app 时，企微后台会将事件推送到此URL
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    log.info('[WecomZone] Callback received:', JSON.stringify(body).substring(0, 500));

    const eventType = body?.event_type || body?.EventType || '';
    const notifyId = body?.notify_id || '';

    log.info(`[WecomZone] event_type=${eventType}, notify_id=${notifyId}`);

    // 根据事件类型处理
    switch (eventType) {
      case 'conversation_new_message':
        log.info('[WecomZone] 新会话消息通知');
        // TODO: 触发会话存档同步
        break;

      case 'chat_archive_audit_approved_single':
        log.info('[WecomZone] 用户同意会话存档');
        break;

      case 'hit_keyword':
        log.info('[WecomZone] 命中关键词规则');
        break;

      case 'chat_archive_export_finished':
        log.info('[WecomZone] 会话导出完成');
        break;

      default:
        log.info(`[WecomZone] 未知事件类型: ${eventType}`);
    }

    res.json({ errcode: 0, errmsg: 'ok' });
  } catch (error: any) {
    log.error('[WecomZone] Callback error:', error.message);
    res.json({ errcode: 0, errmsg: 'ok' });
  }
});

export default router;
