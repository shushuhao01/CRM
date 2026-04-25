/**
 * 入群欢迎语 API 路由
 * 支持企微API同步: externalcontact/group_welcome_template
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomGroupWelcome } from '../../entities/WecomGroupWelcome';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';
import { WecomApiService } from '../../services/WecomApiService';
import { WecomConfig } from '../../entities/WecomConfig';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * 根据租户获取企微配置（用于API同步）
 */
async function getWecomConfigForTenant(tenantId?: string): Promise<WecomConfig | null> {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const where: any = { isEnabled: true };
    if (tenantId) where.tenantId = tenantId;
    return await configRepo.findOne({ where });
  } catch { return null; }
}

/**
 * 构建企微欢迎语模板数据
 */
function buildWelcomeTemplateData(body: any, mediaId?: string) {
  const data: any = {};
  if (body.text) {
    data.text = { content: body.text };
  }
  if (body.mediaType === 'image' && mediaId) {
    data.image = { media_id: mediaId };
  } else if (body.mediaType === 'link') {
    data.link = {
      title: body.linkTitle || '',
      url: body.linkUrl || '',
      desc: body.linkDesc || '',
    };
    if (mediaId) data.link.picurl = mediaId; // link uses picurl not media_id
  } else if (body.mediaType === 'miniprogram' && mediaId) {
    data.miniprogram = {
      title: body.miniprogramTitle || '',
      pic_media_id: mediaId,
      appid: body.miniprogramAppid || '',
      page: body.miniprogramPage || '',
    };
  }
  return data;
}

router.get('/group-welcomes', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const list = await AppDataSource.getRepository(WecomGroupWelcome).find({
      where: { tenantId } as any,
      order: { createdAt: 'DESC' }
    });
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Wecom] Get group welcomes error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/group-welcomes', authenticateToken, upload.single('mediaFile'), async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomGroupWelcome);
    const welcome = repo.create({ ...req.body, tenantId, isEnabled: true });
    const saved = await repo.save(welcome as any) as WecomGroupWelcome;

    // 同步到企微
    try {
      const config = await getWecomConfigForTenant(tenantId);
      if (config) {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
        let mediaId: string | undefined;

        // 上传附件素材
        if (req.file && (req.body.mediaType === 'image' || req.body.mediaType === 'miniprogram')) {
          mediaId = await WecomApiService.uploadMedia(accessToken, 'image', req.file.buffer, req.file.originalname);
        }

        const templateData = buildWelcomeTemplateData(req.body, mediaId);
        const result = await WecomApiService.addGroupWelcomeTemplate(accessToken, templateData);
        saved.wecomTemplateId = result.template_id;
        await repo.save(saved);
        log.info(`[Wecom] Welcome template synced to WeChat Work, template_id: ${result.template_id}`);
      } else {
        log.warn('[Wecom] No WeChat Work config found, welcome saved locally only');
      }
    } catch (syncError: any) {
      log.error('[Wecom] Sync welcome to WeChat Work failed:', syncError.message);
      // 本地已保存，不影响返回，但提示同步失败
    }

    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[Wecom] Create group welcome error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/group-welcomes/:id', authenticateToken, upload.single('mediaFile'), async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomGroupWelcome);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const welcome = await repo.findOne({ where });
    if (!welcome) return res.status(404).json({ success: false, message: '欢迎语不存在' });
    Object.assign(welcome, req.body);
    const saved = await repo.save(welcome);

    // 同步到企微
    try {
      const config = await getWecomConfigForTenant(tenantId);
      if (config && saved.wecomTemplateId) {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
        let mediaId: string | undefined;

        if (req.file && (req.body.mediaType === 'image' || req.body.mediaType === 'miniprogram')) {
          mediaId = await WecomApiService.uploadMedia(accessToken, 'image', req.file.buffer, req.file.originalname);
        }

        const templateData = buildWelcomeTemplateData(req.body, mediaId);
        await WecomApiService.editGroupWelcomeTemplate(accessToken, saved.wecomTemplateId, templateData);
        log.info(`[Wecom] Welcome template updated in WeChat Work, template_id: ${saved.wecomTemplateId}`);
      } else if (config && !saved.wecomTemplateId) {
        // 之前未同步成功，尝试新建
        const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
        let mediaId: string | undefined;
        if (req.file && (req.body.mediaType === 'image' || req.body.mediaType === 'miniprogram')) {
          mediaId = await WecomApiService.uploadMedia(accessToken, 'image', req.file.buffer, req.file.originalname);
        }
        const templateData = buildWelcomeTemplateData(req.body, mediaId);
        const result = await WecomApiService.addGroupWelcomeTemplate(accessToken, templateData);
        saved.wecomTemplateId = result.template_id;
        await repo.save(saved);
      }
    } catch (syncError: any) {
      log.error('[Wecom] Sync welcome update to WeChat Work failed:', syncError.message);
    }

    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[Wecom] Update group welcome error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/group-welcomes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomGroupWelcome);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const welcome = await repo.findOne({ where });

    // 先从企微删除
    if (welcome?.wecomTemplateId) {
      try {
        const config = await getWecomConfigForTenant(tenantId);
        if (config) {
          const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
          await WecomApiService.delGroupWelcomeTemplate(accessToken, welcome.wecomTemplateId);
          log.info(`[Wecom] Welcome template deleted from WeChat Work, template_id: ${welcome.wecomTemplateId}`);
        }
      } catch (syncError: any) {
        log.error('[Wecom] Delete welcome from WeChat Work failed:', syncError.message);
      }
    }

    await repo.delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete group welcome error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

