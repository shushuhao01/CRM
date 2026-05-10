/**
 * 会话存档设置路由
 * 包含：获取/更新设置、存储配置、拉取配置
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomArchiveSetting } from '../../entities/WecomArchiveSetting';
import { WecomConfig } from '../../entities/WecomConfig';
import { log } from '../../config/logger';

const router = Router();

// ==================== 存档设置 ====================

/** 获取存档设置 */
router.get('/chat-archive/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(configId as string), isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在' });

    const settingRepo = getTenantRepo(WecomArchiveSetting);
    const setting = await settingRepo.findOne({ where: { wecomConfigId: parseInt(configId as string) } });

    const commonFields = {
      authType: config.authType || 'self_built',
      dataApiStatus: config.dataApiStatus || 0,
      hasSecret: config.authType === 'third_party' ? !!config.permanentCode : !!config.chatArchiveSecret,
      hasPrivateKey: !!config.chatArchivePrivateKey,
      vasChatArchive: !!config.vasChatArchive,
    };

    if (!setting) {
      // 返回默认设置
      return res.json({
        success: true,
        data: {
          wecomConfigId: parseInt(configId as string),
          fetchInterval: 5,
          fetchMode: 'default',
          retentionDays: 180,
          mediaStorage: 'local',
          autoInspect: false,
          memberScope: null,
          rsaPublicKey: null,
          visibility: 'all',
          maxUsers: 0,
          usedUsers: 0,
          status: 'inactive',
          expireDate: null,
          ...commonFields
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...setting,
        ...commonFields
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Get archive settings error:', error.message);
    res.status(500).json({ success: false, message: '获取存档设置失败' });
  }
});

/** 更新存档设置 */
router.put('/chat-archive/settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId, fetchInterval, fetchMode, retentionDays, mediaStorage, autoInspect, memberScope, rsaPublicKey, visibility } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(configId), isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在' });

    const settingRepo = getTenantRepo(WecomArchiveSetting);
    let setting = await settingRepo.findOne({ where: { wecomConfigId: parseInt(configId) } });

    if (!setting) {
      setting = settingRepo.create({ wecomConfigId: parseInt(configId) }) as WecomArchiveSetting;
    }

    if (fetchInterval !== undefined) {
      const val = parseInt(fetchInterval);
      if (val < 1 || val > 60) return res.status(400).json({ success: false, message: '拉取间隔应在1-60分钟之间' });
      setting.fetchInterval = val;
    }
    if (fetchMode !== undefined) {
      if (!['default', 'pre_page', 'adaptive'].includes(fetchMode)) {
        return res.status(400).json({ success: false, message: '拉取模式不合法' });
      }
      setting.fetchMode = fetchMode;
    }
    if (retentionDays !== undefined) {
      const val = parseInt(retentionDays);
      if (val < 7 || val > 3650) return res.status(400).json({ success: false, message: '保留天数应在7-3650之间' });
      setting.retentionDays = val;
    }
    if (mediaStorage !== undefined) {
      if (!['local', 'oss'].includes(mediaStorage)) {
        return res.status(400).json({ success: false, message: '存储方式不合法' });
      }
      setting.mediaStorage = mediaStorage;
    }
    if (autoInspect !== undefined) setting.autoInspect = !!autoInspect;
    if (memberScope !== undefined) {
      setting.memberScope = typeof memberScope === 'string' ? memberScope : JSON.stringify(memberScope);
    }
    if (rsaPublicKey !== undefined) setting.rsaPublicKey = rsaPublicKey;
    if (visibility !== undefined) {
      if (!['self', 'department', 'all'].includes(visibility)) {
        return res.status(400).json({ success: false, message: '可见性设置不合法' });
      }
      setting.visibility = visibility;
    }

    const saved = await settingRepo.save(setting);
    res.json({ success: true, message: '存档设置已更新', data: saved });
  } catch (error: any) {
    log.error('[Wecom] Update archive settings error:', error.message);
    res.status(500).json({ success: false, message: '更新存档设置失败' });
  }
});

/**
 * 获取当前用户的可见性过滤条件
 * 供其他路由(如chat-records)调用来做可见性过滤
 */
router.get('/chat-archive/visibility-scope', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const currentUser = (req as any).currentUser;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    // 管理员始终全部可见
    if (isAdmin) {
      return res.json({ success: true, data: { visibility: 'all', filterUserIds: null, isAdmin: true } });
    }

    const settingRepo = getTenantRepo(WecomArchiveSetting);
    const setting = await settingRepo.findOne({ where: { wecomConfigId: parseInt(configId as string) } });
    const visibility = setting?.visibility || 'all';

    if (visibility === 'all') {
      return res.json({ success: true, data: { visibility: 'all', filterUserIds: null, isAdmin: false } });
    }

    // 获取当前用户绑定的企微userId
    const { AppDataSource } = await import('../../config/database');
    const bindingRows = await AppDataSource.query(
      'SELECT wecom_user_id FROM wecom_bindings WHERE crm_user_id = ? LIMIT 10',
      [currentUser?.id]
    ).catch(() => []);

    const myWecomUserIds = bindingRows.map((r: any) => r.wecom_user_id).filter(Boolean);

    if (visibility === 'self') {
      return res.json({
        success: true,
        data: { visibility: 'self', filterUserIds: myWecomUserIds, isAdmin: false }
      });
    }

    if (visibility === 'department') {
      // 获取当前用户所在部门的所有成员企微userId
      const deptMemberIds = [...myWecomUserIds];
      try {
        const deptRows = await AppDataSource.query(
          `SELECT DISTINCT wb.wecom_user_id
           FROM wecom_bindings wb
           INNER JOIN users u ON u.id = wb.crm_user_id
           WHERE u.department_id IN (
             SELECT department_id FROM users WHERE id = ?
           )`,
          [currentUser?.id]
        ).catch(() => []);
        for (const row of deptRows) {
          if (row.wecom_user_id && !deptMemberIds.includes(row.wecom_user_id)) {
            deptMemberIds.push(row.wecom_user_id);
          }
        }
      } catch {
        // fallback to self only
      }
      return res.json({
        success: true,
        data: { visibility: 'department', filterUserIds: deptMemberIds, isAdmin: false }
      });
    }

    res.json({ success: true, data: { visibility, filterUserIds: null, isAdmin: false } });
  } catch (error: any) {
    log.error('[Wecom] Get visibility scope error:', error.message);
    res.status(500).json({ success: false, message: '获取可见性范围失败' });
  }
});

// ==================== 刷新授权状态（主动检查企微端授权情况） ====================

/**
 * 刷新会话存档授权状态
 * 检查企微端是否已完成：应用授权、数据与智能专区权限、席位购买
 * 如果条件满足，自动激活会话存档
 */
router.post('/chat-archive/refresh-auth-status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(configId), isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在' });

    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const { AppDataSource } = await import('../../config/database');
    const tenantId = getCurrentTenantId();

    let hasSecret = false;
    let dataApiAuthorized = false;
    let vasPurchased = false;
    let maxUsers = 0;
    let usedUsers = 0;

    // 1. 检查应用授权（第三方应用有permanent_code即为已授权）
    if (config.authType === 'third_party') {
      hasSecret = !!config.permanentCode;
    } else {
      hasSecret = !!config.chatArchiveSecret;
    }

    // 2. 检查数据与智能专区权限 - 尝试调用企微API验证
    if (hasSecret) {
      try {
        const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
        const accessToken = await WecomTokenService.getAccessToken(config);
        // 尝试获取 permit_user_list（会话存档已开通的成员列表）
        const axios = (await import('axios')).default;
        const permitRes = await axios.post(
          `https://qyapi.weixin.qq.com/cgi-bin/msgaudit/get_permit_user_list?access_token=${accessToken}`,
          {}
        );
        if (permitRes.data?.errcode === 0) {
          dataApiAuthorized = true;
          const permitUserIds = permitRes.data?.ids || [];
          log.info(`[ArchiveSettings] 企微已授权会话存档，permit_user数量: ${permitUserIds.length}`);

          // 更新config的dataApiStatus
          config.dataApiStatus = 1;
          await configRepo.save(config);
        } else if (permitRes.data?.errcode === 301053) {
          // 301053 = 未开通会话存档
          log.info('[ArchiveSettings] 企微未开通会话存档功能(301053)');
          dataApiAuthorized = false;
        } else {
          log.warn(`[ArchiveSettings] get_permit_user_list 返回: errcode=${permitRes.data?.errcode}, errmsg=${permitRes.data?.errmsg}`);
          // 某些错误码也表示已授权但其他问题
          if (permitRes.data?.errcode === 60011 || permitRes.data?.errcode === 60020) {
            // 60011=无权限, 60020=接口不可用 - 可能是第三方应用需要通过专区访问
            dataApiAuthorized = false;
          }
        }
      } catch (e: any) {
        log.warn('[ArchiveSettings] 检查数据与智能专区权限失败:', e.message);
      }
    }

    // 3. 检查是否已购买VAS（从tenant表和payment_orders表检查）
    if (tenantId) {
      try {
        const tenantRows = await AppDataSource.query(
          'SELECT wecom_chat_archive_auth FROM tenants WHERE id = ?', [tenantId]
        );
        vasPurchased = !!(tenantRows[0]?.wecom_chat_archive_auth);

        // 如果tenant表没标记，检查是否有已支付的VAS订单
        if (!vasPurchased) {
          const orderRows = await AppDataSource.query(
            `SELECT id FROM payment_orders WHERE tenant_id = ? AND package_id = 'vas_chat_archive' AND status = 'paid' ORDER BY paid_at DESC LIMIT 1`,
            [tenantId]
          );
          if (orderRows.length > 0) {
            vasPurchased = true;
            // 补充更新tenant表
            await AppDataSource.query('UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]);
          }
        }
      } catch (e: any) {
        log.warn('[ArchiveSettings] 检查VAS购买状态失败:', e.message);
      }
    }

    // 4. 获取席位信息
    const settingRepo = getTenantRepo(WecomArchiveSetting);
    let setting = await settingRepo.findOne({ where: { wecomConfigId: parseInt(configId) } });
    if (setting) {
      maxUsers = setting.maxUsers || 0;
      usedUsers = setting.usedUsers || 0;
    }

    // 5. 如果所有条件满足，自动激活
    const activated = hasSecret && (dataApiAuthorized || vasPurchased);
    if (activated && setting) {
      if (setting.status !== 'active') {
        setting.status = 'active';
        await settingRepo.save(setting);
        log.info(`[ArchiveSettings] 会话存档已自动激活: configId=${configId}, tenantId=${tenantId}`);
      }
    }

    res.json({
      success: true,
      data: {
        activated,
        hasSecret,
        dataApiAuthorized,
        vasPurchased,
        maxUsers,
        usedUsers,
        configId: parseInt(configId)
      }
    });
  } catch (error: any) {
    log.error('[ArchiveSettings] Refresh auth status error:', error.message);
    res.status(500).json({ success: false, message: '刷新授权状态失败: ' + error.message });
  }
});

export default router;

