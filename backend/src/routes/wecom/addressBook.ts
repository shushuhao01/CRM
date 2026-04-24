/**
 * 通讯录与绑定 API 路由 — V4.0 完整实现
 *
 * 功能链路:
 * 1. 同步部门: 调用企微API → 存入 wecom_department_mappings
 * 2. 同步成员: 调用企微API → 存入 wecom_user_bindings（未绑定状态）
 * 3. 部门树查询: 从本地表构建树返回
 * 4. 部门成员查询: 从本地 wecom_user_bindings 查询
 * 5. 同步设置: 存取 TenantSettings
 * 6. 同步日志: 记录每次同步操作的结果
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomDepartmentMapping } from '../../entities/WecomDepartmentMapping';
import { WecomUserBinding } from '../../entities/WecomUserBinding';
import { WecomConfig } from '../../entities/WecomConfig';
import { TenantSettings } from '../../entities/TenantSettings';
import { Department } from '../../entities/Department';
import WecomApiService from '../../services/WecomApiService';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';

const router = Router();

// ==================== 同步日志辅助 ====================
const SYNC_LOGS_KEY = 'wecom_sync_logs';

async function appendSyncLog(tenantId: string, entry: {
  type: string; operation: string; result: string; detail: string;
}) {
  try {
    const repo = AppDataSource.getRepository(TenantSettings);
    let setting = await repo.findOne({ where: { tenantId, settingKey: SYNC_LOGS_KEY } });

    let logs: any[] = [];
    if (setting) {
      logs = setting.getValue() || [];
    } else {
      const { v4: genId } = await import('uuid');
      setting = new TenantSettings();
      (setting as any).id = genId();
      (setting as any).tenantId = tenantId;
      (setting as any).settingKey = SYNC_LOGS_KEY;
      (setting as any).settingType = 'json';
    }

    logs.unshift({
      id: Date.now(),
      time: new Date().toISOString(),
      ...entry
    });

    // 最多保留 500 条日志
    if (logs.length > 500) logs = logs.slice(0, 500);

    setting.setValue(logs);
    await repo.save(setting);
  } catch (e: any) {
    log.warn('[AddressBook] appendSyncLog failed:', e.message);
  }
}

// ==================== 同步设置辅助 ====================
const SYNC_SETTINGS_KEY = 'wecom_sync_settings';

// ==================== 1. 获取部门树（本地数据） ====================
router.get('/address-book/departments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.query;

    if (!configId) {
      return res.json({ success: true, data: [] });
    }

    const repo = AppDataSource.getRepository(WecomDepartmentMapping);
    const mappings = await repo.find({
      where: { tenantId, wecomConfigId: Number(configId) },
      order: { wecomDeptId: 'ASC' }
    });

    // 构建树结构
    const nodeMap = new Map<number, any>();
    const roots: any[] = [];

    for (const m of mappings) {
      nodeMap.set(m.wecomDeptId, {
        id: m.id,
        wecomDeptId: m.wecomDeptId,
        wecomDeptName: m.wecomDeptName,
        wecomParentId: m.wecomParentId,
        crmDeptId: m.crmDeptId,
        crmDeptName: m.crmDeptName,
        memberCount: m.memberCount,
        lastSyncTime: m.lastSyncTime,
        children: []
      });
    }

    for (const m of mappings) {
      const node = nodeMap.get(m.wecomDeptId);
      if (m.wecomParentId && nodeMap.has(m.wecomParentId)) {
        nodeMap.get(m.wecomParentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ success: true, data: roots });
  } catch (error: any) {
    log.error('[AddressBook] Get department tree error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 2. 获取部门成员（本地绑定数据） ====================
router.get('/address-book/dept/:deptId/members', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.query;
    const deptId = req.params.deptId;

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const qb = bindingRepo.createQueryBuilder('b')
      .where('b.wecom_config_id = :configId', { configId: Number(configId) });

    if (tenantId) {
      qb.andWhere('b.tenant_id = :tenantId', { tenantId });
    }

    // 部门ID匹配（逗号分隔字段）
    qb.andWhere(
      '(b.wecom_department_ids = :deptId OR b.wecom_department_ids LIKE :startWith OR b.wecom_department_ids LIKE :endWith OR b.wecom_department_ids LIKE :middle)',
      {
        deptId,
        startWith: `${deptId},%`,
        endWith: `%,${deptId}`,
        middle: `%,${deptId},%`
      }
    );

    qb.orderBy('b.wecom_user_name', 'ASC');
    const list = await qb.getMany();

    res.json({
      success: true,
      data: {
        list: list.map(b => ({
          id: b.id,
          wecomUserId: b.wecomUserId,
          name: b.wecomUserName,
          wecomAvatar: b.wecomAvatar,
          crmUserName: b.crmUserName,
          crmUserId: b.crmUserId,
          position: '',
          status: b.isEnabled ? 'active' : 'inactive',
          wecomDepartmentIds: b.wecomDepartmentIds
        })),
        total: list.length
      }
    });
  } catch (error: any) {
    log.error('[AddressBook] Get dept members error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 3. 同步部门（从企微API拉取） ====================
router.post('/address-book/sync-departments', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.body;

    if (!configId) {
      return res.status(400).json({ success: false, message: '请指定企微配置' });
    }

    // 获取通讯录 access_token
    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');

    // 调用企微API获取部门列表
    const departments = await WecomApiService.getDepartmentList(accessToken);

    log.info(`[AddressBook] Synced ${departments.length} departments from WeCom API`);

    // 写入本地映射表
    const repo = AppDataSource.getRepository(WecomDepartmentMapping);

    let createdCount = 0;
    let updatedCount = 0;

    for (const dept of departments) {
      let mapping = await repo.findOne({
        where: { tenantId, wecomConfigId: configId, wecomDeptId: dept.id }
      });

      if (mapping) {
        mapping.wecomDeptName = dept.name;
        mapping.wecomParentId = dept.parentid || 0;
        mapping.lastSyncTime = new Date();
        updatedCount++;
      } else {
        mapping = repo.create({
          tenantId,
          wecomConfigId: configId,
          wecomDeptId: dept.id,
          wecomDeptName: dept.name,
          wecomParentId: dept.parentid || 0,
          memberCount: 0,
          lastSyncTime: new Date()
        });
        createdCount++;
      }

      await repo.save(mapping);
    }

    // 记录同步日志
    if (tenantId) {
      await appendSyncLog(tenantId, {
        type: 'contact',
        operation: '同步部门',
        result: 'success',
        detail: `从企微获取 ${departments.length} 个部门，新增 ${createdCount}，更新 ${updatedCount}`
      });
    }

    res.json({
      success: true,
      message: `同步完成：${departments.length} 个部门（新增 ${createdCount}，更新 ${updatedCount}）`,
      data: { total: departments.length, created: createdCount, updated: updatedCount }
    });
  } catch (error: any) {
    log.error('[AddressBook] Sync departments error:', error.message);

    const tenantId = getCurrentTenantId();
    if (tenantId) {
      await appendSyncLog(tenantId, {
        type: 'contact',
        operation: '同步部门',
        result: 'failed',
        detail: error.message
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 4. 同步成员（从企微API拉取） ====================
router.post('/address-book/sync-members', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.body;

    if (!configId) {
      return res.status(400).json({ success: false, message: '请指定企微配置' });
    }

    // 获取配置信息
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    // 获取通讯录 access_token
    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');

    // 获取所有本地部门
    const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    const localDepts = await deptRepo.find({
      where: { tenantId, wecomConfigId: configId }
    });

    if (localDepts.length === 0) {
      return res.status(400).json({ success: false, message: '请先同步部门' });
    }

    // 从根部门递归获取所有成员（fetch_child=true）
    const rootDeptId = localDepts.find(d => !d.wecomParentId || d.wecomParentId === 0)?.wecomDeptId || 1;
    const users = await WecomApiService.getDepartmentUsers(accessToken, rootDeptId, true);

    log.info(`[AddressBook] Synced ${users.length} members from WeCom API`);

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    let createdCount = 0;
    let updatedCount = 0;

    // 用于更新部门成员计数
    const deptMemberCount = new Map<number, number>();

    for (const user of users) {
      const wecomUserId = user.userid;
      const deptIds = (user.department || []).join(',');

      // 更新部门计数
      for (const dId of (user.department || [])) {
        deptMemberCount.set(dId, (deptMemberCount.get(dId) || 0) + 1);
      }

      // 查找已有绑定
      let binding = await bindingRepo.findOne({
        where: { wecomConfigId: configId, wecomUserId, tenantId }
      });

      if (binding) {
        // 更新企微侧信息，保留CRM绑定
        binding.wecomUserName = user.name || binding.wecomUserName;
        binding.wecomAvatar = user.avatar || binding.wecomAvatar;
        binding.wecomDepartmentIds = deptIds;
        binding.isEnabled = user.status === 1;
        updatedCount++;
      } else {
        // 创建新记录（未绑定CRM用户）
        binding = bindingRepo.create({
          tenantId,
          wecomConfigId: configId,
          corpId: config.corpId,
          wecomUserId,
          wecomUserName: user.name || '',
          wecomAvatar: user.avatar || '',
          wecomDepartmentIds: deptIds,
          crmUserId: '',
          crmUserName: '',
          isEnabled: user.status === 1,
          bindOperator: 'sync'
        });
        createdCount++;
      }

      await bindingRepo.save(binding);
    }

    // 更新部门成员计数
    for (const [deptId, count] of deptMemberCount) {
      await deptRepo.update(
        { wecomConfigId: configId, wecomDeptId: deptId, tenantId },
        { memberCount: count }
      );
    }

    // 记录同步日志
    if (tenantId) {
      await appendSyncLog(tenantId, {
        type: 'contact',
        operation: '同步成员',
        result: 'success',
        detail: `从企微获取 ${users.length} 个成员，新增 ${createdCount}，更新 ${updatedCount}`
      });
    }

    res.json({
      success: true,
      message: `同步完成：${users.length} 个成员（新增 ${createdCount}，更新 ${updatedCount}）`,
      data: { total: users.length, created: createdCount, updated: updatedCount }
    });
  } catch (error: any) {
    log.error('[AddressBook] Sync members error:', error.message);

    const tenantId = getCurrentTenantId();
    if (tenantId) {
      await appendSyncLog(tenantId, {
        type: 'contact',
        operation: '同步成员',
        result: 'failed',
        detail: error.message
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 5. 设置部门映射 ====================
router.put('/address-book/dept-mapping/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomDepartmentMapping);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };

    const mapping = await repo.findOne({ where });
    if (!mapping) return res.status(404).json({ success: false, message: '映射不存在' });

    if (req.body.crmDeptId !== undefined) mapping.crmDeptId = req.body.crmDeptId;
    if (req.body.crmDeptName !== undefined) mapping.crmDeptName = req.body.crmDeptName;

    const saved = await repo.save(mapping);

    if (tenantId) {
      await appendSyncLog(tenantId, {
        type: 'binding',
        operation: '部门映射',
        result: 'success',
        detail: `企微部门「${mapping.wecomDeptName}」映射到CRM部门「${req.body.crmDeptName || ''}」`
      });
    }

    res.json({ success: true, data: saved, message: '映射成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 6. 批量按名称自动映射 ====================
router.post('/address-book/batch-dept-mapping', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.body;

    const mappingRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    const deptRepo = AppDataSource.getRepository(Department);

    // 获取所有未映射的企微部门
    const allMappings = await mappingRepo.find({
      where: { tenantId, wecomConfigId: Number(configId) }
    });
    const unmapped = allMappings.filter(m => !m.crmDeptId || m.crmDeptId === '');

    // 获取所有CRM部门
    const crmDepts = await deptRepo.find();
    const crmDeptMap = new Map<string, any>();
    for (const d of crmDepts) {
      crmDeptMap.set((d.name || '').trim().toLowerCase(), d);
    }

    let matchedCount = 0;
    for (const m of unmapped) {
      const key = (m.wecomDeptName || '').trim().toLowerCase();
      const match = crmDeptMap.get(key);
      if (match) {
        m.crmDeptId = String(match.id);
        m.crmDeptName = match.name;
        await mappingRepo.save(m);
        matchedCount++;
      }
    }

    res.json({ success: true, data: { matched: matchedCount, total: unmapped.length }, message: `自动映射 ${matchedCount}/${unmapped.length} 个部门` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 7. 获取同步设置 ====================
router.get('/address-book/sync-settings', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const defaults = {
      autoSyncEnabled: false, frequency: 'daily', syncTime: '02:00',
      syncDepts: true, syncMembers: true, syncTags: false,
      newMemberAction: 'sync_only',
      disableCrmOnLeave: true, unbindOnLeave: true, transferCustomer: false
    };

    if (!tenantId) {
      return res.json({ success: true, data: defaults });
    }

    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: SYNC_SETTINGS_KEY } });
    const data = setting ? { ...defaults, ...setting.getValue() } : defaults;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 8. 保存同步设置 ====================
router.put('/address-book/sync-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });

    const repo = AppDataSource.getRepository(TenantSettings);
    let setting = await repo.findOne({ where: { tenantId, settingKey: SYNC_SETTINGS_KEY } });

    if (!setting) {
      const { v4: genId } = await import('uuid');
      setting = new TenantSettings();
      (setting as any).id = genId();
      (setting as any).tenantId = tenantId;
      (setting as any).settingKey = SYNC_SETTINGS_KEY;
      (setting as any).settingType = 'json';
    }

    const { configId: _configId, ...settingsData } = req.body;
    setting.setValue(settingsData);
    await repo.save(setting);

    res.json({ success: true, message: '保存成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 9. 获取同步日志 ====================
router.get('/address-book/sync-logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { type, range, page = '1', pageSize = '20' } = req.query;

    if (!tenantId) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: SYNC_LOGS_KEY } });
    let allLogs: any[] = setting ? (setting.getValue() || []) : [];

    // 按类型筛选
    if (type && type !== 'all') {
      allLogs = allLogs.filter((l: any) => l.type === type);
    }

    // 按时间范围筛选
    if (range) {
      const now = new Date();
      let startTime: Date;
      if (range === 'today') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (range === '7d') {
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      allLogs = allLogs.filter((l: any) => new Date(l.time) >= startTime);
    }

    const total = allLogs.length;
    const p = Number(page);
    const ps = Number(pageSize);
    const list = allLogs.slice((p - 1) * ps, p * ps);

    res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 10. 获取绑定列表（带统计） ====================
router.get('/address-book/bindings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId, page = '1', pageSize = '20' } = req.query;

    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const where: any = { tenantId };
    if (configId) where.wecomConfigId = Number(configId);

    const [allBindings, total] = await bindingRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' }
    });

    const bound = allBindings.filter(b => b.crmUserId && b.crmUserId !== '').length;
    const anomaly = allBindings.filter(b => !b.isEnabled).length;

    // 分页
    const p = Number(page);
    const ps = Number(pageSize);
    const list = allBindings.slice((p - 1) * ps, p * ps);

    res.json({
      success: true,
      data: {
        list,
        total,
        stats: {
          total,
          bound,
          unbound: total - bound,
          anomaly
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

