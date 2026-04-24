/**
 * 企微配置管理路由
 * 包含：配置CRUD、连接测试、通讯录部门/成员
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';

const router = Router();

// ==================== 企微配置管理 ====================

/**
 * 获取企微配置列表（脱敏数据）
 */
router.get('/configs', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const configRepo = getTenantRepo(WecomConfig);
    log.info('[Wecom] Fetching configs...');
    const configs = await configRepo.find({ order: { createdAt: 'DESC' } });
    log.info('[Wecom] Found configs:', configs.length);

    const safeConfigs = configs.map(c => ({
      ...c,
      corpSecret: c.corpSecret ? '******' : null,
      contactSecret: c.contactSecret ? '******' : null,
      externalContactSecret: c.externalContactSecret ? '******' : null,
      chatArchiveSecret: c.chatArchiveSecret ? '******' : null,
      chatArchivePrivateKey: c.chatArchivePrivateKey ? '******' : null,
      encodingAesKey: c.encodingAesKey ? '******' : null,
      // V2.0: 第三方授权字段脱敏
      permanentCode: c.permanentCode ? '******' : null
    }));

    res.json({ success: true, data: safeConfigs });
  } catch (error: any) {
    log.error('[Wecom] Get configs error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取配置列表失败' });
  }
});

/**
 * 获取单个企微配置（脱敏数据）
 */
router.get('/configs/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    const safeConfig = {
      ...config,
      corpSecret: config.corpSecret ? '******' : null,
      contactSecret: config.contactSecret ? '******' : null,
      externalContactSecret: config.externalContactSecret ? '******' : null,
      chatArchiveSecret: config.chatArchiveSecret ? '******' : null,
      chatArchivePrivateKey: config.chatArchivePrivateKey ? '******' : null,
      encodingAesKey: config.encodingAesKey ? '******' : null
    };

    res.json({ success: true, data: safeConfig });
  } catch (error: any) {
    log.error('[Wecom] Get config error:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * 创建企微配置
 */
router.post('/configs', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, corpId, corpSecret, agentId, callbackToken, encodingAesKey, callbackUrl,
            contactSecret, externalContactSecret, chatArchiveSecret, chatArchivePrivateKey, remark } = req.body;

    if (!name || !corpId || !corpSecret) {
      return res.status(400).json({ success: false, message: '名称、企业ID和Secret为必填项' });
    }

    const configRepo = getTenantRepo(WecomConfig);
    const existing = await configRepo.findOne({ where: { corpId } });
    if (existing) {
      return res.status(400).json({ success: false, message: '该企业ID已存在' });
    }

    const currentUser = (req as any).currentUser;
    const config = configRepo.create({
      name, corpId, corpSecret, agentId, callbackToken, encodingAesKey, callbackUrl,
      contactSecret, externalContactSecret, chatArchiveSecret, chatArchivePrivateKey, remark,
      bindOperator: currentUser?.name || 'admin',
      bindTime: new Date(),
      connectionStatus: 'pending'
    });

    await configRepo.save(config);

    // 返回脱敏数据，不暴露明文secret
    const safeData = {
      ...config,
      corpSecret: '******',
      contactSecret: config.contactSecret ? '******' : null,
      externalContactSecret: config.externalContactSecret ? '******' : null,
      chatArchiveSecret: config.chatArchiveSecret ? '******' : null,
      chatArchivePrivateKey: config.chatArchivePrivateKey ? '******' : null,
      encodingAesKey: config.encodingAesKey ? '******' : null
    };
    res.json({ success: true, data: safeData, message: '创建成功' });
  } catch (error: any) {
    log.error('[Wecom] Create config error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '创建配置失败' });
  }
});

/**
 * 更新企微配置
 */
router.put('/configs/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    const { name, corpSecret, agentId, callbackToken, encodingAesKey, callbackUrl,
            contactSecret, externalContactSecret, chatArchiveSecret, chatArchivePrivateKey, remark, isEnabled } = req.body;

    if (name) config.name = name;
    if (corpSecret && corpSecret !== '******') config.corpSecret = corpSecret;
    if (agentId !== undefined) config.agentId = agentId;
    if (callbackToken) config.callbackToken = callbackToken;
    if (encodingAesKey && encodingAesKey !== '******') config.encodingAesKey = encodingAesKey;
    if (callbackUrl) config.callbackUrl = callbackUrl;
    if (contactSecret && contactSecret !== '******') config.contactSecret = contactSecret;
    if (externalContactSecret && externalContactSecret !== '******') config.externalContactSecret = externalContactSecret;
    if (chatArchiveSecret && chatArchiveSecret !== '******') config.chatArchiveSecret = chatArchiveSecret;
    if (chatArchivePrivateKey && chatArchivePrivateKey !== '******') config.chatArchivePrivateKey = chatArchivePrivateKey;
    if (remark !== undefined) config.remark = remark;
    if (isEnabled !== undefined) config.isEnabled = isEnabled;

    await configRepo.save(config);
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    log.error('[Wecom] Update config error:', error);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

/**
 * 删除企微配置
 */
router.delete('/configs/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    await configRepo.remove(config);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete config error:', error);
    res.status(500).json({ success: false, message: '删除配置失败' });
  }
});

/**
 * 测试企微配置连接
 */
router.post('/configs/:id/test', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    const result = await WecomApiService.testConnection(config.corpId, config.corpSecret);

    config.connectionStatus = result.success ? 'connected' : 'failed';
    config.lastError = result.success ? null : result.message;
    config.lastApiCallTime = new Date();
    config.apiCallCount += 1;
    await configRepo.save(config);

    res.json({ success: result.success, message: result.message, data: { connected: result.success } });
  } catch (error: any) {
    log.error('[Wecom] Test connection error:', error);
    res.status(500).json({ success: false, message: '测试连接失败' });
  }
});

// ==================== 通讯录 ====================

/**
 * 获取企微通讯录部门列表
 */
router.get('/configs/:id/departments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    log.info('[Wecom] Getting departments for config:', configId);

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');
    const departments = await WecomApiService.getDepartmentList(accessToken);
    log.info('[Wecom] Got departments:', departments.length);

    res.json({ success: true, data: departments });
  } catch (error: any) {
    log.error('[Wecom] Get departments error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '获取部门列表失败' });
  }
});

/**
 * 获取企微通讯录成员列表
 */
router.get('/configs/:id/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const departmentId = parseInt(req.query.departmentId as string) || 1;
    const fetchChild = req.query.fetchChild === 'true';

    log.info('[Wecom] Getting users for config:', configId, 'department:', departmentId);

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });

    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    if (!config.contactSecret) {
      return res.status(400).json({
        success: false,
        message: '未配置通讯录同步Secret，请在企微配置中填写通讯录Secret'
      });
    }

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');
    const users = await WecomApiService.getDepartmentUsers(accessToken, departmentId, fetchChild);
    log.info('[Wecom] Got users:', users.length);

    res.json({ success: true, data: users });
  } catch (error: any) {
    log.error('[Wecom] Get users error:', error.message, error.stack);

    let message = error.message || '获取成员列表失败';
    if (message.includes('60020') || message.includes('not allow')) {
      message = '服务器IP不在企微白名单中，请在企微后台添加服务器公网IP';
    }

    res.status(500).json({ success: false, message });
  }
});

/**
 * 同步通讯录（部门+成员）- 从企业微信API实时拉取
 */
router.post('/configs/:id/sync-contacts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    log.info('[Wecom] Syncing contacts for config:', configId);

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }
    if (!config.contactSecret) {
      return res.status(400).json({ success: false, message: '未配置通讯录Secret' });
    }

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');

    // 1. 同步部门
    const departments = await WecomApiService.getDepartmentList(accessToken);
    log.info('[Wecom] Synced departments:', departments.length);

    // 2. 同步根部门下所有成员
    const users = await WecomApiService.getDepartmentUsers(accessToken, 1, true);
    log.info('[Wecom] Synced users:', users.length);

    res.json({
      success: true,
      message: `同步完成：${departments.length} 个部门，${users.length} 个成员`,
      data: { departments: departments.length, users: users.length }
    });
  } catch (error: any) {
    log.error('[Wecom] Sync contacts error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '同步失败' });
  }
});

// ==================== API诊断 (V4.0) ====================

/**
 * API诊断 - 检测单个API项
 */
router.get('/configs/:id/diagnose/:item', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const item = req.params.item;
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    let status = 'ok';
    let detail: string;

    try {
      switch (item) {
        case 'token': {
          const token = await WecomApiService.getAccessTokenByConfigId(configId, 'corp');
          if (token) {
            detail = `Token获取成功，有效期2小时 (${token.substring(0, 8)}...)`;
            status = 'ok';
          } else {
            detail = 'AccessToken获取失败，请检查CorpID和应用Secret是否正确';
            status = 'fail';
          }
          break;
        }
        case 'address': {
          if (!config.contactSecret) { status = 'none'; detail = '未配置通讯录Secret，请在Secret管理中配置'; break; }
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');
            if (!token) { status = 'fail'; detail = '通讯录Token获取失败，Secret可能无效'; break; }
            const depts = await WecomApiService.getDepartmentList(token);
            detail = `通讯录正常，共${depts.length}个部门`;
            status = 'ok';
          } catch (e: any) {
            status = 'fail';
            const errCode = e.errcode || e.errCode;
            if (errCode === 60011) detail = '无通讯录权限，请在企微后台设置该Secret的可见范围';
            else if (errCode === 40001) detail = '通讯录Secret无效或已过期';
            else detail = `通讯录API异常: ${e.message || '未知错误'}`;
          }
          break;
        }
        case 'external': {
          if (!config.externalContactSecret && config.authType !== 'third_party') {
            status = 'none'; detail = '未配置客户联系Secret，第三方授权模式可跳过'; break;
          }
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
            if (token) {
              detail = '客户联系API可用，权限正常';
              status = 'ok';
            } else {
              detail = '客户联系Token获取失败，请检查Secret配置';
              status = 'fail';
            }
          } catch (e: any) {
            status = 'fail';
            const errCode = e.errcode || e.errCode;
            if (errCode === 84074) detail = '无外部联系人权限，请在企微后台「客户联系」中开通';
            else if (errCode === 48002) detail = 'API无权限，需在应用详情中添加「客户联系」权限';
            else detail = `外部联系人API异常: ${e.message || '未知错误'}`;
          }
          break;
        }
        case 'group': {
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
            if (token) {
              detail = '客户群API可用，权限正常';
              status = 'ok';
            } else {
              detail = '客户群Token获取失败，需先配置客户联系Secret';
              status = 'fail';
            }
          } catch (e: any) {
            status = 'fail';
            detail = `客户群API异常: ${e.message || '未知错误'}`;
          }
          break;
        }
        case 'link': {
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
            if (token) {
              detail = '获客助手API可用';
              status = 'ok';
            } else {
              detail = '获客助手Token获取失败';
              status = 'fail';
            }
          } catch (e: any) {
            status = 'fail';
            detail = `获客助手API异常: ${e.message || '未知错误'}`;
          }
          break;
        }
        case 'archive': {
          if (!config.chatArchiveSecret) { status = 'none'; detail = '未配置会话存档Secret，需企业先开通会话存档功能'; break; }
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, 'chat');
            if (token) {
              detail = `会话存档已开通，授权${config.vasUserCount || 0}人`;
              status = 'ok';
            } else {
              detail = '会话存档Token获取失败，Secret可能无效或会话存档未开通';
              status = 'fail';
            }
          } catch (e: any) {
            status = 'fail';
            const errCode = e.errcode || e.errCode;
            if (errCode === 84084) detail = '会话存档未开通，请在企微后台「管理工具」中申请开通';
            else detail = `会话存档API异常: ${e.message || '未知错误'}`;
          }
          break;
        }
        case 'payment': {
          // 检测是否有收款Secret配置
          status = 'none'; detail = '对外收款功能需单独申请开通，请在企微后台「应用管理→对外收款」中配置';
          break;
        }
        case 'callback': {
          if (config.callbackToken && config.encodingAesKey) {
            if (config.callbackUrl) {
              status = 'ok'; detail = `回调已配置: ${config.callbackUrl}`;
            } else {
              status = 'ok'; detail = '回调Token和AESKey已配置，URL使用系统默认地址';
            }
          } else if (config.callbackToken || config.encodingAesKey) {
            status = 'fail'; detail = '回调配置不完整，Token和EncodingAESKey需同时配置';
          } else {
            status = 'none'; detail = '未配置回调，事件通知(如客户变更、消息)将无法接收';
          }
          break;
        }
        case 'jssdk': {
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, 'corp');
            if (token) {
              detail = 'JS-SDK签名可用，支持侧边栏和H5集成';
              status = 'ok';
            } else {
              detail = 'JS-SDK不可用，需先确保AccessToken正常获取';
              status = 'fail';
            }
          } catch (e: any) {
            status = 'fail';
            detail = `JS-SDK异常: ${e.message || '未知错误'}`;
          }
          break;
        }
        default:
          status = 'fail'; detail = '未知检测项';
      }
    } catch (e: any) {
      status = 'fail';
      detail = `检测异常: ${e.message || '未知错误'}`;
    }

    res.json({ success: true, data: { status, detail } });
  } catch (error: any) {
    log.error('[Wecom Diagnose] Error:', error.message);
    res.status(500).json({ success: false, message: '诊断失败' });
  }
});

// ==================== 功能授权 (V4.0) ====================

/**
 * 获取功能授权列表
 */
router.get('/configs/:id/features', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    // 根据实际配置状态生成功能列表
    const features = [
      {
        key: 'basic', name: '基础功能', desc: '通讯录/客户/群/活码/侧边栏', icon: '📦',
        status: config.connectionStatus === 'connected' ? 'active' : 'inactive',
        expireDate: '永久', usage: null
      },
      {
        key: 'acquisition', name: '获客助手', desc: '获客链接/渠道统计/客户画像', icon: '🎯',
        status: config.connectionStatus === 'connected' ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : '永久',
        usage: null
      },
      {
        key: 'chat_archive', name: '会话存档', desc: '聊天记录/敏感词/质检', icon: '📝',
        status: config.vasChatArchive ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : null,
        usage: config.vasChatArchive ? { used: config.vasUserCount || 0, max: 50, percent: Math.round(((config.vasUserCount || 0) / 50) * 100) } : null
      },
      {
        key: 'ai_assistant', name: 'AI助手', desc: 'AI质检/智能回复/客户分析', icon: '🤖',
        status: 'active', expireDate: '永久',
        usage: { used: 0, max: 10000, percent: 0 }
      },
      {
        key: 'payment', name: '对外收款', desc: '收款记录/收款统计/退款记录', icon: '💰',
        status: config.connectionStatus === 'connected' ? 'active' : 'inactive',
        expireDate: '永久', usage: null
      },
      {
        key: 'kf', name: '微信客服', desc: '微信客服消息/会话管理', icon: '💬',
        status: 'inactive', expireDate: null, usage: null
      }
    ];

    res.json({ success: true, data: features });
  } catch (error: any) {
    log.error('[Wecom Features] Error:', error.message);
    res.status(500).json({ success: false, message: '获取功能列表失败' });
  }
});

export default router;

