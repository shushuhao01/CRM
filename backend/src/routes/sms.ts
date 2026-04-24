import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { SmsTemplate } from '../entities/SmsTemplate';
import { SmsRecord } from '../entities/SmsRecord';
import { getTenantRepo } from '../utils/tenantRepo';
import { AppDataSource } from '../config/database';
import { TenantContextManager } from '../utils/tenantContext';
import { tenantRawSQLStrict } from '../utils/tenantHelpers';
import { adminNotificationService } from '../services/AdminNotificationService';

import { log } from '../config/logger';
const router = Router();

router.use(authenticateToken);

// ==================== 模板相关接口 ====================

/**
 * 获取短信模板列表
 * 支持按 status, category, keyword 筛选
 * 🔥 使用原始 Repository 绕过 getTenantRepo 自动过滤，手动处理租户隔离 + 预设模板可见
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { status, category, keyword, page = 1, pageSize = 10 } = req.query;
    const tenantId = TenantContextManager.getTenantId();
    const templateRepository = AppDataSource.getRepository(SmsTemplate);

    const queryBuilder = templateRepository.createQueryBuilder('template');

    // 🔥 核心：本租户模板 OR 预设模板（tenant_id IS NULL 且 is_preset=1）
    queryBuilder.where(
      '(template.tenant_id = :tenantId OR (template.tenant_id IS NULL AND template.is_preset = 1))',
      { tenantId }
    );

    // 排除逻辑删除的模板
    queryBuilder.andWhere('template.status != :deletedStatus', { deletedStatus: 'deleted' });

    if (status) {
      const statusMap: Record<string, string> = {
        'pending': 'pending_admin',
        'approved': 'active'
      };
      const mappedStatus = statusMap[status as string] || status;
      queryBuilder.andWhere('template.status = :status', { status: mappedStatus });
    }

    if (category) {
      queryBuilder.andWhere('template.category = :category', { category });
    }

    if (keyword) {
      queryBuilder.andWhere('(template.name LIKE :keyword OR template.content LIKE :keyword)', {
        keyword: `%${keyword}%`
      });
    }

    queryBuilder.orderBy('template.is_preset', 'DESC');
    queryBuilder.addOrderBy('template.createdAt', 'DESC');

    // 分页
    const skip = (Number(page) - 1) * Number(pageSize);
    queryBuilder.skip(skip).take(Number(pageSize));

    const [templates, total] = await queryBuilder.getManyAndCount();

    res.json({ success: true, code: 200, data: { templates, total, page: Number(page), pageSize: Number(pageSize) }, message: '获取成功' });
  } catch (error) {
    log.error('获取模板失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取模板失败' });
  }
});

/**
 * 获取可用模板列表（active + 预设模板）
 * CRM端使用：仅返回本租户可用的模板
 * 🔥 使用原始 Repository 绕过 getTenantRepo 自动过滤，手动处理租户隔离 + 预设模板可见
 */
router.get('/templates/available', async (req: Request, res: Response) => {
  try {
    const tenantId = TenantContextManager.getTenantId();
    const templateRepository = AppDataSource.getRepository(SmsTemplate);

    const queryBuilder = templateRepository.createQueryBuilder('template');

    // 🔥 核心：本租户的active模板 + 全局预设模板（tenant_id IS NULL 且 is_preset=1 且 active）
    queryBuilder.where(
      '((template.tenant_id = :tenantId AND template.status IN (:...activeStatuses)) OR (template.tenant_id IS NULL AND template.is_preset = 1 AND template.status = :presetActive))',
      { tenantId, activeStatuses: ['active', 'approved'], presetActive: 'active' }
    );
    queryBuilder.andWhere('template.status != :deletedStatus', { deletedStatus: 'deleted' });

    queryBuilder.orderBy('template.is_preset', 'DESC');
    queryBuilder.addOrderBy('template.createdAt', 'DESC');

    const templates = await queryBuilder.getMany();

    res.json({ success: true, code: 200, data: { templates }, message: '获取成功' });
  } catch (error) {
    log.error('获取可用模板失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取可用模板失败' });
  }
});

/**
 * 获取我的模板申请列表
 * CRM端使用：返回当前用户提交的所有模板申请
 */
router.get('/templates/my-applications', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { status } = req.query;
    const templateRepository = getTenantRepo(SmsTemplate);

    const queryBuilder = templateRepository.createQueryBuilder('template');
    queryBuilder.andWhere('template.applicant = :applicant', { applicant: currentUser?.userId });
    queryBuilder.andWhere('template.is_preset = 0');
    queryBuilder.andWhere('template.status != :deletedStatus', { deletedStatus: 'deleted' });

    if (status && status !== 'all') {
      queryBuilder.andWhere('template.status = :status', { status });
    }

    queryBuilder.orderBy('template.createdAt', 'DESC');

    const templates = await queryBuilder.getMany();

    res.json({ success: true, code: 200, data: { templates }, message: '获取成功' });
  } catch (error) {
    log.error('获取我的申请失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取我的申请失败' });
  }
});

/**
 * 申请短信模板（CRM端提交）
 * status 固定为 pending_admin
 */
router.post('/templates/apply', async (req: Request, res: Response) => {
  try {
    const templateRepository = getTenantRepo(SmsTemplate);
    const currentUser = (req as any).user;
    const { name, category, content, variables, description } = req.body;

    if (!name || !content) {
      return res.status(400).json({ success: false, code: 400, message: '模板名称和内容不能为空' });
    }

    const template = templateRepository.create({
      name,
      category: category || 'general',
      content,
      variables: variables || [],
      description: description || '',
      applicant: currentUser?.userId || currentUser?.id || 'unknown',
      applicantName: currentUser?.realName || currentUser?.username || currentUser?.name || '未知用户',
      applicantDept: currentUser?.department || '',
      status: 'pending_admin',
      isPreset: 0
    });

    log.info(`[SMS] 准备保存模板申请: ${JSON.stringify({ name, applicant: template.applicant, status: template.status })}`);
    const savedTemplate = await templateRepository.save(template);

    log.info(`[SMS] 用户 ${template.applicant} 申请了短信模板: ${name}, ID: ${savedTemplate.id}`);

    // 🔥 通知管理后台有新的模板申请
    try {
      await adminNotificationService.notify('sms_template_applied' as any, {
        title: '新短信模板申请',
        content: `用户 ${template.applicantName || template.applicant} 提交了短信模板申请"${name}"，请及时审核。`,
        relatedId: String(savedTemplate.id),
        relatedType: 'sms_template',
        extraData: { templateName: name, applicant: template.applicant, tenantId: savedTemplate.tenantId }
      });
    } catch (notifyErr) {
      log.warn('[SMS] 通知管理后台失败（不影响主流程）:', notifyErr);
    }

    res.status(201).json({ success: true, code: 200, data: savedTemplate, message: '模板申请已提交，等待管理员审核' });
  } catch (error) {
    log.error('申请模板失败:', error);
    res.status(500).json({ success: false, code: 500, message: '申请模板失败' });
  }
});

/**
 * 撤销模板申请（CRM端用户）
 * 仅 pending_admin 状态可撤销
 */
router.post('/templates/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const templateRepository = getTenantRepo(SmsTemplate);
    const { id } = req.params;
    const currentUser = (req as any).user;

    const template = await templateRepository.findOne({ where: { id } });
    if (!template) {
      return res.status(404).json({ success: false, code: 404, message: '模板不存在' });
    }

    // 只能撤销自己的申请
    if (template.applicant !== currentUser?.userId) {
      return res.status(403).json({ success: false, code: 403, message: '无权撤销他人的申请' });
    }

    // 只能在 pending_admin 状态下撤销
    if (template.status !== 'pending_admin' && template.status !== 'pending') {
      return res.status(400).json({ success: false, code: 400, message: '当前状态不可撤销，仅待管理员审核的申请可以撤销' });
    }

    template.status = 'withdrawn';
    await templateRepository.save(template);

    log.info(`用户 ${currentUser?.userId} 撤销了模板申请: ${template.name} (ID: ${id})`);

    res.json({ success: true, code: 200, message: '申请已撤销', data: { id, status: 'withdrawn' } });
  } catch (error) {
    log.error('撤销申请失败:', error);
    res.status(500).json({ success: false, code: 500, message: '撤销申请失败' });
  }
});

/**
 * 删除已拒绝的模板申请（CRM端用户清理）
 * 仅 rejected/withdrawn 状态可删除
 */
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateRepository = getTenantRepo(SmsTemplate);
    const { id } = req.params;
    const currentUser = (req as any).user;

    const template = await templateRepository.findOne({ where: { id } });
    if (!template) {
      return res.status(404).json({ success: false, code: 404, message: '模板不存在' });
    }

    // 只能删除自己的 + rejected/withdrawn
    if (template.applicant !== currentUser?.userId) {
      return res.status(403).json({ success: false, code: 403, message: '无权删除他人的申请' });
    }

    // 只能删除已拒绝或已撤销的模板
    if (!['rejected', 'withdrawn'].includes(template.status)) {
      return res.status(400).json({ success: false, code: 400, message: '仅可删除已拒绝或已撤销的申请' });
    }

    // 逻辑删除
    template.status = 'deleted';
    await templateRepository.save(template);

    log.info(`用户 ${currentUser?.userId} 删除了模板申请: ${template.name} (ID: ${id})`);

    res.json({ success: true, code: 200, message: '已删除' });
  } catch (error) {
    log.error('删除模板失败:', error);
    res.status(500).json({ success: false, code: 500, message: '删除模板失败' });
  }
});

/**
 * 【保留兼容】审核短信模板（租户管理员 → 后续由管理后台接管）
 */
router.post('/templates/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateRepository = getTenantRepo(SmsTemplate);
    const { id } = req.params;
    const { approved } = req.body;
    const currentUser = (req as any).user;

    const template = await templateRepository.findOne({ where: { id } });
    if (!template) {
      return res.status(404).json({ success: false, code: 404, message: '模板不存在' });
    }

    template.status = approved ? 'active' : 'rejected';
    template.approvedBy = currentUser?.userId;
    template.approvedAt = new Date();

    await templateRepository.save(template);

    res.json({
      success: true, code: 200,
      message: approved ? '审核通过' : '审核拒绝',
      data: { id, status: template.status }
    });
  } catch (error) {
    log.error('审核失败:', error);
    res.status(500).json({ success: false, code: 500, message: '审核失败' });
  }
});

// ==================== 发送记录相关接口 ====================

/**
 * 获取短信发送记录
 * 支持 status, keyword, startDate, endDate 筛选
 * 🔥 v1.8.1: 角色数据范围过滤
 *   - admin/super_admin: 查看本租户所有记录
 *   - department_manager: 查看本部门记录
 *   - sales_staff/customer_service: 仅查看个人记录
 */
router.get('/records', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword, startDate, endDate } = req.query;
    const recordRepository = getTenantRepo(SmsRecord);
    const currentUser = (req as any).user;

    const queryBuilder = recordRepository.createQueryBuilder('record');

    // 🔥 角色数据范围过滤
    const userRole = currentUser?.role || '';
    const adminRoles = ['super_admin', 'superadmin', 'admin'];
    if (adminRoles.includes(userRole)) {
      // 管理员：查看本租户所有记录（getTenantRepo已自动过滤租户）
    } else if (userRole === 'department_manager' || userRole === '部门经理') {
      // 部门经理：查看本部门所有记录
      const deptId = currentUser?.department || currentUser?.departmentId || '';
      if (deptId) {
        queryBuilder.andWhere(
          '(record.senderDepartmentId = :deptId OR record.applicantDept = :deptName OR record.applicant = :userId)',
          { deptId, deptName: deptId, userId: currentUser?.userId }
        );
      } else {
        queryBuilder.andWhere('record.applicant = :userId', { userId: currentUser?.userId });
      }
    } else {
      // 普通员工（sales_staff/customer_service等）：仅查看个人记录
      queryBuilder.andWhere(
        '(record.applicant = :userId OR record.senderUserId = :userId)',
        { userId: currentUser?.userId }
      );
    }

    if (status) {
      queryBuilder.andWhere('record.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(record.templateName LIKE :keyword OR record.applicantName LIKE :keyword OR record.content LIKE :keyword OR CAST(record.recipients AS CHAR) LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    if (startDate) {
      queryBuilder.andWhere('record.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('record.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    queryBuilder.orderBy('record.createdAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [records, total] = await queryBuilder.getManyAndCount();

    res.json({ success: true, code: 200, data: { records, total }, message: '获取成功' });
  } catch (error) {
    log.error('获取记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取记录失败' });
  }
});

/**
 * 发送短信
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const recordRepository = getTenantRepo(SmsRecord);
    const currentUser = (req as any).user;
    const { templateId, templateName, recipients, content } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ success: false, code: 400, message: '接收人不能为空' });
    }

    // ====== 短信额度校验（兼容私有部署和SaaS） ======
    const t = tenantRawSQLStrict();
    try {
      const quotaRows = await AppDataSource.query(
        `SELECT config_key, config_value FROM system_config
         WHERE config_key IN ('sms_quota_total', 'sms_quota_used') ${t.sql}`,
        [...t.params]
      );
      let totalQuota = 0, usedQuota = 0;
      for (const r of quotaRows) {
        if (r.config_key === 'sms_quota_total') totalQuota = parseInt(r.config_value) || 0;
        if (r.config_key === 'sms_quota_used') usedQuota = parseInt(r.config_value) || 0;
      }
      const remaining = totalQuota - usedQuota;
      // 只有当已开通额度功能（totalQuota > 0）时才校验
      if (totalQuota > 0 && remaining < recipients.length) {
        return res.status(400).json({
          success: false, code: 400,
          message: `短信额度不足，剩余${remaining}条，需要${recipients.length}条。请先购买额度。`
        });
      }
    } catch (quotaErr: any) {
      log.warn('[SMS] 额度校验跳过:', quotaErr.message);
    }

    // 生成发送详情（从recipients构建每条记录的状态）
    const sendDetails = recipients.map((r: any) => ({
      phone: typeof r === 'string' ? r : (r.phone || r.mobile || ''),
      name: typeof r === 'string' ? '' : (r.name || r.customerName || ''),
      status: 'success',
      sentAt: new Date().toISOString(),
      errorMsg: ''
    }));

    const record = recordRepository.create({
      templateId: templateId ? String(templateId) : null,
      templateName,
      content,
      recipients,
      recipientCount: recipients.length,
      successCount: recipients.length,
      failCount: 0,
      status: 'completed',
      sendDetails,
      applicant: currentUser?.userId,
      applicantName: currentUser?.realName || currentUser?.username,
      applicantDept: currentUser?.department || '',
      senderUserId: currentUser?.userId,
      senderDepartmentId: currentUser?.department || currentUser?.departmentId || '',
      triggerSource: 'manual',
      sentAt: new Date()
    });

    const savedRecord = await recordRepository.save(record);

    // ====== 发送成功后扣减额度（兼容私有部署和SaaS） ======
    try {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = CAST(config_value AS SIGNED) + ?
         WHERE config_key = 'sms_quota_used' ${t.sql}`,
        [recipients.length, ...t.params]
      );
    } catch (deductErr: any) {
      log.warn('[SMS] 额度扣减跳过:', deductErr.message);
    }

    res.json({ success: true, code: 200, data: savedRecord, message: '发送成功' });
  } catch (error) {
    log.error('发送失败:', error);
    res.status(500).json({ success: false, code: 500, message: '发送失败' });
  }
});

// ==================== 统计相关接口 ====================

/**
 * 获取短信统计数据
 * 🔥 v1.8.1: 角色数据范围过滤
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const templateRepository = getTenantRepo(SmsTemplate);
    const recordRepository = getTenantRepo(SmsRecord);
    const currentUser = (req as any).user;
    const userRole = currentUser?.role || '';
    const adminRoles = ['super_admin', 'superadmin', 'admin'];
    const isAdminUser = adminRoles.includes(userRole);

    // 待审核模板（包含旧状态兼容）
    const pendingTemplates = await templateRepository
      .createQueryBuilder('template')
      .where('template.status IN (:...statuses)', { statuses: ['pending_admin', 'pending'] })
      .getCount();

    // 构建记录查询（带角色过滤）
    const buildRecordQuery = () => {
      const qb = recordRepository.createQueryBuilder('record');
      if (!isAdminUser) {
        if (userRole === 'department_manager' || userRole === '部门经理') {
          const deptId = currentUser?.department || currentUser?.departmentId || '';
          if (deptId) {
            qb.andWhere(
              '(record.senderDepartmentId = :deptId OR record.applicantDept = :deptName OR record.applicant = :userId)',
              { deptId, deptName: deptId, userId: currentUser?.userId }
            );
          } else {
            qb.andWhere('record.applicant = :userId', { userId: currentUser?.userId });
          }
        } else {
          qb.andWhere('(record.applicant = :userId OR record.senderUserId = :userId)', { userId: currentUser?.userId });
        }
      }
      return qb;
    };

    // 总发送量
    const totalSentResult = await buildRecordQuery()
      .select('SUM(record.successCount)', 'total')
      .getRawOne();

    // 今日发送量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySentResult = await buildRecordQuery()
      .select('SUM(record.successCount)', 'total')
      .andWhere('record.sentAt >= :today', { today })
      .getRawOne();

    // 🔥 非管理员的个人统计
    let myPendingCount = 0;
    let myApprovedCount = 0;
    if (!isAdminUser) {
      try {
        // 我的待审核申请数（模板申请中 pending_admin 的）
        myPendingCount = await templateRepository
          .createQueryBuilder('template')
          .where('template.applicant = :userId', { userId: currentUser?.userId })
          .andWhere('template.status IN (:...statuses)', { statuses: ['pending_admin', 'pending'] })
          .getCount();
        // 我的已通过申请数
        myApprovedCount = await templateRepository
          .createQueryBuilder('template')
          .where('template.applicant = :userId', { userId: currentUser?.userId })
          .andWhere('template.status = :status', { status: 'active' })
          .getCount();
      } catch (statErr) {
        log.warn('[SMS] 个人统计查询失败:', statErr);
      }
    }

    res.json({
      success: true, code: 200,
      data: {
        pendingTemplates: isAdminUser ? pendingTemplates : 0,
        pendingSms: 0,
        todaySent: todaySentResult?.total || 0,
        totalSent: totalSentResult?.total || 0,
        myPendingCount,
        myApprovedCount
      },
      message: '获取成功'
    });
  } catch (error) {
    log.error('获取统计失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取统计失败' });
  }
});

// ==================== 变量文档接口 ====================

/**
 * 获取短信模板变量文档
 * 返回所有预定义的模板变量及说明
 */
router.get('/variable-docs', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      code: 200,
      data: { variables: SMS_TEMPLATE_VARIABLES },
      message: '获取成功'
    });
  } catch (error) {
    log.error('获取变量文档失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取变量文档失败' });
  }
});

/**
 * 短信模板预定义变量库
 * 覆盖多行业、多场景、多客户类型
 */
const SMS_TEMPLATE_VARIABLES = [
  // ====== 客户信息 ======
  { name: '{customerName}', label: '客户姓名', example: '张先生', category: '客户信息', description: '客户的姓名或称呼' },
  { name: '{phone}', label: '客户手机号', example: '138****8888', category: '客户信息', description: '客户的联系手机号（建议脱敏显示）' },
  { name: '{email}', label: '客户邮箱', example: 'zhang@example.com', category: '客户信息', description: '客户的联系邮箱' },
  { name: '{customerNo}', label: '客户编号', example: 'CUS20240115001', category: '客户信息', description: '系统分配的客户唯一编号' },
  { name: '{gender}', label: '客户性别称谓', example: '先生/女士', category: '客户信息', description: '根据客户性别自动填入称谓' },
  { name: '{memberLevel}', label: '会员等级', example: '黄金会员', category: '客户信息', description: '客户的会员等级名称' },
  { name: '{memberPoints}', label: '会员积分', example: '12580', category: '客户信息', description: '客户当前可用积分' },
  { name: '{contactPerson}', label: '联系人', example: '李经理', category: '客户信息', description: '企业客户的对接联系人' },

  // ====== 订单信息 ======
  { name: '{orderNo}', label: '订单编号', example: 'ORD20240115001', category: '订单信息', description: '订单唯一编号' },
  { name: '{amount}', label: '订单金额', example: '299.00', category: '订单信息', description: '订单总金额（元）' },
  { name: '{paidAmount}', label: '已付金额', example: '199.00', category: '订单信息', description: '客户已支付的金额' },
  { name: '{unpaidAmount}', label: '未付金额', example: '100.00', category: '订单信息', description: '客户尚未支付的金额' },
  { name: '{orderStatus}', label: '订单状态', example: '已确认', category: '订单信息', description: '订单当前状态' },
  { name: '{orderDate}', label: '下单日期', example: '2024-01-15', category: '订单信息', description: '客户下单时间' },
  { name: '{orderItems}', label: '订单商品', example: '商品A x2、商品B x1', category: '订单信息', description: '订单包含的商品摘要' },
  { name: '{paymentMethod}', label: '支付方式', example: '微信支付', category: '订单信息', description: '客户使用的支付方式' },
  { name: '{paymentDeadline}', label: '付款截止时间', example: '2024-01-16 23:59', category: '订单信息', description: '订单付款的截止时间' },

  // ====== 商品信息 ======
  { name: '{productName}', label: '商品名称', example: '精品商务套装', category: '商品信息', description: '商品的名称' },
  { name: '{productPrice}', label: '商品价格', example: '599.00', category: '商品信息', description: '商品单价（元）' },
  { name: '{productSpec}', label: '商品规格', example: 'XL码/黑色', category: '商品信息', description: '商品的规格型号' },
  { name: '{productQty}', label: '商品数量', example: '2', category: '商品信息', description: '商品购买数量' },
  { name: '{productCategory}', label: '商品分类', example: '服饰/男装', category: '商品信息', description: '商品所属分类' },
  { name: '{skuCode}', label: 'SKU编码', example: 'SKU-20240115-001', category: '商品信息', description: '商品SKU唯一编码' },

  // ====== 物流信息 ======
  { name: '{trackingNo}', label: '物流单号', example: 'SF1234567890', category: '物流信息', description: '快递运单号' },
  { name: '{expressCompany}', label: '快递公司', example: '顺丰速运', category: '物流信息', description: '快递公司名称' },
  { name: '{deliveryDate}', label: '预计送达日期', example: '2024-01-16', category: '物流信息', description: '预计送达的日期' },
  { name: '{deliveryTime}', label: '预计送达时间', example: '2024-01-16 14:00', category: '物流信息', description: '预计送达的具体时间' },
  { name: '{trackingUrl}', label: '物流查询链接', example: 'https://t.cn/xxx', category: '物流信息', description: '物流查询的短链接' },
  { name: '{senderAddress}', label: '发货地址', example: '广州市天河区', category: '物流信息', description: '商品的发货地' },
  { name: '{receiverAddress}', label: '收货地址', example: '北京市朝阳区XX路', category: '物流信息', description: '客户的收货地址（脱敏）' },
  { name: '{pickupCode}', label: '取件码', example: '6-8-9-2', category: '物流信息', description: '快递柜取件码' },
  { name: '{pickupLocation}', label: '取件地点', example: '丰巢柜-小区北门', category: '物流信息', description: '取件的具体位置' },

  // ====== 公司/品牌信息 ======
  { name: '{companyName}', label: '公司名称', example: 'XX科技有限公司', category: '公司信息', description: '发送方的公司名称' },
  { name: '{brandName}', label: '品牌名称', example: 'XX品牌', category: '公司信息', description: '发送方的品牌名称' },
  { name: '{shopName}', label: '店铺名称', example: 'XX旗舰店', category: '公司信息', description: '店铺/门店名称' },
  { name: '{serviceHotline}', label: '服务热线', example: '400-123-4567', category: '公司信息', description: '客服电话号码' },
  { name: '{website}', label: '网站地址', example: 'www.example.com', category: '公司信息', description: '官方网站地址' },
  { name: '{wechatOA}', label: '微信公众号', example: 'XX官方', category: '公司信息', description: '微信公众号名称' },
  { name: '{storeAddress}', label: '门店地址', example: '广州市天河区XX路100号', category: '公司信息', description: '线下门店地址' },

  // ====== 验证/安全 ======
  { name: '{code}', label: '验证码', example: '123456', category: '验证安全', description: '短信验证码' },
  { name: '{minutes}', label: '有效分钟数', example: '5', category: '验证安全', description: '验证码有效期（分钟）' },
  { name: '{newPassword}', label: '新密码', example: '******', category: '验证安全', description: '重置后的新密码' },
  { name: '{loginIp}', label: '登录IP', example: '192.168.1.100', category: '验证安全', description: '账户登录的IP地址' },
  { name: '{loginTime}', label: '登录时间', example: '2024-01-15 14:30', category: '验证安全', description: '账户登录的时间' },
  { name: '{loginDevice}', label: '登录设备', example: 'iPhone 15', category: '验证安全', description: '账户登录的设备名称' },

  // ====== 营销/促销 ======
  { name: '{discount}', label: '折扣', example: '8', category: '营销促销', description: '折扣力度（如8代表8折）' },
  { name: '{couponCode}', label: '优惠券码', example: 'VIP2024', category: '营销促销', description: '优惠券兑换码' },
  { name: '{couponAmount}', label: '优惠券金额', example: '50', category: '营销促销', description: '优惠券面值（元）' },
  { name: '{couponExpiry}', label: '优惠券有效期', example: '2024-02-28', category: '营销促销', description: '优惠券到期日期' },
  { name: '{activityName}', label: '活动名称', example: '新春大促', category: '营销促销', description: '促销活动名称' },
  { name: '{activityContent}', label: '活动内容', example: '全场3折起', category: '营销促销', description: '促销活动的简要描述' },
  { name: '{giftName}', label: '赠品名称', example: '精美礼盒', category: '营销促销', description: '赠品/赠品活动名称' },
  { name: '{inviteCode}', label: '邀请码', example: 'INV2024ABC', category: '营销促销', description: '邀请注册码' },
  { name: '{inviteUrl}', label: '邀请链接', example: 'https://t.cn/invite', category: '营销促销', description: '邀请注册短链接' },
  { name: '{rewardAmount}', label: '奖励金额', example: '10.00', category: '营销促销', description: '活动奖励金额' },
  { name: '{eventName}', label: '事件/活动名称', example: '年度客户答谢会', category: '营销促销', description: '举办的活动名称' },
  { name: '{eventDate}', label: '活动日期', example: '2024-02-10', category: '营销促销', description: '活动举办日期' },

  // ====== 通用日期/时间 ======
  { name: '{startDate}', label: '开始日期', example: '2024-01-01', category: '通用时间', description: '时间范围的起始日期' },
  { name: '{endDate}', label: '结束日期', example: '2024-01-31', category: '通用时间', description: '时间范围的结束日期' },
  { name: '{startTime}', label: '开始时间', example: '09:00', category: '通用时间', description: '时间范围的起始时间' },
  { name: '{endTime}', label: '结束时间', example: '18:00', category: '通用时间', description: '时间范围的结束时间' },
  { name: '{date}', label: '日期', example: '2024-01-15', category: '通用时间', description: '通用日期' },
  { name: '{time}', label: '时间', example: '14:30', category: '通用时间', description: '通用时间' },
  { name: '{year}', label: '年份', example: '2024', category: '通用时间', description: '年份' },
  { name: '{month}', label: '月份', example: '1月', category: '通用时间', description: '月份' },

  // ====== 服务/售后 ======
  { name: '{serviceName}', label: '服务名称', example: '售后维修', category: '服务售后', description: '服务项目名称' },
  { name: '{ticketNo}', label: '工单编号', example: 'TK20240115001', category: '服务售后', description: '售后/服务工单编号' },
  { name: '{serviceResult}', label: '处理结果', example: '已维修完成', category: '服务售后', description: '服务工单的处理结果' },
  { name: '{serviceRemark}', label: '服务备注', example: '已更换零部件', category: '服务售后', description: '服务处理的备注说明' },
  { name: '{returnNo}', label: '退货编号', example: 'RT20240115001', category: '服务售后', description: '退货退款编号' },
  { name: '{refundAmount}', label: '退款金额', example: '199.00', category: '服务售后', description: '退款金额（元）' },
  { name: '{refundReason}', label: '退款原因', example: '商品质量问题', category: '服务售后', description: '退款的原因' },
  { name: '{warrantyExpiry}', label: '保修到期日', example: '2025-01-15', category: '服务售后', description: '产品保修到期日期' },

  // ====== 预约/会议 ======
  { name: '{appointmentDate}', label: '预约日期', example: '2024-01-20', category: '预约会议', description: '服务预约的日期' },
  { name: '{appointmentTime}', label: '预约时间', example: '14:00-15:00', category: '预约会议', description: '服务预约的时间段' },
  { name: '{meetingTitle}', label: '会议主题', example: '季度销售总结会', category: '预约会议', description: '会议名称/主题' },
  { name: '{meetingDate}', label: '会议日期', example: '2024-01-20', category: '预约会议', description: '会议举办日期' },
  { name: '{meetingTime}', label: '会议时间', example: '14:00', category: '预约会议', description: '会议开始时间' },
  { name: '{meetingRoom}', label: '会议室', example: '3楼-大会议室', category: '预约会议', description: '会议室名称/位置' },
  { name: '{location}', label: '地点', example: '广州市天河区XX大厦', category: '预约会议', description: '通用地点信息' },
  { name: '{address}', label: '详细地址', example: '广州市天河区XX路100号3层', category: '预约会议', description: '详细地址信息' },
  { name: '{contact}', label: '联系人', example: '王助理', category: '预约会议', description: '活动/会议联系人' },
  { name: '{contactPhone}', label: '联系电话', example: '020-12345678', category: '预约会议', description: '联系人电话' },
  { name: '{venue}', label: '场地', example: '国际会展中心', category: '预约会议', description: '活动举办场地' },

  // ====== 财务/账户 ======
  { name: '{balance}', label: '账户余额', example: '1580.00', category: '财务账户', description: '账户当前余额（元）' },
  { name: '{invoiceNo}', label: '发票编号', example: 'INV20240115001', category: '财务账户', description: '发票编号' },
  { name: '{invoiceAmount}', label: '发票金额', example: '5000.00', category: '财务账户', description: '发票金额（元）' },
  { name: '{contractNo}', label: '合同编号', example: 'CON20240115001', category: '财务账户', description: '合同编号' },
  { name: '{renewalDate}', label: '续费日期', example: '2024-02-15', category: '财务账户', description: '服务续费到期日期' },
  { name: '{renewalAmount}', label: '续费金额', example: '3980.00', category: '财务账户', description: '续费应付金额（元）' },
  { name: '{accountName}', label: '账户名称', example: 'XX公司', category: '财务账户', description: '收/付款账户名称' },

  // ====== 教育/培训 ======
  { name: '{courseName}', label: '课程名称', example: 'Python入门', category: '教育培训', description: '课程/培训名称' },
  { name: '{teacherName}', label: '讲师姓名', example: '张老师', category: '教育培训', description: '授课讲师名称' },
  { name: '{className}', label: '班级名称', example: '2024春季班', category: '教育培训', description: '班级/期次名称' },
  { name: '{examDate}', label: '考试日期', example: '2024-03-15', category: '教育培训', description: '考试/测验日期' },
  { name: '{score}', label: '成绩/分数', example: '92', category: '教育培训', description: '考试/测评分数' },
  { name: '{enrollment}', label: '报名信息', example: '已成功报名', category: '教育培训', description: '报名状态说明' },

  // ====== 医疗/健康 ======
  { name: '{doctorName}', label: '医生姓名', example: '张医生', category: '医疗健康', description: '医生/顾问姓名' },
  { name: '{department}', label: '科室名称', example: '内科', category: '医疗健康', description: '就诊科室名称' },
  { name: '{hospitalName}', label: '医院名称', example: 'XX人民医院', category: '医疗健康', description: '医院/机构名称' },
  { name: '{visitDate}', label: '就诊日期', example: '2024-01-20', category: '医疗健康', description: '预约就诊日期' },
  { name: '{visitTime}', label: '就诊时间', example: '10:30', category: '医疗健康', description: '预约就诊时间' },
  { name: '{queueNo}', label: '排队号', example: 'A015', category: '医疗健康', description: '排队叫号' },

  // ====== 餐饮/酒店 ======
  { name: '{reservationNo}', label: '预订编号', example: 'RSV20240115001', category: '餐饮酒店', description: '预订订单编号' },
  { name: '{checkInDate}', label: '入住日期', example: '2024-01-20', category: '餐饮酒店', description: '酒店入住日期' },
  { name: '{checkOutDate}', label: '退房日期', example: '2024-01-22', category: '餐饮酒店', description: '酒店退房日期' },
  { name: '{roomType}', label: '房型', example: '豪华大床房', category: '餐饮酒店', description: '预订的房间类型' },
  { name: '{guestCount}', label: '入住人数', example: '2', category: '餐饮酒店', description: '入住人数' },
  { name: '{tableNo}', label: '桌号', example: 'A8', category: '餐饮酒店', description: '餐厅桌号' },
  { name: '{mealTime}', label: '用餐时间', example: '12:00', category: '餐饮酒店', description: '预订用餐时间' },
  { name: '{dinerCount}', label: '用餐人数', example: '6', category: '餐饮酒店', description: '用餐人数' },

  // ====== 房产/物业 ======
  { name: '{propertyName}', label: '楼盘/小区名', example: 'XX花园', category: '房产物业', description: '楼盘或小区名称' },
  { name: '{unitNo}', label: '房号', example: '3栋2单元1501', category: '房产物业', description: '具体房间号' },
  { name: '{propertyFee}', label: '物业费', example: '580.00', category: '房产物业', description: '物业费金额（元）' },
  { name: '{maintenanceDate}', label: '维修日期', example: '2024-01-18', category: '房产物业', description: '物业维修日期' },
  { name: '{parkingNo}', label: '车位号', example: 'B2-088', category: '房产物业', description: '停车位编号' },

  // ====== 汽车/出行 ======
  { name: '{vehicleNo}', label: '车牌号', example: '粤A12345', category: '汽车出行', description: '车辆牌照号码' },
  { name: '{vehicleModel}', label: '车型', example: '宝马3系', category: '汽车出行', description: '车辆品牌型号' },
  { name: '{insuranceExpiry}', label: '保险到期日', example: '2024-06-30', category: '汽车出行', description: '车险到期日期' },
  { name: '{inspectionDate}', label: '年检日期', example: '2024-03-15', category: '汽车出行', description: '车辆年检日期' },
  { name: '{serviceItem}', label: '保养项目', example: '机油更换+空调滤芯', category: '汽车出行', description: '汽车保养维修项目' },
  { name: '{flightNo}', label: '航班号', example: 'CZ3901', category: '汽车出行', description: '航班号码' },
  { name: '{trainNo}', label: '车次', example: 'G1234', category: '汽车出行', description: '火车车次号' },
  { name: '{seatNo}', label: '座位号', example: '5车6A', category: '汽车出行', description: '座位号码' },
  { name: '{departStation}', label: '出发站', example: '广州南站', category: '汽车出行', description: '出发站点/机场' },
  { name: '{arriveStation}', label: '到达站', example: '北京西站', category: '汽车出行', description: '到达站点/机场' },
  { name: '{departTime}', label: '出发时间', example: '2024-01-20 08:30', category: '汽车出行', description: '出发时间' },

  // ====== 通用内容 ======
  { name: '{content}', label: '自定义内容', example: '具体内容', category: '通用内容', description: '自定义填入的文本内容' },
  { name: '{link}', label: '链接', example: 'https://t.cn/xxx', category: '通用内容', description: '短链接地址' },
  { name: '{remark}', label: '备注', example: '请及时处理', category: '通用内容', description: '附加备注信息' },
  { name: '{reason}', label: '原因', example: '系统升级维护', category: '通用内容', description: '事件/操作的原因说明' },
  { name: '{result}', label: '结果', example: '处理完成', category: '通用内容', description: '处理/操作结果' },
  { name: '{number}', label: '数量/编号', example: '3', category: '通用内容', description: '通用数量或编号' },
  { name: '{title}', label: '标题', example: '重要通知', category: '通用内容', description: '通用标题文本' },
  { name: '{status}', label: '状态', example: '已完成', category: '通用内容', description: '通用状态描述' }
];

// ==================== 客户搜索（数据范围过滤）====================

/**
 * 搜索可发短信的客户（按用户数据范围过滤）
 * 🔥 v1.8.1: 员工只能选自己的客户，经理看部门，管理员看全部
 */
router.get('/customers/search', async (req: Request, res: Response) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const currentUser = (req as any).user;
    const userRole = currentUser?.role || '';
    const adminRoles = ['super_admin', 'superadmin', 'admin'];

    const { Customer } = await import('../entities/Customer');
    const customerRepository = getTenantRepo(Customer);
    const qb = customerRepository.createQueryBuilder('c');

    // 数据范围过滤
    if (adminRoles.includes(userRole)) {
      // 管理员看全部
    } else if (userRole === 'department_manager' || userRole === '部门经理') {
      // 部门经理看本部门
      const deptId = currentUser?.department || currentUser?.departmentId || '';
      if (deptId) {
        // 需要获取本部门所有用户ID
        const { User } = await import('../entities/User');
        const userRepo = getTenantRepo(User);
        const deptUsers = await userRepo.createQueryBuilder('u')
          .select('u.id')
          .where('u.department = :dept OR u.departmentName = :dept', { dept: deptId })
          .getMany();
        const deptUserIds = deptUsers.map(u => u.id);
        if (deptUserIds.length > 0) {
          qb.andWhere('(c.salesPersonId IN (:...deptUserIds) OR c.createdBy IN (:...deptUserIds))', { deptUserIds });
        }
      }
    } else {
      // 普通员工只能看自己的客户
      qb.andWhere('(c.salesPersonId = :userId OR c.createdBy = :userId)', { userId: currentUser?.userId });
    }

    // 关键词搜索
    if (keyword) {
      qb.andWhere('(c.name LIKE :kw OR c.phone LIKE :kw OR c.customerNo LIKE :kw)', { kw: `%${keyword}%` });
    }

    // 只返回有手机号的客户
    qb.andWhere('c.phone IS NOT NULL AND c.phone != :empty', { empty: '' });

    qb.orderBy('c.createdAt', 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize));
    qb.take(Number(pageSize));

    const [customers, total] = await qb.getManyAndCount();

    const list = customers.map((c: any) => ({
      id: c.id,
      name: c.name || c.customerName || '',
      phone: c.phone || '',
      company: c.company || '',
      level: c.level || '',
      tags: c.tags || [],
      customerNo: c.customerNo || '',
      gender: c.gender || '',
      email: c.email || '',
      address: c.address || ''
    }));

    res.json({ success: true, data: { list, total } });
  } catch (error) {
    log.error('搜索客户失败:', error);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

export default router;
