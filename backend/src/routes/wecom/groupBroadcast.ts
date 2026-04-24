/**
 * 群发消息 API 路由
 * 通过企微API externalcontact/add_msg_template 发送
 * 消息以群主身份发送（企微API限制）
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomGroupBroadcast } from '../../entities/WecomGroupBroadcast';
import { WecomCustomerGroup } from '../../entities/WecomCustomerGroup';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';
import { WecomApiService } from '../../services/WecomApiService';
import { WecomConfig } from '../../entities/WecomConfig';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function getWecomConfigForTenant(tenantId?: string): Promise<WecomConfig | null> {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const where: any = { isEnabled: true };
    if (tenantId) where.tenantId = tenantId;
    return await configRepo.findOne({ where });
  } catch { return null; }
}

router.get('/group-broadcasts', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const list = await AppDataSource.getRepository(WecomGroupBroadcast).find({
      where: { tenantId } as any,
      order: { createdAt: 'DESC' }
    });
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Wecom] Get group broadcasts error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/group-broadcasts', authenticateToken, upload.any(), async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomGroupBroadcast);

    // Determine target description and count
    let targetDesc = '全部群';
    let targetCount = 0;

    if (req.body.target === 'all') {
      const groupRepo = AppDataSource.getRepository(WecomCustomerGroup);
      targetCount = await groupRepo.count({ where: { tenantId, status: 'normal' } as any });
      targetDesc = '全部群';
    } else if (req.body.target === 'specified') {
      const groups = req.body.specifiedGroups ? JSON.parse(req.body.specifiedGroups) : [];
      targetCount = groups.length;
      targetDesc = `指定群(${targetCount})`;
    } else if (req.body.target === 'template') {
      targetDesc = '按群模板';
    }

    const attachmentsMeta = req.body.attachments ? JSON.parse(req.body.attachments) : [];
    const contentType = attachmentsMeta.length > 0 ? '文本+附件' : '文本';

    const broadcast = repo.create({
      ...req.body,
      tenantId,
      targetDesc,
      targetCount,
      contentType,
      status: req.body.sendMode === 'now' ? 'pending' : 'pending',
      successCount: 0,
    });

    const saved = await repo.save(broadcast);

    // 调用企微 API 发送
    if (req.body.sendMode === 'now') {
      try {
        const config = await getWecomConfigForTenant(tenantId);
        if (config) {
          const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');

          // 上传附件素材获取media_id
          const wecomAttachments: any[] = [];
          const files = (req.files as Express.Multer.File[]) || [];

          for (const att of attachmentsMeta) {
            if (att.type === 'link') {
              wecomAttachments.push({
                msgtype: 'link',
                link: { title: att.linkTitle || '', url: att.linkUrl || '', desc: att.linkDesc || '' }
              });
            } else if (att.fileIndex !== undefined) {
              const file = files.find((f: Express.Multer.File) => f.fieldname === `attachmentFile_${att.fileIndex}`);
              if (file) {
                const mediaType = att.type === 'image' ? 'image' : att.type === 'video' ? 'video' : 'file';
                const mediaId = await WecomApiService.uploadMedia(accessToken, mediaType, file.buffer, file.originalname);
                wecomAttachments.push({
                  msgtype: att.type === 'image' ? 'image' : att.type === 'video' ? 'video' : 'file',
                  [att.type === 'image' ? 'image' : att.type === 'video' ? 'video' : 'file']: { media_id: mediaId }
                });
              }
            }
          }

          const msgData: any = {
            chat_type: 'group' as const,
            text: { content: req.body.text },
          };
          if (wecomAttachments.length > 0) {
            msgData.attachments = wecomAttachments;
          }

          const result = await WecomApiService.addMsgTemplate(accessToken, msgData);
          saved.wecomMsgId = result.msgid;
          saved.status = 'sent';
          saved.successCount = targetCount - (result.fail_list?.length || 0);
          saved.failCount = result.fail_list?.length || 0;
          await repo.save(saved);
          log.info(`[Wecom] Broadcast sent via WeChat Work API, msgid: ${result.msgid}`);
        } else {
          saved.status = 'failed';
          saved.detailResults = JSON.stringify([{ error: '未找到企微配置' }]);
          await repo.save(saved);
        }
      } catch (syncError: any) {
        log.error('[Wecom] Send broadcast via WeChat Work API failed:', syncError.message);
        saved.status = 'failed';
        saved.detailResults = JSON.stringify([{ error: syncError.message }]);
        await repo.save(saved);
      }
    }

    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[Wecom] Create group broadcast error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/group-broadcasts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomGroupBroadcast);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const broadcast = await repo.findOne({ where });
    if (!broadcast) return res.status(404).json({ success: false, message: '任务不存在' });

    let detailResults: any[] = [];
    try { detailResults = broadcast.detailResults ? JSON.parse(broadcast.detailResults) : []; } catch {}

    res.json({ success: true, data: { ...broadcast, results: detailResults } });
  } catch (error: any) {
    log.error('[Wecom] Get broadcast detail error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/group-broadcasts/:id/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomGroupBroadcast);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const broadcast = await repo.findOne({ where });
    if (!broadcast) return res.status(404).json({ success: false, message: '任务不存在' });
    broadcast.status = 'cancelled';
    await repo.save(broadcast);
    res.json({ success: true, message: '已取消' });
  } catch (error: any) {
    log.error('[Wecom] Cancel broadcast error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/group-broadcasts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    await AppDataSource.getRepository(WecomGroupBroadcast).delete({
      id: Number(req.params.id),
      tenantId
    } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete broadcast error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

