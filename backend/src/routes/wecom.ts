/**
 * 企业微信管理路由
 */
import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { WecomConfig } from '../entities/WecomConfig';
import { WecomUserBinding } from '../entities/WecomUserBinding';
import { WecomCustomer } from '../entities/WecomCustomer';
import { WecomAcquisitionLink } from '../entities/WecomAcquisitionLink';
import { WecomServiceAccount } from '../entities/WecomServiceAccount';
import { WecomPaymentRecord } from '../entities/WecomPaymentRecord';
import WecomApiService from '../services/WecomApiService';

const router = Router();

// ==================== 企微回调接口 ====================

/**
 * 企微回调验证（GET请求）
 * 企业微信服务器会发送GET请求来验证URL有效性
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce, echostr } = req.query;
    console.log('[Wecom Callback] Verify request:', { msg_signature, timestamp, nonce, echostr: echostr?.toString().substring(0, 20) + '...' });

    if (!msg_signature || !timestamp || !nonce || !echostr) {
      return res.status(400).send('Missing parameters');
    }

    // 获取所有启用的配置，尝试验证
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const configs = await configRepo.find({ where: { isEnabled: true } });

    for (const config of configs) {
      if (!config.callbackToken || !config.encodingAesKey) continue;

      // 验证签名
      const token = config.callbackToken;
      const arr = [token, timestamp as string, nonce as string, echostr as string].sort();
      const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');

      if (sha1 === msg_signature) {
        // 解密 echostr
        try {
          const aesKey = Buffer.from(config.encodingAesKey + '=', 'base64');
          const iv = aesKey.slice(0, 16);
          const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
          decipher.setAutoPadding(false);
          let decrypted = Buffer.concat([decipher.update(Buffer.from(echostr as string, 'base64')), decipher.final()]);

          // 去除PKCS7填充
          const pad = decrypted[decrypted.length - 1];
          decrypted = decrypted.slice(0, decrypted.length - pad);

          // 解析内容：前16字节随机字符串 + 4字节消息长度 + 消息内容 + CorpID
          const msgLen = decrypted.readUInt32BE(16);
          const msg = decrypted.slice(20, 20 + msgLen).toString('utf8');

          console.log('[Wecom Callback] Verify success, echostr:', msg);
          return res.send(msg);
        } catch (e) {
          console.error('[Wecom Callback] Decrypt error:', e);
        }
      }
    }

    console.log('[Wecom Callback] Verify failed - no matching config');
    res.status(403).send('Verify failed');
  } catch (error: any) {
    console.error('[Wecom Callback] Error:', error);
    res.status(500).send('Server error');
  }
});

/**
 * 企微回调消息接收（POST请求）
 * 接收企业微信推送的事件消息
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce } = req.query;
    const body = req.body;
    console.log('[Wecom Callback] Message received:', { msg_signature, timestamp, nonce });

    // TODO: 解密消息并处理各类事件
    // 目前先返回成功，后续可以根据需要处理具体事件

    res.send('success');
  } catch (error: any) {
    console.error('[Wecom Callback] Error:', error);
    res.status(500).send('Server error');
  }
});

// ==================== 企微配置管理 ====================

/**
 * 获取企微配置列表
 */
router.get('/configs', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    console.log('[Wecom] Fetching configs...');
    const configs = await configRepo.find({ order: { createdAt: 'DESC' } });
    console.log('[Wecom] Found configs:', configs.length);

    // 隐藏敏感信息
    const safeConfigs = configs.map(c => ({
      ...c,
      corpSecret: c.corpSecret ? '******' : null,
      contactSecret: c.contactSecret ? '******' : null,
      chatArchiveSecret: c.chatArchiveSecret ? '******' : null,
      chatArchivePrivateKey: c.chatArchivePrivateKey ? '******' : null,
      encodingAesKey: c.encodingAesKey ? '******' : null
    }));

    res.json({ success: true, data: safeConfigs });
  } catch (error: any) {
    console.error('[Wecom] Get configs error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取配置列表失败' });
  }
});

/**
 * 获取单个企微配置
 */
router.get('/configs/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    // 隐藏敏感信息
    const safeConfig = {
      ...config,
      corpSecret: config.corpSecret ? '******' : null,
      contactSecret: config.contactSecret ? '******' : null,
      chatArchiveSecret: config.chatArchiveSecret ? '******' : null,
      chatArchivePrivateKey: config.chatArchivePrivateKey ? '******' : null,
      encodingAesKey: config.encodingAesKey ? '******' : null
    };

    res.json({ success: true, data: safeConfig });
  } catch (error: any) {
    console.error('[Wecom] Get config error:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * 创建企微配置
 */
router.post('/configs', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, corpId, corpSecret, agentId, callbackToken, encodingAesKey, callbackUrl,
            contactSecret, chatArchiveSecret, chatArchivePrivateKey, remark } = req.body;

    if (!name || !corpId || !corpSecret) {
      return res.status(400).json({ success: false, message: '名称、企业ID和Secret为必填项' });
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);

    // 检查企业ID是否已存在
    const existing = await configRepo.findOne({ where: { corpId } });
    if (existing) {
      return res.status(400).json({ success: false, message: '该企业ID已存在' });
    }

    const currentUser = (req as any).currentUser;
    const config = configRepo.create({
      name,
      corpId,
      corpSecret,
      agentId,
      callbackToken,
      encodingAesKey,
      callbackUrl,
      contactSecret,
      chatArchiveSecret,
      chatArchivePrivateKey,
      remark,
      bindOperator: currentUser?.name || 'admin',
      bindTime: new Date(),
      connectionStatus: 'pending'
    });

    await configRepo.save(config);

    res.json({ success: true, data: config, message: '创建成功' });
  } catch (error: any) {
    console.error('[Wecom] Create config error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '创建配置失败' });
  }
});

/**
 * 更新企微配置
 */
router.put('/configs/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    const { name, corpSecret, agentId, callbackToken, encodingAesKey, callbackUrl,
            contactSecret, chatArchiveSecret, chatArchivePrivateKey, remark, isEnabled } = req.body;

    if (name) config.name = name;
    if (corpSecret && corpSecret !== '******') config.corpSecret = corpSecret;
    if (agentId !== undefined) config.agentId = agentId;
    if (callbackToken) config.callbackToken = callbackToken;
    if (encodingAesKey && encodingAesKey !== '******') config.encodingAesKey = encodingAesKey;
    if (callbackUrl) config.callbackUrl = callbackUrl;
    if (contactSecret && contactSecret !== '******') config.contactSecret = contactSecret;
    if (chatArchiveSecret && chatArchiveSecret !== '******') config.chatArchiveSecret = chatArchiveSecret;
    if (chatArchivePrivateKey && chatArchivePrivateKey !== '******') config.chatArchivePrivateKey = chatArchivePrivateKey;
    if (remark !== undefined) config.remark = remark;
    if (isEnabled !== undefined) config.isEnabled = isEnabled;

    await configRepo.save(config);

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('[Wecom] Update config error:', error);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

/**
 * 删除企微配置
 */
router.delete('/configs/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    await configRepo.remove(config);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('[Wecom] Delete config error:', error);
    res.status(500).json({ success: false, message: '删除配置失败' });
  }
});

/**
 * 测试企微配置连接
 */
router.post('/configs/:id/test', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    const result = await WecomApiService.testConnection(config.corpId, config.corpSecret);

    // 更新连接状态
    config.connectionStatus = result.success ? 'connected' : 'failed';
    config.lastError = result.success ? null : result.message;
    config.lastApiCallTime = new Date();
    config.apiCallCount += 1;
    await configRepo.save(config);

    res.json({ success: result.success, message: result.message, data: { connected: result.success } });
  } catch (error: any) {
    console.error('[Wecom] Test connection error:', error);
    res.status(500).json({ success: false, message: '测试连接失败' });
  }
});

// ==================== 企微联动（成员绑定） ====================

/**
 * 获取企微通讯录部门列表
 */
router.get('/configs/:id/departments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configId = parseInt(req.params.id);
    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId);
    const departments = await WecomApiService.getDepartmentList(accessToken);

    res.json({ success: true, data: departments });
  } catch (error: any) {
    console.error('[Wecom] Get departments error:', error);
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

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId);
    const users = await WecomApiService.getDepartmentUsers(accessToken, departmentId, fetchChild);

    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('[Wecom] Get users error:', error);
    res.status(500).json({ success: false, message: error.message || '获取成员列表失败' });
  }
});

/**
 * 获取成员绑定列表
 */
router.get('/bindings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, crmUserId } = req.query;
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);

    const where: any = {};
    if (configId) where.wecomConfigId = parseInt(configId as string);
    if (crmUserId) where.crmUserId = crmUserId;

    const bindings = await bindingRepo.find({ where, order: { createdAt: 'DESC' } });

    res.json({ success: true, data: bindings });
  } catch (error: any) {
    console.error('[Wecom] Get bindings error:', error);
    res.status(500).json({ success: false, message: '获取绑定列表失败' });
  }
});

/**
 * 创建成员绑定
 */
router.post('/bindings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { wecomConfigId, wecomUserId, wecomUserName, wecomAvatar, wecomDepartmentIds,
            crmUserId, crmUserName } = req.body;

    if (!wecomConfigId || !wecomUserId || !crmUserId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: wecomConfigId } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在' });
    }

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);

    // 检查是否已绑定
    const existing = await bindingRepo.findOne({
      where: { wecomConfigId, wecomUserId }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: '该企微成员已绑定' });
    }

    const currentUser = (req as any).currentUser;
    const binding = bindingRepo.create({
      wecomConfigId,
      corpId: config.corpId,
      wecomUserId,
      wecomUserName,
      wecomAvatar,
      wecomDepartmentIds,
      crmUserId,
      crmUserName,
      bindOperator: currentUser?.name || 'admin'
    });

    await bindingRepo.save(binding);

    res.json({ success: true, data: binding, message: '绑定成功' });
  } catch (error: any) {
    console.error('[Wecom] Create binding error:', error);
    res.status(500).json({ success: false, message: '创建绑定失败' });
  }
});

/**
 * 解除成员绑定
 */
router.delete('/bindings/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const binding = await bindingRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!binding) {
      return res.status(404).json({ success: false, message: '绑定不存在' });
    }

    await bindingRepo.remove(binding);

    res.json({ success: true, message: '解绑成功' });
  } catch (error: any) {
    console.error('[Wecom] Delete binding error:', error);
    res.status(500).json({ success: false, message: '解绑失败' });
  }
});

// ==================== 企业客户管理 ====================

/**
 * 获取客户统计数据 (放在 /customers 之前，避免路由匹配问题)
 */
router.get('/customers/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const customerRepo = AppDataSource.getRepository(WecomCustomer);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queryBuilder = customerRepo.createQueryBuilder('c');
    if (configId) {
      queryBuilder.andWhere('c.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    }

    // 今日进粉
    const todayAdd = await queryBuilder.clone()
      .andWhere('c.add_time >= :today', { today })
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    // 累计进粉
    const totalAdd = await queryBuilder.clone()
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    // 删除客户
    const deleted = await queryBuilder.clone()
      .andWhere('c.status = :status', { status: 'deleted' })
      .getCount();

    // 成交客户
    const dealt = await queryBuilder.clone()
      .andWhere('c.is_dealt = :isDealt', { isDealt: true })
      .getCount();

    res.json({
      success: true,
      data: { todayAdd, totalAdd, deleted, dealt }
    });
  } catch (error: any) {
    console.error('[Wecom] Get customer stats error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

/**
 * 获取企业客户列表
 */
router.get('/customers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, status, followUserId, keyword, page = 1, pageSize = 20 } = req.query;
    const customerRepo = AppDataSource.getRepository(WecomCustomer);

    const queryBuilder = customerRepo.createQueryBuilder('c');

    if (configId) {
      queryBuilder.andWhere('c.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    }
    if (status) {
      queryBuilder.andWhere('c.status = :status', { status });
    }
    if (followUserId) {
      queryBuilder.andWhere('c.follow_user_id = :followUserId', { followUserId });
    }
    if (keyword) {
      queryBuilder.andWhere('(c.name LIKE :keyword OR c.remark LIKE :keyword)', { keyword: `%${keyword}%` });
    }

    const total = await queryBuilder.getCount();
    const customers = await queryBuilder
      .orderBy('c.created_at', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    res.json({ success: true, data: { list: customers, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    console.error('[Wecom] Get customers error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
});

/**
 * 同步企微客户数据
 */
router.post('/customers/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) {
      return res.status(400).json({ success: false, message: '请选择企微配置' });
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    // 获取绑定的成员
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const bindings = await bindingRepo.find({ where: { wecomConfigId: configId, isEnabled: true } });

    if (bindings.length === 0) {
      return res.status(400).json({ success: false, message: '没有绑定的成员，请先在企微联动中绑定成员' });
    }

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'contact');
    const customerRepo = AppDataSource.getRepository(WecomCustomer);
    let syncCount = 0;

    for (const binding of bindings) {
      try {
        const externalUserIds = await WecomApiService.getExternalContactList(accessToken, binding.wecomUserId);

        for (const externalUserId of externalUserIds) {
          try {
            const detail = await WecomApiService.getExternalContactDetail(accessToken, externalUserId);
            const externalContact = detail.external_contact;
            const followUser = detail.follow_user?.[0];

            // 查找或创建客户记录
            let customer = await customerRepo.findOne({
              where: { wecomConfigId: configId, externalUserId }
            });

            if (!customer) {
              customer = customerRepo.create({
                wecomConfigId: configId,
                corpId: config.corpId,
                externalUserId
              });
            }

            customer.name = externalContact.name;
            customer.avatar = externalContact.avatar;
            customer.type = externalContact.type;
            customer.gender = externalContact.gender;
            customer.corpName = externalContact.corp_name;
            customer.position = externalContact.position;
            customer.followUserId = binding.wecomUserId;
            customer.followUserName = binding.wecomUserName;
            customer.remark = followUser?.remark;
            customer.description = followUser?.description;
            customer.addTime = followUser?.createtime ? new Date(followUser.createtime * 1000) : null;
            customer.addWay = followUser?.add_way;
            customer.tagIds = followUser?.tags ? JSON.stringify(followUser.tags.map((t: any) => t.tag_id)) : null;
            customer.status = 'normal';

            await customerRepo.save(customer);
            syncCount++;
          } catch (e) {
            console.error(`[Wecom] Sync customer ${externalUserId} error:`, e);
          }
        }
      } catch (e) {
        console.error(`[Wecom] Sync user ${binding.wecomUserId} customers error:`, e);
      }
    }

    res.json({ success: true, message: `同步完成，共同步 ${syncCount} 个客户` });
  } catch (error: any) {
    console.error('[Wecom] Sync customers error:', error);
    res.status(500).json({ success: false, message: error.message || '同步客户失败' });
  }
});

// ==================== 获客助手 ====================

/**
 * 获取获客链接列表
 */
router.get('/acquisition-links', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const linkRepo = AppDataSource.getRepository(WecomAcquisitionLink);

    const where: any = {};
    if (configId) where.wecomConfigId = parseInt(configId as string);

    const links = await linkRepo.find({ where, order: { createdAt: 'DESC' } });

    res.json({ success: true, data: links });
  } catch (error: any) {
    console.error('[Wecom] Get acquisition links error:', error);
    res.status(500).json({ success: false, message: '获取获客链接失败' });
  }
});

/**
 * 创建获客链接
 */
router.post('/acquisition-links', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { wecomConfigId, linkName, userIds, departmentIds, welcomeMsg, tagIds } = req.body;

    if (!wecomConfigId || !linkName || !userIds?.length) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: wecomConfigId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    // 调用企微API创建链接
    const accessToken = await WecomApiService.getAccessTokenByConfigId(wecomConfigId, 'contact');
    const linkData = await WecomApiService.createAcquisitionLink(accessToken, linkName, userIds, { departmentIds });

    const linkRepo = AppDataSource.getRepository(WecomAcquisitionLink);
    const currentUser = (req as any).currentUser;

    const link = linkRepo.create({
      wecomConfigId,
      corpId: config.corpId,
      linkId: linkData.link_id,
      linkName,
      linkUrl: linkData.link,
      welcomeMsg,
      userIds: JSON.stringify(userIds),
      departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
      tagIds: tagIds ? JSON.stringify(tagIds) : null,
      createdBy: currentUser?.name || 'admin'
    });

    await linkRepo.save(link);

    res.json({ success: true, data: link, message: '创建成功' });
  } catch (error: any) {
    console.error('[Wecom] Create acquisition link error:', error);
    res.status(500).json({ success: false, message: error.message || '创建获客链接失败' });
  }
});

// ==================== 微信客服 ====================

/**
 * 获取客服账号列表
 */
router.get('/service-accounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const accountRepo = AppDataSource.getRepository(WecomServiceAccount);

    const where: any = {};
    if (configId) where.wecomConfigId = parseInt(configId as string);

    const accounts = await accountRepo.find({ where, order: { createdAt: 'DESC' } });

    res.json({ success: true, data: accounts });
  } catch (error: any) {
    console.error('[Wecom] Get service accounts error:', error);
    res.status(500).json({ success: false, message: '获取客服账号失败' });
  }
});

/**
 * 创建客服账号
 */
router.post('/service-accounts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { wecomConfigId, name, servicerUserIds, welcomeMsg } = req.body;

    if (!wecomConfigId || !name) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: wecomConfigId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    // 调用企微API创建客服账号
    const accessToken = await WecomApiService.getAccessTokenByConfigId(wecomConfigId);
    const openKfId = await WecomApiService.createKfAccount(accessToken, name);

    const accountRepo = AppDataSource.getRepository(WecomServiceAccount);
    const currentUser = (req as any).currentUser;

    const account = accountRepo.create({
      wecomConfigId,
      corpId: config.corpId,
      openKfId,
      name,
      servicerUserIds: servicerUserIds ? JSON.stringify(servicerUserIds) : null,
      welcomeMsg,
      createdBy: currentUser?.name || 'admin'
    });

    await accountRepo.save(account);

    res.json({ success: true, data: account, message: '创建成功' });
  } catch (error: any) {
    console.error('[Wecom] Create service account error:', error);
    res.status(500).json({ success: false, message: error.message || '创建客服账号失败' });
  }
});

// ==================== 对外收款 ====================

/**
 * 获取收款记录列表
 */
router.get('/payments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, userId, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const paymentRepo = AppDataSource.getRepository(WecomPaymentRecord);

    const queryBuilder = paymentRepo.createQueryBuilder('p');

    if (configId) {
      queryBuilder.andWhere('p.wecomConfigId = :configId', { configId: parseInt(configId as string) });
    }
    if (userId) {
      queryBuilder.andWhere('p.userId = :userId', { userId });
    }
    if (status) {
      queryBuilder.andWhere('p.status = :status', { status });
    }
    if (startDate) {
      queryBuilder.andWhere('p.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('p.createdAt <= :endDate', { endDate });
    }

    const total = await queryBuilder.getCount();
    const payments = await queryBuilder
      .orderBy('p.createdAt', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    res.json({ success: true, data: { list: payments, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    console.error('[Wecom] Get payments error:', error);
    res.status(500).json({ success: false, message: '获取收款记录失败' });
  }
});

export default router;
