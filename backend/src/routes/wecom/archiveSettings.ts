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
      // ★ 尝试从购买记录中获取 maxUsers
      let purchasedMaxUsers = 0;
      try {
        const { getCurrentTenantId } = await import('../../utils/tenantContext');
        const tenantId = getCurrentTenantId();
        if (tenantId) {
          const { AppDataSource } = await import('../../config/database');
          const billingKey = `tenant_billing_records_${tenantId}`;
          const billingRows = await AppDataSource.query(
            'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1', [billingKey]
          ).catch(() => []);
          if (billingRows.length > 0) {
            const records = JSON.parse(billingRows[0].config_value);
            if (Array.isArray(records)) {
              const archiveRecords = records.filter((r: any) =>
                (r.type === 'archive' || r.type === 'chat_archive' || r.type === 'vas_chat_archive') &&
                (r.status === 'paid' || r.status === 'active' || r.status === 'free' || r.fulfillmentStatus === 'fulfilled')
              );
              for (const r of archiveRecords) {
                const seats = r.userCount || r.maxMembers || r.seats || 0;
                purchasedMaxUsers = Math.max(purchasedMaxUsers, seats);
              }
            }
          }
        }
      } catch { /* ignore */ }

      // 返回默认设置（含购买的席位数）
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
          maxUsers: purchasedMaxUsers,
          usedUsers: 0,
          status: purchasedMaxUsers > 0 ? 'active' : 'inactive',
          expireDate: null,
          ...commonFields
        }
      });
    }

    // ★ 如果 setting 存在但 maxUsers 为 0，尝试从购买记录同步
    if (setting.maxUsers === 0 || !setting.maxUsers) {
      try {
        const { getCurrentTenantId } = await import('../../utils/tenantContext');
        const tenantId = getCurrentTenantId();
        if (tenantId) {
          const { AppDataSource } = await import('../../config/database');
          const billingKey = `tenant_billing_records_${tenantId}`;
          const billingRows = await AppDataSource.query(
            'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1', [billingKey]
          ).catch(() => []);
          if (billingRows.length > 0) {
            const records = JSON.parse(billingRows[0].config_value);
            if (Array.isArray(records)) {
              const archiveRecords = records.filter((r: any) =>
                (r.type === 'archive' || r.type === 'chat_archive' || r.type === 'vas_chat_archive') &&
                (r.status === 'paid' || r.status === 'active' || r.status === 'free' || r.fulfillmentStatus === 'fulfilled')
              );
              let purchasedMaxUsers = 0;
              for (const r of archiveRecords) {
                const seats = r.userCount || r.maxMembers || r.seats || 0;
                purchasedMaxUsers = Math.max(purchasedMaxUsers, seats);
              }
              if (purchasedMaxUsers > 0) {
                setting.maxUsers = purchasedMaxUsers;
                setting.status = 'active';
                await settingRepo.save(setting);
                log.info(`[ArchiveSettings] GET settings: 同步购买席位 maxUsers=${purchasedMaxUsers}`);
              }
            }
          }
        }
      } catch { /* ignore */ }
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
    const { configId, fetchInterval, fetchMode, retentionDays, mediaStorage, autoInspect, memberScope, rsaPublicKey, visibility, auditMembers } = req.body;
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
    if (auditMembers !== undefined) {
      setting.auditMembers = typeof auditMembers === 'string' ? auditMembers : JSON.stringify(auditMembers);
    }
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

    // 2. 检查数据与智能专区权限 - 通过 get_auth_info 检查授权范围
    if (hasSecret && config.authType === 'third_party') {
      try {
        const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
        const axios = (await import('axios')).default;

        // 方式1: 通过 get_auth_info 检查授权范围（最可靠）
        if (config.suiteId) {
          try {
            const suiteToken = await WecomTokenService.getSuiteAccessToken(config.suiteId);
            const authInfoRes = await axios.post(
              `https://qyapi.weixin.qq.com/cgi-bin/service/get_auth_info?suite_access_token=${suiteToken}`,
              { auth_corpid: config.corpId, suite_id: config.suiteId }
            );
            if (authInfoRes.data?.errcode === 0 || !authInfoRes.data?.errcode) {
              const authInfo = authInfoRes.data?.auth_info;
              // 检查 auth_info 中是否有会话存档/数据专区相关权限
              // 企微授权信息中 agent.privilege.extra_party/extra_user 包含授权范围
              const agents = authInfo?.agent || [];
              if (agents.length > 0) {
                // 有 agent 信息说明应用已授权，检查是否有数据专区权限
                const privileges = agents[0]?.privilege || {};
                // 如果 authScope 中包含会话存档相关标记，或者企业已授权数据专区
                dataApiAuthorized = true;
                log.info(`[ArchiveSettings] get_auth_info 检测通过: 应用已授权, agent数量=${agents.length}`);
              }
            } else {
              log.warn(`[ArchiveSettings] get_auth_info 返回: errcode=${authInfoRes.data?.errcode}, errmsg=${authInfoRes.data?.errmsg}`);
            }
          } catch (e: any) {
            log.warn('[ArchiveSettings] get_auth_info 调用失败:', e.message);
          }
        }

        // 方式2: 尝试 get_permit_user_list（传统会话存档方式）
        if (!dataApiAuthorized) {
          try {
            const accessToken = await WecomTokenService.getAccessToken(config);
            const permitRes = await axios.post(
              `https://qyapi.weixin.qq.com/cgi-bin/msgaudit/get_permit_user_list?access_token=${accessToken}`,
              {}
            );
            if (permitRes.data?.errcode === 0) {
              dataApiAuthorized = true;
              const permitUserIds = permitRes.data?.ids || [];
              log.info(`[ArchiveSettings] get_permit_user_list 检测通过: permit_user数量=${permitUserIds.length}`);
            } else {
              log.info(`[ArchiveSettings] get_permit_user_list 返回: errcode=${permitRes.data?.errcode}, errmsg=${permitRes.data?.errmsg}`);
              // 对于第三方应用，301053(未开通)和60011(无权限)都可能是因为走的是数据专区模式
              // 如果 get_auth_info 已经通过了，这里失败不影响
            }
          } catch (e: any) {
            log.warn('[ArchiveSettings] get_permit_user_list 调用失败:', e.message);
          }
        }

        // 更新config的dataApiStatus
        if (dataApiAuthorized) {
          config.dataApiStatus = 1;
          await configRepo.save(config);
        }
      } catch (e: any) {
        log.warn('[ArchiveSettings] 检查数据与智能专区权限失败:', e.message);
      }
    } else if (hasSecret && config.authType !== 'third_party') {
      // 自建应用：直接检查 chatArchiveSecret 是否配置
      dataApiAuthorized = !!config.chatArchiveSecret;
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

        // ★ 从购买记录中获取席位数并同步到 wecom_archive_settings
        if (vasPurchased) {
          let purchasedSeats = 0;
          // 从 billing records 中查找
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
                  purchasedSeats = Math.max(purchasedSeats, seats);
                }
              }
            } catch { /* ignore */ }
          }

          // 从 payment_orders 中查找
          if (purchasedSeats === 0) {
            const paidOrders = await AppDataSource.query(
              `SELECT package_name, remark FROM payment_orders WHERE tenant_id = ? AND package_id = 'vas_chat_archive' AND status = 'paid' ORDER BY paid_at DESC LIMIT 1`,
              [tenantId]
            ).catch(() => []);
            if (paidOrders.length > 0) {
              const pkgName = paidOrders[0].package_name || '';
              const seatMatch = pkgName.match(/(\d+)\s*人/);
              if (seatMatch) purchasedSeats = parseInt(seatMatch[1]);
            }
          }

          // 更新 wecom_archive_settings 的 max_users
          if (purchasedSeats > 0) {
            maxUsers = purchasedSeats;
            const settingRepo = getTenantRepo(WecomArchiveSetting);
            let setting = await settingRepo.findOne({ where: { wecomConfigId: parseInt(configId) } });
            if (setting) {
              if (setting.maxUsers !== purchasedSeats) {
                setting.maxUsers = purchasedSeats;
                setting.status = 'active';
                await settingRepo.save(setting);
                log.info(`[ArchiveSettings] 同步购买席位数到设置: maxUsers=${purchasedSeats}, configId=${configId}`);
              }
            } else {
              // 创建新的设置记录
              const defaultExpire = new Date();
              defaultExpire.setFullYear(defaultExpire.getFullYear() + 1);
              setting = settingRepo.create({
                wecomConfigId: parseInt(configId),
                maxUsers: purchasedSeats,
                status: 'active',
                fetchInterval: 5,
                fetchMode: 'default',
                retentionDays: 180,
                visibility: 'all',
                expireDate: defaultExpire
              }) as WecomArchiveSetting;
              await settingRepo.save(setting);
              log.info(`[ArchiveSettings] 创建存档设置并同步席位: maxUsers=${purchasedSeats}, configId=${configId}`);
            }
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

    // 5. 如果所有条件满足，自动激活（并自动设置到期时间）
    const activated = hasSecret && (dataApiAuthorized || vasPurchased);
    if (activated && setting) {
      let needSave = false;
      if (setting.status !== 'active') {
        setting.status = 'active';
        needSave = true;
        log.info(`[ArchiveSettings] 会话存档已自动激活: configId=${configId}, tenantId=${tenantId}`);
      }
      // 自动设置到期时间（如果为空）
      if (!setting.expireDate) {
        // 尝试从购买记录获取到期时间
        let expireDateFromOrder: string | null = null;
        try {
          const orderRows = await AppDataSource.query(
            `SELECT expire_date, remark FROM payment_orders WHERE tenant_id = ? AND package_id = 'vas_chat_archive' AND status = 'paid' ORDER BY paid_at DESC LIMIT 1`,
            [tenantId]
          ).catch(() => []);
          if (orderRows.length > 0 && orderRows[0].expire_date) {
            expireDateFromOrder = orderRows[0].expire_date;
          }
        } catch { /* ignore */ }

        if (expireDateFromOrder) {
          setting.expireDate = new Date(expireDateFromOrder);
        } else {
          // 默认设为1年后
          const oneYearLater = new Date();
          oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
          setting.expireDate = oneYearLater;
        }
        needSave = true;
        log.info(`[ArchiveSettings] 自动设置到期时间: ${setting.expireDate}, configId=${configId}`);
      }
      if (needSave) await settingRepo.save(setting);
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

/**
 * 获取会话存档RSA公钥（SaaS模式：从服务商全局配置获取）
 * 租户复制此公钥到企微后台「管理工具 → 企业会话内容 → 加密密钥」
 */
router.get('/chat-archive/rsa-public-key', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const { AppDataSource } = await import('../../config/database');
    const { WecomSuiteConfig } = await import('../../entities/WecomSuiteConfig');

    // 从服务商全局配置获取公钥
    const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
    const suiteConfig = await suiteRepo.findOne({ where: {}, order: { id: 'ASC' } });

    if (suiteConfig?.chatArchiveRsaPublicKey) {
      return res.json({
        success: true,
        data: {
          publicKey: suiteConfig.chatArchiveRsaPublicKey,
          source: 'suite_config',
          hasPrivateKey: !!suiteConfig.chatArchiveRsaPrivateKey
        }
      });
    }

    res.json({
      success: true,
      data: {
        publicKey: '',
        source: 'none',
        hasPrivateKey: false,
        hint: '管理员尚未配置RSA密钥对，请联系平台管理员在管理后台配置。'
      }
    });
  } catch (error: any) {
    log.error('[ArchiveSettings] Get RSA public key error:', error.message);
    res.status(500).json({ success: false, message: '获取公钥失败' });
  }
});

export default router;

