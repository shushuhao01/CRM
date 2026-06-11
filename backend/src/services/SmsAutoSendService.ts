import { SmsAutoSendRule } from '../entities/SmsAutoSendRule';
import { SmsTemplate } from '../entities/SmsTemplate';
import { SmsRecord } from '../entities/SmsRecord';
import { getTenantRepo } from '../utils/tenantRepo';
import { AppDataSource } from '../config/database';
import { TenantContextManager } from '../utils/tenantContext';
import { tenantRawSQLStrict } from '../utils/tenantHelpers';
import { aliyunSmsService } from './AliyunSmsService';
import { resolveSmsSignName, stripSmsSignPrefix, applySmsSignature } from '../utils/smsSignature';
import { SmsQuotaNotifyService } from './SmsQuotaNotifyService';
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

    // 🔥 签名处理：开头【...】是服务商签名而非模板变量
    // SaaS=平台签名（管理后台 sms_config），私有部署=CRM系统设置签名（回退平台签名）
    const signName = await resolveSmsSignName();
    const baseTemplateContent = signName ? stripSmsSignPrefix(template.content) : template.content;

    // 自动匹配变量（基于去掉签名段后的模板正文），再前置真实签名
    const content = applySmsSignature(
      SmsAutoSendService.fillTemplateVariables(baseTemplateContent, contextData),
      signName
    );

    // 额度校验（兼容私有部署和SaaS）：额度用完暂停发送，如实记录失败并通知管理员
    const t = tenantRawSQLStrict();
    let quotaInsufficient = false;
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
        quotaInsufficient = true;
      }
    } catch (quotaErr: any) {
      log.warn('[SMS-AutoSend] 额度校验跳过:', quotaErr.message);
    }

    if (quotaInsufficient) {
      log.warn(`[SMS-AutoSend] 规则 ${rule.name}: 短信额度不足，已暂停发送`);
      // 如实记录失败
      const quotaFailRepo = getTenantRepo(SmsRecord);
      const quotaFailRecord = quotaFailRepo.create({
        templateId: rule.templateId,
        templateName: template.name,
        content,
        recipients: [{ name: customer.name, phone: customer.phone }],
        recipientCount: 1,
        successCount: 0,
        failCount: 1,
        status: 'failed',
        sendDetails: [{
          phone: customer.phone,
          name: customer.name || '',
          status: 'failed',
          sentAt: new Date().toISOString(),
          errorMsg: '短信额度不足，已暂停发送'
        }],
        remark: '发送失败：短信额度不足，已暂停发送',
        applicant: contextData.userId || 'system',
        applicantName: '自动发送',
        applicantDept: contextData.departmentId || '',
        senderUserId: contextData.userId || 'system',
        senderDepartmentId: contextData.departmentId || '',
        triggerSource: 'auto',
        autoRuleId: rule.id,
        sentAt: new Date()
      });
      await quotaFailRepo.save(quotaFailRecord);

      // 更新规则失败统计
      const quotaRuleRepo = getTenantRepo(SmsAutoSendRule);
      rule.statsFailCount = (rule.statsFailCount || 0) + 1;
      rule.lastTriggeredAt = new Date();
      await quotaRuleRepo.save(rule);

      // 🔥 通知管理员：因额度不足，自动发送给该客户的短信失败
      SmsQuotaNotifyService.notifyQuotaSendFailure(
        `自动发送（规则：${rule.name}）`,
        [{ name: customer.name, phone: customer.phone }],
        content
      ).catch(err => log.warn('[SMS-AutoSend] 额度不足通知失败:', err));
      return;
    }

    // 🔥 真实发送：通过短信通道发送，未配置通道/无服务商CODE时如实记为失败
    // 模板参数基于去掉签名段后的正文提取（签名由服务商按 signName 自动添加，不是模板参数）
    const variableMap = SmsAutoSendService.buildVariableMap(contextData);
    const varNames = [...new Set((baseTemplateContent.match(/\{(\w+)\}/g) || []).map(m => m.slice(1, -1)))];
    const templateParams: Record<string, string> = {};
    for (const v of varNames) templateParams[v] = variableMap[v] || '';

    const sendResult = await aliyunSmsService.sendBusinessSms(
      customer.phone,
      template.vendorTemplateCode || '',
      templateParams
    );
    const sendOk = sendResult.success === true;
    const errorMsg = sendOk ? '' : (sendResult.message || '发送失败');

    // 创建发送记录（如实记录成功/失败）
    const recordRepo = getTenantRepo(SmsRecord);
    const record = recordRepo.create({
      templateId: rule.templateId,
      templateName: template.name,
      content,
      recipients: [{ name: customer.name, phone: customer.phone }],
      recipientCount: 1,
      successCount: sendOk ? 1 : 0,
      failCount: sendOk ? 0 : 1,
      status: sendOk ? 'completed' : 'failed',
      sendDetails: [{
        phone: customer.phone,
        name: customer.name || '',
        status: sendOk ? 'success' : 'failed',
        sentAt: new Date().toISOString(),
        errorMsg
      }],
      remark: sendOk ? '' : `发送失败：${errorMsg}`,
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

    // 仅发送成功才扣减额度（兼容私有部署和SaaS），并触发额度预警检查
    if (sendOk) {
      try {
        await AppDataSource.query(
          `UPDATE system_config SET config_value = CAST(config_value AS SIGNED) + 1
           WHERE config_key = 'sms_quota_used' ${t.sql}`,
          [...t.params]
        );
      } catch (deductErr: any) {
        log.warn('[SMS-AutoSend] 额度扣减跳过:', deductErr.message);
      }
      // 🔥 扣减后检查额度预警（100/50/10/用完，通知租户管理员）
      await SmsQuotaNotifyService.checkQuotaWarning().catch(() => { /* 预警失败不影响主流程 */ });
    }

    // 更新规则统计（如实区分成功/失败）
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    if (sendOk) {
      rule.statsSentCount = (rule.statsSentCount || 0) + 1;
    } else {
      rule.statsFailCount = (rule.statsFailCount || 0) + 1;
    }
    rule.lastTriggeredAt = new Date();
    await ruleRepo.save(rule);

    if (sendOk) {
      log.info(`[SMS-AutoSend] 规则 ${rule.name}: 成功发送短信给 ${customer.name}(${customer.phone})`);
    } else {
      log.warn(`[SMS-AutoSend] 规则 ${rule.name}: 发送失败（${customer.name}/${customer.phone}）: ${errorMsg}`);
    }
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
   * 构建变量映射表（填充内容和构造服务商模板参数共用）
   * 🔥 v1.8.1 增强：覆盖完整变量映射表
   */
  private static buildVariableMap(contextData: Record<string, any>): Record<string, string> {
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
      productName: SmsAutoSendService.normalizeProductNames(order.productName || order.productNames),
      orderItems: SmsAutoSendService.normalizeProductNames(order.productNames || order.productName),
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
      servicePhone: company.serviceHotline || contextData.serviceHotline || contextData.servicePhone || '',
      website: company.website || contextData.website || '',
      // 通用时间
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      year: String(now.getFullYear()),
      month: `${now.getMonth() + 1}月`,
    };

    return variableMap;
  }

  /**
   * 规范化商品名称
   * 订单触发时 productName 可能是商品JSON数组字符串，需提取为可读的商品名（多个用、分隔）
   */
  private static normalizeProductNames(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) {
      return value
        .map((p: any) => (typeof p === 'string' ? p : (p?.name || p?.productName || p?.title || '')))
        .filter(Boolean)
        .join('、');
    }
    if (typeof value !== 'string') return String(value);

    const str = value.trim();
    // 形如 JSON 数组的字符串：解析并提取商品名
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const arr = JSON.parse(str);
        if (Array.isArray(arr)) {
          return arr
            .map((p: any) => (typeof p === 'string' ? p : (p?.name || p?.productName || p?.title || '')))
            .filter(Boolean)
            .join('、');
        }
      } catch { /* 解析失败按原文返回 */ }
    }
    return str;
  }

  /**
   * 填充模板变量
   */
  private static fillTemplateVariables(
    templateContent: string,
    contextData: Record<string, any>
  ): string {
    let content = templateContent;
    const variableMap = SmsAutoSendService.buildVariableMap(contextData);

    for (const [key, value] of Object.entries(variableMap)) {
      if (value) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    return content;
  }
}

