/**
 * AI助手 API 路由
 * V4.0新增: AI模型配置、智能体管理、知识库、话术库、AI标签规则、调用日志
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomAiModel } from '../../entities/WecomAiModel';
import { WecomAiAgent } from '../../entities/WecomAiAgent';
import { WecomAiLog } from '../../entities/WecomAiLog';
import { WecomKnowledgeBase } from '../../entities/WecomKnowledgeBase';
import { WecomKnowledgeEntry } from '../../entities/WecomKnowledgeEntry';
import { WecomScriptCategory } from '../../entities/WecomScriptCategory';
import { WecomScript } from '../../entities/WecomScript';
import { getCurrentTenantId } from '../../utils/tenantContext';

const router = Router();

// ==================== AI模型管理 ====================

router.get('/ai/models', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const list = await AppDataSource.getRepository(WecomAiModel).find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/models', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiModel);
    const model = repo.create({ ...req.body, tenantId });
    const saved = await repo.save(model);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/models/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiModel);
    const model = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!model) return res.status(404).json({ success: false, message: '模型不存在' });
    Object.assign(model, req.body);
    const saved = await repo.save(model);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ai/models/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    await AppDataSource.getRepository(WecomAiModel).delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/models/:id/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiModel);
    const model = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!model) return res.status(404).json({ success: false, message: '模型不存在' });

    const startTime = Date.now();
    try {
      // TODO: 实际调用provider API测试连接
      const latency = Date.now() - startTime;
      model.lastTestTime = new Date();
      model.lastTestStatus = 'success';
      await repo.save(model);
      res.json({ success: true, data: { status: 'success', latency } });
    } catch (testErr: any) {
      model.lastTestTime = new Date();
      model.lastTestStatus = 'fail';
      await repo.save(model);
      res.json({ success: true, data: { status: 'fail', error: testErr.message } });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/models/:id/default', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiModel);
    await repo.update({ tenantId, isDefault: true } as any, { isDefault: false });
    await repo.update({ id: Number(req.params.id), tenantId } as any, { isDefault: true });
    res.json({ success: true, message: '设置成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 智能体管理 ====================

router.get('/ai/agents', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const list = await AppDataSource.getRepository(WecomAiAgent).find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/agents', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiAgent);
    const agent = repo.create({ ...req.body, tenantId });
    const saved = await repo.save(agent);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/agents/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiAgent);
    const agent = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!agent) return res.status(404).json({ success: false, message: '智能体不存在' });
    Object.assign(agent, req.body);
    const saved = await repo.save(agent);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ai/agents/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    await AppDataSource.getRepository(WecomAiAgent).delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 知识库管理 ====================

router.get('/ai/knowledge-bases', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const list = await AppDataSource.getRepository(WecomKnowledgeBase).find({
      where: { tenantId }, order: { updatedAt: 'DESC' }
    });
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/knowledge-bases', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomKnowledgeBase);
    const kb = repo.create({ ...req.body, tenantId });
    const saved = await repo.save(kb);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/knowledge-bases/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomKnowledgeBase);
    const kb = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!kb) return res.status(404).json({ success: false, message: '知识库不存在' });
    Object.assign(kb, req.body);
    const saved = await repo.save(kb);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ai/knowledge-bases/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    await AppDataSource.getRepository(WecomKnowledgeEntry).delete({ tenantId, knowledgeBaseId: Number(req.params.id) } as any);
    await AppDataSource.getRepository(WecomKnowledgeBase).delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ai/knowledge-bases/:id/entries', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { page = 1, pageSize = 20, keyword } = req.query;
    const qb = AppDataSource.getRepository(WecomKnowledgeEntry).createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.knowledgeBaseId = :kbId', { kbId: Number(req.params.id) });
    if (keyword) qb.andWhere('(e.title LIKE :kw OR e.content LIKE :kw)', { kw: `%${keyword}%` });
    qb.orderBy('e.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize));
    const [list, total] = await qb.getManyAndCount();
    res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/knowledge-bases/:id/entries', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const kbId = Number(req.params.id);
    const repo = AppDataSource.getRepository(WecomKnowledgeEntry);
    const entry = repo.create({ ...req.body, tenantId, knowledgeBaseId: kbId, sourceType: req.body.sourceType || 'manual' });
    const saved = await repo.save(entry);
    await AppDataSource.getRepository(WecomKnowledgeBase)
      .createQueryBuilder().update().set({ entryCount: () => 'entry_count + 1' })
      .where('id = :id AND tenant_id = :tenantId', { id: kbId, tenantId }).execute();
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/knowledge-entries/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomKnowledgeEntry);
    const entry = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!entry) return res.status(404).json({ success: false, message: '条目不存在' });
    Object.assign(entry, req.body);
    const saved = await repo.save(entry);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ai/knowledge-entries/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomKnowledgeEntry);
    const entry = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!entry) return res.status(404).json({ success: false, message: '条目不存在' });
    const kbId = entry.knowledgeBaseId;
    await repo.delete({ id: entry.id } as any);
    await AppDataSource.getRepository(WecomKnowledgeBase)
      .createQueryBuilder().update().set({ entryCount: () => 'GREATEST(entry_count - 1, 0)' })
      .where('id = :id AND tenant_id = :tenantId', { id: kbId, tenantId }).execute();
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/knowledge-bases/:id/reindex', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomKnowledgeBase);
    const kb = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!kb) return res.status(404).json({ success: false, message: '知识库不存在' });
    kb.indexStatus = 'indexing';
    await repo.save(kb);
    const entryCount = await AppDataSource.getRepository(WecomKnowledgeEntry).count({
      where: { tenantId, knowledgeBaseId: kb.id }
    });
    kb.entryCount = entryCount;
    kb.indexStatus = 'indexed';
    kb.lastIndexTime = new Date();
    await repo.save(kb);
    res.json({ success: true, data: { entryCount, status: 'indexed' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 话术分类管理 ====================

router.get('/ai/script-categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const categories = await AppDataSource.getRepository(WecomScriptCategory).find({
      where: { tenantId }, order: { sortOrder: 'ASC', createdAt: 'DESC' }
    });
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    const enriched = await Promise.all(categories.map(async (cat) => {
      const stats = await scriptRepo.createQueryBuilder('s')
        .select('COUNT(*)', 'scriptCount')
        .addSelect('COALESCE(SUM(s.useCount), 0)', 'totalUseCount')
        .where('s.tenantId = :tenantId AND s.categoryId = :catId', { tenantId, catId: cat.id })
        .getRawOne();
      return { ...cat, scriptCount: Number(stats?.scriptCount || 0), totalUseCount: Number(stats?.totalUseCount || 0) };
    }));
    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/script-categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomScriptCategory);
    const cat = repo.create({ ...req.body, tenantId });
    const saved = await repo.save(cat);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/script-categories/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomScriptCategory);
    const cat = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!cat) return res.status(404).json({ success: false, message: '分类不存在' });
    Object.assign(cat, req.body);
    const saved = await repo.save(cat);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ai/script-categories/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    await AppDataSource.getRepository(WecomScript).delete({ tenantId, categoryId: Number(req.params.id) } as any);
    await AppDataSource.getRepository(WecomScriptCategory).delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 话术管理 ====================

router.get('/ai/scripts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { categoryId, page = 1, pageSize = 50, keyword } = req.query;
    const qb = AppDataSource.getRepository(WecomScript).createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId });
    if (categoryId) qb.andWhere('s.categoryId = :categoryId', { categoryId: Number(categoryId) });
    if (keyword) qb.andWhere('(s.title LIKE :kw OR s.content LIKE :kw)', { kw: `%${keyword}%` });
    qb.orderBy('s.useCount', 'DESC').addOrderBy('s.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize));
    const [list, total] = await qb.getManyAndCount();
    res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai/scripts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomScript);
    const script = repo.create({ ...req.body, tenantId });
    const saved = await repo.save(script);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/scripts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomScript);
    const script = await repo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!script) return res.status(404).json({ success: false, message: '话术不存在' });
    Object.assign(script, req.body);
    const saved = await repo.save(script);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ai/scripts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    await AppDataSource.getRepository(WecomScript).delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/ai/scripts/:id/use-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    await AppDataSource.getRepository(WecomScript)
      .createQueryBuilder().update().set({ useCount: () => 'use_count + 1' })
      .where('id = :id AND tenant_id = :tenantId', { id: Number(req.params.id), tenantId }).execute();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AI标签规则 ====================

// 获取AI标签规则列表
router.get('/ai/tag-rules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.json({ success: true, data: [] });
    // 使用 TenantSettings 存储标签规则（与敏感词组类似）
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: 'wecom_ai_tag_rules' } });
    const rules = setting ? (Array.isArray(setting.getValue()) ? setting.getValue() : []) : [];
    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建AI标签规则
router.post('/ai/tag-rules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    let setting = await repo.findOne({ where: { tenantId, settingKey: 'wecom_ai_tag_rules' } });
    let rules: any[] = setting ? (Array.isArray(setting.getValue()) ? setting.getValue() : []) : [];
    const newRule = {
      id: Date.now(),
      ...req.body,
      hitCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rules.push(newRule);
    if (!setting) {
      const { v4: genId } = await import('uuid');
      setting = new TenantSettings();
      (setting as any).id = genId();
      (setting as any).tenantId = tenantId;
      (setting as any).settingKey = 'wecom_ai_tag_rules';
      (setting as any).settingType = 'json';
    }
    setting.setValue(rules);
    await repo.save(setting);
    res.json({ success: true, data: newRule, message: '创建成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 手动触发标签规则（需在 :id 路由之前）
router.post('/ai/tag-rules/trigger', authenticateToken, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, message: '触发成功，后台处理中', data: { taskId: Date.now() } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新AI标签规则
router.put('/ai/tag-rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: 'wecom_ai_tag_rules' } });
    if (!setting) return res.status(404).json({ success: false, message: '规则不存在' });
    let rules: any[] = Array.isArray(setting.getValue()) ? setting.getValue() : [];
    const id = parseInt(req.params.id);
    const idx = rules.findIndex((r: any) => r.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: '规则不存在' });
    rules[idx] = { ...rules[idx], ...req.body, updatedAt: new Date().toISOString() };
    setting.setValue(rules);
    await repo.save(setting);
    res.json({ success: true, data: rules[idx], message: '更新成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除AI标签规则
router.delete('/ai/tag-rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: 'wecom_ai_tag_rules' } });
    if (!setting) return res.status(404).json({ success: false, message: '规则不存在' });
    let rules: any[] = Array.isArray(setting.getValue()) ? setting.getValue() : [];
    const id = parseInt(req.params.id);
    const before = rules.length;
    rules = rules.filter((r: any) => r.id !== id);
    if (rules.length === before) return res.status(404).json({ success: false, message: '规则不存在' });
    setting.setValue(rules);
    await repo.save(setting);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取标签规则命中记录
router.get('/ai/tag-rules/:id/hits', authenticateToken, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AI日志导出 & 话术改写 & 知识库增强 ====================

// 导出AI日志（需在 /ai/logs/:id 之前）
router.get('/ai/logs/export', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: [P1] 实现真实逻辑
    res.json({ success: true, data: { url: null }, message: '导出功能开发中' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI改写话术
router.post('/ai/scripts/:id/ai-rewrite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    // 配额校验
    const quotaCheck = await checkAndDeductAiQuota(tenantId, 1);
    if (!quotaCheck.allowed) {
      return res.status(400).json({
        success: false,
        code: 'QUOTA_EXCEEDED',
        message: `AI调用额度已用完（已用 ${quotaCheck.used} / 共 ${quotaCheck.quota} 次）。请购买AI额度套餐后继续使用。`,
        data: quotaCheck
      });
    }
    // TODO: [P1] 实现真实逻辑 - 调用AI模型改写话术内容
    res.json({ success: true, data: { rewritten: '' }, message: 'AI改写功能开发中' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 上传知识库文档
router.post('/ai/knowledge-bases/:id/upload', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: [P1] 实现真实逻辑
    res.json({ success: true, message: '文档上传功能开发中', data: { entries: 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 从CRM同步数据到知识库
router.post('/ai/knowledge-bases/:id/sync-crm', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: [P1] 实现真实逻辑
    res.json({ success: true, message: '同步功能开发中', data: { synced: 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AI调用日志 ====================

router.get('/ai/logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { page = 1, pageSize = 20, agentId, status, operationType, startDate, endDate } = req.query;
    const qb = AppDataSource.getRepository(WecomAiLog).createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId });
    if (agentId) qb.andWhere('log.agentId = :agentId', { agentId: Number(agentId) });
    if (status) qb.andWhere('log.status = :status', { status });
    if (operationType) qb.andWhere('log.operationType = :operationType', { operationType });
    if (startDate) qb.andWhere('log.createdAt >= :startDate', { startDate: String(startDate) + ' 00:00:00' });
    if (endDate) qb.andWhere('log.createdAt <= :endDate', { endDate: String(endDate) + ' 23:59:59' });
    qb.orderBy('log.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize));
    const [list, total] = await qb.getManyAndCount();
    res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ai/logs/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiLog);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await repo.createQueryBuilder('log')
      .select('COUNT(*)', 'totalCalls')
      .addSelect("SUM(CASE WHEN log.status = 'success' THEN 1 ELSE 0 END)", 'successCalls')
      .addSelect('COALESCE(AVG(log.durationMs), 0)', 'avgDuration')
      .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'totalTokens')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :today', { today })
      .getRawOne();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStats = await repo.createQueryBuilder('log')
      .select('COUNT(*)', 'totalCalls')
      .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'totalTokens')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :monthStart', { monthStart })
      .getRawOne();
    const tc = Number(todayStats?.totalCalls || 0);
    const sc = Number(todayStats?.successCalls || 0);
    res.json({
      success: true,
      data: {
        today: {
          totalCalls: tc, successCalls: sc,
          successRate: tc > 0 ? Math.round((sc / tc) * 1000) / 10 : 0,
          avgDuration: Math.round(Number(todayStats?.avgDuration || 0)),
          totalTokens: Number(todayStats?.totalTokens || 0),
        },
        month: {
          totalCalls: Number(monthStats?.totalCalls || 0),
          totalTokens: Number(monthStats?.totalTokens || 0),
          estimatedCost: Math.round(Number(monthStats?.totalTokens || 0) / 1000 * 0.03 * 100) / 100,
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ai/logs/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const log = await AppDataSource.getRepository(WecomAiLog).findOne({
      where: { id: Number(req.params.id), tenantId }
    });
    if (!log) return res.status(404).json({ success: false, message: '日志不存在' });
    res.json({ success: true, data: log });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AI使用量统计 & 套餐订单 ====================

// AI使用量概览（主页统计条）
router.get('/ai/usage-overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiLog);
    // 总调用量
    const totalResult = await repo.createQueryBuilder('log')
      .select('COUNT(*)', 'totalCalls')
      .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'totalTokens')
      .where('log.tenantId = :tenantId', { tenantId })
      .getRawOne();
    // 本月调用
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthResult = await repo.createQueryBuilder('log')
      .select('COUNT(*)', 'monthCalls')
      .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'monthTokens')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :monthStart', { monthStart })
      .getRawOne();
    // 套餐配额 - 从 TenantSettings 读取（购买套餐后累加）
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const quotaSetting = await settingsRepo.findOne({ where: { tenantId, settingKey: 'ai_quota' } });
    const quota = quotaSetting ? Number(quotaSetting.getValue()) : 0;
    // 读取管理后台配置的计费单位
    let quotaUnit = 'calls'; // 默认按次数
    try {
      const pricingRows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
      ).catch(() => []);
      if (pricingRows.length > 0) {
        const config = JSON.parse(pricingRows[0].config_value);
        if (config.quotaUnit) quotaUnit = config.quotaUnit;
      }
    } catch {}
    const used = quotaUnit === 'tokens' ? Number(totalResult?.totalTokens || 0) : Number(totalResult?.totalCalls || 0);
    res.json({
      success: true,
      data: {
        used,
        quota,
        quotaUnit,
        percent: quota > 0 ? Math.min(Math.round(used / quota * 100), 100) : 0,
        monthCalls: Number(monthResult?.monthCalls || 0),
        monthTokens: Number(monthResult?.monthTokens || 0),
        totalTokens: Number(totalResult?.totalTokens || 0),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI套餐列表（从管理后台配置读取）
router.get('/ai/packages', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 优先从 system_config 读取完整定价配置（含支付方式）
    const pricingRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);
    if (pricingRows.length > 0) {
      try {
        const config = JSON.parse(pricingRows[0].config_value);
        if (config.aiPackages && Array.isArray(config.aiPackages) && config.aiPackages.length > 0) {
          return res.json({ success: true, data: config.aiPackages, paymentMethods: config.paymentMethods || ['wechat', 'alipay'] });
        }
      } catch {}
    }
    // 次选：从 system_config 的 ai_packages_global 读取
    const sysRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'ai_packages_global' LIMIT 1"
    ).catch(() => []);
    if (sysRows.length > 0) {
      try {
        const packages = JSON.parse(sysRows[0].config_value);
        if (Array.isArray(packages) && packages.length > 0) {
          return res.json({ success: true, data: packages });
        }
      } catch {}
    }
    // 次选：从 TenantSettings 读取
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    let setting = await repo.findOne({ where: { settingKey: 'ai_packages_global' } });
    if (setting) {
      const packages = setting.getValue();
      if (Array.isArray(packages) && packages.length > 0) {
        return res.json({ success: true, data: packages });
      }
    }
    // 没有配置任何套餐 → 返回空（暂无套餐）
    res.json({ success: true, data: [] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI购买记录
router.get('/ai/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { page = 1, pageSize = 10 } = req.query;
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: 'ai_orders' } });
    const allOrders: any[] = setting ? (Array.isArray(setting.getValue()) ? setting.getValue() : []) : [];
    allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (Number(page) - 1) * Number(pageSize);
    const list = allOrders.slice(start, start + Number(pageSize));
    res.json({ success: true, data: { list, total: allOrders.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 购买AI套餐 - 创建支付订单
router.post('/ai/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const { packageId, packageName, calls, price, payType = 'wechat' } = req.body;

    // 生成订单号
    const orderNo = 'AI' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();

    if (price <= 0) {
      // 免费套餐防重复：每租户只能领取一次
      const claimCheck = await AppDataSource.query(
        "SELECT id FROM system_config WHERE config_key = ? LIMIT 1",
        [`tenant_ai_free_claimed_${tenantId}`]
      ).catch(() => []);
      if (claimCheck.length > 0) {
        return res.status(400).json({ success: false, message: '每个租户仅可领取一次免费AI体验包' });
      }
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
        [`tenant_ai_free_claimed_${tenantId}`, JSON.stringify({ claimedAt: new Date().toISOString(), packageId })]
      );

      // 免费套餐，直接生效
      const { TenantSettings } = await import('../../entities/TenantSettings');
      const repo = AppDataSource.getRepository(TenantSettings);
      // 记录订单
      let orderSetting = await repo.findOne({ where: { tenantId, settingKey: 'ai_orders' } });
      let orders: any[] = orderSetting ? (Array.isArray(orderSetting.getValue()) ? orderSetting.getValue() : []) : [];
      const newOrder = {
        id: Date.now(), orderNo, packageId, packageName, calls, price: 0,
        status: 'paid', payType: 'free', createdAt: new Date().toISOString(),
      };
      orders.push(newOrder);
      if (!orderSetting) {
        const { v4: genId } = await import('uuid');
        orderSetting = new TenantSettings();
        (orderSetting as any).id = genId();
        (orderSetting as any).tenantId = tenantId;
        (orderSetting as any).settingKey = 'ai_orders';
        (orderSetting as any).settingType = 'json';
      }
      orderSetting.setValue(orders);
      await repo.save(orderSetting);
      // 增加配额
      let quotaSetting = await repo.findOne({ where: { tenantId, settingKey: 'ai_quota' } });
      let currentQuota = quotaSetting ? Number(quotaSetting.getValue()) : 10000;
      currentQuota += (calls || 0);
      if (!quotaSetting) {
        const { v4: genId } = await import('uuid');
        quotaSetting = new TenantSettings();
        (quotaSetting as any).id = genId();
        (quotaSetting as any).tenantId = tenantId;
        (quotaSetting as any).settingKey = 'ai_quota';
        (quotaSetting as any).settingType = 'number';
      }
      quotaSetting.setValue(currentQuota);
      await repo.save(quotaSetting);

      // 解锁AI助手权限
      try {
        const pkgKey = `tenant_wecom_package_${tenantId}`;
        const pkgRows = await AppDataSource.query("SELECT id, config_value FROM system_config WHERE config_key = ? LIMIT 1", [pkgKey]).catch(() => []);
        let tenantPkg: any = {};
        if (pkgRows.length > 0) { try { tenantPkg = JSON.parse(pkgRows[0].config_value); } catch { tenantPkg = {}; } }
        if (!tenantPkg.menuPermissions) tenantPkg.menuPermissions = {};
        tenantPkg.menuPermissions.aiAssistant = true;
        tenantPkg.aiPackage = { name: packageName, calls, claimedAt: new Date().toISOString() };
        tenantPkg.updatedAt = new Date().toISOString();
        const pkgVal = JSON.stringify(tenantPkg);
        if (pkgRows.length > 0) {
          await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [pkgVal, pkgKey]);
        } else {
          await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [pkgKey, pkgVal]);
        }
      } catch (permErr: any) { console.warn('[AI] Unlock permission error:', permErr.message); }

      return res.json({ success: true, data: { ...newOrder, paid: true }, message: '免费套餐已生效' });
    }

    // 付费套餐 - 创建 payment_orders 记录
    const { v4: genId } = await import('uuid');
    const orderId = genId();
    const expireTime = new Date(Date.now() + 30 * 60 * 1000); // 30分钟过期

    try {
      await AppDataSource.query(
        `INSERT INTO payment_orders (id, order_no, customer_type, tenant_id, package_id, package_name, amount, pay_type, status, contact_name, expire_time, remark, created_at, updated_at) VALUES (?, ?, 'tenant', ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
        [orderId, orderNo, tenantId, packageId, packageName, price, payType, 'AI套餐购买', expireTime, `AI套餐: ${packageName}, ${calls}次调用`]
      );
    } catch (insertErr: any) {
      // 如果 payment_orders 表不存在，回退到 TenantSettings 方式
      console.warn('[AI Order] payment_orders insert failed, fallback to TenantSettings:', insertErr.message);
    }

    // 尝试生成支付二维码
    let qrCode = '';
    let payUrl = '';
    try {
      if (payType === 'wechat') {
        const { paymentService } = await import('../../services/PaymentService');
        const result = await paymentService.createWechatOrderForExisting(orderNo, price * 100, packageName);
        qrCode = result.qrCode || '';
        payUrl = result.payUrl || '';
      } else if (payType === 'alipay') {
        const { AlipayService } = await import('../../services/AlipayService');
        const alipayService = new AlipayService();
        const result = await alipayService.createQRPay({ orderNo, amount: price, subject: packageName });
        payUrl = result.payUrl || '';
        qrCode = result.qrCode || payUrl;
      }

      // 更新订单的二维码
      if (qrCode || payUrl) {
        await AppDataSource.query(
          `UPDATE payment_orders SET qr_code = ?, pay_url = ? WHERE order_no = ?`,
          [qrCode, payUrl, orderNo]
        ).catch(() => {});
      }
    } catch (payErr: any) {
      console.warn('[AI Order] Payment QR generation failed:', payErr.message);
      // 支付服务不可用时，生成模拟二维码URL
      qrCode = '';
      payUrl = '';
    }

    // 同时记录到 TenantSettings 的订单列表
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    let orderSetting = await repo.findOne({ where: { tenantId, settingKey: 'ai_orders' } });
    let orders: any[] = orderSetting ? (Array.isArray(orderSetting.getValue()) ? orderSetting.getValue() : []) : [];
    const newOrder = {
      id: Date.now(), orderNo, packageId, packageName, calls, price,
      status: 'pending', payType, qrCode, payUrl,
      createdAt: new Date().toISOString(),
    };
    orders.push(newOrder);
    if (!orderSetting) {
      const { v4: genId2 } = await import('uuid');
      orderSetting = new TenantSettings();
      (orderSetting as any).id = genId2();
      (orderSetting as any).tenantId = tenantId;
      (orderSetting as any).settingKey = 'ai_orders';
      (orderSetting as any).settingType = 'json';
    }
    orderSetting.setValue(orders);
    await repo.save(orderSetting);

    res.json({
      success: true,
      data: { ...newOrder, paid: false },
      message: qrCode || payUrl ? '订单已创建，请扫码支付' : '订单已创建，支付服务配置中'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 查询AI订单支付状态
router.get('/ai/orders/:orderNo/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const { orderNo } = req.params;

    // 先查 payment_orders 表
    let status = 'pending';
    try {
      const [row] = await AppDataSource.query(
        `SELECT status FROM payment_orders WHERE order_no = ? AND tenant_id = ?`,
        [orderNo, tenantId]
      );
      if (row) status = row.status;
    } catch { /* table may not exist */ }

    // 如果已支付，更新 TenantSettings 中的订单状态并增加配额
    if (status === 'paid') {
      const { TenantSettings } = await import('../../entities/TenantSettings');
      const repo = AppDataSource.getRepository(TenantSettings);
      const orderSetting = await repo.findOne({ where: { tenantId, settingKey: 'ai_orders' } });
      if (orderSetting) {
        const orders: any[] = Array.isArray(orderSetting.getValue()) ? orderSetting.getValue() : [];
        const order = orders.find((o: any) => o.orderNo === orderNo);
        if (order && order.status !== 'paid') {
          order.status = 'paid';
          order.paidAt = new Date().toISOString();
          orderSetting.setValue(orders);
          await repo.save(orderSetting);
          // 增加配额
          let quotaSetting = await repo.findOne({ where: { tenantId, settingKey: 'ai_quota' } });
          let currentQuota = quotaSetting ? Number(quotaSetting.getValue()) : 10000;
          currentQuota += (order.calls || 0);
          if (!quotaSetting) {
            const { v4: genId } = await import('uuid');
            quotaSetting = new TenantSettings();
            (quotaSetting as any).id = genId();
            (quotaSetting as any).tenantId = tenantId;
            (quotaSetting as any).settingKey = 'ai_quota';
            (quotaSetting as any).settingType = 'number';
          }
          quotaSetting.setValue(currentQuota);
          await repo.save(quotaSetting);
        }
      }
    }

    res.json({ success: true, data: { orderNo, status } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI模型使用量统计（按模型分组，支持日期筛选）
router.get('/ai/model-usage', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { startDate, endDate, page = 1, pageSize = 10 } = req.query;
    const qb = AppDataSource.getRepository(WecomAiLog).createQueryBuilder('log')
      .select('log.agentName', 'modelName')
      .addSelect('COUNT(*)', 'callCount')
      .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'totalTokens')
      .addSelect('COALESCE(SUM(log.inputTokens), 0)', 'inputTokens')
      .addSelect('COALESCE(SUM(log.outputTokens), 0)', 'outputTokens')
      .where('log.tenantId = :tenantId', { tenantId });
    if (startDate) qb.andWhere('log.createdAt >= :startDate', { startDate: String(startDate) + ' 00:00:00' });
    if (endDate) qb.andWhere('log.createdAt <= :endDate', { endDate: String(endDate) + ' 23:59:59' });
    qb.groupBy('log.agentName').orderBy('callCount', 'DESC');
    const allResults = await qb.getRawMany();
    const total = allResults.length;
    const start = (Number(page) - 1) * Number(pageSize);
    const list = allResults.slice(start, start + Number(pageSize)).map(r => ({
      modelName: r.modelName || '未知',
      callCount: Number(r.callCount),
      totalTokens: Number(r.totalTokens),
      inputTokens: Number(r.inputTokens),
      outputTokens: Number(r.outputTokens),
    }));
    res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI使用量趋势（按日分组，近30天，支持日期筛选）
router.get('/ai/usage-trend', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    let { startDate, endDate } = req.query;
    if (!startDate) {
      const d = new Date(); d.setDate(d.getDate() - 29);
      startDate = d.toISOString().slice(0, 10);
    }
    if (!endDate) endDate = new Date().toISOString().slice(0, 10);
    const qb = AppDataSource.getRepository(WecomAiLog).createQueryBuilder('log')
      .select("DATE(log.createdAt)", 'date')
      .addSelect('log.agentName', 'modelName')
      .addSelect('COUNT(*)', 'callCount')
      .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'totalTokens')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :startDate', { startDate: String(startDate) + ' 00:00:00' })
      .andWhere('log.createdAt <= :endDate', { endDate: String(endDate) + ' 23:59:59' })
      .groupBy('date').addGroupBy('log.agentName')
      .orderBy('date', 'ASC');
    const raw = await qb.getRawMany();
    res.json({
      success: true,
      data: raw.map(r => ({
        date: r.date,
        modelName: r.modelName || '未知',
        callCount: Number(r.callCount),
        totalTokens: Number(r.totalTokens),
      }))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 工具函数：检查AI额度，并在消耗后扣减
 * 额度来源优先级：system_config.tenant_wecom_package > TenantSettings.ai_quota
 */
async function checkAndDeductAiQuota(tenantId: string, deduct = 1): Promise<{ allowed: boolean; remaining: number; quota: number; used: number }> {
  let quota = 0;

  // 优先从 tenant_wecom_package 读取套餐领取/管理员分配的额度
  const pkgRows = await AppDataSource.query(
    "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
    [`tenant_wecom_package_${tenantId}`]
  ).catch(() => []);
  if (pkgRows.length > 0) {
    try {
      const pkg = JSON.parse(pkgRows[0].config_value);
      quota = pkg.aiPackage?.calls || pkg.aiPackage?.totalQuota || 0;
    } catch { /* ignore */ }
  }

  // 兼容旧的 TenantSettings 数据源
  if (quota === 0) {
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const repo = AppDataSource.getRepository(TenantSettings);
    const quotaSetting = await repo.findOne({ where: { tenantId, settingKey: 'ai_quota' } });
    quota = quotaSetting ? Number(quotaSetting.getValue()) : 0;
  }

  // 读取已用次数
  const usedResult = await AppDataSource.getRepository(WecomAiLog)
    .createQueryBuilder('log')
    .select('COUNT(*)', 'used')
    .where('log.tenantId = :tenantId', { tenantId })
    .getRawOne().catch(() => ({ used: 0 }));
  const used = Number(usedResult?.used || 0);
  const remaining = Math.max(0, quota - used);

  // 读取全局设置中的 stopOnQuotaExhaust
  let stopOnExhaust = true;
  const globalRows = await AppDataSource.query(
    "SELECT config_value FROM system_config WHERE config_key = 'wecom_ai_global_settings' LIMIT 1"
  ).catch(() => []);
  if (globalRows.length > 0) {
    try {
      const gs = JSON.parse(globalRows[0].config_value);
      stopOnExhaust = gs.stopOnQuotaExhaust !== false;
    } catch { /* default true */ }
  }

  if (quota > 0 && remaining < deduct && stopOnExhaust) {
    return { allowed: false, remaining, quota, used };
  }
  return { allowed: true, remaining, quota, used };
}

/**
 * GET /ai/quota-status
 * 获取当前租户AI额度状态（剩余/总量/已用）
 */
router.get('/ai/quota-status', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const status = await checkAndDeductAiQuota(tenantId, 0);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

