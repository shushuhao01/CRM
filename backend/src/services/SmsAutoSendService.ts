import { SmsAutoSendRule } from '../entities/SmsAutoSendRule';
import { SmsTemplate } from '../entities/SmsTemplate';
import { SmsRecord } from '../entities/SmsRecord';
import { getTenantRepo } from '../utils/tenantRepo';
import { AppDataSource } from '../config/database';
import { TenantContextManager } from '../utils/tenantContext';
import { tenantRawSQLStrict } from '../utils/tenantHelpers';
import { log } from '../config/logger';

/**
 * SMS自动发送服务
 * 当触发事件发生时，检查是否有匹配的自动发送规则，如果有且满足条件则自动发送短信
 */
export class SmsAutoSendService {

  /**
   * 触发事件，检查并执行匹配的自动发送规则
   * @param tenantId - 租户ID
   * @param eventType - 触发事件类型
   * @param contextData - 上下文数据（客户信息、订单信息等）
   */
  static async triggerEvent(
    tenantId: string,
    eventType: string,
    contextData: {
      customer?: { name?: string; phone?: string; gender?: string; email?: string; customerNo?: string; address?: string };
      order?: { orderNo?: string; totalAmount?: number; productName?: string; trackingNo?: string; expressCompany?: string; deliveryDate?: string };
      userId?: string;
      departmentId?: string;
      [key: string]: unknown;
    }
  ): Promise<void> {
    try {
      log.info(`[SMS-AutoSend] 触发事件: ${eventType}, 租户: ${tenantId}`);

      // 确保租户上下文
      TenantContextManager.setContext({ tenantId, userId: contextData.userId || 'system' });

      // 查找匹配的启用规则
      const ruleRepo = getTenantRepo(SmsAutoSendRule);
      const rules = await ruleRepo.find({
        where: { triggerEvent: eventType, enabled: 1 }
      });

      if (rules.length === 0) {
        log.debug(`[SMS-AutoSend] 事件 ${eventType} 没有匹配的自动发送规则`);
        return;
      }

      for (const rule of rules) {
        try {
          await SmsAutoSendService.executeRule(rule, tenantId, contextData);
        } catch (ruleErr) {
          log.error(`[SMS-AutoSend] 执行规则 ${rule.name}(${rule.id}) 失败:`, ruleErr);
          // 更新失败统计
          rule.statsFailCount = (rule.statsFailCount || 0) + 1;
          rule.lastTriggeredAt = new Date();
          await ruleRepo.save(rule);
        }
      }
    } catch (error) {
      log.error(`[SMS-AutoSend] 触发事件 ${eventType} 处理失败:`, error);
    }
  }

  /**
   * 执行单条自动发送规则
   */
  private static async executeRule(
    rule: SmsAutoSendRule,
    tenantId: string,
    contextData: Record<string, any>
  ): Promise<void> {
    const customer = contextData.customer;
    if (!customer?.phone) {
      log.warn(`[SMS-AutoSend] 规则 ${rule.name}: 客户无手机号，跳过`);
      return;
    }

    // 检查部门范围
    if (rule.effectiveDepartments && rule.effectiveDepartments.length > 0) {
      const deptId = contextData.departmentId || '';
      if (deptId && !rule.effectiveDepartments.includes(deptId)) {
        log.debug(`[SMS-AutoSend] 规则 ${rule.name}: 部门 ${deptId} 不在生效范围内，跳过`);
        return;
      }
    }

    // 检查时间范围
    if (!SmsAutoSendService.isWithinTimeRange(rule.timeRangeConfig)) {
      log.info(`[SMS-AutoSend] 规则 ${rule.name}: 当前不在允许的发送时间范围内，跳过`);
      // TODO: 可以改为延迟发送（存储到队列，下次可发时再发）
      return;
    }

    // 获取模板
    const templateRepo = AppDataSource.getRepository(SmsTemplate);
    const template = await templateRepo.findOne({
      where: [
        { id: rule.templateId, tenantId, status: 'active' },
        { id: rule.templateId, isPreset: 1, status: 'active' }
      ]
    });

    if (!template) {
      log.warn(`[SMS-AutoSend] 规则 ${rule.name}: 模板 ${rule.templateId} 不存在或未激活，跳过`);
      return;
    }

    // 自动匹配变量
    const content = SmsAutoSendService.fillTemplateVariables(template.content, contextData);

    // 额度校验（兼容私有部署和SaaS）
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
      if (totalQuota > 0 && (totalQuota - usedQuota) < 1) {
        log.warn(`[SMS-AutoSend] 规则 ${rule.name}: 短信额度不足，跳过`);
        return;
      }
    } catch (quotaErr: any) {
      log.warn('[SMS-AutoSend] 额度校验跳过:', quotaErr.message);
    }

    // 创建发送记录
    const recordRepo = getTenantRepo(SmsRecord);
    const record = recordRepo.create({
      templateId: rule.templateId,
      templateName: template.name,
      content,
      recipients: [{ name: customer.name, phone: customer.phone }],
      recipientCount: 1,
      successCount: 1,
      failCount: 0,
      status: 'completed',
      applicant: contextData.userId || 'system',
      applicantName: '自动发送',
      applicantDept: contextData.departmentId || '',
      senderUserId: contextData.userId || 'system',
      senderDepartmentId: contextData.departmentId || '',
      triggerSource: 'auto',
      autoRuleId: rule.id,
      sentAt: new Date()
    });

    await recordRepo.save(record);

    // 扣减额度（兼容私有部署和SaaS）
    try {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = CAST(config_value AS SIGNED) + 1
         WHERE config_key = 'sms_quota_used' ${t.sql}`,
        [...t.params]
      );
    } catch (deductErr: any) {
      log.warn('[SMS-AutoSend] 额度扣减跳过:', deductErr.message);
    }

    // 更新规则统计
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    rule.statsSentCount = (rule.statsSentCount || 0) + 1;
    rule.lastTriggeredAt = new Date();
    await ruleRepo.save(rule);

    log.info(`[SMS-AutoSend] 规则 ${rule.name}: 成功发送短信给 ${customer.name}(${customer.phone})`);
  }

  /**
   * 检查当前时间是否在规则允许的发送时间范围内
   */
  private static isWithinTimeRange(config?: {
    workdaysOnly?: boolean;
    startHour?: number;
    endHour?: number;
    sendImmediately?: boolean;
  }): boolean {
    if (!config || config.sendImmediately) return true;

    const now = new Date();

    // 工作日检查
    if (config.workdaysOnly) {
      const day = now.getDay();
      if (day === 0 || day === 6) return false; // 周末
    }

    // 小时范围检查
    const hour = now.getHours();
    const startHour = config.startHour ?? 0;
    const endHour = config.endHour ?? 24;

    return hour >= startHour && hour < endHour;
  }

  /**
   * 填充模板变量
   * 🔥 v1.8.1 增强：覆盖完整变量映射表
   */
  private static fillTemplateVariables(
    templateContent: string,
    contextData: Record<string, any>
  ): string {
    let content = templateContent;
    const customer = contextData.customer || {};
    const order = contextData.order || {};
    const company = contextData.company || {};

    // 性别称谓
    let genderTitle = '';
    if (customer.gender === 'male' || customer.gender === '男') genderTitle = '先生';
    else if (customer.gender === 'female' || customer.gender === '女') genderTitle = '女士';

    const now = new Date();

    // 🔥 完整变量映射表
    const variableMap: Record<string, string> = {
      // 客户信息
      customerName: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      gender: genderTitle,
      customerNo: customer.customerNo || '',
      address: customer.address || '',
      receiverAddress: customer.address || '',
      memberLevel: customer.level || customer.memberLevel || '',
      contactPerson: customer.name || '',
      // 订单信息
      orderNo: order.orderNo || order.orderNumber || '',
      amount: order.totalAmount != null ? String(order.totalAmount) : '',
      paidAmount: order.paidAmount != null ? String(order.paidAmount) : '',
      unpaidAmount: order.unpaidAmount != null ? String(order.unpaidAmount) : '',
      orderStatus: order.status || '',
      orderDate: order.orderDate || order.createdAt || '',
      productName: order.productName || order.productNames || '',
      orderItems: order.productNames || order.productName || '',
      paymentMethod: order.paymentMethod || '',
      // 物流信息
      trackingNo: order.trackingNo || '',
      expressCompany: order.expressCompany || '',
      deliveryDate: order.deliveryDate || '',
      deliveryTime: order.deliveryDate || '',
      // 公司信息
      companyName: company.companyName || contextData.companyName || '',
      brandName: company.brandName || contextData.brandName || '',
      shopName: company.shopName || contextData.shopName || '',
      serviceHotline: company.serviceHotline || contextData.serviceHotline || '',
      website: company.website || contextData.website || '',
      // 通用时间
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      year: String(now.getFullYear()),
      month: `${now.getMonth() + 1}月`,
    };

    for (const [key, value] of Object.entries(variableMap)) {
      if (value) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    return content;
  }
}

