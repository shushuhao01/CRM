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
 * 流程：1. 获取待扫描的文本消息 → 2. 对无明文的消息调用 get_msg_body 获取并解密 → 3. 用敏感词正则匹配明文
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
      .andWhere('r.msg_type IN (:...types)', { types: ['text', 'link', 'weapp', 'card'] });

    if (configId) queryBuilder.andWhere('r.wecom_config_id = :configId', { configId });

    const records = await queryBuilder.take(5000).getMany();
    log.info(`[Wecom] 敏感词扫描: 待扫描 ${records.length} 条记录, 敏感词 ${words.length} 个`);

    // 第一步：对没有明文(plainText)的消息，尝试获取消息体并解密
    const needPlainText = records.filter(r => {
      try {
        const c = JSON.parse(r.content || '{}');
        return !c.plainText && c.secretKey;
      } catch { return false; }
    });

    let decryptedCount = 0;
    if (needPlainText.length > 0 && configId) {
      try {
        const { WecomConfig } = await import('../../entities/WecomConfig');
        const configRepo = AppDataSource.getRepository(WecomConfig);
        const config = await configRepo.findOne({ where: { id: parseInt(configId), isEnabled: true } });
        if (config) {
          const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
          decryptedCount = await WecomChatArchiveService.fetchAndStorePlainTexts(config, needPlainText, 200);
          log.info(`[Wecom] 敏感词扫描: 获取消息明文 ${decryptedCount}/${needPlainText.length} 条`);
          if (decryptedCount > 0) {
            const refreshed = await queryBuilder.take(5000).getMany();
            records.length = 0;
            records.push(...refreshed);
          }
        }
      } catch (e: any) {
        log.warn(`[Wecom] 获取消息明文失败(非致命): ${e.message}`);
      }
    }

    // 第二步：用敏感词匹配明文或原始content
    let markedCount = 0;
    for (const record of records) {
      let textToScan = '';
      try {
        const contentObj = JSON.parse(record.content || '{}');
        textToScan = contentObj.plainText || '';
        if (!textToScan) {
          textToScan = contentObj.text || contentObj.content || contentObj.summary || contentObj.title || '';
        }
      } catch {
        textToScan = record.content || '';
      }
      if (!textToScan) continue;

      if (regex.test(textToScan)) {
        record.isSensitive = true;
        const matched = words.filter(w => textToScan.toLowerCase().includes(w.toLowerCase()));
        record.auditRemark = `[自动检测] 包含敏感词: ${matched.slice(0, 5).join(', ')}`;
        await recordRepo.save(record);
        markedCount++;
      }
    }

    const msg = `扫描完成：检查 ${records.length} 条，获取明文 ${decryptedCount} 条，标记敏感 ${markedCount} 条`;
    log.info(`[Wecom] ${msg}`);
    res.json({ success: true, message: msg, data: { scanned: records.length, marked: markedCount, decrypted: decryptedCount } });
  } catch (error: any) {
    log.error('[Wecom] Scan sensitive words error:', error.message);
    res.status(500).json({ success: false, message: '敏感词扫描失败' });
  }
});

/**
 * 敏感词触发统计（分页）
 * 查询被标记为敏感的聊天记录，按触发词分组统计
 */
router.get('/sensitive-words/trigger-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, dateRange, startDate, endDate, page = '1', pageSize = '10' } = req.query;
    const tenantId = getCurrentTenantId();

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({ where: { tenantId: tenantId || '', settingKey: SENSITIVE_WORDS_KEY } });
    const words: string[] = setting ? setting.getValue() || [] : [];

    const recordRepo = getTenantRepo(WecomChatRecord);
    const qb = recordRepo.createQueryBuilder('r')
      .where('r.is_sensitive = :s', { s: true });
    if (configId) qb.andWhere('r.wecom_config_id = :configId', { configId: parseInt(configId as string) });

    // 日期筛选
    const now = new Date();
    if (dateRange === 'today') {
      qb.andWhere('r.msg_time >= :ts', { ts: new Date(now.toISOString().split('T')[0]).getTime() });
    } else if (dateRange === '7d') {
      qb.andWhere('r.msg_time >= :ts', { ts: now.getTime() - 7 * 86400000 });
    } else if (dateRange === '30d') {
      qb.andWhere('r.msg_time >= :ts', { ts: now.getTime() - 30 * 86400000 });
    } else if (startDate && endDate) {
      qb.andWhere('r.msg_time >= :ts1', { ts1: new Date(startDate as string).getTime() });
      qb.andWhere('r.msg_time <= :ts2', { ts2: new Date(endDate as string).getTime() + 86400000 });
    }

    const allRecords = await qb.getMany();

    // 按敏感词统计触发次数
    const wordCountMap = new Map<string, { count: number; lastTime: number }>();
    for (const record of allRecords) {
      const content = (record.content || '').toLowerCase();
      for (const w of words) {
        if (content.includes(w.toLowerCase())) {
          const existing = wordCountMap.get(w) || { count: 0, lastTime: 0 };
          existing.count++;
          const msgTime = record.msgTime || 0;
          if (msgTime > existing.lastTime) existing.lastTime = msgTime;
          wordCountMap.set(w, existing);
        }
      }
    }

    // 确保所有已保存的敏感词都出现在列表中（即使触发次数为0）
    for (const w of words) {
      if (!wordCountMap.has(w)) {
        wordCountMap.set(w, { count: 0, lastTime: 0 });
      }
    }

    const allStats = Array.from(wordCountMap.entries())
      .map(([word, data]) => ({
        word,
        triggerCount: data.count,
        lastTriggeredAt: data.lastTime ? new Date(data.lastTime).toISOString().replace('T', ' ').slice(0, 16) : '-',
        trend: 0
      }))
      .sort((a, b) => b.triggerCount - a.triggerCount);

    const total = allStats.length;
    const p = parseInt(page as string) || 1;
    const ps = parseInt(pageSize as string) || 10;
    const list = allStats.slice((p - 1) * ps, p * ps);

    res.json({ success: true, data: { list, total, page: p, pageSize: ps } });
  } catch (error: any) {
    log.error('[Wecom] Get sensitive word trigger stats error:', error.message);
    res.status(500).json({ success: false, message: '获取触发统计失败' });
  }
});

/**
 * 获取敏感词触发的聊天记录列表（详细）
 */
router.get('/sensitive-words/hit-records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, page = '1', pageSize = '10', startDate, endDate } = req.query;

    const recordRepo = getTenantRepo(WecomChatRecord);
    const qb = recordRepo.createQueryBuilder('r')
      .where('r.is_sensitive = :s', { s: true });
    if (configId) qb.andWhere('r.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (startDate) qb.andWhere('r.msg_time >= :ts1', { ts1: new Date(startDate as string).getTime() });
    if (endDate) qb.andWhere('r.msg_time <= :ts2', { ts2: new Date(endDate as string).getTime() + 86400000 });

    const total = await qb.getCount();
    const p = parseInt(page as string) || 1;
    const ps = parseInt(pageSize as string) || 10;
    const records = await qb.orderBy('r.msg_time', 'DESC').skip((p - 1) * ps).take(ps).getMany();

    // 富化发送方/接收方名称
    const userIds = new Set<string>();
    for (const r of records) {
      if (r.fromUserId) userIds.add(r.fromUserId);
      try {
        const toIds = JSON.parse(r.toUserIds || '[]');
        if (Array.isArray(toIds)) toIds.forEach((id: string) => { if (id) userIds.add(id); });
      } catch { /* ignore */ }
    }

    const nameMap = new Map<string, string>();
    if (userIds.size > 0) {
      const uidArr = Array.from(userIds);
      const tenantId = getCurrentTenantId();
      const tenantCond = tenantId ? ' AND tenant_id = ?' : '';
      const tenantParam = tenantId ? [tenantId] : [];
      try {
        const members = await AppDataSource.query(
          `SELECT wecom_user_id, name FROM wecom_user_bindings WHERE wecom_user_id IN (${uidArr.map(() => '?').join(',')})${tenantCond}`, [...uidArr, ...tenantParam]
        );
        for (const m of members) { if (m.name) nameMap.set(m.wecom_user_id, m.name); }
      } catch { /* ignore */ }
      try {
        const customers = await AppDataSource.query(
          `SELECT external_user_id, remark, name FROM wecom_customers WHERE external_user_id IN (${uidArr.map(() => '?').join(',')})${tenantCond}`, [...uidArr, ...tenantParam]
        );
        for (const c of customers) { nameMap.set(c.external_user_id, c.remark || c.name || c.external_user_id); }
      } catch { /* ignore */ }
    }

    const list = records.map((r: any) => {
      const fromName = r.fromUserName && r.fromUserName !== r.fromUserId ? r.fromUserName : (nameMap.get(r.fromUserId) || r.fromUserId);
      let toName = '';
      try {
        const toIds = JSON.parse(r.toUserIds || '[]');
        toName = Array.isArray(toIds) ? toIds.map((id: string) => nameMap.get(id) || id).join(', ') : r.toUserIds;
      } catch { toName = r.toUserIds || ''; }
      return { ...r, fromUserName: fromName, toUserName: toName };
    });

    res.json({ success: true, data: { list, total, page: p, pageSize: ps } });
  } catch (error: any) {
    log.error('[Wecom] Get sensitive hit records error:', error.message);
    res.status(500).json({ success: false, message: '获取触发记录失败' });
  }
});

export default router;

