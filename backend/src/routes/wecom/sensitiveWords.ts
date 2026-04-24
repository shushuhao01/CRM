/**
 * 敏感词管理路由
 * 包含：敏感词列表、保存、扫描
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { getTenantRepo } from '../../utils/tenantRepo';
import { TenantSettings } from '../../entities/TenantSettings';
import { WecomChatRecord } from '../../entities/WecomChatRecord';
import { log } from '../../config/logger';
import { getCurrentTenantId } from '../../utils/tenantContext';

const router = Router();
const SENSITIVE_WORDS_KEY = 'wecom_sensitive_words';

/**
 * 获取敏感词列表
 */
router.get('/sensitive-words', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.json({ success: true, data: [] });

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({ where: { tenantId, settingKey: SENSITIVE_WORDS_KEY } });
    const words = setting ? setting.getValue() || [] : [];
    res.json({ success: true, data: words });
  } catch (error: any) {
    log.error('[Wecom] Get sensitive words error:', error.message);
    res.status(500).json({ success: false, message: '获取敏感词失败' });
  }
});

/**
 * 保存敏感词列表（全量覆盖）
 */
router.put('/sensitive-words', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { words } = req.body;
    if (!Array.isArray(words)) return res.status(400).json({ success: false, message: '参数格式错误' });

    const cleanWords = [...new Set(words.filter((w: string) => w && w.trim()).map((w: string) => w.trim()))];

    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    let setting = await settingsRepo.findOne({ where: { tenantId, settingKey: SENSITIVE_WORDS_KEY } });

    if (!setting) {
      const { v4: genId } = await import('uuid');
      setting = new TenantSettings();
      (setting as any).id = genId();
      (setting as any).tenantId = tenantId;
      (setting as any).settingKey = SENSITIVE_WORDS_KEY;
      (setting as any).settingType = 'json';
    }

    setting.setValue(cleanWords);
    await settingsRepo.save(setting);
    res.json({ success: true, message: `已保存 ${cleanWords.length} 个敏感词`, data: cleanWords });
  } catch (error: any) {
    log.error('[Wecom] Save sensitive words error:', error.message);
    res.status(500).json({ success: false, message: '保存敏感词失败' });
  }
});

/**
 * 使用敏感词扫描聊天记录并自动标记
 */
router.post('/sensitive-words/scan', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({ where: { tenantId: tenantId || '', settingKey: SENSITIVE_WORDS_KEY } });
    const words: string[] = setting ? setting.getValue() || [] : [];

    if (words.length === 0) {
      return res.json({ success: true, message: '敏感词列表为空，无需扫描', data: { scanned: 0, marked: 0 } });
    }

    const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(escapedWords.join('|'), 'i');

    const recordRepo = getTenantRepo(WecomChatRecord);
    const queryBuilder = recordRepo.createQueryBuilder('r')
      .where('r.is_sensitive = :isSensitive', { isSensitive: false })
      .andWhere('r.msg_type IN (:...types)', { types: ['text', 'meta'] });

    if (configId) queryBuilder.andWhere('r.wecom_config_id = :configId', { configId });

    const records = await queryBuilder.take(5000).getMany();
    let markedCount = 0;

    for (const record of records) {
      const content = record.content || '';
      if (regex.test(content)) {
        record.isSensitive = true;
        record.auditRemark = '[自动检测] 包含敏感词';
        await recordRepo.save(record);
        markedCount++;
      }
    }

    res.json({ success: true, message: `扫描完成：检查 ${records.length} 条，标记 ${markedCount} 条`, data: { scanned: records.length, marked: markedCount } });
  } catch (error: any) {
    log.error('[Wecom] Scan sensitive words error:', error.message);
    res.status(500).json({ success: false, message: '敏感词扫描失败' });
  }
});

export default router;

