/**
 * 管理后台 - 通知服务路由
 */
import { Router, Request, Response } from 'express'
import { adminNotificationService, EVENT_TYPES, CHANNEL_TYPES } from '../../services/AdminNotificationService'

const router = Router()

// 获取事件类型列表（前端用来渲染规则矩阵）
router.get('/event-types', async (_req: Request, res: Response) => {
  const list = Object.entries(EVENT_TYPES).map(([key, val]) => ({
    key,
    label: val.label,
    level: val.level,
    category: val.category
  }))
  res.json({ success: true, data: list })
})

// 获取渠道类型列表
router.get('/channel-types', async (_req: Request, res: Response) => {
  res.json({ success: true, data: CHANNEL_TYPES })
})

// 获取通知列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, isRead, eventType } = req.query as any
    const data = await adminNotificationService.getNotifications({ page, pageSize, isRead, eventType })
    res.json({ success: true, data })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '获取通知列表失败' })
  }
})

// 获取未读数量
router.get('/unread-count', async (_req: Request, res: Response) => {
  try {
    const count = await adminNotificationService.getUnreadCount()
    res.json({ success: true, data: { count } })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '获取未读数量失败' })
  }
})

// 标记单条已读
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    await adminNotificationService.markAsRead(req.params.id)
    res.json({ success: true, message: '已标记为已读' })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

// 标记全部已读
router.put('/read-all', async (_req: Request, res: Response) => {
  try {
    await adminNotificationService.markAllAsRead()
    res.json({ success: true, message: '已全部标记为已读' })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

// 删除单条通知
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await adminNotificationService.deleteNotification(req.params.id)
    res.json({ success: true, message: '已删除' })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// 清空全部通知
router.delete('/', async (_req: Request, res: Response) => {
  try {
    await adminNotificationService.clearAllNotifications()
    res.json({ success: true, message: '已清空全部通知' })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '清空失败' })
  }
})

// ============ 渠道配置 ============

// 获取渠道配置
router.get('/channels', async (_req: Request, res: Response) => {
  try {
    const channels = await adminNotificationService.getChannels()
    const parsed = channels.map((ch: any) => ({
      ...ch,
      config_data: typeof ch.config_data === 'string' ? JSON.parse(ch.config_data || '{}') : (ch.config_data || {})
    }))
    res.json({ success: true, data: parsed })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '获取渠道配置失败' })
  }
})

// 保存渠道配置（批量）
router.put('/channels', async (req: Request, res: Response) => {
  try {
    const { channels } = req.body
    if (!Array.isArray(channels)) {
      return res.status(400).json({ success: false, message: '参数格式错误' })
    }
    await adminNotificationService.saveChannelsBatch(channels)
    res.json({ success: true, message: '渠道配置已保存' })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '保存渠道配置失败' })
  }
})

// 保存单个渠道
router.put('/channels/:channelType', async (req: Request, res: Response) => {
  try {
    await adminNotificationService.saveChannel(req.params.channelType, req.body)
    res.json({ success: true, message: '渠道配置已保存' })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '保存失败' })
  }
})

// 测试渠道连接
router.post('/channels/test', async (req: Request, res: Response) => {
  try {
    const { channelType, config } = req.body
    const result = await adminNotificationService.testChannel(channelType, config)
    res.json({ success: true, data: result })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '测试失败' })
  }
})

// ============ 通知规则 ============

// 获取通知规则
router.get('/rules', async (_req: Request, res: Response) => {
  try {
    const rules = await adminNotificationService.getRules()
    res.json({ success: true, data: rules })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '获取通知规则失败' })
  }
})

// 保存通知规则
router.put('/rules', async (req: Request, res: Response) => {
  try {
    const { rules } = req.body
    if (!Array.isArray(rules)) {
      return res.status(400).json({ success: false, message: '参数格式错误' })
    }
    await adminNotificationService.saveRules(rules)
    res.json({ success: true, message: '通知规则已保存' })
  } catch (_e: any) {
    res.status(500).json({ success: false, message: '保存通知规则失败' })
  }
})

export default router
