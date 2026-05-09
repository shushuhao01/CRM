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

// ==================== 名称有效性辅助 ====================
/**
 * 判断企微返回的名称是否“可信”（非空、非纯空白、非 ID 同值）
 * 企微 API 在 contact_secret 缺失/权限不足时常返回 name="" 或 name===String(id)
 */
function isValidName(name: any, id: number | string): boolean {
  if (name === null || name === undefined) return false;
  const s = String(name).trim();
  if (s === '') return false;
  if (s === String(id)) return false;
  return true;
}

/** 把 DB 中已经被污染成 "123" 这种形式的 wecomDeptName 视为缺失，统一返回 null */
function sanitizeDeptName(name: any, id: number | string): string | null {
  return isValidName(name, id) ? String(name).trim() : null;
}

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

    // 检查本地数据是否有有效名称（非null、非空、非纯数字ID、非与ID相同）
    const hasValidNames = mappings.length > 0 && mappings.some(m => isValidName(m.wecomDeptName, m.wecomDeptId));

    // 如果本地数据存在但名称缺失，尝试从API获取并回填
    if (mappings.length > 0 && !hasValidNames) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(Number(configId), 'contact');
        const apiDepts = await WecomApiService.getDepartmentList(accessToken);
        if (apiDepts.length > 0) {
          log.info('[AddressBook] Enriching local department names from API...');
          for (const apiDept of apiDepts) {
            const local = mappings.find(m => m.wecomDeptId === apiDept.id);
            if (local && isValidName(apiDept.name, apiDept.id)) {
              local.wecomDeptName = String(apiDept.name).trim();
              local.wecomParentId = apiDept.parentid || local.wecomParentId;
              await repo.save(local).catch(() => {});
            }
          }
        }
      } catch (e: any) {
        log.warn('[AddressBook] API enrich failed, using local data:', e.message);
      }
    }

    // 构建树结构
    const nodeMap = new Map<number, any>();
    const roots: any[] = [];

    for (const m of mappings) {
      const cleanName = sanitizeDeptName(m.wecomDeptName, m.wecomDeptId);
      nodeMap.set(m.wecomDeptId, {
        id: m.id,
        wecomDeptId: m.wecomDeptId,
        wecomDeptName: cleanName || `部门${m.wecomDeptId}`,
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

      // 仅当 API 返回的 name 是“可信”的（非空、非ID同值）才覆盖；否则保留 DB 已有有效值
      const apiNameValid = isValidName(dept.name, dept.id);
      if (mapping) {
        if (apiNameValid) {
          mapping.wecomDeptName = String(dept.name).trim();
        } else if (!isValidName(mapping.wecomDeptName, dept.id)) {
          // 旧值也是脏的（例如 "14"），清掉，让前端显示 "部门X" fallback
          mapping.wecomDeptName = '';
        }
        mapping.wecomParentId = dept.parentid || 0;
        mapping.lastSyncTime = new Date();
        updatedCount++;
      } else {
        mapping = repo.create({
          tenantId,
          wecomConfigId: configId,
          wecomDeptId: dept.id,
          wecomDeptName: apiNameValid ? String(dept.name).trim() : '',
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

    // 第三方授权应用 /user/list 常常只返回 userid，name 为空
    // 对名称缺失的成员逐个调 /user/get 补充（限制最多 200 个，避免接口过载）
    const missingNameUsers = users.filter((u: any) => !isValidName(u.name, u.userid));
    if (missingNameUsers.length > 0 && config.authType === 'third_party') {
      const limit = Math.min(missingNameUsers.length, 200);
      log.info(`[AddressBook] 第三方应用：${missingNameUsers.length} 个成员名称缺失，开始通过 /user/get 逐个补充（处理前 ${limit} 个）`);
      let enriched = 0;
      for (let i = 0; i < limit; i++) {
        const u = missingNameUsers[i];
        const detail = await WecomApiService.getUserDetail(accessToken, u.userid);
        if (detail && isValidName(detail.name, u.userid)) {
          u.name = detail.name;
          if (detail.avatar) u.avatar = detail.avatar;
          enriched++;
        }
        // 简单限速 - 避免被企微限流
        if (i % 20 === 19) await new Promise(r => setTimeout(r, 100));
      }
      log.info(`[AddressBook] /user/get 名称补充完成：${enriched}/${limit} 成功`);
    }

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

      // user.name 仅当“可信”才覆盖（非空、非与 userid 相同）
      const apiUserNameValid = isValidName(user.name, wecomUserId);
      if (binding) {
        if (apiUserNameValid) {
          binding.wecomUserName = String(user.name).trim();
        } else if (!isValidName(binding.wecomUserName, wecomUserId)) {
          // 旧值也是脏的（等于 userid），清空让前端显示成员账号 fallback
          binding.wecomUserName = '';
        }
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
          wecomUserName: apiUserNameValid ? String(user.name).trim() : '',
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
    const pageBindings = allBindings.slice((p - 1) * ps, p * ps);

    // 收集所有用到的部门ID，一次性查出名称
    const allDeptIds = new Set<number>();
    for (const b of pageBindings) {
      (b.wecomDepartmentIds || '').split(',').filter(Boolean).forEach(s => allDeptIds.add(Number(s)));
    }
    const deptNameMap = new Map<number, string>();
    if (allDeptIds.size > 0 && configId) {
      const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
      const depts = await deptRepo.createQueryBuilder('d')
        .where('d.wecom_config_id = :configId', { configId: Number(configId) })
        .andWhere('d.tenant_id = :tenantId', { tenantId })
        .andWhere('d.wecom_dept_id IN (:...ids)', { ids: Array.from(allDeptIds) })
        .getMany();
      for (const d of depts) {
        deptNameMap.set(d.wecomDeptId, sanitizeDeptName(d.wecomDeptName, d.wecomDeptId) || `部门${d.wecomDeptId}`);
      }
    }

    // sanitize + 装填 department 显示字段
    const list = pageBindings.map(b => {
      const cleanName = isValidName(b.wecomUserName, b.wecomUserId) ? String(b.wecomUserName).trim() : '';
      const deptIds = (b.wecomDepartmentIds || '').split(',').filter(Boolean).map(Number);
      const deptNames = deptIds.map(id => deptNameMap.get(id) || `部门${id}`).filter(Boolean);
      return {
        ...b,
        wecomUserName: cleanName,
        department: deptNames.join(' / ') || ''
      };
    });

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

// ==================== 11. 获取部门子节点（子部门 + 直属成员混合） ====================
router.get('/address-book/dept/:deptId/children', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.query;
    const parentDeptId = Number(req.params.deptId);

    if (!configId) return res.json({ success: true, data: [] });

    // 获取子部门
    const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    const childDepts = await deptRepo.find({
      where: { tenantId, wecomConfigId: Number(configId), wecomParentId: parentDeptId }
    });

    const deptNodes = childDepts.map(d => {
      const clean = sanitizeDeptName(d.wecomDeptName, d.wecomDeptId);
      const display = clean || `部门${d.wecomDeptId}`;
      return {
        nodeId: `dept_${d.wecomDeptId}`,
        nodeType: 'dept' as const,
        label: display,
        wecomDeptId: d.wecomDeptId,
        wecomDeptName: display,
        memberCount: d.memberCount || 0,
        crmDeptName: d.crmDeptName,
        isLeaf: false
      };
    });

    // 获取直属成员
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const deptIdStr = String(parentDeptId);
    const members = await bindingRepo.createQueryBuilder('b')
      .where('b.wecom_config_id = :configId', { configId: Number(configId) })
      .andWhere('b.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(b.wecom_department_ids = :deptId OR b.wecom_department_ids LIKE :startWith OR b.wecom_department_ids LIKE :endWith OR b.wecom_department_ids LIKE :middle)',
        { deptId: deptIdStr, startWith: `${deptIdStr},%`, endWith: `%,${deptIdStr}`, middle: `%,${deptIdStr},%` }
      )
      .orderBy('b.wecom_user_name', 'ASC')
      .getMany();

    const memberNodes = members.map(m => {
      const cleanName = isValidName(m.wecomUserName, m.wecomUserId)
        ? String(m.wecomUserName).trim()
        : '';
      const display = cleanName || m.wecomUserId;
      return {
        nodeId: `member_${m.wecomUserId}`,
        nodeType: 'member' as const,
        label: display,
        wecomUserId: m.wecomUserId,
        wecomUserName: cleanName,
        wecomAvatar: m.wecomAvatar,
        crmUserName: m.crmUserName,
        crmUserId: m.crmUserId,
        isEnabled: m.isEnabled,
        isLeaf: true
      };
    });

    res.json({ success: true, data: [...deptNodes, ...memberNodes] });
  } catch (error: any) {
    log.error('[AddressBook] Get dept children error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 12. 成员详情画像 ====================
router.get('/address-book/member/:wecomUserId/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.query;
    const { wecomUserId } = req.params;

    // 1. 基本信息（从绑定表）
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const binding = await bindingRepo.findOne({
      where: { tenantId, wecomConfigId: Number(configId), wecomUserId }
    });
    if (!binding) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }

    // 2. 外部联系人统计（从 wecom_customers）
    const { WecomCustomer } = await import('../../entities/WecomCustomer');
    const customerRepo = AppDataSource.getRepository(WecomCustomer);
    const totalExternalQb = customerRepo.createQueryBuilder('c')
      .where('c.wecom_config_id = :configId', { configId: Number(configId) })
      .andWhere('c.follow_user_id = :uid', { uid: wecomUserId });
    if (tenantId) totalExternalQb.andWhere('c.tenant_id = :tenantId', { tenantId });

    const totalExternal = await totalExternalQb.getCount();
    const validExternal = await totalExternalQb.clone().andWhere('c.status = :s', { s: 'normal' }).getCount();
    const deletedExternal = await totalExternalQb.clone().andWhere('c.status = :s', { s: 'deleted' }).getCount();

    // 消息统计：汇总该成员的客户消息
    const msgStats = await totalExternalQb.clone()
      .select('SUM(c.msg_sent_count)', 'totalSent')
      .addSelect('SUM(c.msg_recv_count)', 'totalRecv')
      .getRawOne();

    // 3. 客户群统计（从 wecom_customer_groups，群主为该成员）
    const { WecomCustomerGroup } = await import('../../entities/WecomCustomerGroup');
    const groupRepo = AppDataSource.getRepository(WecomCustomerGroup);
    const groupQb = groupRepo.createQueryBuilder('g')
      .where('g.owner_user_id = :uid', { uid: wecomUserId });
    if (tenantId) groupQb.andWhere('g.tenant_id = :tenantId', { tenantId });

    const ownedGroups = await groupQb.getCount();
    const groupMemberSum = await groupQb.clone()
      .select('SUM(g.member_count)', 'total')
      .getRawOne();

    // 4. 对外收款统计（从 wecom_payment_records）
    const { WecomPaymentRecord } = await import('../../entities/WecomPaymentRecord');
    const payRepo = AppDataSource.getRepository(WecomPaymentRecord);
    const payQb = payRepo.createQueryBuilder('p')
      .where('p.user_id = :uid', { uid: wecomUserId });
    if (tenantId) payQb.andWhere('p.tenant_id = :tenantId', { tenantId });

    const payCount = await payQb.getCount();
    const paySum = await payQb.clone()
      .andWhere('p.status = :ps', { ps: 'paid' })
      .select('SUM(p.amount)', 'total')
      .getRawOne();

    // 5. 退款统计（从 wecom_payment_refunds，操作人 = 该成员）
    const { WecomPaymentRefund } = await import('../../entities/WecomPaymentRefund');
    const refundRepo = AppDataSource.getRepository(WecomPaymentRefund);
    const refundQb = refundRepo.createQueryBuilder('r')
      .where('r.operator_id = :uid', { uid: wecomUserId });
    if (tenantId) refundQb.andWhere('r.tenant_id = :tenantId', { tenantId });

    const refundCount = await refundQb.getCount();
    const refundSum = await refundQb.clone()
      .andWhere('r.status = :rs', { rs: 'completed' })
      .select('SUM(r.refund_amount)', 'total')
      .getRawOne();

    // 6. 消息记录统计（从 wecom_chat_records）
    const { WecomChatRecord } = await import('../../entities/WecomChatRecord');
    const chatRepo = AppDataSource.getRepository(WecomChatRecord);
    const chatQb = chatRepo.createQueryBuilder('ch')
      .where('ch.from_user_id = :uid', { uid: wecomUserId });
    if (tenantId) chatQb.andWhere('ch.tenant_id = :tenantId', { tenantId });
    const chatMsgCount = await chatQb.getCount();

    // 7. 部门名称解析
    const deptIds = (binding.wecomDepartmentIds || '').split(',').filter(Boolean).map(Number);
    let deptNames: string[] = [];
    if (deptIds.length > 0) {
      const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
      const depts = await deptRepo.createQueryBuilder('d')
        .where('d.wecom_config_id = :configId', { configId: Number(configId) })
        .andWhere('d.wecom_dept_id IN (:...ids)', { ids: deptIds })
        .getMany();
      deptNames = depts
        .map(d => sanitizeDeptName(d.wecomDeptName, d.wecomDeptId) || `部门${d.wecomDeptId}`);
    }

    const cleanUserName = isValidName(binding.wecomUserName, binding.wecomUserId)
      ? String(binding.wecomUserName).trim()
      : '';

    res.json({
      success: true,
      data: {
        // 基本信息
        wecomUserId: binding.wecomUserId,
        wecomUserName: cleanUserName,
        wecomAvatar: binding.wecomAvatar,
        isEnabled: binding.isEnabled,
        departments: deptNames,
        wecomDepartmentIds: binding.wecomDepartmentIds,
        // CRM绑定
        crmUserId: binding.crmUserId,
        crmUserName: binding.crmUserName,
        bindingId: binding.id,
        // 外部联系人
        externalContacts: {
          total: totalExternal,
          valid: validExternal,
          deleted: deletedExternal
        },
        // 客户群
        customerGroups: {
          ownedCount: ownedGroups,
          totalMembers: parseInt(groupMemberSum?.total) || 0
        },
        // 消息
        messageStats: {
          sentToCustomers: parseInt(msgStats?.totalSent) || 0,
          recvFromCustomers: parseInt(msgStats?.totalRecv) || 0,
          chatRecordCount: chatMsgCount
        },
        // 收款
        payments: {
          count: payCount,
          totalAmount: parseInt(paySum?.total) || 0
        },
        // 退款
        refunds: {
          count: refundCount,
          totalAmount: parseInt(refundSum?.total) || 0
        }
      }
    });
  } catch (error: any) {
    log.error('[AddressBook] Get member profile error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 13. 部门汇总统计 ====================
router.get('/address-book/dept/:deptId/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.query;
    const deptId = Number(req.params.deptId);

    if (!configId) return res.status(400).json({ success: false, message: '缺少configId' });

    // 1. 部门信息
    const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    const dept = await deptRepo.findOne({
      where: { tenantId, wecomConfigId: Number(configId), wecomDeptId: deptId }
    });
    if (!dept) return res.status(404).json({ success: false, message: '部门不存在' });

    // 2. 获取该部门下所有成员的 wecomUserId 列表
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const deptIdStr = String(deptId);
    const members = await bindingRepo.createQueryBuilder('b')
      .where('b.wecom_config_id = :configId', { configId: Number(configId) })
      .andWhere('b.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(b.wecom_department_ids = :deptId OR b.wecom_department_ids LIKE :startWith OR b.wecom_department_ids LIKE :endWith OR b.wecom_department_ids LIKE :middle)',
        { deptId: deptIdStr, startWith: `${deptIdStr},%`, endWith: `%,${deptIdStr}`, middle: `%,${deptIdStr},%` }
      )
      .getMany();

    const memberIds = members.map(m => m.wecomUserId);
    const memberCount = members.length;

    // 如果没有成员，返回空统计
    const cleanDeptName = sanitizeDeptName(dept.wecomDeptName, dept.wecomDeptId) || `部门${dept.wecomDeptId}`;

    if (memberIds.length === 0) {
      return res.json({
        success: true,
        data: {
          deptName: cleanDeptName,
          wecomDeptId: dept.wecomDeptId,
          crmDeptName: dept.crmDeptName,
          memberCount: 0,
          members: [],
          externalContacts: { total: 0, valid: 0, deleted: 0 },
          customerGroups: { count: 0, totalMembers: 0 },
          payments: { count: 0, totalAmount: 0 },
          refunds: { count: 0, totalAmount: 0 },
          chatMessages: 0
        }
      });
    }

    // 3. 外部联系人汇总
    const { WecomCustomer } = await import('../../entities/WecomCustomer');
    const customerRepo = AppDataSource.getRepository(WecomCustomer);
    const extQb = customerRepo.createQueryBuilder('c')
      .where('c.follow_user_id IN (:...uids)', { uids: memberIds });
    if (tenantId) extQb.andWhere('c.tenant_id = :tenantId', { tenantId });

    const totalExternal = await extQb.getCount();
    const validExternal = await extQb.clone().andWhere('c.status = :s', { s: 'normal' }).getCount();
    const deletedExternal = await extQb.clone().andWhere('c.status = :s', { s: 'deleted' }).getCount();

    // 4. 客户群汇总
    const { WecomCustomerGroup } = await import('../../entities/WecomCustomerGroup');
    const groupRepo = AppDataSource.getRepository(WecomCustomerGroup);
    const grpQb = groupRepo.createQueryBuilder('g')
      .where('g.owner_user_id IN (:...uids)', { uids: memberIds });
    if (tenantId) grpQb.andWhere('g.tenant_id = :tenantId', { tenantId });

    const groupCount = await grpQb.getCount();
    const groupMemberSum = await grpQb.clone().select('SUM(g.member_count)', 'total').getRawOne();

    // 5. 收款汇总
    const { WecomPaymentRecord } = await import('../../entities/WecomPaymentRecord');
    const payRepo = AppDataSource.getRepository(WecomPaymentRecord);
    const payQb = payRepo.createQueryBuilder('p')
      .where('p.user_id IN (:...uids)', { uids: memberIds });
    if (tenantId) payQb.andWhere('p.tenant_id = :tenantId', { tenantId });

    const payCount = await payQb.getCount();
    const paySum = await payQb.clone().andWhere('p.status = :ps', { ps: 'paid' }).select('SUM(p.amount)', 'total').getRawOne();

    // 6. 退款汇总
    const { WecomPaymentRefund } = await import('../../entities/WecomPaymentRefund');
    const refundRepo = AppDataSource.getRepository(WecomPaymentRefund);
    const refundQb = refundRepo.createQueryBuilder('r')
      .where('r.operator_id IN (:...uids)', { uids: memberIds });
    if (tenantId) refundQb.andWhere('r.tenant_id = :tenantId', { tenantId });

    const refundCount = await refundQb.getCount();
    const refundSum = await refundQb.clone().andWhere('r.status = :rs', { rs: 'completed' }).select('SUM(r.refund_amount)', 'total').getRawOne();

    // 7. 聊天记录总数
    const { WecomChatRecord } = await import('../../entities/WecomChatRecord');
    const chatRepo = AppDataSource.getRepository(WecomChatRecord);
    const chatQb = chatRepo.createQueryBuilder('ch')
      .where('ch.from_user_id IN (:...uids)', { uids: memberIds });
    if (tenantId) chatQb.andWhere('ch.tenant_id = :tenantId', { tenantId });
    const chatCount = await chatQb.getCount();

    // 8. 成员列表概要（含外部联系人数）
    const memberSummaries = [];
    for (const m of members) {
      const mExtCount = await customerRepo.createQueryBuilder('c')
        .where('c.follow_user_id = :uid', { uid: m.wecomUserId })
        .andWhere(tenantId ? 'c.tenant_id = :tenantId' : '1=1', { tenantId })
        .andWhere('c.status = :s', { s: 'normal' })
        .getCount();
      const mCleanName = isValidName(m.wecomUserName, m.wecomUserId)
        ? String(m.wecomUserName).trim()
        : '';
      memberSummaries.push({
        wecomUserId: m.wecomUserId,
        wecomUserName: mCleanName,
        wecomAvatar: m.wecomAvatar,
        crmUserName: m.crmUserName,
        isEnabled: m.isEnabled,
        externalContactCount: mExtCount
      });
    }

    res.json({
      success: true,
      data: {
        deptName: cleanDeptName,
        wecomDeptId: dept.wecomDeptId,
        crmDeptName: dept.crmDeptName,
        memberCount,
        members: memberSummaries,
        externalContacts: { total: totalExternal, valid: validExternal, deleted: deletedExternal },
        customerGroups: { count: groupCount, totalMembers: parseInt(groupMemberSum?.total) || 0 },
        payments: { count: payCount, totalAmount: parseInt(paySum?.total) || 0 },
        refunds: { count: refundCount, totalAmount: parseInt(refundSum?.total) || 0 },
        chatMessages: chatCount
      }
    });
  } catch (error: any) {
    log.error('[AddressBook] Get dept summary error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 14. 在组织架构中直接绑定CRM用户 ====================
router.put('/address-book/member/:id/bind-crm', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { crmUserId, crmUserName } = req.body;
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const binding = await bindingRepo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!binding) return res.status(404).json({ success: false, message: '成员不存在' });

    binding.crmUserId = crmUserId || '';
    binding.crmUserName = crmUserName || '';
    await bindingRepo.save(binding);

    if (tenantId) {
      await appendSyncLog(tenantId, {
        type: 'binding',
        operation: 'CRM绑定',
        result: 'success',
        detail: `成员「${binding.wecomUserName}」绑定CRM用户「${crmUserName || '解除绑定'}」`
      });
    }

    res.json({ success: true, message: crmUserId ? '绑定成功' : '已解除绑定' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 15. 数据修复：清理名称被污染为 ID 同值的记录 ====================
router.post('/address-book/repair-names', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.body;
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });

    const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    const userRepo = AppDataSource.getRepository(WecomUserBinding);

    // 1. 清理部门名称 == ID 的记录
    const deptWhere: any = { tenantId };
    if (configId) deptWhere.wecomConfigId = Number(configId);
    const allDepts = await deptRepo.find({ where: deptWhere });
    let deptCleaned = 0;
    for (const d of allDepts) {
      if (!isValidName(d.wecomDeptName, d.wecomDeptId)) {
        if (d.wecomDeptName && d.wecomDeptName !== '') {
          d.wecomDeptName = '';
          await deptRepo.save(d);
          deptCleaned++;
        }
      }
    }

    // 2. 清理成员名称 == userid 的记录
    const userWhere: any = { tenantId };
    if (configId) userWhere.wecomConfigId = Number(configId);
    const allUsers = await userRepo.find({ where: userWhere });
    let userCleaned = 0;
    for (const u of allUsers) {
      if (!isValidName(u.wecomUserName, u.wecomUserId)) {
        if (u.wecomUserName && u.wecomUserName !== '') {
          u.wecomUserName = '';
          await userRepo.save(u);
          userCleaned++;
        }
      }
    }

    // 3. 从企微 API 重新拉取名称
    let deptEnriched = 0;
    let userEnriched = 0;
    if (configId) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(Number(configId), 'contact');
        const apiDepts = await WecomApiService.getDepartmentList(accessToken);
        for (const apiDept of apiDepts) {
          if (!isValidName(apiDept.name, apiDept.id)) continue;
          const local = allDepts.find(d => d.wecomDeptId === apiDept.id);
          if (local) {
            local.wecomDeptName = String(apiDept.name).trim();
            local.wecomParentId = apiDept.parentid || local.wecomParentId;
            await deptRepo.save(local);
            deptEnriched++;
          }
        }
        // 拉取成员名称（先批量 /user/list）
        const rootDept = allDepts.find(d => !d.wecomParentId || d.wecomParentId === 0)?.wecomDeptId || 1;
        const apiUsers = await WecomApiService.getDepartmentUsers(accessToken, rootDept, true);
        for (const apiU of apiUsers) {
          if (!isValidName(apiU.name, apiU.userid)) continue;
          const local = allUsers.find(u => u.wecomUserId === apiU.userid);
          if (local) {
            local.wecomUserName = String(apiU.name).trim();
            if (apiU.avatar) local.wecomAvatar = apiU.avatar;
            await userRepo.save(local);
            userEnriched++;
          }
        }

        // 第三方应用 fallback：对仍然缺名称的成员，逐个 /user/get（限流，最多 200 个）
        const stillMissing = allUsers.filter(u => !isValidName(u.wecomUserName, u.wecomUserId));
        if (stillMissing.length > 0) {
          const limit = Math.min(stillMissing.length, 200);
          log.info(`[AddressBook] repair-names: ${stillMissing.length} 个成员仍缺名称，通过 /user/get 补充前 ${limit} 个`);
          for (let i = 0; i < limit; i++) {
            const local = stillMissing[i];
            const detail = await WecomApiService.getUserDetail(accessToken, local.wecomUserId);
            if (detail && isValidName(detail.name, local.wecomUserId)) {
              local.wecomUserName = String(detail.name).trim();
              if (detail.avatar) local.wecomAvatar = detail.avatar;
              await userRepo.save(local);
              userEnriched++;
            }
            if (i % 20 === 19) await new Promise(r => setTimeout(r, 100));
          }
        }
      } catch (e: any) {
        log.warn('[AddressBook] repair-names API enrich failed:', e.message);
      }
    }

    res.json({
      success: true,
      message: `清理完成：部门清理 ${deptCleaned} 条、回填 ${deptEnriched} 条；成员清理 ${userCleaned} 条、回填 ${userEnriched} 条`,
      data: { deptCleaned, deptEnriched, userCleaned, userEnriched }
    });
  } catch (error: any) {
    log.error('[AddressBook] repair-names error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

