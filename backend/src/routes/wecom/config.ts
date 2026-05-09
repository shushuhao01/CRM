/**
 * 企微配置管理路由
 * 包含：配置CRUD、连接测试、通讯录部门/成员
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomDepartmentMapping } from '../../entities/WecomDepartmentMapping';
import { WecomUserBinding } from '../../entities/WecomUserBinding';
import WecomApiService from '../../services/WecomApiService';
import { getCurrentTenantId } from '../../utils/tenantContext';
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

    let result: { success: boolean; message: string };

    if (config.authType === 'third_party') {
      // 第三方授权模式：使用 suite_access_token + permanent_code 获取企业token
      try {
        const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
        const token = await WecomTokenService.getAccessToken(config, 'corp');
        if (token) {
          result = { success: true, message: '第三方授权连接正常' };
        } else {
          result = { success: false, message: '获取企业Token失败' };
        }
      } catch (e: any) {
        log.error('[Wecom] Third-party test connection error:', e.message);
        let hint = e.message || '连接失败';
        if (hint.includes('suite_ticket')) {
          hint = '尚未收到suite_ticket推送，请确认服务商应用回调URL配置正确，等待企微推送（约10分钟一次）';
        } else if (hint.includes('permanent_code') || hint.includes('永久授权码')) {
          hint = '永久授权码缺失，请重新进行扫码授权';
        } else if (hint.includes('Suite配置')) {
          hint = '服务商应用配置不完整，请检查SuiteID/SuiteSecret/SuiteTicket';
        }
        result = { success: false, message: hint };
      }
    } else {
      // 自建应用模式：使用 corpId + corpSecret
      result = await WecomApiService.testConnection(config.corpId, config.corpSecret);
    }

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
 * 优先使用本地同步数据（wecom_department_mappings），确保第三方授权模式下也能显示名称
 */
router.get('/configs/:id/departments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const tenantId = getCurrentTenantId();
    log.info('[Wecom] Getting departments for config:', configId);

    // 优先从本地数据库获取（已同步的部门数据带有名称）
    const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    const localDepts = await deptRepo.find({
      where: { wecomConfigId: configId, ...(tenantId ? { tenantId } : {}) },
      order: { wecomDeptId: 'ASC' }
    });

    // 检查本地数据是否有有效名称（非null、非空、非与ID同值）
    const hasValidNames = localDepts.length > 0 && localDepts.some(d =>
      d.wecomDeptName && d.wecomDeptName.trim() && d.wecomDeptName.trim() !== String(d.wecomDeptId)
    );

    if (localDepts.length > 0 && hasValidNames) {
      log.info('[Wecom] Using local departments with names:', localDepts.length);
      const departments = localDepts.map(d => ({
        id: d.wecomDeptId,
        name: d.wecomDeptName || `部门${d.wecomDeptId}`,
        parentid: d.wecomParentId || 0,
        order: 0,
        _source: 'local'
      }));
      return res.json({ success: true, data: departments });
    }

    // 本地无数据 或 本地数据名称缺失 → 从API获取
    try {
      const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');
      const apiDepts = await WecomApiService.getDepartmentList(accessToken);
      log.info('[Wecom] Got departments from API:', apiDepts.length);

      // 如果本地有数据但缺名称，用API数据回填本地
      if (localDepts.length > 0 && !hasValidNames && apiDepts.length > 0) {
        log.info('[Wecom] Enriching local departments with names from API...');
        for (const apiDept of apiDepts) {
          const local = localDepts.find(d => d.wecomDeptId === apiDept.id);
          if (local && apiDept.name && String(apiDept.name).trim() !== '' && String(apiDept.name).trim() !== String(apiDept.id)) {
            local.wecomDeptName = String(apiDept.name).trim();
            local.wecomParentId = apiDept.parentid || 0;
            await deptRepo.save(local).catch(() => {});
          }
        }
        // 返回合并后的数据
        const departments = localDepts.map(d => {
          const apiMatch = apiDepts.find((a: any) => a.id === d.wecomDeptId);
          return {
            id: d.wecomDeptId,
            name: d.wecomDeptName || apiMatch?.name || `部门${d.wecomDeptId}`,
            parentid: d.wecomParentId || 0,
            order: 0,
            _source: 'enriched'
          };
        });
        return res.json({ success: true, data: departments });
      }

      res.json({ success: true, data: apiDepts });
    } catch (apiError: any) {
      // API也失败时，返回本地数据（带ID作为名称fallback）
      if (localDepts.length > 0) {
        log.warn('[Wecom] API failed, returning local departments with ID fallback');
        const departments = localDepts.map(d => ({
          id: d.wecomDeptId,
          name: d.wecomDeptName || `部门${d.wecomDeptId}`,
          parentid: d.wecomParentId || 0,
          order: 0,
          _source: 'local-fallback'
        }));
        return res.json({ success: true, data: departments });
      }
      throw apiError;
    }
  } catch (error: any) {
    log.error('[Wecom] Get departments error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '获取部门列表失败' });
  }
});

/**
 * 获取企微通讯录成员列表
 * 优先使用本地同步数据（wecom_user_bindings），确保第三方授权模式下也能显示姓名
 */
router.get('/configs/:id/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const departmentId = parseInt(req.query.departmentId as string) || 1;
    const fetchChild = req.query.fetchChild === 'true';
    const tenantId = getCurrentTenantId();

    log.info('[Wecom] Getting users for config:', configId, 'department:', departmentId);

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });

    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    // 优先从本地数据库获取（已同步的成员数据带有姓名）
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const qb = bindingRepo.createQueryBuilder('b')
      .where('b.wecom_config_id = :configId', { configId });

    if (tenantId) {
      qb.andWhere('b.tenant_id = :tenantId', { tenantId });
    }

    if (!fetchChild) {
      // 精确匹配单个部门
      qb.andWhere(
        '(b.wecom_department_ids = :deptId OR b.wecom_department_ids LIKE :startWith OR b.wecom_department_ids LIKE :endWith OR b.wecom_department_ids LIKE :middle)',
        {
          deptId: String(departmentId),
          startWith: `${departmentId},%`,
          endWith: `%,${departmentId}`,
          middle: `%,${departmentId},%`
        }
      );
    }

    qb.orderBy('b.wecom_user_name', 'ASC');
    const localBindings = await qb.getMany();

    // 检查本地数据是否有有效姓名（非null、非空、非类似userid的长字符串）
    const hasValidUserNames = localBindings.length > 0 && localBindings.some(b =>
      b.wecomUserName && b.wecomUserName.trim() && b.wecomUserName !== b.wecomUserId
    );

    if (localBindings.length > 0 && hasValidUserNames) {
      log.info('[Wecom] Using local users with names:', localBindings.length);
      const users = localBindings.map(b => ({
        userid: b.wecomUserId,
        name: b.wecomUserName || b.wecomUserId,
        department: b.wecomDepartmentIds ? b.wecomDepartmentIds.split(',').map(Number).filter(n => n > 0) : [],
        avatar: b.wecomAvatar || '',
        status: b.isEnabled ? 1 : 0,
        _source: 'local'
      }));
      return res.json({ success: true, data: users });
    }

    // 本地无数据 或 本地名称缺失 → 从API获取
    try {
      if (config.authType !== 'third_party' && !config.contactSecret) {
        // 自建应用无通讯录Secret → 返回本地数据（即使名称缺失）
        if (localBindings.length > 0) {
          const users = localBindings.map(b => ({
            userid: b.wecomUserId,
            name: b.wecomUserName || b.wecomUserId,
            department: b.wecomDepartmentIds ? b.wecomDepartmentIds.split(',').map(Number).filter(n => n > 0) : [],
            avatar: b.wecomAvatar || '',
            status: b.isEnabled ? 1 : 0,
            _source: 'local-no-secret'
          }));
          return res.json({ success: true, data: users });
        }
        return res.status(400).json({
          success: false,
          message: '未配置通讯录同步Secret，请在企微配置中填写通讯录Secret。请先执行「同步通讯录」操作。'
        });
      }

      const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');
      const apiUsers = await WecomApiService.getDepartmentUsers(accessToken, departmentId, fetchChild);
      log.info('[Wecom] Got users from API:', apiUsers.length);

      // 如果本地有数据但缺名称，用API数据回填本地
      if (localBindings.length > 0 && !hasValidUserNames && apiUsers.length > 0) {
        log.info('[Wecom] Enriching local users with names from API...');
        const bindingRepo2 = AppDataSource.getRepository(WecomUserBinding);
        for (const apiUser of apiUsers) {
          const local = localBindings.find(b => b.wecomUserId === apiUser.userid);
          if (local && apiUser.name && apiUser.name !== apiUser.userid) {
            local.wecomUserName = apiUser.name;
            local.wecomAvatar = apiUser.avatar || local.wecomAvatar;
            await bindingRepo2.save(local).catch(() => {});
          }
        }
        // 返回合并数据
        const users = localBindings.map(b => {
          const apiMatch = apiUsers.find((a: any) => a.userid === b.wecomUserId);
          return {
            userid: b.wecomUserId,
            name: b.wecomUserName || apiMatch?.name || b.wecomUserId,
            department: b.wecomDepartmentIds ? b.wecomDepartmentIds.split(',').map(Number).filter(n => n > 0) : [],
            avatar: b.wecomAvatar || apiMatch?.avatar || '',
            status: b.isEnabled ? 1 : 0,
            _source: 'enriched'
          };
        });
        return res.json({ success: true, data: users });
      }

      res.json({ success: true, data: apiUsers });
    } catch (apiError: any) {
      // API失败时返回本地数据
      if (localBindings.length > 0) {
        log.warn('[Wecom] API failed, returning local users with ID fallback');
        const users = localBindings.map(b => ({
          userid: b.wecomUserId,
          name: b.wecomUserName || b.wecomUserId,
          department: b.wecomDepartmentIds ? b.wecomDepartmentIds.split(',').map(Number).filter(n => n > 0) : [],
          avatar: b.wecomAvatar || '',
          status: b.isEnabled ? 1 : 0,
          _source: 'local-fallback'
        }));
        return res.json({ success: true, data: users });
      }
      throw apiError;
    }
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
 * 同步通讯录（部门+成员）- 从企业微信API实时拉取并持久化到本地
 */
router.post('/configs/:id/sync-contacts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const tenantId = getCurrentTenantId();
    log.info('[Wecom] Syncing contacts for config:', configId);

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }
    if (config.authType !== 'third_party' && !config.contactSecret) {
      return res.status(400).json({ success: false, message: '未配置通讯录Secret' });
    }

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');

    // 1. 同步部门
    const departments = await WecomApiService.getDepartmentList(accessToken);
    log.info('[Wecom] Synced departments:', departments.length);

    // 持久化部门到本地
    const deptRepo = AppDataSource.getRepository(WecomDepartmentMapping);
    let deptCreated = 0, deptUpdated = 0;
    for (const dept of departments) {
      let mapping = await deptRepo.findOne({
        where: { wecomConfigId: configId, wecomDeptId: dept.id, ...(tenantId ? { tenantId } : {}) }
      });
      // 仅当 API 名称“可信”（非空、非ID同值）才覆盖
      const apiDeptNameValid = dept?.name !== null && dept?.name !== undefined
        && String(dept.name).trim() !== ''
        && String(dept.name).trim() !== String(dept.id);
      if (mapping) {
        if (apiDeptNameValid) mapping.wecomDeptName = String(dept.name).trim();
        else if (mapping.wecomDeptName && String(mapping.wecomDeptName).trim() === String(dept.id)) {
          mapping.wecomDeptName = '';
        }
        mapping.wecomParentId = dept.parentid || 0;
        mapping.lastSyncTime = new Date();
        deptUpdated++;
      } else {
        mapping = deptRepo.create({
          tenantId: tenantId || config.tenantId,
          wecomConfigId: configId,
          wecomDeptId: dept.id,
          wecomDeptName: apiDeptNameValid ? String(dept.name).trim() : '',
          wecomParentId: dept.parentid || 0,
          memberCount: 0,
          lastSyncTime: new Date()
        });
        deptCreated++;
      }
      await deptRepo.save(mapping);
    }

    // 2. 同步根部门下所有成员
    const users = await WecomApiService.getDepartmentUsers(accessToken, 1, true);
    log.info('[Wecom] Synced users:', users.length);

    // 持久化成员到本地
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    let userCreated = 0, userUpdated = 0;
    const deptMemberCount = new Map<number, number>();

    for (const user of users) {
      const wecomUserId = user.userid;
      const deptIds = (user.department || []).join(',');

      for (const dId of (user.department || [])) {
        deptMemberCount.set(dId, (deptMemberCount.get(dId) || 0) + 1);
      }

      let binding = await bindingRepo.findOne({
        where: { wecomConfigId: configId, wecomUserId, ...(tenantId ? { tenantId } : {}) }
      });

      const apiUserNameValid = user?.name !== null && user?.name !== undefined
        && String(user.name).trim() !== ''
        && String(user.name).trim() !== String(wecomUserId);
      if (binding) {
        if (apiUserNameValid) binding.wecomUserName = String(user.name).trim();
        else if (binding.wecomUserName && String(binding.wecomUserName).trim() === String(wecomUserId)) {
          binding.wecomUserName = '';
        }
        binding.wecomAvatar = user.avatar || binding.wecomAvatar;
        binding.wecomDepartmentIds = deptIds;
        binding.isEnabled = user.status === 1;
        userUpdated++;
      } else {
        binding = bindingRepo.create({
          tenantId: tenantId || config.tenantId,
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
        userCreated++;
      }
      await bindingRepo.save(binding);
    }

    // 更新部门成员计数
    for (const [deptId, count] of deptMemberCount) {
      await deptRepo.update(
        { wecomConfigId: configId, wecomDeptId: deptId, ...(tenantId ? { tenantId } : {}) },
        { memberCount: count }
      );
    }

    res.json({
      success: true,
      message: `同步完成：${departments.length} 个部门（新增${deptCreated}/更新${deptUpdated}），${users.length} 个成员（新增${userCreated}/更新${userUpdated}）`,
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
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, 'corp');
            if (token) {
              const modeLabel = config.authType === 'third_party' ? '第三方授权' : '自建应用';
              detail = `Token获取成功(${modeLabel}模式)，有效期2小时 (${token.substring(0, 8)}...)`;
              status = 'ok';
            } else {
              detail = config.authType === 'third_party'
                ? 'Token获取失败，请检查服务商应用配置(SuiteID/SuiteSecret/SuiteTicket)'
                : 'AccessToken获取失败，请检查CorpID和应用Secret是否正确';
              status = 'fail';
            }
          } catch (tokenErr: any) {
            status = 'fail';
            let msg = tokenErr.message || '未知错误';
            if (config.authType === 'third_party') {
              if (msg.includes('suite_ticket')) {
                msg = '尚未收到suite_ticket推送，请确认回调URL正确配置，等待企微推送(约10分钟一次)';
              } else if (msg.includes('Suite配置')) {
                msg = '服务商应用配置不完整，请在数据看板→企微授权→服务商应用中检查配置';
              } else if (msg.includes('permanent_code') || msg.includes('永久授权码')) {
                msg = '永久授权码缺失或无效，请重新扫码授权';
              }
              detail = `第三方授权Token获取失败: ${msg}`;
            } else {
              detail = `AccessToken获取失败: ${msg}`;
            }
          }
          break;
        }
        case 'address': {
          if (config.authType !== 'third_party' && !config.contactSecret) { status = 'none'; detail = '未配置通讯录Secret，请在Secret管理中配置'; break; }
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, config.authType === 'third_party' ? 'corp' : 'contact');
            if (!token) { status = 'fail'; detail = config.authType === 'third_party' ? '通讯录Token获取失败(第三方授权)，请检查授权范围是否包含通讯录权限' : '通讯录Token获取失败，Secret可能无效'; break; }
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
            const token = await WecomApiService.getAccessTokenByConfigId(configId, config.authType === 'third_party' ? 'corp' : 'external');
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
            const token = await WecomApiService.getAccessTokenByConfigId(configId, config.authType === 'third_party' ? 'corp' : 'external');
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
            const token = await WecomApiService.getAccessTokenByConfigId(configId, config.authType === 'third_party' ? 'corp' : 'external');
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
          if (config.authType !== 'third_party' && !config.chatArchiveSecret) { status = 'none'; detail = '未配置会话存档Secret，需企业先开通会话存档功能'; break; }
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, config.authType === 'third_party' ? 'corp' : 'chat');
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
          if (config.authType !== 'third_party' && !config.paymentSecret) {
            status = 'none'; detail = '未配置对外收款Secret，请在企微后台「应用管理→对外收款」中获取Secret后配置'; break;
          }
          try {
            const token = await WecomApiService.getAccessTokenByConfigId(configId, config.authType === 'third_party' ? 'corp' : 'payment');
            const axios = (await import('axios')).default;
            const now = Math.floor(Date.now() / 1000);
            const verifyRes = await axios.post(
              `https://qyapi.weixin.qq.com/cgi-bin/externalpay/get_bill_list?access_token=${token}`,
              { begin_time: now - 3600, end_time: now, limit: 1 }
            );
            const ec = verifyRes.data?.errcode;
            if (ec === 0 || ec === undefined) {
              status = 'ok'; detail = '对外收款API可用，权限正常';
            } else if (ec === 48002 || ec === 60011 || ec === 60020) {
              status = 'fail'; detail = `收款权限不足(${ec})，请确认${config.authType === 'third_party' ? '授权时已勾选「对外收款」权限' : 'Secret对应的应用已开通「对外收款」'}`;
            } else {
              status = 'fail'; detail = `收款API异常: ${verifyRes.data?.errmsg || '未知错误'} (${ec})`;
            }
          } catch (e: any) {
            status = 'fail'; detail = `对外收款检测失败: ${e.message || '未知错误'}`;
          }
          break;
        }
        case 'callback': {
          if (config.authType === 'third_party') {
            // 第三方授权模式：回调由服务商应用统一接收，无需企业单独配置
            status = 'ok'; detail = '第三方授权模式，回调由服务商应用统一接收（管理后台配置）';
          } else if (config.callbackToken && config.encodingAesKey) {
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
 * 获取功能授权列表 + 使用量卡片数据
 * 根据authType区分自建/第三方模式，返回真实授权范围和使用量
 */
router.get('/configs/:id/features', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    // 解析第三方授权范围
    const authorizedPrivileges: string[] = [];
    if (config.authType === 'third_party' && config.authScope) {
      try {
        const authScopeData = JSON.parse(config.authScope);
        // 提取已授权的权限列表
        const agents = authScopeData?.agent || [];
        for (const agent of agents) {
          const privs = agent.privilege || {};
          if (privs.allow_party?.length > 0 || privs.allow_user?.length > 0 || privs.allow_tag?.length > 0) {
            authorizedPrivileges.push('通讯录');
          }
          if (privs.extra_party?.length > 0 || privs.extra_user?.length > 0 || privs.extra_tag?.length > 0) {
            authorizedPrivileges.push('客户联系');
          }
          // 检查level（如有）
          if (agent.appid || agent.agentid) {
            authorizedPrivileges.push('应用消息');
          }
        }
      } catch { /* ignore parse error */ }
    }

    const isConnected = config.connectionStatus === 'connected';
    const isThirdParty = config.authType === 'third_party';

    // 查询实际使用量数据
    let acquisitionLinkCount = 0;
    const archiveUserCount = config.vasUserCount || 0;
    let aiUsageCount = 0;
    const tenantId = (req as any).tenantId;

    try {
      // 获客助手：统计获客链接数量
      const linkRows = await configRepo.manager.query(
        'SELECT COUNT(*) as cnt FROM wecom_acquisition_links WHERE tenant_id = ? AND is_deleted = 0',
        [tenantId]
      ).catch(() => [{ cnt: 0 }]);
      acquisitionLinkCount = parseInt(linkRows[0]?.cnt || 0);
    } catch { /* table may not exist */ }

    try {
      // AI助手：统计AI调用次数
      const aiRows = await configRepo.manager.query(
        'SELECT COUNT(*) as cnt FROM wecom_ai_logs WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        [tenantId]
      ).catch(() => [{ cnt: 0 }]);
      aiUsageCount = parseInt(aiRows[0]?.cnt || 0);
    } catch { /* table may not exist */ }

    // 功能列表
    const features = [
      {
        key: 'basic', name: '基础功能', desc: '通讯录/客户/群/活码/侧边栏', icon: '📦',
        status: isConnected ? 'active' : 'inactive',
        expireDate: '永久', usage: null,
        authSource: isThirdParty ? '第三方授权自动获取' : '自建应用配置'
      },
      {
        key: 'acquisition', name: '获客助手', desc: '获客链接/渠道统计/客户画像', icon: '🎯',
        status: isConnected ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : '永久',
        usage: { used: acquisitionLinkCount, max: 1000, percent: Math.min(100, Math.round((acquisitionLinkCount / 1000) * 100)) },
        authSource: isThirdParty ? '第三方授权自动获取' : '客户联系Secret'
      },
      {
        key: 'chat_archive', name: '会话存档', desc: '聊天记录/敏感词/质检', icon: '📝',
        status: config.vasChatArchive ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : null,
        usage: config.vasChatArchive ? { used: archiveUserCount, max: 70, percent: Math.min(100, Math.round((archiveUserCount / 70) * 100)) } : null,
        authSource: config.vasChatArchive ? (isThirdParty ? '第三方授权+增值开通' : '会话存档Secret') : '未开通'
      },
      {
        key: 'ai_assistant', name: 'AI助手', desc: 'AI质检/智能回复/客户分析', icon: '🤖',
        status: isConnected ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : '永久',
        usage: { used: aiUsageCount, max: 10000, percent: Math.min(100, Math.round((aiUsageCount / 10000) * 100)) },
        authSource: '平台提供'
      },
      {
        key: 'payment', name: '对外收款', desc: '收款记录/收款统计/退款记录', icon: '💰',
        status: isConnected ? 'active' : 'inactive',
        expireDate: '永久', usage: null,
        authSource: isThirdParty ? '需企业在企微后台单独开通' : '对外收款Secret'
      },
      {
        key: 'kf', name: '微信客服', desc: '微信客服消息/会话管理', icon: '💬',
        status: 'inactive', expireDate: null, usage: null,
        authSource: '未开通'
      }
    ];

    // 使用量统计卡片数据（独立区域展示）
    const usageCards = [
      {
        key: 'wecom_package', title: '企微套餐',
        icon: '📊', color: '#4C6EF5',
        purchased: isConnected ? '已授权' : '未授权',
        authorized: isConnected ? 1 : 0,
        authorizedMax: 1,
        status: isConnected ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : '永久',
        detail: isThirdParty ? `第三方授权企业: ${config.name || config.corpId}` : `自建应用: ${config.name || config.corpId}`
      },
      {
        key: 'chat_archive_usage', title: '会话存档',
        icon: '📝', color: '#10B981',
        purchased: config.vasChatArchive ? `${archiveUserCount}人` : '未购买',
        authorized: archiveUserCount,
        authorizedMax: 70,
        status: config.vasChatArchive ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : null,
        detail: config.vasChatArchive ? `已开通${archiveUserCount}人存档，上限70人` : '需在企微后台开通会话存档功能'
      },
      {
        key: 'acquisition_usage', title: '获客助手',
        icon: '🎯', color: '#F59E0B',
        purchased: isConnected ? '已开通' : '未开通',
        authorized: acquisitionLinkCount,
        authorizedMax: 1000,
        status: isConnected ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : '永久',
        detail: `已创建${acquisitionLinkCount}个获客链接，上限1000个`
      },
      {
        key: 'ai_assistant_usage', title: 'AI助手',
        icon: '🤖', color: '#8B5CF6',
        purchased: isConnected ? '已开通' : '未开通',
        authorized: aiUsageCount,
        authorizedMax: 10000,
        status: isConnected ? 'active' : 'inactive',
        expireDate: config.vasExpireDate ? config.vasExpireDate.toISOString().split('T')[0] : '永久',
        detail: `近30天已调用${aiUsageCount}次，月上限10000次`
      }
    ];

    res.json({
      success: true,
      data: features,
      usageCards,
      authInfo: {
        authType: config.authType,
        authMode: isThirdParty ? '第三方服务商应用授权' : '自建应用配置',
        authorizedPrivileges: isThirdParty ? authorizedPrivileges : [],
        suiteId: isThirdParty ? config.suiteId : null,
        hasPermanentCode: !!config.permanentCode,
      }
    });
  } catch (error: any) {
    log.error('[Wecom Features] Error:', error.message);
    res.status(500).json({ success: false, message: '获取功能列表失败' });
  }
});

export default router;

