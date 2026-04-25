/**
 * 增值管理模块 - 公司管理、配置、备注预设路由
 * 包含：外包公司CRUD、状态配置、排序、价格梯度、备注预设、订单同步
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { ValueAddedOrder } from '../../entities/ValueAddedOrder';
import { ValueAddedPriceConfig } from '../../entities/ValueAddedPriceConfig';
import { ValueAddedStatusConfig } from '../../entities/ValueAddedStatusConfig';
import { OutsourceCompany } from '../../entities/OutsourceCompany';
import { v4 as uuidv4 } from 'uuid';
import { In, Not } from 'typeorm';
import { getTenantRepo, tenantSQL } from '../../utils/tenantRepo';
import {
  findPriceByOrderDate,
  updateCompanyStats,
  syncOrdersToValueAdded,
  syncOrdersToValueAddedOptimized
} from './valueAddedHelpers';

import { log } from '../../config/logger';
export function registerCompanyRoutes(router: Router): void {
router.get('/companies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, keywords } = req.query;

    const companyRepo = getTenantRepo(OutsourceCompany);
    const queryBuilder = companyRepo.createQueryBuilder('company');

    // 状态筛选
    if (status && status !== 'all') {
      queryBuilder.where('company.status = :status', { status });
    }

    // 关键词搜索
    if (keywords) {
      queryBuilder.andWhere(
        '(company.company_name LIKE :kw OR company.contact_person LIKE :kw OR company.contact_phone LIKE :kw)',
        { kw: `%${keywords}%` }
      );
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序：先按sort_order，再按created_at
    queryBuilder.orderBy('company.sort_order', 'ASC').addOrderBy('company.created_at', 'DESC');

    const list = await queryBuilder.getMany();

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: size }
    });
  } catch (error: any) {
    log.error('[ValueAdded] Get companies error:', error);
    res.status(500).json({ success: false, message: '获取公司列表失败' });
  }
});

/**
 * 创建外包公司
 */
router.post('/companies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      contactPerson,
      contactPhone,
      contactEmail,
      address,
      remark
    } = req.body;
    const user = (req as any).currentUser;

    if (!companyName) {
      return res.status(400).json({ success: false, message: '请填写公司名称' });
    }

    const companyRepo = getTenantRepo(OutsourceCompany);

    // 检查公司名称是否已存在
    const existing = await companyRepo.findOne({ where: { companyName } });
    if (existing) {
      return res.status(400).json({ success: false, message: '公司名称已存在' });
    }

    // 🔥 自动计算下一个排序值
    const maxSortResult = await companyRepo
      .createQueryBuilder('c')
      .select('MAX(c.sort_order)', 'maxSort')
      .getRawOne();
    const nextSort = (maxSortResult?.maxSort && maxSortResult.maxSort < 999)
      ? maxSortResult.maxSort + 1
      : await companyRepo.count() + 1;

    const company = new OutsourceCompany();
    company.id = uuidv4();
    company.companyName = companyName;
    company.contactPerson = contactPerson || null;
    company.contactPhone = contactPhone || null;
    company.contactEmail = contactEmail || null;
    company.address = address || null;
    company.status = 'active';
    company.sortOrder = nextSort;
    company.remark = remark || null;
    company.createdBy = user.id;
    company.createdByName = user.name || user.username;

    await companyRepo.save(company);

    res.json({ success: true, message: '创建成功', data: company });
  } catch (error: any) {
    log.error('[ValueAdded] Create company error:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

/**
 * 更新外包公司
 */
router.put('/companies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      contactPerson,
      contactPhone,
      contactEmail,
      address,
      status,
      remark
    } = req.body;

    const companyRepo = getTenantRepo(OutsourceCompany);
    const company = await companyRepo.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({ success: false, message: '公司不存在' });
    }

    // 检查公司名称是否与其他公司重复
    if (companyName && companyName !== company.companyName) {
      const existing = await companyRepo.findOne({ where: { companyName } });
      if (existing) {
        return res.status(400).json({ success: false, message: '公司名称已存在' });
      }
    }

    if (companyName) company.companyName = companyName;
    if (contactPerson !== undefined) company.contactPerson = contactPerson;
    if (contactPhone !== undefined) company.contactPhone = contactPhone;
    if (contactEmail !== undefined) company.contactEmail = contactEmail;
    if (address !== undefined) company.address = address;
    if (status) company.status = status;
    if (remark !== undefined) company.remark = remark;

    await companyRepo.save(company);

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Update company error:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * 删除外包公司
 */
router.delete('/companies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyRepo = getTenantRepo(OutsourceCompany);
    const orderRepo = getTenantRepo(ValueAddedOrder);

    const company = await companyRepo.findOne({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: '公司不存在' });
    }

    // 检查是否有关联的订单
    const orderCount = await orderRepo.count({ where: { companyId: id } });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该公司有 ${orderCount} 个关联订单，无法删除。请先停用该公司。`
      });
    }

    // 检查是否是默认公司
    if (company.isDefault === 1) {
      return res.status(400).json({
        success: false,
        message: '默认公司无法删除，请先设置其他公司为默认'
      });
    }

    await companyRepo.remove(company);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Delete company error:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});
/**
 * 获取结算报表数据（全面版）
 */
router.get('/settlement-report', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const orderRepo = getTenantRepo(ValueAddedOrder);

    // 构建基础查询条件（所有订单）- 按下单时间筛选
    const buildAllOrdersQuery = () => {
      const qb = orderRepo.createQueryBuilder('order');

      // 日期筛选（按下单时间）
      if (startDate && endDate) {
        qb.where('order.order_date BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string + ' 23:59:59')
        });
      }

      // 公司筛选
      if (companyId) {
        qb.andWhere('order.company_id = :companyId', { companyId });
      }

      return qb;
    };

    // 构建已结算订单查询条件 - 按下单时间筛选
    const buildSettledQuery = () => {
      const qb = orderRepo.createQueryBuilder('order');
      qb.where('order.settlement_status = :status', { status: 'settled' });

      if (startDate && endDate) {
        qb.andWhere('order.order_date BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string + ' 23:59:59')
        });
      }

      if (companyId) {
        qb.andWhere('order.company_id = :companyId', { companyId });
      }

      return qb;
    };

    // 1. 汇总统计数据
    const [
      totalStats,
      settledStats,
      unsettledStats,
      validStats,
      invalidStats,
      pendingStats,
      unsettledAllStats  // 新增：全部未结算（含无效和补单）
    ] = await Promise.all([
      // 全部订单
      buildAllOrdersQuery()
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'totalAmount')
        .addSelect('SUM(order.settlement_amount)', 'settledAmount')
        .getRawOne(),
      // 已结算
      buildAllOrdersQuery()
        .andWhere('order.settlement_status = :status', { status: 'settled' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.settlement_amount)', 'amount')
        .getRawOne(),
      // 未结算（排除无效和补单状态，只统计有效和待处理）
      buildAllOrdersQuery()
        .andWhere('order.settlement_status = :status', { status: 'unsettled' })
        .andWhere('order.status IN (:...validStatuses)', { validStatuses: ['valid', 'pending'] })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'amount')
        .getRawOne(),
      // 有效资料
      buildAllOrdersQuery()
        .andWhere('order.status = :status', { status: 'valid' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.settlement_amount)', 'amount')
        .getRawOne(),
      // 无效资料
      buildAllOrdersQuery()
        .andWhere('order.status = :status', { status: 'invalid' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'amount')
        .getRawOne(),
      // 待处理
      buildAllOrdersQuery()
        .andWhere('order.status = :status', { status: 'pending' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'amount')
        .getRawOne(),
      // 全部未结算（包含无效和补单，用于tooltip显示）
      buildAllOrdersQuery()
        .andWhere('order.settlement_status = :status', { status: 'unsettled' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'amount')
        .getRawOne()
    ]);

    // 2. 按日期分组统计（已结算订单）- 按下单时间分组
    const dailyData = await buildSettledQuery()
      .select('DATE(order.order_date)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.settlement_amount)', 'amount')
      .addSelect('AVG(order.settlement_amount)', 'avgAmount')
      .groupBy('DATE(order.order_date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 3. 按公司分组统计（全面数据）
    const companyData = await buildAllOrdersQuery()
      .select('order.company_id', 'companyId')
      .addSelect('order.company_name', 'companyName')
      .addSelect('COUNT(*)', 'totalCount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "settled" THEN 1 ELSE 0 END)', 'settledCount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "unsettled" THEN 1 ELSE 0 END)', 'unsettledCount')
      .addSelect('SUM(CASE WHEN order.status = "valid" THEN 1 ELSE 0 END)', 'validCount')
      .addSelect('SUM(CASE WHEN order.status = "invalid" THEN 1 ELSE 0 END)', 'invalidCount')
      .addSelect('SUM(CASE WHEN order.status = "pending" THEN 1 ELSE 0 END)', 'pendingCount')
      .addSelect('SUM(order.settlement_amount)', 'settledAmount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "unsettled" THEN order.unit_price ELSE 0 END)', 'unsettledAmount')
      .addSelect('AVG(CASE WHEN order.settlement_status = "settled" THEN order.settlement_amount ELSE NULL END)', 'avgSettledAmount')
      .addSelect('MIN(order.settlement_date)', 'firstSettlementDate')
      .addSelect('MAX(order.settlement_date)', 'lastSettlementDate')
      .groupBy('order.company_id')
      .addGroupBy('order.company_name')
      .orderBy('settledAmount', 'DESC')
      .getRawMany();

    // 4. 有效率和结算率趋势（按日期）- 按下单时间分组
    const trendData = await buildAllOrdersQuery()
      .select('DATE(order.order_date)', 'date')
      .addSelect('COUNT(*)', 'totalCount')
      .addSelect('SUM(CASE WHEN order.status = "valid" THEN 1 ELSE 0 END)', 'validCount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "settled" THEN 1 ELSE 0 END)', 'settledCount')
      .groupBy('DATE(order.order_date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 5. 状态分布统计
    const statusDistribution = await buildAllOrdersQuery()
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.unit_price)', 'amount')
      .groupBy('order.status')
      .getRawMany();

    res.json({
      success: true,
      data: {
        // 汇总统计
        summary: {
          total: {
            count: parseInt(totalStats?.count || 0),
            totalAmount: parseFloat(totalStats?.totalAmount || 0),
            settledAmount: parseFloat(totalStats?.settledAmount || 0)
          },
          settled: {
            count: parseInt(settledStats?.count || 0),
            amount: parseFloat(settledStats?.amount || 0)
          },
          unsettled: {
            count: parseInt(unsettledStats?.count || 0),
            amount: parseFloat(unsettledStats?.amount || 0)
          },
          valid: {
            count: parseInt(validStats?.count || 0),
            amount: parseFloat(validStats?.amount || 0)
          },
          invalid: {
            count: parseInt(invalidStats?.count || 0),
            amount: parseFloat(invalidStats?.amount || 0)
          },
          pending: {
            count: parseInt(pendingStats?.count || 0),
            amount: parseFloat(pendingStats?.amount || 0)
          },
          // 新增：全部未结算数据（包含无效和补单）
          unsettledAll: {
            count: parseInt(unsettledAllStats?.count || 0),
            amount: parseFloat(unsettledAllStats?.amount || 0)
          }
        },
        // 按日期统计（已结算）
        dailyData: dailyData.map(item => ({
          date: item.date,
          count: parseInt(item.count),
          amount: parseFloat(item.amount || 0),
          avgAmount: parseFloat(item.avgAmount || 0)
        })),
        // 按公司统计
        companyData: companyData.map(item => ({
          companyId: item.companyId,
          companyName: item.companyName,
          totalCount: parseInt(item.totalCount || 0),
          settledCount: parseInt(item.settledCount || 0),
          unsettledCount: parseInt(item.unsettledCount || 0),
          validCount: parseInt(item.validCount || 0),
          invalidCount: parseInt(item.invalidCount || 0),
          pendingCount: parseInt(item.pendingCount || 0),
          settledAmount: parseFloat(item.settledAmount || 0),
          unsettledAmount: parseFloat(item.unsettledAmount || 0),
          avgSettledAmount: parseFloat(item.avgSettledAmount || 0),
          firstSettlementDate: item.firstSettlementDate,
          lastSettlementDate: item.lastSettlementDate
        })),
        // 趋势数据
        trendData: trendData.map(item => ({
          date: item.date,
          totalCount: parseInt(item.totalCount || 0),
          validCount: parseInt(item.validCount || 0),
          settledCount: parseInt(item.settledCount || 0),
          validRate: parseInt(item.totalCount || 0) > 0
            ? (parseInt(item.validCount || 0) / parseInt(item.totalCount || 0) * 100).toFixed(2)
            : '0.00',
          settlementRate: parseInt(item.totalCount || 0) > 0
            ? (parseInt(item.settledCount || 0) / parseInt(item.totalCount || 0) * 100).toFixed(2)
            : '0.00'
        })),
        // 状态分布
        statusDistribution: statusDistribution.map(item => ({
          status: item.status,
          count: parseInt(item.count || 0),
          amount: parseFloat(item.amount || 0)
        }))
      }
    });
  } catch (error: any) {
    log.error('[ValueAdded] Get settlement report error:', error);
    res.status(500).json({ success: false, message: '获取报表数据失败' });
  }
});

/**
 * 🔥 系统默认状态预设（全租户生效，不可删除）
 */
const SYSTEM_DEFAULT_STATUS_CONFIGS = [
  { type: 'validStatus', value: 'pending', label: '待处理', sortOrder: 1 },
  { type: 'validStatus', value: 'valid', label: '有效', sortOrder: 2 },
  { type: 'validStatus', value: 'invalid', label: '无效', sortOrder: 3 },
  { type: 'validStatus', value: 'supplemented', label: '已补单', sortOrder: 4 },
  { type: 'settlementStatus', value: 'unsettled', label: '未结算', sortOrder: 1 },
  { type: 'settlementStatus', value: 'settled', label: '已结算', sortOrder: 2 },
];

/**
 * 🔥 确保系统默认预设存在（全局共享，tenant_id = NULL）
 */
async function ensureSystemDefaultConfigs() {
  try {
    // 🔥 先确保 is_system 列存在
    try {
      await AppDataSource.query(
        "SELECT is_system FROM value_added_status_configs LIMIT 1"
      );
    } catch (colErr: any) {
      if (colErr.message && colErr.message.includes('is_system')) {
        log.info('[ValueAdded] 自动添加 is_system 列...');
        await AppDataSource.query(
          "ALTER TABLE value_added_status_configs ADD COLUMN is_system TINYINT DEFAULT 0 COMMENT '系统预设' AFTER sort_order"
        );
      }
    }

    // 🔥 一次性迁移：将已有的系统预设从租户绑定改为全局（tenant_id = NULL）
    await AppDataSource.query(
      "UPDATE value_added_status_configs SET tenant_id = NULL WHERE is_system = 1 AND tenant_id IS NOT NULL"
    );

    // 检查全局系统预设是否已存在（tenant_id IS NULL, is_system = 1）
    const [existing] = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM value_added_status_configs WHERE is_system = 1 AND tenant_id IS NULL"
    );
    if (existing && existing.cnt > 0) return; // 已初始化过

    log.info('[ValueAdded] 初始化系统默认状态预设(全局共享)...');
    for (const def of SYSTEM_DEFAULT_STATUS_CONFIGS) {
      const [existsDef] = await AppDataSource.query(
        "SELECT id FROM value_added_status_configs WHERE type = ? AND value = ? AND tenant_id IS NULL",
        [def.type, def.value]
      );
      if (!existsDef) {
        const id = uuidv4();
        await AppDataSource.query(
          "INSERT INTO value_added_status_configs (id, tenant_id, type, value, label, sort_order, is_system) VALUES (?, NULL, ?, ?, ?, ?, 1)",
          [id, def.type, def.value, def.label, def.sortOrder]
        );
      }
    }
    log.info('[ValueAdded] 系统默认状态预设初始化完成');
  } catch (e) {
    log.error('[ValueAdded] 初始化系统预设失败（不影响查询）:', e);
  }
}

/**
 * 🔥 系统默认备注预设（全租户生效）
 */
const SYSTEM_DEFAULT_REMARK_PRESETS = [
  { category: 'invalid', remarkText: '客户拒收', sortOrder: 1 },
  { category: 'invalid', remarkText: '地址错误无法送达', sortOrder: 2 },
  { category: 'invalid', remarkText: '客户电话无法接通', sortOrder: 3 },
  { category: 'invalid', remarkText: '客户取消订单', sortOrder: 4 },
  { category: 'invalid', remarkText: '商品质量问题', sortOrder: 5 },
  { category: 'invalid', remarkText: '发货错误', sortOrder: 6 },
  { category: 'invalid', remarkText: '物流丢失', sortOrder: 7 },
  { category: 'invalid', remarkText: '超时未签收', sortOrder: 8 },
  { category: 'invalid', remarkText: '客户信息不符', sortOrder: 9 },
  { category: 'invalid', remarkText: '其他原因', sortOrder: 10 },
  { category: 'general', remarkText: '正常处理', sortOrder: 1 },
  { category: 'general', remarkText: '需要跟进', sortOrder: 2 },
  { category: 'general', remarkText: '已联系客户', sortOrder: 3 },
  { category: 'general', remarkText: '待确认', sortOrder: 4 },
  { category: 'general', remarkText: '优先处理', sortOrder: 5 },
];

/**
 * 🔥 确保系统默认备注预设存在（全局共享，tenant_id = NULL）
 */
async function ensureSystemDefaultRemarkPresets() {
  try {
    // 🔥 确保 is_system 列存在
    try {
      await AppDataSource.query("SELECT is_system FROM value_added_remark_presets LIMIT 1");
    } catch (colErr: any) {
      log.info('[ValueAdded] 自动添加 remark_presets.is_system 列...');
      await AppDataSource.query(
        "ALTER TABLE value_added_remark_presets ADD COLUMN is_system TINYINT DEFAULT 0 COMMENT '系统预设' AFTER is_active"
      );
    }

    // 🔥 一次性迁移：将匹配系统预设的旧租户数据改为全局
    for (const def of SYSTEM_DEFAULT_REMARK_PRESETS) {
      await AppDataSource.query(
        "UPDATE value_added_remark_presets SET tenant_id = NULL, is_system = 1 WHERE remark_text = ? AND category = ? AND tenant_id IS NOT NULL AND is_system = 0",
        [def.remarkText, def.category]
      );
    }

    // 检查全局系统预设是否已存在
    const [existing] = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM value_added_remark_presets WHERE is_system = 1 AND tenant_id IS NULL"
    );
    if (existing && existing.cnt > 0) return; // 已初始化过

    log.info('[ValueAdded] 初始化系统默认备注预设(全局共享)...');
    for (const def of SYSTEM_DEFAULT_REMARK_PRESETS) {
      const [existsDef] = await AppDataSource.query(
        "SELECT id FROM value_added_remark_presets WHERE remark_text = ? AND category = ? AND tenant_id IS NULL",
        [def.remarkText, def.category]
      );
      if (!existsDef) {
        const id = uuidv4();
        await AppDataSource.query(
          "INSERT INTO value_added_remark_presets (id, tenant_id, remark_text, category, sort_order, is_active, is_system) VALUES (?, NULL, ?, ?, ?, 1, 1)",
          [id, def.remarkText, def.category, def.sortOrder]
        );
      }
    }
    log.info('[ValueAdded] 系统默认备注预设初始化完成');
  } catch (e) {
    log.error('[ValueAdded] 初始化备注预设失败（不影响查询）:', e);
  }
}

/**
 * 获取状态配置列表（系统预设 + 租户自定义）
 */
router.get('/status-configs', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 🔥 确保系统默认预设存在
    await ensureSystemDefaultConfigs();

    const { TenantContextManager } = await import('../../utils/tenantContext');
    const { deployConfig } = await import('../../config/deploy');
    const currentTenantId = deployConfig.isSaaS() ? TenantContextManager.getTenantId() : null;

    // 🔥 查询：系统预设（tenant_id IS NULL）+ 当前租户自定义（tenant_id = ?）
    const whereClause = currentTenantId
      ? 'WHERE (tenant_id IS NULL OR tenant_id = ?)'
      : 'WHERE 1=1';
    const params = currentTenantId ? [currentTenantId] : [];

    const validStatus = await AppDataSource.query(
      `SELECT id, tenant_id AS tenantId, type, value, label, sort_order AS sortOrder, is_system AS isSystem, created_at AS createdAt
       FROM value_added_status_configs
       ${whereClause} AND type = 'validStatus'
       ORDER BY is_system DESC, sort_order ASC, created_at ASC`,
      [...params]
    );

    const settlementStatus = await AppDataSource.query(
      `SELECT id, tenant_id AS tenantId, type, value, label, sort_order AS sortOrder, is_system AS isSystem, created_at AS createdAt
       FROM value_added_status_configs
       ${whereClause} AND type = 'settlementStatus'
       ORDER BY is_system DESC, sort_order ASC, created_at ASC`,
      [...params]
    );

    res.json({
      success: true,
      data: {
        validStatus,
        settlementStatus
      }
    });
  } catch (error: any) {
    log.error('[ValueAdded] Get status configs error:', error);
    res.status(500).json({ success: false, message: '获取状态配置失败' });
  }
});

/**
 * 添加状态配置
 */
router.post('/status-configs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, value, label } = req.body;

    if (!type || !value || !label) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    const { ValueAddedStatusConfig } = await import('../../entities/ValueAddedStatusConfig');
    const configRepo = getTenantRepo(ValueAddedStatusConfig);

    // 检查是否已存在
    const existing = await configRepo.findOne({ where: { type, value } });
    if (existing) {
      return res.status(400).json({ success: false, message: '该状态已存在' });
    }

    const config = new ValueAddedStatusConfig();
    config.type = type;
    config.value = value;
    config.label = label;

    await configRepo.save(config);

    res.json({ success: true, message: '添加成功', data: { id: config.id } });
  } catch (error: any) {
    log.error('[ValueAdded] Add status config error:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

/**
 * 删除状态配置（仅允许删除租户自定义配置，系统预设不可删除）
 */
router.delete('/status-configs/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 🔥 用原生SQL查询（可能是系统预设 tenant_id=NULL 或租户自定义）
    const [config] = await AppDataSource.query(
      "SELECT id, is_system, tenant_id FROM value_added_status_configs WHERE id = ?",
      [id]
    );

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    // 🔥 系统预设不可删除
    if (config.is_system === 1) {
      return res.status(403).json({ success: false, message: '系统默认预设不可删除' });
    }

    // 只删除租户自己的自定义配置
    const t = tenantSQL('');
    await AppDataSource.query(
      `DELETE FROM value_added_status_configs WHERE id = ?${t.sql}`,
      [id, ...t.params]
    );

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Delete status config error:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * 公司排序
 */
router.put('/companies/sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companies } = req.body;

    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    const companyRepo = getTenantRepo(OutsourceCompany);

    // 批量更新排序
    for (let i = 0; i < companies.length; i++) {
      await companyRepo.update(companies[i].id, { sortOrder: i + 1 });
    }

    res.json({ success: true, message: '排序成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Sort companies error:', error);
    res.status(500).json({ success: false, message: '排序失败' });
  }
});


/**
 * 设置默认公司
 */
router.put('/companies/:id/set-default', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyRepo = getTenantRepo(OutsourceCompany);

    // 🔥 支持取消默认：如果id为'none'，则取消所有默认
    if (id === 'none') {
      // 查找所有公司并更新
      const allCompanies = await companyRepo.find();
      for (const company of allCompanies) {
        await companyRepo.update(company.id, { isDefault: 0 });
      }
      return res.json({ success: true, message: '已取消默认公司' });
    }

    // 取消所有公司的默认状态
    const allCompanies = await companyRepo.find();
    for (const company of allCompanies) {
      await companyRepo.update(company.id, { isDefault: 0 });
    }

    // 设置当前公司为默认
    await companyRepo.update(id, { isDefault: 1, sortOrder: 1 });

    // 重新排序其他公司
    const otherCompanies = await companyRepo.find({
      where: { id: Not(id) },
      order: { sortOrder: 'ASC' }
    });

    for (let i = 0; i < otherCompanies.length; i++) {
      await companyRepo.update(otherCompanies[i].id, { sortOrder: i + 2 });
    }

    res.json({ success: true, message: '设置成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Set default company error:', error);
    res.status(500).json({ success: false, message: '设置失败' });
  }
});

/**
 * 批量修改订单公司
 */
router.put('/orders/batch-update-company', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids, companyId, companyName, unitPrice: providedUnitPrice } = req.body;
    const user = (req as any).currentUser;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要处理的订单' });
    }

    if (!companyId || !companyName) {
      return res.status(400).json({ success: false, message: '请选择外包公司' });
    }

    const orderRepo = getTenantRepo(ValueAddedOrder);

    // 批量更新订单，🔥 每个订单根据下单日期动态匹配价格
    const orders = await orderRepo.findBy({ id: In(ids) });
    for (const order of orders) {
      order.companyId = companyId;
      order.companyName = companyName;
      // 🔥 如果前端提供了单价，优先使用；否则根据订单下单日期匹配价格档位
      if (providedUnitPrice !== undefined && providedUnitPrice !== null) {
        order.unitPrice = Number(providedUnitPrice);
      } else if (companyId !== 'default-company') {
        order.unitPrice = await findPriceByOrderDate(companyId, order.orderDate);
      } else {
        order.unitPrice = 0;
      }
      // 🔥 如果已结算且有效，同步更新结算金额，确保与单价一致
      if (order.settlementStatus === 'settled' && order.status === 'valid') {
        order.settlementAmount = order.unitPrice;
      }
      order.operatorId = user.id;
      order.operatorName = user.name || user.username;
    }

    await orderRepo.save(orders);

    // 更新公司统计
    await updateCompanyStats(companyId);

    res.json({ success: true, message: '批量修改成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Batch update company error:', error);
    res.status(500).json({ success: false, message: '批量修改失败' });
  }
});

/**
 * 修改单个订单公司
 */
router.put('/orders/:id/company', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { companyId, companyName, unitPrice: providedUnitPrice } = req.body;
    const user = (req as any).currentUser;

    if (!companyId || !companyName) {
      return res.status(400).json({ success: false, message: '请选择外包公司' });
    }

    const orderRepo = getTenantRepo(ValueAddedOrder);

    const order = await orderRepo.findOne({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    let unitPrice = 0; // 默认单价为0（待分配）

    // 🔥 如果前端提供了单价，优先使用前端的值
    if (providedUnitPrice !== undefined && providedUnitPrice !== null) {
      unitPrice = Number(providedUnitPrice);
    } else if (companyId !== 'default-company') {
      // 🔥 根据订单下单日期动态匹配价格档位
      unitPrice = await findPriceByOrderDate(companyId, order.orderDate);
    }

    // 更新订单
    order.companyId = companyId;
    order.companyName = companyName;
    order.unitPrice = unitPrice;
    order.operatorId = user.id;
    order.operatorName = user.name || user.username;

    // 🔥 如果已结算且有效，同步更新结算金额，确保与单价一致
    if (order.settlementStatus === 'settled' && order.status === 'valid') {
      order.settlementAmount = order.unitPrice;
    }

    await orderRepo.save(order);

    // 更新公司统计
    await updateCompanyStats(companyId);

    res.json({ success: true, message: '修改成功', data: { unitPrice } });
  } catch (error: any) {
    log.error('[ValueAdded] Update order company error:', error);
    res.status(500).json({ success: false, message: '修改失败' });
  }
});

/**
 * 🔥 更新单个订单单价（支持手动修改单价）
 */
router.put('/orders/:id/unit-price', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { unitPrice } = req.body;
    const user = (req as any).currentUser;

    if (unitPrice === undefined || unitPrice === null) {
      return res.status(400).json({ success: false, message: '请输入单价' });
    }

    const orderRepo = getTenantRepo(ValueAddedOrder);
    const order = await orderRepo.findOne({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    order.unitPrice = Number(unitPrice);
    order.operatorId = user.id;
    order.operatorName = user.name || user.username;

    // 🔥 如果已结算且有效，同步更新结算金额
    if (order.settlementStatus === 'settled' && order.status === 'valid') {
      order.settlementAmount = order.unitPrice;
    }

    await orderRepo.save(order);

    // 更新公司统计
    if (order.companyId && order.companyId !== 'default-company') {
      await updateCompanyStats(order.companyId);
    }

    res.json({ success: true, message: '单价更新成功', data: { unitPrice: order.unitPrice } });
  } catch (error: any) {
    log.error('[ValueAdded] Update unit price error:', error);
    res.status(500).json({ success: false, message: '单价更新失败' });
  }
});

/**
 * 公司排序
 */
router.put('/companies/sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companies } = req.body;

    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    const companyRepo = getTenantRepo(OutsourceCompany);

    // 批量更新排序
    for (let i = 0; i < companies.length; i++) {
      await companyRepo.update(companies[i].id, { sortOrder: i + 1 });
    }

    res.json({ success: true, message: '排序成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Sort companies error:', error);
    res.status(500).json({ success: false, message: '排序失败' });
  }
});

/**
 * ============================================
 * 价格档位管理 API（新版多档位系统）
 * ============================================
 */

/**
 * 获取公司的价格档位列表
 */
router.get('/companies/:companyId/price-tiers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const configRepo = getTenantRepo(ValueAddedPriceConfig);

    const tiers = await configRepo.find({
      where: { companyId },
      order: { tierOrder: 'ASC', priority: 'ASC', createdAt: 'DESC' }
    });

    res.json({ success: true, data: tiers });
  } catch (error: any) {
    log.error('[ValueAdded] Get price tiers error:', error);
    res.status(500).json({ success: false, message: '获取价格档位失败' });
  }
});

/**
 * 创建价格档位
 */
router.post('/companies/:companyId/price-tiers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const user = (req as any).currentUser;
    const {
      tierName,
      tierOrder = 1,
      pricingType = 'fixed',
      unitPrice = 0,
      percentageRate = 0,
      baseAmountField = 'orderAmount',
      startDate,
      endDate,
      isActive = 1,
      priority = 0,
      remark
    } = req.body;

    if (!tierName) {
      return res.status(400).json({ success: false, message: '请输入档位名称' });
    }

    if (pricingType === 'fixed' && (!unitPrice || unitPrice <= 0)) {
      return res.status(400).json({ success: false, message: '按单计价时请输入有效的单价' });
    }

    if (pricingType === 'percentage' && (!percentageRate || percentageRate <= 0)) {
      return res.status(400).json({ success: false, message: '按比例计价时请输入有效的比例' });
    }

    const configRepo = getTenantRepo(ValueAddedPriceConfig);
    const tier = new ValueAddedPriceConfig();

    tier.id = uuidv4();
    tier.companyId = companyId;
    tier.tierName = tierName;
    tier.tierOrder = tierOrder;
    tier.pricingType = pricingType;
    tier.unitPrice = unitPrice;
    tier.percentageRate = percentageRate;
    tier.baseAmountField = baseAmountField;
    tier.startDate = startDate || null;
    tier.endDate = endDate || null;
    tier.isActive = isActive;
    tier.priority = priority;
    tier.remark = remark || null;
    tier.createdBy = user.id;
    tier.createdByName = user.name || user.username;

    await configRepo.save(tier);

    res.json({ success: true, message: '创建成功', data: { id: tier.id } });
  } catch (error: any) {
    log.error('[ValueAdded] Create price tier error:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

/**
 * 更新价格档位
 */
router.put('/companies/:companyId/price-tiers/:tierId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const {
      tierName,
      tierOrder,
      pricingType,
      unitPrice,
      percentageRate,
      baseAmountField,
      startDate,
      endDate,
      isActive,
      priority,
      remark
    } = req.body;

    const configRepo = getTenantRepo(ValueAddedPriceConfig);
    const tier = await configRepo.findOne({ where: { id: tierId } });

    if (!tier) {
      return res.status(404).json({ success: false, message: '档位不存在' });
    }

    if (tierName) tier.tierName = tierName;
    if (tierOrder !== undefined) tier.tierOrder = tierOrder;
    if (pricingType) tier.pricingType = pricingType;
    if (unitPrice !== undefined) tier.unitPrice = unitPrice;
    if (percentageRate !== undefined) tier.percentageRate = percentageRate;
    if (baseAmountField) tier.baseAmountField = baseAmountField;
    if (startDate !== undefined) tier.startDate = startDate || null;
    if (endDate !== undefined) tier.endDate = endDate || null;
    if (isActive !== undefined) tier.isActive = isActive;
    if (priority !== undefined) tier.priority = priority;
    if (remark !== undefined) tier.remark = remark;

    await configRepo.save(tier);

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Update price tier error:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * 删除价格档位
 */
router.delete('/companies/:companyId/price-tiers/:tierId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const configRepo = getTenantRepo(ValueAddedPriceConfig);

    const tier = await configRepo.findOne({ where: { id: tierId } });
    if (!tier) {
      return res.status(404).json({ success: false, message: '档位不存在' });
    }

    await configRepo.remove(tier);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[ValueAdded] Delete price tier error:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * 计算订单价格（根据档位配置）
 * 内部辅助函数 - 预留用于自动价格计算
 */
function _calculateOrderPrice(order: any, company: any, priceTiers: ValueAddedPriceConfig[]): number {
  // 1. 待分配
  if (order.companyId === 'default-company' || !order.companyId) {
    return 0;
  }

  // 2. 查找匹配的价格档位
  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
  const matchedTier = findMatchingPriceTier(priceTiers, orderDate);

  // 3. 根据档位计算价格
  if (matchedTier) {
    if (matchedTier.pricingType === 'fixed') {
      return matchedTier.unitPrice;
    } else if (matchedTier.pricingType === 'percentage') {
      const baseAmount = order[matchedTier.baseAmountField] || 0;
      return Number((baseAmount * (matchedTier.percentageRate / 100)).toFixed(2));
    }
  }

  // 4. 使用公司默认单价
  return company?.defaultUnitPrice || 0;
}

/**
 * 查找匹配的价格档位
 */
function findMatchingPriceTier(tiers: ValueAddedPriceConfig[], orderDate: Date): ValueAddedPriceConfig | null {
  // 只考虑启用的档位
  const activeTiers = tiers.filter(t => t.isActive === 1);

  // 过滤出日期范围匹配的档位
  const matchedTiers = activeTiers.filter(tier => {
    // 没有设置日期范围，永久有效
    if (!tier.startDate && !tier.endDate) {
      return true;
    }

    const start = tier.startDate ? new Date(tier.startDate) : null;
    const end = tier.endDate ? new Date(tier.endDate) : null;

    // 只有开始日期
    if (start && !end) {
      return orderDate >= start;
    }

    // 只有结束日期
    if (!start && end) {
      return orderDate <= end;
    }

    // 有开始和结束日期
    if (start && end) {
      return orderDate >= start && orderDate <= end;
    }

    return false;
  });

  // 按优先级降序排序，取第一个
  if (matchedTiers.length > 0) {
    matchedTiers.sort((a, b) => b.priority - a.priority);
    return matchedTiers[0];
  }

  return null;
}

/**
 * 获取备注预设列表（系统预设 + 租户自定义）
 */
router.get('/remark-presets', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 🔥 确保系统默认备注预设存在
    await ensureSystemDefaultRemarkPresets();

    const { category } = req.query;
    const { TenantContextManager } = await import('../../utils/tenantContext');
    const { deployConfig } = await import('../../config/deploy');
    const currentTenantId = deployConfig.isSaaS() ? TenantContextManager.getTenantId() : null;

    // 🔥 查询：系统预设（tenant_id IS NULL）+ 当前租户自定义（tenant_id = ?）
    const whereClause = currentTenantId
      ? 'WHERE is_active = 1 AND (tenant_id IS NULL OR tenant_id = ?)'
      : 'WHERE is_active = 1';
    const params: any[] = currentTenantId ? [currentTenantId] : [];

    if (category) {
      params.push(category);
    }

    const presets = await AppDataSource.query(
      `SELECT id, remark_text, category, sort_order, is_active, usage_count, COALESCE(is_system, 0) as is_system
       FROM value_added_remark_presets
       ${whereClause}
       ${category ? 'AND category = ?' : ''}
       ORDER BY is_system DESC, category, sort_order ASC`,
      params
    );

    res.json({
      success: true,
      data: presets
    });
  } catch (error: any) {
    log.error('获取备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备注预设失败',
      error: error.message
    });
  }
});

/**
 * 创建备注预设
 */
router.post('/remark-presets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { remarkText, category = 'general', sortOrder = 0 } = req.body;

    if (!remarkText) {
      return res.status(400).json({
        success: false,
        message: '备注内容不能为空'
      });
    }

    const id = uuidv4();
    const { TenantContextManager } = await import('../../utils/tenantContext');
    const { deployConfig } = await import('../../config/deploy');
    const currentTenantId = deployConfig.isSaaS() ? TenantContextManager.getTenantId() : null;
    await AppDataSource.query(
      `INSERT INTO value_added_remark_presets (id, tenant_id, remark_text, category, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, currentTenantId, remarkText, category, sortOrder]
    );

    res.json({
      success: true,
      message: '创建成功',
      data: { id }
    });
  } catch (error: any) {
    log.error('创建备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '创建备注预设失败',
      error: error.message
    });
  }
});

/**
 * 更新备注预设
 */
router.put('/remark-presets/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarkText, category, sortOrder, isActive } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (remarkText !== undefined) {
      updates.push('remark_text = ?');
      params.push(remarkText);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      });
    }

    params.push(id);
    const tUpdate = tenantSQL('');
    await AppDataSource.query(
      `UPDATE value_added_remark_presets SET ${updates.join(', ')} WHERE id = ?${tUpdate.sql}`,
      [...params, ...tUpdate.params]
    );

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error: any) {
    log.error('更新备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '更新备注预设失败',
      error: error.message
    });
  }
});

/**
 * 删除备注预设（仅允许删除租户自定义预设，系统预设不可删除）
 */
router.delete('/remark-presets/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 🔥 检查是否为系统预设
    const [preset] = await AppDataSource.query(
      "SELECT id, COALESCE(is_system, 0) as is_system FROM value_added_remark_presets WHERE id = ?",
      [id]
    );

    if (!preset) {
      return res.status(404).json({ success: false, message: '预设不存在' });
    }

    if (preset.is_system === 1) {
      return res.status(403).json({ success: false, message: '系统默认预设不可删除' });
    }

    const tDel = tenantSQL('');
    await AppDataSource.query(
      `DELETE FROM value_added_remark_presets WHERE id = ?${tDel.sql}`,
      [id, ...tDel.params]
    );

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    log.error('删除备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '删除备注预设失败',
      error: error.message
    });
  }
});

/**
 * 增加备注预设使用次数
 */
router.post('/remark-presets/:id/increment-usage', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tInc = tenantSQL('');
    await AppDataSource.query(
      `UPDATE value_added_remark_presets SET usage_count = usage_count + 1 WHERE id = ?${tInc.sql}`,
      [id, ...tInc.params]
    );

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error: any) {
    log.error('更新使用次数失败:', error);
    res.status(500).json({
      success: false,
      message: '更新使用次数失败',
      error: error.message
    });
  }
});

/**
 * 手动触发订单同步（管理员功能）
 */
router.post('/sync-orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { fullSync } = req.body; // fullSync=true 表示全量同步

    if (fullSync) {
      // 全量同步（使用旧版函数）
      await syncOrdersToValueAdded();
    } else {
      // 增量同步（使用优化版函数）
      await syncOrdersToValueAddedOptimized();
    }

    res.json({
      success: true,
      message: '订单同步完成'
    });
  } catch (error: any) {
    log.error('[ValueAdded] 手动同步失败:', error);
    res.status(500).json({
      success: false,
      message: '订单同步失败',
      error: error.message
    });
  }
});


} // end registerCompanyRoutes
