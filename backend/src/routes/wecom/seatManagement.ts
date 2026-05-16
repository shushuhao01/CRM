/**
 * 席位管理路由
 * Phase 6: 会话存档增值服务 — 席位管控
 * 包含：席位信息获取、成员管理、部门树、席位校验
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomArchiveSetting } from '../../entities/WecomArchiveSetting';
import { WecomArchiveMember } from '../../entities/WecomArchiveMember';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';

const router = Router();

/**
 * 获取席位信息
 * 返回：最大席位、已用席位、成员列表、到期日期
 */
router.get('/chat-archive/seats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const settingRepo = getTenantRepo(WecomArchiveSetting);
    const setting = await settingRepo.findOne({ where: { wecomConfigId: parseInt(configId as string) } });

    const memberRepo = getTenantRepo(WecomArchiveMember);
    const members = await memberRepo.find({ order: { createdAt: 'ASC' } });
    const enabledMembers = members.filter(m => m.isEnabled);

    let maxUsers = setting?.maxUsers || 0;
    const usedUsers = enabledMembers.length;

    // ★ 如果 maxUsers 为 0，尝试从购买记录中获取套餐额度
    if (maxUsers === 0) {
      try {
        const { getCurrentTenantId } = await import('../../utils/tenantContext');
        const { AppDataSource } = await import('../../config/database');
        const tenantId = getCurrentTenantId();
        if (tenantId) {
          const billingKey = `tenant_billing_records_${tenantId}`;
          const billingRows = await AppDataSource.query(
            'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1', [billingKey]
          ).catch(() => []);
          if (billingRows.length > 0) {
            try {
              const records = JSON.parse(billingRows[0].config_value);
              if (Array.isArray(records)) {
                const archiveRecords = records.filter((r: any) =>
                  (r.type === 'archive' || r.type === 'chat_archive' || r.type === 'vas_chat_archive') &&
                  (r.status === 'paid' || r.status === 'active' || r.status === 'free' || r.fulfillmentStatus === 'fulfilled')
                );
                for (const r of archiveRecords) {
                  const seats = r.userCount || r.maxMembers || r.seats || 0;
                  maxUsers = Math.max(maxUsers, seats);
                }
              }
            } catch { /* ignore */ }
          }
          // ★ 同步到 setting 表
          if (maxUsers > 0 && setting) {
            setting.maxUsers = maxUsers;
            setting.status = 'active';
            await settingRepo.save(setting);
            log.info(`[Wecom Seats] 从购买记录同步席位额度: maxUsers=${maxUsers}`);
          }

          // ★ 如果还是0，从 wecom_configs.vas_user_count 获取
          if (maxUsers === 0) {
            const { WecomConfig } = await import('../../entities/WecomConfig');
            const configRepo = AppDataSource.getRepository(WecomConfig);
            const config = await configRepo.findOne({ where: { id: parseInt(configId as string) } });
            if (config?.vasUserCount && config.vasUserCount > 0) {
              maxUsers = config.vasUserCount;
            }
          }
        }
      } catch (e: any) {
        log.warn('[Wecom Seats] 获取购买记录失败:', e.message);
      }
    }

    // 同步已用数到setting
    if (setting && setting.usedUsers !== usedUsers) {
      setting.usedUsers = usedUsers;
      await settingRepo.save(setting);
    }

    res.json({
      success: true,
      data: {
        maxUsers,
        usedUsers,
        members: await Promise.all(members.map(async (m) => {
          // ★ 补充部门信息和头像（从 wecom_user_bindings 获取）
          let departmentIds = '';
          let avatar = '';
          try {
            const { AppDataSource } = await import('../../config/database');
            const bindingRows = await AppDataSource.query(
              'SELECT wecom_department_ids, wecom_avatar FROM wecom_user_bindings WHERE wecom_user_id = ? LIMIT 1',
              [m.wecomUserId]
            );
            if (bindingRows.length > 0) {
              if (bindingRows[0].wecom_department_ids) {
                departmentIds = bindingRows[0].wecom_department_ids;
              }
              if (bindingRows[0].wecom_avatar) {
                avatar = bindingRows[0].wecom_avatar;
              }
            }
          } catch { /* ignore */ }
          return {
            id: m.id,
            wecomUserId: m.wecomUserId,
            wecomUserName: m.wecomUserName,
            name: m.wecomUserName || m.wecomUserId,
            avatar,
            crmUserId: m.crmUserId,
            isEnabled: m.isEnabled,
            departmentIds,
            createdAt: m.createdAt
          };
        })),
        expireDate: setting?.expireDate || null,
        status: maxUsers > 0 ? 'active' : (setting?.status || 'inactive'),
        visibility: setting?.visibility || 'all'
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Get seats error:', error.message);
    res.status(500).json({ success: false, message: '获取席位信息失败' });
  }
});

/**
 * 更新生效成员列表
 * 参数：members = [{ wecomUserId, wecomUserName, isEnabled }]
 */
router.put('/chat-archive/seats/members', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId, members } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    if (!Array.isArray(members)) return res.status(400).json({ success: false, message: 'members需为数组' });

    const settingRepo = getTenantRepo(WecomArchiveSetting);
    const setting = await settingRepo.findOne({ where: { wecomConfigId: parseInt(configId) } });

    const maxUsers = setting?.maxUsers || 0;
    const enabledCount = members.filter((m: any) => m.isEnabled).length;

    // 校验席位是否超限
    if (maxUsers > 0 && enabledCount > maxUsers) {
      return res.status(400).json({
        success: false,
        message: `启用成员数(${enabledCount})超出席位限制(${maxUsers})，请先增购席位`
      });
    }

    const memberRepo = getTenantRepo(WecomArchiveMember);

    // 先获取当前所有成员
    const existingMembers = await memberRepo.find();
    const existingMap = new Map(existingMembers.map(m => [m.wecomUserId, m]));

    let addedCount = 0;
    let updatedCount = 0;
    let removedCount = 0;

    // 更新或新增
    const incomingUserIds = new Set<string>();
    for (const m of members) {
      if (!m.wecomUserId) continue;
      incomingUserIds.add(m.wecomUserId);

      const existing = existingMap.get(m.wecomUserId);
      if (existing) {
        let changed = false;
        if (m.wecomUserName !== undefined && m.wecomUserName !== existing.wecomUserName) {
          existing.wecomUserName = m.wecomUserName;
          changed = true;
        }
        if (m.isEnabled !== undefined && m.isEnabled !== existing.isEnabled) {
          existing.isEnabled = m.isEnabled;
          changed = true;
        }
        if (changed) {
          await memberRepo.save(existing);
          updatedCount++;
        }
      } else {
        const { getCurrentTenantId } = await import('../../utils/tenantContext');
        const newMember = memberRepo.create({
          tenantId: getCurrentTenantId() || undefined,
          wecomUserId: m.wecomUserId,
          wecomUserName: m.wecomUserName || '',
          isEnabled: m.isEnabled !== false
        });
        await memberRepo.save(newMember);
        addedCount++;
      }
    }

    // 移除不在列表中的成员
    for (const [userId, member] of existingMap) {
      if (!incomingUserIds.has(userId)) {
        await memberRepo.remove(member);
        removedCount++;
      }
    }

    // 更新setting中的已用席位数
    if (setting) {
      setting.usedUsers = enabledCount;
      await settingRepo.save(setting);
    }

    res.json({
      success: true,
      message: `席位更新完成：新增${addedCount}，更新${updatedCount}，移除${removedCount}`,
      data: { addedCount, updatedCount, removedCount, enabledCount }
    });
  } catch (error: any) {
    log.error('[Wecom] Update seat members error:', error.message);
    res.status(500).json({ success: false, message: '更新席位成员失败' });
  }
});

/**
 * 获取企微部门树(含绑定状态)
 * 用于席位管理中选择成员
 */
router.get('/chat-archive/seats/wecom-tree', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const { AppDataSource } = await import('../../config/database');
    const { WecomDepartmentMapping } = await import('../../entities/WecomDepartmentMapping');
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();

    let departments: any[] = [];
    let users: any[] = [];

    // ★ 优先从本地数据库获取部门（已同步的数据有正确的名称）
    const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    const localDepts = await deptRepo.find({
      where: { wecomConfigId: parseInt(configId as string), ...(tenantId ? { tenantId } : {}) },
      order: { wecomDeptId: 'ASC' }
    });

    if (localDepts.length > 0 && localDepts.some(d => d.wecomDeptName && d.wecomDeptName.trim() !== String(d.wecomDeptId))) {
      // 使用本地部门数据（有正确名称）
      departments = localDepts.map(d => ({
        id: d.wecomDeptId,
        name: d.wecomDeptName || `部门${d.wecomDeptId}`,
        parentid: d.wecomParentId || 0
      }));
      log.info(`[Wecom SeatTree] 使用本地部门数据: ${departments.length} 个部门`);
    }

    // 尝试从企微API获取（如果本地没有或需要成员数据）
    try {
      const accessToken = await WecomApiService.getAccessTokenByConfigId(parseInt(configId as string), 'contact');

      // 如果本地没有部门数据，从API获取
      if (departments.length === 0) {
        const apiDepts = await WecomApiService.getDepartmentList(accessToken);
        departments = apiDepts;
      }

      // 获取根部门下所有成员
      users = await WecomApiService.getDepartmentUsers(accessToken, 1, true);
    } catch (apiError: any) {
      const errMsg = apiError.message || '';
      // ★ 如果是未授权错误，使用本地绑定数据作为成员列表
      if (errMsg.includes('40014') || errMsg.includes('60011') || errMsg.includes('invalid access_token')) {
        log.warn(`[Wecom SeatTree] 企微API不可用(${errMsg.substring(0, 50)})，使用本地绑定数据`);

        // 从 wecom_user_bindings 获取本地成员
        const { WecomUserBinding } = await import('../../entities/WecomUserBinding');
        const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
        const localBindings = await bindingRepo.find({
          where: { wecomConfigId: parseInt(configId as string), ...(tenantId ? { tenantId } : {}) }
        });
        users = localBindings.map(b => ({
          userid: b.wecomUserId,
          name: b.wecomUserName || b.wecomUserId,
          department: b.wecomDepartmentIds ? b.wecomDepartmentIds.split(',').map(Number).filter(n => n > 0) : [1]
        }));

        // 如果本地也没有部门数据，创建一个默认根部门
        if (departments.length === 0) {
          departments = [{ id: 1, name: '全部成员', parentid: 0 }];
        }
      } else {
        throw apiError;
      }
    }

    // 获取当前已选成员
    const memberRepo = getTenantRepo(WecomArchiveMember);
    const selectedMembers = await memberRepo.find();
    const selectedMap = new Map(selectedMembers.map(m => [m.wecomUserId, m]));

    // 构建部门树
    const deptMap = new Map<number, any>();
    for (const dept of departments) {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name || `部门${dept.id}`,
        parentId: dept.parentid || 0,
        children: [],
        members: []
      });
    }

    // 分配成员到部门
    for (const user of users) {
      const deptIds: number[] = user.department || [];
      const selected = selectedMap.get(user.userid);
      const memberNode = {
        wecomUserId: user.userid,
        name: user.name || user.userid,
        crmUserId: selected?.crmUserId || null,
        isBound: !!selected,
        isSelected: selected?.isEnabled || false
      };
      for (const deptId of deptIds) {
        const dept = deptMap.get(deptId);
        if (dept) dept.members.push(memberNode);
      }
      // 如果成员没有匹配到任何部门，放到根部门
      if (deptIds.length === 0 || !deptIds.some(id => deptMap.has(id))) {
        const rootDept = deptMap.get(1);
        if (rootDept) rootDept.members.push(memberNode);
      }
    }

    // 构建树形结构
    const rootNodes: any[] = [];
    for (const [_id, dept] of deptMap) {
      if (dept.parentId === 0 || !deptMap.has(dept.parentId)) {
        rootNodes.push(dept);
      } else {
        const parent = deptMap.get(dept.parentId);
        if (parent) parent.children.push(dept);
      }
    }

    res.json({
      success: true,
      data: {
        tree: rootNodes,
        totalUsers: users.length,
        selectedCount: selectedMembers.filter(m => m.isEnabled).length
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Get wecom tree error:', error.message);

    const errMsg = error.message || '';
    if (errMsg.includes('40014') || errMsg.includes('invalid access_token')) {
      return res.status(403).json({
        success: false,
        errorCode: 'CONTACT_NOT_AUTHORIZED',
        message: '组织架构信息尚未授权，无法加载成员列表',
        hint: '请先在企业微信管理后台「应用管理→第三方应用→授权信息」中完成组织架构授权，然后在CRM通讯录页面点击「同步通讯录」'
      });
    }

    res.status(500).json({ success: false, message: error.message || '获取部门树失败' });
  }
});

export default router;



