/**
 * 物流模块 - 物流公司管理与追踪路由
 * 包含：物流公司CRUD、物流追踪查询、批量查询、刷新
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { LogisticsController } from '../../controllers/LogisticsController';
import { LogisticsCompany } from '../../entities/LogisticsCompany';
import { v4 as uuidv4 } from 'uuid';
import { orderNotificationService } from '../../services/OrderNotificationService';
import { getTenantRepo } from '../../utils/tenantRepo';
import { logisticsTraceService } from '../../services/LogisticsTraceService';

import { log } from '../../config/logger';
export function registerCompanyAndTraceRoutes(router: Router, logisticsController: LogisticsController): void {
// ========== 默认物流公司预设数据 ==========

/**
 * 默认物流公司列表（系统预设）
 * 每个租户首次访问时自动初始化这些数据
 */
const DEFAULT_LOGISTICS_COMPANIES = [
  { id: 'lc-sf',   code: 'SF',   name: '顺丰速运', shortName: '顺丰', website: 'https://www.sf-express.com', trackingUrl: 'https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/{trackingNo}', contactPhone: '95338',  status: 'active' as const, sortOrder: 1,  remark: '顺丰速运官方' },
  { id: 'lc-zto',  code: 'ZTO',  name: '中通快递', shortName: '中通', website: 'https://www.zto.com',         trackingUrl: 'https://www.zto.com/express/expressInfo.html?no={trackingNo}', contactPhone: '95311',  status: 'active' as const, sortOrder: 2,  remark: '中通快递官方' },
  { id: 'lc-yto',  code: 'YTO',  name: '圆通速递', shortName: '圆通', website: 'https://www.yto.net.cn',      trackingUrl: 'https://www.yto.net.cn/query/{trackingNo}',                  contactPhone: '95554',  status: 'active' as const, sortOrder: 3,  remark: '圆通速递官方' },
  { id: 'lc-sto',  code: 'STO',  name: '申通快递', shortName: '申通', website: 'https://www.sto.cn',           trackingUrl: 'https://www.sto.cn/query/{trackingNo}',                      contactPhone: '95543',  status: 'active' as const, sortOrder: 4,  remark: '申通快递官方' },
  { id: 'lc-yd',   code: 'YD',   name: '韵达速递', shortName: '韵达', website: 'https://www.yunda.com',        trackingUrl: 'https://www.yunda.com/query/{trackingNo}',                   contactPhone: '95546',  status: 'active' as const, sortOrder: 5,  remark: '韵达速递官方' },
  { id: 'lc-jtsd', code: 'JTSD', name: '极兔速递', shortName: '极兔', website: 'https://www.jtexpress.cn',     trackingUrl: 'https://www.jtexpress.cn/track/{trackingNo}',                contactPhone: '95353',  status: 'active' as const, sortOrder: 6,  remark: '极兔速递官方' },
  { id: 'lc-ems',  code: 'EMS',  name: '邮政EMS',  shortName: 'EMS',  website: 'https://www.ems.com.cn',       trackingUrl: 'https://www.ems.com.cn/queryList?mailNo={trackingNo}',        contactPhone: '11183',  status: 'active' as const, sortOrder: 7,  remark: '中国邮政EMS' },
  { id: 'lc-jd',   code: 'JD',   name: '京东物流', shortName: '京东', website: 'https://www.jdl.com',          trackingUrl: 'https://www.jd.com/orderDetail?orderId={trackingNo}',         contactPhone: '950616', status: 'inactive' as const, sortOrder: 8, remark: '京东物流（需开通合作）' },
  { id: 'lc-dbl',  code: 'DBL',  name: '德邦快递', shortName: '德邦', website: 'https://www.deppon.com',       trackingUrl: 'https://www.deppon.com/tracking/{trackingNo}',               contactPhone: '95353',  status: 'inactive' as const, sortOrder: 9, remark: '德邦快递（需开通合作）' },
];

/**
 * 检查并初始化当前租户的默认物流公司
 * 如果当前租户没有任何物流公司数据，则自动插入预设数据
 */
async function ensureDefaultLogisticsCompanies(): Promise<void> {
  try {
    const repository = getTenantRepo(LogisticsCompany);
    const count = await repository.count();

    if (count === 0) {
      log.info('[物流公司] 当前租户无物流公司数据，正在初始化默认数据...');

      for (const companyData of DEFAULT_LOGISTICS_COMPANIES) {
        try {
          const company = repository.create({
            id: `${companyData.id}-${uuidv4().substring(0, 8)}`,
            code: companyData.code,
            name: companyData.name,
            shortName: companyData.shortName,
            website: companyData.website,
            trackingUrl: companyData.trackingUrl,
            contactPhone: companyData.contactPhone,
            status: companyData.status,
            sortOrder: companyData.sortOrder,
            remark: companyData.remark
          });
          await repository.save(company);
        } catch (insertError) {
          // 忽略单条插入失败（可能因 UNIQUE 约束），继续其他
          log.warn(`[物流公司] 初始化 ${companyData.name} 失败（可能已存在）:`, insertError instanceof Error ? insertError.message : insertError);
        }
      }

      log.info('[物流公司] ✅ 默认物流公司数据初始化完成');
    }
  } catch (error) {
    log.error('[物流公司] 初始化默认数据失败:', error);
    // 不抛出异常，允许后续逻辑继续执行
  }
}

/**
 * 调试端点：测试根据物流单号查询订单手机号（需要认证 + 租户隔离）
 */
router.get('/debug/order-phone', async (req: Request, res: Response) => {
  try {
    const { trackingNo } = req.query;

    if (!trackingNo) {
      return res.json({ success: false, message: '请提供物流单号' });
    }

    const { Order } = await import('../../entities/Order');
    const orderRepository = getTenantRepo(Order);

    // 精确匹配
    let order = await orderRepository.findOne({
      where: { trackingNumber: trackingNo as string },
      select: ['id', 'orderNumber', 'trackingNumber', 'shippingPhone', 'customerPhone', 'shippingName', 'customerName', 'customerId']
    });

    // 模糊匹配
    if (!order) {
      order = await orderRepository
        .createQueryBuilder('order')
        .select(['order.id', 'order.orderNumber', 'order.trackingNumber', 'order.shippingPhone', 'order.customerPhone', 'order.shippingName', 'order.customerName', 'order.customerId'])
        .andWhere('order.trackingNumber LIKE :trackingNoLike', { trackingNoLike: `%${trackingNo}%` })
        .getOne();
    }

    if (!order) {
      // 列出当前租户中有物流单号的订单
      const allOrders = await orderRepository
        .createQueryBuilder('order')
        .select(['order.orderNumber', 'order.trackingNumber', 'order.shippingPhone', 'order.customerPhone'])
        .andWhere('order.trackingNumber IS NOT NULL')
        .andWhere('order.trackingNumber != :empty', { empty: '' })
        .limit(10)
        .getMany();

      return res.json({
        success: false,
        message: `未找到物流单号: ${trackingNo}`,
        hint: '数据库中有以下物流单号:',
        existingOrders: allOrders.map(o => ({
          orderNumber: o.orderNumber,
          trackingNumber: o.trackingNumber,
          shippingPhone: o.shippingPhone || '(空)',
          customerPhone: o.customerPhone || '(空)'
        }))
      });
    }

    return res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        shippingPhone: order.shippingPhone || '(空)',
        customerPhone: order.customerPhone || '(空)',
        shippingName: order.shippingName || '(空)',
        customerName: order.customerName || '(空)',
        customerId: order.customerId || '(空)'
      }
    });
  } catch (error) {
    log.error('[调试] 查询失败:', error);
    return res.status(500).json({ success: false, message: '查询失败', error: String(error) });
  }
});

// ========== 物流公司管理 API ==========

/**
 * 获取物流公司列表（支持筛选）
 */
router.get('/companies/list', async (req: Request, res: Response) => {
  try {
    const { name, code, status, page = 1, pageSize = 20 } = req.query;

    // 🔥 确保当前租户有默认物流公司数据
    await ensureDefaultLogisticsCompanies();

    const repository = getTenantRepo(LogisticsCompany);
    const queryBuilder = repository.createQueryBuilder('company');

    // 筛选条件
    if (name) {
      queryBuilder.andWhere('company.name LIKE :name', { name: `%${name}%` });
    }
    if (code) {
      queryBuilder.andWhere('company.code LIKE :code', { code: `%${code}%` });
    }
    if (status) {
      queryBuilder.andWhere('company.status = :status', { status });
    }

    // 排序
    queryBuilder.orderBy('company.sortOrder', 'ASC').addOrderBy('company.createdAt', 'DESC');

    // 分页
    const skip = (Number(page) - 1) * Number(pageSize);
    queryBuilder.skip(skip).take(Number(pageSize));

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('获取物流公司列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物流公司列表失败'
    });
  }
});

/**
 * 获取启用的物流公司列表（用于下拉选择）
 */
router.get('/companies/active', async (_req: Request, res: Response) => {
  try {
    // 🔥 确保当前租户有默认物流公司数据
    await ensureDefaultLogisticsCompanies();

    const repository = getTenantRepo(LogisticsCompany);
    const companies = await repository.find({
      where: { status: 'active' },
      order: { sortOrder: 'ASC', name: 'ASC' },
      select: ['id', 'code', 'name', 'shortName', 'logo', 'trackingUrl']
    });

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    log.error('获取启用的物流公司列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物流公司列表失败'
    });
  }
});

/**
 * 新增物流公司
 */
router.post('/companies', async (req: Request, res: Response) => {
  try {
    const { code, name, shortName, logo, website, trackingUrl, apiUrl, contactPhone, servicePhone, status, remark } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: '公司代码和名称不能为空'
      });
    }

    const repository = getTenantRepo(LogisticsCompany);

    // 检查代码是否已存在
    const existing = await repository.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '公司代码已存在'
      });
    }

    const company = repository.create({
      id: uuidv4(),
      code,
      name,
      shortName,
      logo,
      website,
      trackingUrl,
      apiUrl,
      contactPhone: contactPhone || servicePhone,
      status: status || 'active',
      remark,
      sortOrder: 0
    });

    await repository.save(company);

    return res.json({
      success: true,
      message: '新增成功',
      data: company
    });
  } catch (error) {
    log.error('新增物流公司失败:', error);
    return res.status(500).json({
      success: false,
      message: '新增物流公司失败'
    });
  }
});

/**
 * 更新物流公司
 */
router.put('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, shortName, logo, website, trackingUrl, apiUrl, contactPhone, servicePhone, status, remark, sortOrder } = req.body;

    const repository = getTenantRepo(LogisticsCompany);
    const company = await repository.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '物流公司不存在'
      });
    }

    // 如果修改了代码，检查是否与其他公司冲突
    if (code && code !== company.code) {
      const existing = await repository.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '公司代码已存在'
        });
      }
    }

    // 更新字段
    if (code) company.code = code;
    if (name) company.name = name;
    if (shortName !== undefined) company.shortName = shortName;
    if (logo !== undefined) company.logo = logo;
    if (website !== undefined) company.website = website;
    if (trackingUrl !== undefined) company.trackingUrl = trackingUrl;
    if (apiUrl !== undefined) company.apiUrl = apiUrl;
    if (contactPhone !== undefined) company.contactPhone = contactPhone;
    if (servicePhone !== undefined) company.contactPhone = servicePhone;
    if (status !== undefined) company.status = status;
    if (remark !== undefined) company.remark = remark;
    if (sortOrder !== undefined) company.sortOrder = sortOrder;

    await repository.save(company);

    return res.json({
      success: true,
      message: '更新成功',
      data: company
    });
  } catch (error) {
    log.error('更新物流公司失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新物流公司失败'
    });
  }
});

/**
 * 切换物流公司状态
 */
router.patch('/companies/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }

    const repository = getTenantRepo(LogisticsCompany);
    const company = await repository.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '物流公司不存在'
      });
    }

    company.status = status;
    await repository.save(company);

    return res.json({
      success: true,
      message: status === 'active' ? '启用成功' : '禁用成功',
      data: company
    });
  } catch (error) {
    log.error('切换物流公司状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
});

/**
 * 删除物流公司
 */
router.delete('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const repository = getTenantRepo(LogisticsCompany);
    const company = await repository.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '物流公司不存在'
      });
    }

    await repository.remove(company);

    return res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    log.error('删除物流公司失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除物流公司失败'
    });
  }
});

// ========== 物流公司导入导出 API ==========

/**
 * 导出全部物流公司数据（含API配置和快递100配置）
 */
router.get('/companies/export', async (_req: Request, res: Response) => {
  try {
    const companyRepo = getTenantRepo(LogisticsCompany);
    const companies = await companyRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' }
    });

    // 获取API配置
    let apiConfigs: any[] = [];
    try {
      const { LogisticsApiConfig } = await import('../../entities/LogisticsApiConfig');
      const apiConfigRepo = getTenantRepo(LogisticsApiConfig);
      apiConfigs = await apiConfigRepo.find();
    } catch (e) {
      log.warn('[物流公司导出] 获取API配置失败:', e);
    }

    // 获取快递100配置
    let kuaidi100Config: any = null;
    try {
      const { SystemConfig } = await import('../../entities/SystemConfig');
      const configRepo = getTenantRepo(SystemConfig);
      const config = await configRepo.findOne({ where: { configKey: 'kuaidi100' } });
      if (config && config.configValue) {
        kuaidi100Config = typeof config.configValue === 'string'
          ? JSON.parse(config.configValue)
          : config.configValue;
      }
    } catch (e) {
      log.warn('[物流公司导出] 获取快递100配置失败:', e);
    }

    // 构建导出数据
    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.0',
      companies: companies.map(c => ({
        code: c.code,
        name: c.name,
        shortName: c.shortName || '',
        logo: c.logo || '',
        website: c.website || '',
        trackingUrl: c.trackingUrl || '',
        apiUrl: c.apiUrl || '',
        apiKey: c.apiKey || '',
        apiSecret: c.apiSecret || '',
        contactPhone: c.contactPhone || '',
        contactEmail: c.contactEmail || '',
        serviceArea: c.serviceArea || '',
        priceInfo: c.priceInfo || null,
        status: c.status,
        sortOrder: c.sortOrder || 0,
        remark: c.remark || '',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })),
      apiConfigs: apiConfigs.map(ac => ({
        companyCode: ac.companyCode,
        companyName: ac.companyName || '',
        appId: ac.appId || '',
        appKey: ac.appKey || '',
        appSecret: ac.appSecret || '',
        customerId: ac.customerId || '',
        apiUrl: ac.apiUrl || '',
        apiEnvironment: ac.apiEnvironment || 'sandbox',
        extraConfig: ac.extraConfig || null,
        supportCreateOrder: ac.supportCreateOrder || 0,
        enabled: ac.enabled || 0
      })),
      kuaidi100Config: kuaidi100Config
    };

    return res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    log.error('[物流公司导出] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '导出失败'
    });
  }
});

/**
 * 导入物流公司数据（重复的按code覆盖）
 */
router.post('/companies/import', async (req: Request, res: Response) => {
  try {
    const { companies, apiConfigs, kuaidi100Config } = req.body;

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        success: false,
        message: '导入数据为空或格式不正确'
      });
    }

    const companyRepo = getTenantRepo(LogisticsCompany);
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const item of companies) {
      try {
        if (!item.code || !item.name) {
          errorCount++;
          continue;
        }

        // 查找是否已存在
        const existing = await companyRepo.findOne({ where: { code: item.code } });

        if (existing) {
          // 覆盖更新
          if (item.name) existing.name = item.name;
          if (item.shortName !== undefined) existing.shortName = item.shortName;
          if (item.logo !== undefined) existing.logo = item.logo;
          if (item.website !== undefined) existing.website = item.website;
          if (item.trackingUrl !== undefined) existing.trackingUrl = item.trackingUrl;
          if (item.apiUrl !== undefined) existing.apiUrl = item.apiUrl;
          if (item.apiKey !== undefined) existing.apiKey = item.apiKey;
          if (item.apiSecret !== undefined) existing.apiSecret = item.apiSecret;
          if (item.contactPhone !== undefined) existing.contactPhone = item.contactPhone;
          if (item.contactEmail !== undefined) existing.contactEmail = item.contactEmail;
          if (item.serviceArea !== undefined) existing.serviceArea = item.serviceArea;
          if (item.priceInfo !== undefined) existing.priceInfo = item.priceInfo;
          if (item.status) existing.status = item.status;
          if (item.sortOrder !== undefined) existing.sortOrder = item.sortOrder;
          if (item.remark !== undefined) existing.remark = item.remark;
          await companyRepo.save(existing);
          updatedCount++;
        } else {
          // 新增
          const company = companyRepo.create({
            id: uuidv4(),
            code: item.code,
            name: item.name,
            shortName: item.shortName || '',
            logo: item.logo || '',
            website: item.website || '',
            trackingUrl: item.trackingUrl || '',
            apiUrl: item.apiUrl || '',
            apiKey: item.apiKey || '',
            apiSecret: item.apiSecret || '',
            contactPhone: item.contactPhone || '',
            contactEmail: item.contactEmail || '',
            serviceArea: item.serviceArea || '',
            priceInfo: item.priceInfo || null,
            status: item.status || 'active',
            sortOrder: item.sortOrder || 0,
            remark: item.remark || ''
          });
          await companyRepo.save(company);
          importedCount++;
        }
      } catch (itemError) {
        log.warn(`[物流公司导入] 处理 ${item.code} 失败:`, itemError);
        errorCount++;
      }
    }

    // 导入API配置
    let apiImportedCount = 0;
    if (apiConfigs && Array.isArray(apiConfigs) && apiConfigs.length > 0) {
      try {
        const { LogisticsApiConfig } = await import('../../entities/LogisticsApiConfig');
        const apiConfigRepo = getTenantRepo(LogisticsApiConfig);

        for (const ac of apiConfigs) {
          try {
            if (!ac.companyCode) continue;
            const existingConfig = await apiConfigRepo.findOne({
              where: { companyCode: ac.companyCode.toUpperCase() }
            });

            if (existingConfig) {
              // 覆盖更新
              if (ac.companyName) existingConfig.companyName = ac.companyName;
              if (ac.appId !== undefined) existingConfig.appId = ac.appId;
              if (ac.appKey !== undefined) existingConfig.appKey = ac.appKey;
              if (ac.appSecret !== undefined) existingConfig.appSecret = ac.appSecret;
              if (ac.customerId !== undefined) existingConfig.customerId = ac.customerId;
              if (ac.apiUrl !== undefined) existingConfig.apiUrl = ac.apiUrl;
              if (ac.apiEnvironment) existingConfig.apiEnvironment = ac.apiEnvironment;
              if (ac.extraConfig !== undefined) existingConfig.extraConfig = ac.extraConfig;
              if (ac.supportCreateOrder !== undefined) existingConfig.supportCreateOrder = ac.supportCreateOrder;
              if (ac.enabled !== undefined) existingConfig.enabled = ac.enabled;
              await apiConfigRepo.save(existingConfig);
            } else {
              const newConfig = apiConfigRepo.create({
                id: uuidv4(),
                companyCode: ac.companyCode.toUpperCase(),
                companyName: ac.companyName || ac.companyCode,
                appId: ac.appId || '',
                appKey: ac.appKey || '',
                appSecret: ac.appSecret || '',
                customerId: ac.customerId || '',
                apiUrl: ac.apiUrl || '',
                apiEnvironment: ac.apiEnvironment || 'sandbox',
                extraConfig: ac.extraConfig || null,
                supportCreateOrder: ac.supportCreateOrder || 0,
                enabled: ac.enabled || 0
              });
              await apiConfigRepo.save(newConfig);
            }
            apiImportedCount++;
          } catch (acError) {
            log.warn(`[物流公司导入] API配置 ${ac.companyCode} 处理失败:`, acError);
          }
        }
      } catch (e) {
        log.warn('[物流公司导入] 导入API配置失败:', e);
      }
    }

    // 导入快递100配置
    if (kuaidi100Config) {
      try {
        const { SystemConfig } = await import('../../entities/SystemConfig');
        const configRepo = getTenantRepo(SystemConfig);
        let config = await configRepo.findOne({ where: { configKey: 'kuaidi100' } });
        if (config) {
          config.configValue = JSON.stringify(kuaidi100Config);
          await configRepo.save(config);
        } else {
          config = configRepo.create({
            id: uuidv4(),
            configKey: 'kuaidi100',
            configValue: JSON.stringify(kuaidi100Config),
            description: '快递100 API配置'
          } as any);
          await configRepo.save(config);
        }
      } catch (e) {
        log.warn('[物流公司导入] 快递100配置导入失败:', e);
      }
    }

    return res.json({
      success: true,
      message: `导入完成：新增 ${importedCount} 个，覆盖更新 ${updatedCount} 个${errorCount > 0 ? `，失败 ${errorCount} 个` : ''}${apiImportedCount > 0 ? `，API配置 ${apiImportedCount} 个` : ''}`,
      data: { importedCount, updatedCount, errorCount, apiImportedCount }
    });
  } catch (error) {
    log.error('[物流公司导入] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '导入失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

// ========== 原有物流跟踪 API ==========

// 获取物流列表
router.get('/list', (req, res) => logisticsController.getLogisticsList(req, res));

// 获取支持的快递公司列表
router.get('/companies', (req, res) => logisticsController.getSupportedCompanies(req, res));

// 创建物流跟踪
router.post('/tracking', (req, res) => logisticsController.createLogisticsTracking(req, res));

// ========== 物流轨迹查询 API（调用真实快递API） ==========

/**
 * 查询物流轨迹（调用真实快递公司API）
 */
router.get('/trace/query', async (req: Request, res: Response) => {
  try {
    const { trackingNo, companyCode, phone, senderPhone } = req.query;

    if (!trackingNo) {
      return res.status(400).json({
        success: false,
        message: '请提供物流单号'
      });
    }

    // 🔥 修复：检查手机号是否为有效值（不是空字符串）
    let phoneToUse = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : undefined;
    // 🔥 双保险：寄件人手机号备用
    const senderPhoneStr = (senderPhone && typeof senderPhone === 'string' && senderPhone.trim()) ? senderPhone.trim() : undefined;

    log.info(`[物流轨迹查询] 前端传递的phone参数: "${phone}", senderPhone: "${senderPhone}", 处理后: ${phoneToUse ? phoneToUse.slice(-4) + '****' : '(空)'}`);

    // 🔥 如果前端没有传递有效手机号，尝试从数据库获取
    if (!phoneToUse) {
      try {
        const { Order } = await import('../../entities/Order');
        const orderRepository = getTenantRepo(Order);

        // 🔥 改进：多种方式查找订单
        let order = await orderRepository.findOne({
          where: { trackingNumber: trackingNo as string },
          select: ['id', 'orderNumber', 'trackingNumber', 'shippingPhone', 'customerPhone', 'shippingName', 'customerName', 'customerId']
        });

        // 如果通过trackingNumber找不到，尝试其他方式
        if (!order) {
          // 尝试模糊匹配（有些系统可能存储格式不同）
          order = await orderRepository
            .createQueryBuilder('order')
            .select(['order.id', 'order.orderNumber', 'order.trackingNumber', 'order.shippingPhone', 'order.customerPhone', 'order.shippingName', 'order.customerName', 'order.customerId'])
            .andWhere('order.trackingNumber = :trackingNo', { trackingNo: trackingNo as string })
            .orWhere('order.trackingNumber LIKE :trackingNoLike', { trackingNoLike: `%${trackingNo}%` })
            .getOne();
        }

        if (order) {
          // 🔥 优先使用收货人手机号，其次使用客户手机号
          // 确保手机号不是空字符串
          const shippingPhone = order.shippingPhone?.trim() || '';
          const customerPhone = order.customerPhone?.trim() || '';

          if (shippingPhone) {
            phoneToUse = shippingPhone;
          } else if (customerPhone) {
            phoneToUse = customerPhone;
          }

          log.info(`[物流轨迹查询] 从数据库获取订单: ${order.orderNumber}`);
          log.info(`[物流轨迹查询] shippingPhone: "${order.shippingPhone}" -> "${shippingPhone || '(空)'}"`);
          log.info(`[物流轨迹查询] customerPhone: "${order.customerPhone}" -> "${customerPhone || '(空)'}"`);

          // 🔥 如果订单中没有手机号，尝试从客户表获取
          if (!phoneToUse && order.customerId) {
            try {
              const { Customer } = await import('../../entities/Customer');
              const customerRepository = getTenantRepo(Customer);
              const customer = await customerRepository.findOne({
                where: { id: order.customerId },
                select: ['id', 'phone', 'name']
              });
              if (customer && customer.phone?.trim()) {
                phoneToUse = customer.phone.trim();
                log.info(`[物流轨迹查询] 从客户表获取手机号: ${phoneToUse.slice(-4)}****`);
              }
            } catch (customerError) {
              log.info('[物流轨迹查询] 从客户表获取手机号失败:', customerError);
            }
          }

          log.info(`[物流轨迹查询] 最终使用手机号: ${phoneToUse ? phoneToUse.slice(-4) + '****' : '未找到有效手机号'}`);
        } else {
          log.info(`[物流轨迹查询] 数据库中未找到物流单号: ${trackingNo}`);
        }
      } catch (dbError) {
        log.info('[物流轨迹查询] 从数据库获取手机号失败:', dbError);
      }
    }

    log.info(`[物流轨迹查询] 单号: ${trackingNo}, 快递公司: ${companyCode || '自动识别'}, 手机号: ${phoneToUse ? '已提供(' + phoneToUse.slice(-4) + ')' : '未提供'}, 寄件人手机号: ${senderPhoneStr ? '已提供(' + senderPhoneStr.slice(-4) + ')' : '未提供'}`);

    let result = await logisticsTraceService.queryTrace(
      trackingNo as string,
      companyCode as string | undefined,
      phoneToUse
    );

    // 🔥 双保险：如果首次查询失败且有寄件人手机号，用寄件人手机号重试
    if (!result.success && senderPhoneStr && senderPhoneStr !== phoneToUse) {
      log.info(`[物流轨迹查询] 客户手机号查询失败，使用寄件人手机号${senderPhoneStr.slice(-4)}****重试...`);
      result = await logisticsTraceService.queryTrace(
        trackingNo as string,
        companyCode as string | undefined,
        senderPhoneStr
      );
      if (result.success) {
        log.info('[物流轨迹查询] ✅ 使用寄件人手机号查询成功');
      }
    }

    // 🔥 如果查询成功，更新数据库中的物流状态和最新动态
    if (result.success && result.traces.length > 0) {
      try {
        const { Order } = await import('../../entities/Order');
        const orderRepository = getTenantRepo(Order);
        const order = await orderRepository.findOne({
          where: { trackingNumber: trackingNo as string }
        });
        if (order) {
          // 🔥 修复：保存最新物流动态前先按时间排序，确保取到最新的
          const sortedTraces = [...result.traces].sort((a, b) => {
            const timeA = new Date(a.time).getTime();
            const timeB = new Date(b.time).getTime();
            return timeB - timeA;
          });
          const latestDescription = sortedTraces[0].description || sortedTraces[0].status || '';

          order.logisticsStatus = result.status;
          order.latestLogisticsInfo = latestDescription;
          if (result.estimatedDeliveryTime) {
            order.expectedDeliveryDate = result.estimatedDeliveryTime;
          }

          // 🔥 实时自动同步：根据最新物流动态安全更新订单状态
          const { detectLogisticsStatus, mapLogisticsToOrderStatus } = await import('../../services/LogisticsAutoSyncService');
          const detectedStatus = detectLogisticsStatus(latestDescription);
          const targetOrderStatus = mapLogisticsToOrderStatus(detectedStatus, order.status);

          if (targetOrderStatus && targetOrderStatus !== order.status) {
            const oldStatus = order.status;
            order.status = targetOrderStatus as any;
            log.info(`[物流轨迹查询] 🔄 实时同步订单状态: ${order.orderNumber} ${oldStatus} → ${targetOrderStatus} (物流: ${detectedStatus}, 动态: "${latestDescription.substring(0, 50)}")`);

            if (targetOrderStatus === 'delivered') {
              order.deliveredAt = new Date();
            }

            // 记录状态变更历史
            try {
              const { OrderStatusHistory } = await import('../../entities/OrderStatusHistory');
              const historyRepo = getTenantRepo(OrderStatusHistory);
              await historyRepo.save(historyRepo.create({
                orderId: order.id,
                status: targetOrderStatus as any,
                notes: `[实时同步] 物流动态: "${latestDescription.substring(0, 100)}" → ${detectedStatus} → ${targetOrderStatus}`,
                operatorName: '系统实时同步'
              }));
            } catch (_histErr) {
              // 历史记录失败不影响主流程
            }
          }

          order.updatedAt = new Date();
          await orderRepository.save(order);
        }
      } catch (updateError) {
        log.warn('[物流轨迹查询] 更新订单状态失败:', updateError);
      }
    }

    return res.json({
      success: result.success,
      data: result,
      message: result.success ? '查询成功' : result.statusText
    });
  } catch (error) {
    log.error('[物流轨迹查询] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '查询失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

/**
 * 批量查询物流轨迹（增强版，支持传递订单详情）
 */
router.post('/trace/batch-query', async (req: Request, res: Response) => {
  try {
    const { trackingNos, companyCode, orders } = req.body;

    // 🔥 支持两种模式：
    // 1. 简单模式：只传 trackingNos 数组
    // 2. 详情模式：传 orders 数组，包含 trackingNo, companyCode, phone 等信息

    let queryItems: Array<{ trackingNo: string; companyCode?: string; phone?: string }> = [];

    if (orders && Array.isArray(orders) && orders.length > 0) {
      // 详情模式
      queryItems = orders.map((o: any) => ({
        trackingNo: o.trackingNo,
        companyCode: o.companyCode || companyCode,
        phone: o.phone
      }));
    } else if (trackingNos && Array.isArray(trackingNos) && trackingNos.length > 0) {
      // 简单模式
      queryItems = trackingNos.map((no: string) => ({
        trackingNo: no,
        companyCode
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: '请提供物流单号列表或订单详情'
      });
    }

    if (queryItems.length > 50) {
      return res.status(400).json({
        success: false,
        message: '单次最多查询50个单号'
      });
    }

    log.info(`[批量物流轨迹查询] 单号数量: ${queryItems.length}`);

    // 🔥 并行查询所有订单（使用 Promise.allSettled 避免单个失败影响整体）
    const results = await Promise.allSettled(
      queryItems.map(async (item) => {
        try {
          // 如果没有传手机号，尝试从数据库获取
          let phoneToUse = item.phone;
          if (!phoneToUse) {
            try {
              const { Order } = await import('../../entities/Order');
              const orderRepository = getTenantRepo(Order);
              const order = await orderRepository.findOne({
                where: { trackingNumber: item.trackingNo }
              });
              if (order) {
                phoneToUse = order.shippingPhone?.trim() || order.customerPhone?.trim() || undefined;
              }
            } catch (_e) {
              // 忽略数据库查询错误
            }
          }

          const result = await logisticsTraceService.queryTrace(
            item.trackingNo,
            item.companyCode,
            phoneToUse
          );

          // 🔥 如果查询成功，更新数据库中的物流状态
          if (result.success && result.traces.length > 0) {
            try {
              const { Order } = await import('../../entities/Order');
              const orderRepository = getTenantRepo(Order);
              const order = await orderRepository.findOne({
                where: { trackingNumber: item.trackingNo }
              });
              if (order) {
                // 🔥 修复：保存最新物流动态前先按时间排序
                const sortedTraces = [...result.traces].sort((a, b) => {
                  const timeA = new Date(a.time).getTime();
                  const timeB = new Date(b.time).getTime();
                  return timeB - timeA;
                });
                const latestDescription = sortedTraces[0].description || sortedTraces[0].status || '';

                order.logisticsStatus = result.status;
                order.latestLogisticsInfo = latestDescription;
                if (result.estimatedDeliveryTime) {
                  order.expectedDeliveryDate = result.estimatedDeliveryTime;
                }

                // 🔥 实时自动同步：根据最新物流动态安全更新订单状态
                const { detectLogisticsStatus, mapLogisticsToOrderStatus } = await import('../../services/LogisticsAutoSyncService');
                const detectedStatus = detectLogisticsStatus(latestDescription);
                const targetOrderStatus = mapLogisticsToOrderStatus(detectedStatus, order.status);

                if (targetOrderStatus && targetOrderStatus !== order.status) {
                  order.status = targetOrderStatus as any;
                  if (targetOrderStatus === 'delivered') {
                    order.deliveredAt = new Date();
                  }
                }

                order.updatedAt = new Date();
                await orderRepository.save(order);
              }
            } catch (_e) {
              // 忽略更新错误
            }
          }

          return result;
        } catch (error) {
          return {
            success: false,
            trackingNo: item.trackingNo,
            companyCode: item.companyCode || '',
            companyName: '',
            status: 'error',
            statusText: error instanceof Error ? error.message : '查询失败',
            traces: []
          };
        }
      })
    );

    // 🔥 处理结果
    const finalResults = results.map((r, index) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        return {
          success: false,
          trackingNo: queryItems[index].trackingNo,
          companyCode: queryItems[index].companyCode || '',
          companyName: '',
          status: 'error',
          statusText: r.reason?.message || '查询失败',
          traces: []
        };
      }
    });

    const successCount = finalResults.filter(r => r.success).length;
    log.info(`[批量物流轨迹查询] 完成，成功 ${successCount}/${queryItems.length} 个`);

    return res.json({
      success: true,
      data: finalResults,
      message: `查询完成，成功 ${successCount} 个`
    });
  } catch (error) {
    log.error('[批量物流轨迹查询] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '查询失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

/**
 * 刷新物流轨迹（强制从快递API获取最新数据）
 */
router.post('/trace/refresh', async (req: Request, res: Response) => {
  try {
    const { trackingNo, companyCode, phone } = req.body;

    if (!trackingNo) {
      return res.status(400).json({
        success: false,
        message: '请提供物流单号'
      });
    }

    // 🔥 如果前端没有传递手机号，尝试从数据库获取
    let phoneToUse = phone as string | undefined;
    if (!phoneToUse) {
      try {
        const { Order } = await import('../../entities/Order');
        const orderRepository = getTenantRepo(Order);
        const order = await orderRepository.findOne({
          where: { trackingNumber: trackingNo as string }
        });
        if (order) {
          phoneToUse = order.shippingPhone || order.customerPhone || undefined;
          log.info(`[刷新物流轨迹] 从数据库获取手机号: ${phoneToUse ? phoneToUse.slice(-4) + '****' : '未找到'}`);
        }
      } catch (dbError) {
        log.info('[刷新物流轨迹] 从数据库获取手机号失败:', dbError);
      }
    }

    log.info(`[刷新物流轨迹] 单号: ${trackingNo}, 手机号: ${phoneToUse ? '已提供' : '未提供'}`);

    // 强制从API获取最新数据（带手机号）
    const result = await logisticsTraceService.queryTrace(trackingNo, companyCode, phoneToUse);

    // 如果查询成功，可以更新数据库中的物流状态
    if (result.success && result.traces.length > 0) {
      try {
        const { Order } = await import('../../entities/Order');
        const orderRepository = getTenantRepo(Order);

        // 查找对应的订单（通过trackingNumber字段）
        const order = await orderRepository.findOne({
          where: { trackingNumber: trackingNo }
        });

        if (order) {
          // 更新订单的物流状态
          order.logisticsStatus = result.status;
          // 🔥 修复：保存最新物流动态前先按时间排序，确保取到最新的
          if (result.traces.length > 0) {
            const sortedTraces = [...result.traces].sort((a, b) => {
              const timeA = new Date(a.time).getTime();
              const timeB = new Date(b.time).getTime();
              return timeB - timeA; // 倒序，最新的在前
            });
            const latestTrace = sortedTraces[0];
            order.latestLogisticsInfo = latestTrace.description || latestTrace.status || '';
          }
          // 🔥 如果有预计送达时间，也更新
          if (result.estimatedDeliveryTime) {
            order.expectedDeliveryDate = result.estimatedDeliveryTime;
          }
          order.updatedAt = new Date();
          await orderRepository.save(order);
          log.info(`[刷新物流轨迹] 订单 ${order.orderNumber} 物流状态已更新为: ${result.status}, 最新动态: ${order.latestLogisticsInfo?.substring(0, 30)}...`);
        }
      } catch (updateError) {
        log.warn('[刷新物流轨迹] 更新订单状态失败:', updateError);
      }
    }

    return res.json({
      success: result.success,
      data: result,
      message: result.success ? '刷新成功' : result.statusText
    });
  } catch (error) {
    log.error('[刷新物流轨迹] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '刷新失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

// 查询物流轨迹（旧版API，保持兼容）
router.get('/trace', (req, res) => logisticsController.getLogisticsTrace(req, res));

// 批量同步物流状态
router.post('/batch-sync', (req, res) => logisticsController.batchSyncLogistics(req, res));

// 更新物流状态
router.put('/tracking/:id', (req, res) => logisticsController.updateLogisticsStatus(req, res));

} // end registerCompanyAndTraceRoutes
