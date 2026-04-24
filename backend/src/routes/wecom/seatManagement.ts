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

    const maxUsers = setting?.maxUsers || 0;
    const usedUsers = enabledMembers.length;

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
        members: members.map(m => ({
          id: m.id,
          wecomUserId: m.wecomUserId,
          wecomUserName: m.wecomUserName,
          crmUserId: m.crmUserId,
          isEnabled: m.isEnabled,
          createdAt: m.createdAt
        })),
        expireDate: setting?.expireDate || null,
        status: setting?.status || 'inactive'
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
        const newMember = memberRepo.create({
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

    const accessToken = await WecomApiService.getAccessTokenByConfigId(parseInt(configId as string), 'contact');

    // 获取部门列表
    const departments = await WecomApiService.getDepartmentList(accessToken);

    // 获取根部门下所有成员
    const users = await WecomApiService.getDepartmentUsers(accessToken, 1, true);

    // 获取当前已选成员
    const memberRepo = getTenantRepo(WecomArchiveMember);
    const selectedMembers = await memberRepo.find();
    const selectedMap = new Map(selectedMembers.map(m => [m.wecomUserId, m]));

    // 构建部门树
    const deptMap = new Map<number, any>();
    for (const dept of departments) {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
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
        name: user.name,
        crmUserId: selected?.crmUserId || null,
        isBound: !!selected,
        isSelected: selected?.isEnabled || false
      };
      for (const deptId of deptIds) {
        const dept = deptMap.get(deptId);
        if (dept) dept.members.push(memberNode);
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
    res.status(500).json({ success: false, message: error.message || '获取部门树失败' });
  }
});

export default router;



