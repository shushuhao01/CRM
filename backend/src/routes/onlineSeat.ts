/**
 * 在线席位管理路由
 * 提供心跳上报、在线席位查询、会话管理等API
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { onlineSeatService } from '../services/OnlineSeatService';
import { log } from '../config/logger';
import { getClientIp } from '../utils/getClientIp';

const router = Router();

/**
 * 心跳上报
 * POST /api/v1/online-seat/heartbeat
 * 前端每30秒调用一次，更新会话活跃时间
 */
router.post('/heartbeat', authenticateToken, async (req: Request, res: Response) => {
  try {
    const sessionToken = (req as any).sessionToken;
    if (!sessionToken) {
      return res.json({ success: true, data: { status: 'no_session' } });
    }

    // 🔥 检查会话是否已被踢出
    const sessionStatus = await onlineSeatService.getSessionStatus(sessionToken);
    if (sessionStatus === 'kicked') {
      return res.json({ success: true, data: { kicked: true, message: '您的会话已被管理员下线' } });
    }
    if (sessionStatus === 'expired' || sessionStatus === 'logged_out') {
      return res.json({ success: true, data: { expired: true, message: '会话已过期' } });
    }

    // 🔥 not_found 时：检查席位后决定是否重建会话
    if (sessionStatus === 'not_found') {
      const userId = (req as any).currentUser?.id || (req as any).userId;
      const tenantId = (req as any).tenantId || (req as any).currentUser?.tenantId;
      if (userId && tenantId) {
        // 先检查席位是否已满（浏览器关闭15分钟后重开的场景）
        try {
          const seatCheck = await onlineSeatService.checkLoginAllowed(tenantId, userId);
          if (!seatCheck.allowed) {
            // 席位已满，强制用户重新登录
            return res.json({ success: true, data: { expired: true, message: '在线席位已满，请等待其他成员下线后重新登录' } });
          }
        } catch (_e) {
          // 检查失败时允许重建（容错）
        }
        await onlineSeatService.ensureSessionExists({
          sessionToken,
          userId,
          tenantId,
          deviceInfo: req.get('User-Agent'),
          ipAddress: getClientIp(req)
        });
      }
    }

    await onlineSeatService.updateActivityDirect(sessionToken);

    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  } catch (error) {
    log.error('[OnlineSeat] 心跳上报失败:', error);
    res.json({ success: true, data: { status: 'ok' } }); // 心跳失败不影响业务
  }
});

/**
 * 获取当前租户在线席位统计
 * GET /api/v1/online-seat/stats
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    log.info(`[OnlineSeat] /stats called, tenantId=${tenantId}`);
    if (!tenantId) {
      return res.json({ success: true, data: { mode: 'total' } });
    }

    const stats = await onlineSeatService.getTenantSeatStats(tenantId);
    log.info(`[OnlineSeat] /stats result:`, JSON.stringify(stats));
    res.json({ success: true, data: stats });
  } catch (error) {
    log.error('[OnlineSeat] 获取席位统计失败:', error);
    res.status(500).json({ success: false, message: '获取席位统计失败' });
  }
});

/**
 * 获取当前在线用户列表
 * GET /api/v1/online-seat/sessions
 * 需要管理员权限
 */
router.get('/sessions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    log.info(`[OnlineSeat] /sessions called, tenantId=${tenantId}`);
    if (!tenantId) {
      return res.json({ success: true, data: { sessions: [], onlineCount: 0, total: 0 } });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
    const { sessions, total } = await onlineSeatService.getOnlineSessions(tenantId, page, pageSize);
    const onlineCount = await onlineSeatService.getOnlineCount(tenantId);
    log.info(`[OnlineSeat] /sessions result: sessions=${sessions.length}, total=${total}, onlineCount=${onlineCount}`);

    res.json({
      success: true,
      data: {
        sessions,
        onlineCount,
        total,
        page,
        pageSize
      }
    });
  } catch (error) {
    log.error('[OnlineSeat] 获取在线列表失败:', error);
    res.status(500).json({ success: false, message: '获取在线列表失败' });
  }
});

/**
 * 强制踢出会话
 * POST /api/v1/online-seat/kick
 * 需要管理员权限
 */
router.post('/kick', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    const { sessionId, userId } = req.body;

    if (!tenantId) {
      return res.status(403).json({ success: false, message: '租户信息缺失' });
    }

    let kicked = 0;
    if (sessionId) {
      const result = await onlineSeatService.forceKickSession(sessionId, tenantId);
      kicked = result ? 1 : 0;
    } else if (userId) {
      kicked = await onlineSeatService.forceKickUser(userId, tenantId);
    } else {
      return res.status(400).json({ success: false, message: '请提供 sessionId 或 userId' });
    }

    res.json({ success: true, data: { kicked } });
  } catch (error) {
    log.error('[OnlineSeat] 踢出会话失败:', error);
    res.status(500).json({ success: false, message: '踢出会话失败' });
  }
});

export default router;
