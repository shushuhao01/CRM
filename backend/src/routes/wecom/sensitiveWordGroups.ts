/**
 * 敏感词组管理路由
 * CRUD: /sensitive-word-groups
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { TenantSettings } from '../../entities/TenantSettings';

const router = Router();
const GROUPS_KEY = 'wecom_sensitive_word_groups';

// 辅助：读取/写入敏感词组（存储在 TenantSettings JSON 中）
async function loadGroups(tenantId: string): Promise<any[]> {
  const repo = AppDataSource.getRepository(TenantSettings);
  const setting = await repo.findOne({ where: { tenantId, settingKey: GROUPS_KEY } });
  if (!setting) return [];
  const val = setting.getValue();
  return Array.isArray(val) ? val : [];
}

async function saveGroups(tenantId: string, groups: any[]): Promise<void> {
  const repo = AppDataSource.getRepository(TenantSettings);
  let setting = await repo.findOne({ where: { tenantId, settingKey: GROUPS_KEY } });
  if (!setting) {
    const { v4: genId } = await import('uuid');
    setting = new TenantSettings();
    (setting as any).id = genId();
    (setting as any).tenantId = tenantId;
    (setting as any).settingKey = GROUPS_KEY;
    (setting as any).settingType = 'json';
  }
  setting.setValue(groups);
  await repo.save(setting);
}

/**
 * GET /sensitive-word-groups - 获取所有词组
 */
router.get('/sensitive-word-groups', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.json({ success: true, data: [] });
    const groups = await loadGroups(tenantId);
    res.json({ success: true, data: groups });
  } catch (error: any) {
    log.error('[Wecom] Get sensitive word groups error:', error.message);
    res.status(500).json({ success: false, message: '获取敏感词组失败' });
  }
});

/**
 * POST /sensitive-word-groups - 创建词组
 */
router.post('/sensitive-word-groups', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const groups = await loadGroups(tenantId);
    const newGroup = {
      id: Date.now(),
      groupName: req.body.groupName || '',
      detectMode: req.body.detectMode || 'exact',
      agentId: req.body.agentId || null,
      words: req.body.words || [],
      actions: req.body.actions || ['mark', 'notify'],
      exemptAdmin: !!req.body.exemptAdmin,
      isEnabled: req.body.isEnabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    groups.push(newGroup);
    await saveGroups(tenantId, groups);
    res.json({ success: true, data: newGroup, message: '词组已创建' });
  } catch (error: any) {
    log.error('[Wecom] Create sensitive word group error:', error.message);
    res.status(500).json({ success: false, message: '创建敏感词组失败' });
  }
});

/**
 * PUT /sensitive-word-groups/:id - 更新词组
 */
router.put('/sensitive-word-groups/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const id = parseInt(req.params.id);
    const groups = await loadGroups(tenantId);
    const idx = groups.findIndex(g => g.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: '词组不存在' });
    groups[idx] = {
      ...groups[idx],
      groupName: req.body.groupName ?? groups[idx].groupName,
      detectMode: req.body.detectMode ?? groups[idx].detectMode,
      agentId: req.body.agentId ?? groups[idx].agentId,
      words: req.body.words ?? groups[idx].words,
      actions: req.body.actions ?? groups[idx].actions,
      exemptAdmin: req.body.exemptAdmin ?? groups[idx].exemptAdmin,
      isEnabled: req.body.isEnabled ?? groups[idx].isEnabled,
      updatedAt: new Date().toISOString(),
    };
    await saveGroups(tenantId, groups);
    res.json({ success: true, data: groups[idx], message: '词组已更新' });
  } catch (error: any) {
    log.error('[Wecom] Update sensitive word group error:', error.message);
    res.status(500).json({ success: false, message: '更新敏感词组失败' });
  }
});

/**
 * DELETE /sensitive-word-groups/:id - 删除词组
 */
router.delete('/sensitive-word-groups/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const id = parseInt(req.params.id);
    let groups = await loadGroups(tenantId);
    const before = groups.length;
    groups = groups.filter(g => g.id !== id);
    if (groups.length === before) return res.status(404).json({ success: false, message: '词组不存在' });
    await saveGroups(tenantId, groups);
    res.json({ success: true, message: '词组已删除' });
  } catch (error: any) {
    log.error('[Wecom] Delete sensitive word group error:', error.message);
    res.status(500).json({ success: false, message: '删除敏感词组失败' });
  }
});

export default router;

