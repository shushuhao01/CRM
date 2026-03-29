/**
 * 业绩报表定时发送服务
 *
 * 功能：
 * - 根据配置的发送时间自动发送业绩报表
 * - 支持每日/每周/每月发送
 * - 支持工作日/每天发送
 *
 * 创建日期：2025-12-19
 */

import { getDataSource } from '../config/database';
import { PerformanceReportConfig } from '../entities/PerformanceReportConfig';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { logger } from '../config/logger';
import crypto from 'crypto';
import { getTenantRepo } from '../utils/tenantRepo';
import { TenantContextManager } from '../utils/tenantContext';
import { deployConfig } from '../config/deploy';

class PerformanceReportScheduler {
  private timer: NodeJS.Timeout | null = null;
  private checkInterval = 60000; // 每分钟检查一次

  /**
   * 启动定时任务
   */
  start(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    // 立即执行一次检查
    this.checkAndSend();

    // 每分钟检查一次是否需要发送
    this.timer = setInterval(() => {
      this.checkAndSend();
    }, this.checkInterval);

    logger.info('📊 [业绩报表] 定时发送服务已启动（每分钟检查）');
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('📊 [业绩报表] 定时发送服务已停止');
  }

  /**
   * 检查并发送报表
   */
  private async checkAndSend(): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) return;

      const configRepo = dataSource.getRepository(PerformanceReportConfig);

      // 获取所有启用的配置（跨租户查询，定时任务需要处理所有租户的配置）
      const configs = await configRepo.find({
        where: { isEnabled: 1 }
      });

      if (configs.length === 0) return;

      // 🔥 修复：统一使用北京时间（UTC+8）判断触发时间，避免服务器时区差异
      const now = new Date();
      const beijingOffset = 8 * 60 * 60 * 1000;
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
      const beijingNow = new Date(utcTime + beijingOffset);

      const currentTime = `${beijingNow.getHours().toString().padStart(2, '0')}:${beijingNow.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = beijingNow.getDay(); // 0=周日, 1=周一, ...
      const currentDate = beijingNow.getDate();

      for (const config of configs) {
        try {
          // 检查是否到了发送时间
          if (!this.shouldSendNow(config, currentTime, currentDay, currentDate, beijingNow)) {
            continue;
          }

          // 检查今天是否已经发送过（基于北京时间）
          if (this.hasSentToday(config, beijingNow)) {
            continue;
          }

          logger.info(`📊 [业绩报表] 开始发送: ${config.name}`);

          // 生成并发送报表
          await this.sendReport(config);

        } catch (error) {
          logger.error(`[业绩报表] 发送失败 (${config.name}):`, error);
        }
      }
    } catch (error) {
      logger.error('[业绩报表] 检查任务失败:', error);
    }
  }

  /**
   * 判断是否应该现在发送
   */
  private shouldSendNow(
    config: PerformanceReportConfig,
    currentTime: string,
    currentDay: number,
    currentDate: number,
    now: Date
  ): boolean {
    // 检查发送时间（精确到分钟）
    if (config.sendTime !== currentTime) {
      return false;
    }

    // 根据发送频率检查
    switch (config.sendFrequency) {
      case 'daily':
        // 每日发送，检查重复类型
        if (config.repeatType === 'workday') {
          // 工作日：周一到周五
          return currentDay >= 1 && currentDay <= 5;
        } else if (config.repeatType === 'everyday') {
          // 每天
          return true;
        } else if (config.repeatType === 'custom' && config.sendDays) {
          // 自定义：检查是否在指定的星期几
          const dayMap: Record<string, number> = {
            'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0
          };
          return config.sendDays.some(day => dayMap[day] === currentDay);
        }
        return true;

      case 'weekly':
        // 每周发送，检查是否是指定的星期几
        if (config.sendDays && config.sendDays.length > 0) {
          const dayMap: Record<string, number> = {
            'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0
          };
          return config.sendDays.some(day => dayMap[day] === currentDay);
        }
        // 默认周一
        return currentDay === 1;

      case 'monthly':
        // 每月发送，检查是否是月初第一个工作日或指定日期
        if (currentDate === 1) {
          return true;
        }
        // 如果1号是周末，则在第一个工作日发送
        if (currentDate <= 3 && currentDay >= 1 && currentDay <= 5) {
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
          if (firstDay === 0 || firstDay === 6) {
            // 1号是周末，检查今天是否是第一个工作日
            return currentDate === (firstDay === 0 ? 2 : (firstDay === 6 ? 3 : 1));
          }
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * 检查今天是否已经发送过（基于北京时间日期比较）
   */
  private hasSentToday(config: PerformanceReportConfig, beijingNow: Date): boolean {
    if (!config.lastSentAt) return false;

    // 将 lastSentAt 也转换为北京时间进行日期比较
    const lastSent = new Date(config.lastSentAt);
    const beijingOffset = 8 * 60 * 60 * 1000;
    const lastSentUtc = lastSent.getTime() + (lastSent.getTimezoneOffset() * 60 * 1000);
    const lastSentBeijing = new Date(lastSentUtc + beijingOffset);

    const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return toDateStr(lastSentBeijing) === toDateStr(beijingNow);
  }

  /**
   * 发送报表
   */
  private async sendReport(config: PerformanceReportConfig): Promise<void> {
    const dataSource = getDataSource();
    if (!dataSource) return;

    // 🔥 在租户上下文中执行，确保数据隔离
    const tenantId = (config as any).tenantId || (config as any).tenant_id;
    const runInContext = async () => {
      // 生成报表数据（使用getTenantRepo自动过滤租户数据）
      const reportData = await this.generateReportData(
        config.reportTypes,
        config.viewScope,
        config.targetDepartments || [],
        config.rankingLimit || 10
      );

      // 根据消息格式生成内容
      const useMarkdown = config.messageFormat === 'image';
      const messageContent = useMarkdown
        ? this.generateMarkdownMessage(reportData, config)
        : this.generateTextMessage(reportData, config);

      // 发送消息
      let result: { success: boolean; message: string };
      if (config.channelType === 'dingtalk') {
        result = await this.sendDingtalkMessage(config.webhook, config.secret, messageContent, useMarkdown);
      } else if (config.channelType === 'wechat_work') {
        result = await this.sendWechatWorkMessage(config.webhook, messageContent, useMarkdown);
      } else {
        result = { success: false, message: '不支持的渠道类型' };
      }

      // 🔥 修复：使用 getTenantRepo 更新发送状态，确保租户隔离
      const configRepo = getTenantRepo(PerformanceReportConfig);
      config.lastSentAt = new Date();
      config.lastSentStatus = result.success ? 'success' : 'failed';
      config.lastSentMessage = result.message;
      await configRepo.save(config);

      if (result.success) {
        logger.info(`📊 [业绩报表] ✅ 发送成功: ${config.name}`);
      } else {
        logger.error(`📊 [业绩报表] ❌ 发送失败: ${config.name} - ${result.message}`);
      }
    };

    // SaaS模式下在租户上下文中运行
    if (deployConfig.isSaaS() && tenantId) {
      await TenantContextManager.run({ tenantId }, runInContext);
    } else {
      await runInContext();
    }
  }

  /**
   * 生成报表数据
   */
  private async generateReportData(
    reportTypes: string[],
    viewScope: string,
    targetDepartments: string[],
    rankingLimit: number = 10
  ): Promise<any> {
    const dataSource = getDataSource();
    if (!dataSource) return {};

    // 🔥 修复：使用北京时间计算日期
    const now = new Date();
    // 获取北京时间的当前时间（UTC+8）
    const beijingOffset = 8 * 60 * 60 * 1000; // 8小时的毫秒数
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const beijingTime = new Date(utcTime + beijingOffset);

    // 计算北京时间的今天和昨天
    const beijingYear = beijingTime.getFullYear();
    const beijingMonth = beijingTime.getMonth();
    const beijingDate = beijingTime.getDate();

    // 昨天的日期字符串（北京时间）
    const yesterdayBeijing = new Date(beijingYear, beijingMonth, beijingDate - 1);
    const yesterdayStr = `${yesterdayBeijing.getFullYear()}-${String(yesterdayBeijing.getMonth() + 1).padStart(2, '0')}-${String(yesterdayBeijing.getDate()).padStart(2, '0')}`;

    // 本月第一天（北京时间）
    const monthStartStr = `${beijingYear}-${String(beijingMonth + 1).padStart(2, '0')}-01`;

    logger.info(`[业绩报表] 📅 统计日期: 昨日=${yesterdayStr}, 本月开始=${monthStartStr}, 当前北京时间=${beijingTime.toISOString()}`);

    const orderRepo = getTenantRepo(Order);

    // 🔥 修复：使用 CONVERT_TZ 确保 DATE() 提取的是北京时间日期，避免 MySQL 服务器时区不一致问题
    // 查询昨日数据 - 使用字符串日期比较
    const dailyQuery = orderRepo.createQueryBuilder('o')
      .where('DATE(CONVERT_TZ(o.created_at, "+00:00", "+08:00")) = :date', { date: yesterdayStr });

    // 查询本月数据
    const monthlyQuery = orderRepo.createQueryBuilder('o')
      .where('DATE(CONVERT_TZ(o.created_at, "+00:00", "+08:00")) >= :start', { start: monthStartStr });

    if (viewScope === 'department' && targetDepartments.length > 0) {
      dailyQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
      monthlyQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
    }

    const dailyStats = await dailyQuery
      .select([
        `SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN 1 ELSE 0 END) as orderCount`,
        `COALESCE(SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN o.total_amount ELSE 0 END), 0) as orderAmount`,
        `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as signedCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as signedAmount`,
        `SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) as refundCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN o.total_amount ELSE 0 END), 0) as refundAmount`
      ])
      .getRawOne();

    logger.info(`[业绩报表] 📊 昨日统计结果: orderCount=${dailyStats?.orderCount}, orderAmount=${dailyStats?.orderAmount}`);

    const monthlyStats = await monthlyQuery
      .select([
        `SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN 1 ELSE 0 END) as orderCount`,
        `COALESCE(SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN o.total_amount ELSE 0 END), 0) as orderAmount`,
        `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as signedCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as signedAmount`,
        `SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) as refundCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN o.total_amount ELSE 0 END), 0) as refundAmount`
      ])
      .getRawOne();

    const monthlySignedRate = monthlyStats?.orderCount > 0
      ? ((monthlyStats.signedCount / monthlyStats.orderCount) * 100).toFixed(1)
      : '0.0';

    // 🔥 计算衍生指标
    const dailyOrderCount = parseInt(dailyStats?.orderCount || '0');
    const dailyOrderAmount = parseFloat(dailyStats?.orderAmount || '0');
    const dailyRefundCount = parseInt(dailyStats?.refundCount || '0');
    const dailyRefundAmount = parseFloat(dailyStats?.refundAmount || '0');
    const monthlyOrderCount = parseInt(monthlyStats?.orderCount || '0');
    const monthlyOrderAmount = parseFloat(monthlyStats?.orderAmount || '0');
    const monthlyRefundCount = parseInt(monthlyStats?.refundCount || '0');
    const monthlyRefundAmount = parseFloat(monthlyStats?.refundAmount || '0');

    const dailyRefundRate = dailyOrderCount > 0 ? ((dailyRefundCount / dailyOrderCount) * 100).toFixed(1) : '0.0';
    const monthlyRefundRate = monthlyOrderCount > 0 ? ((monthlyRefundCount / monthlyOrderCount) * 100).toFixed(1) : '0.0';
    const dailyAvgAmount = dailyOrderCount > 0 ? Math.round(dailyOrderAmount / dailyOrderCount) : 0;
    const monthlyAvgAmount = monthlyOrderCount > 0 ? Math.round(monthlyOrderAmount / monthlyOrderCount) : 0;

    // 获取排名
    const userRepo = getTenantRepo(User);
    let rankingQuery = orderRepo.createQueryBuilder('o')
      .select([
        'o.created_by as userId',
        `COALESCE(SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN o.total_amount ELSE 0 END), 0) as totalAmount`,
        `SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN 1 ELSE 0 END) as orderCount`
      ])
      .where('DATE(CONVERT_TZ(o.created_at, "+00:00", "+08:00")) >= :start', { start: monthStartStr })
      .groupBy('o.created_by')
      .orderBy('totalAmount', 'DESC');

    if (viewScope === 'department' && targetDepartments.length > 0) {
      rankingQuery = rankingQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
    }

    // 🔥 使用配置的排行数量限制
    rankingQuery = rankingQuery.limit(rankingLimit);

    const rankingData = await rankingQuery.getRawMany();

    const topRanking = await Promise.all(
      rankingData.map(async (item: any) => {
        let userName = '未知用户';
        if (item.userId) {
          const user = await userRepo.findOne({ where: { id: item.userId } });
          if (user) {
            userName = user.realName || user.username || '未知用户';
          }
        }
        return {
          name: userName,
          amount: parseFloat(item.totalAmount || '0'),
          orderCount: parseInt(item.orderCount || '0')
        };
      })
    );

    return {
      reportDate: yesterdayStr,
      reportDateText: this.formatDateText(yesterdayBeijing),
      daily: {
        orderCount: dailyOrderCount,
        orderAmount: dailyOrderAmount,
        signedCount: parseInt(dailyStats?.signedCount || '0'),
        signedAmount: parseFloat(dailyStats?.signedAmount || '0'),
        refundCount: dailyRefundCount,
        refundAmount: dailyRefundAmount,
        refundRate: dailyRefundRate,
        avgOrderAmount: dailyAvgAmount
      },
      monthly: {
        orderCount: monthlyOrderCount,
        orderAmount: monthlyOrderAmount,
        signedCount: parseInt(monthlyStats?.signedCount || '0'),
        signedAmount: parseFloat(monthlyStats?.signedAmount || '0'),
        signedRate: monthlySignedRate,
        refundCount: monthlyRefundCount,
        refundAmount: monthlyRefundAmount,
        refundRate: monthlyRefundRate,
        avgOrderAmount: monthlyAvgAmount
      },
      topRanking
    };
  }

  private formatDateText(date: Date): string {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekDays[date.getDay()]})`;
  }

  private generateTextMessage(data: any, config: PerformanceReportConfig): string {
    const lines: string[] = [];
    const types = config.reportTypes || [];
    lines.push(`📊 ${config.name}`);
    lines.push(`━━━━━━━━━━━━━━━━`);
    lines.push(`📅 ${data.reportDateText}`);
    lines.push('');

    // 当日数据
    lines.push('💰 当日业绩');
    if (types.includes('order_count')) {
      lines.push(`   订单数: ${data.daily.orderCount} 单`);
    }
    if (types.includes('order_amount')) {
      lines.push(`   订单金额: ¥${data.daily.orderAmount.toLocaleString()}`);
    }
    if (types.includes('refund_count')) {
      lines.push(`   退款单数: ${data.daily.refundCount} 单`);
    }
    if (types.includes('refund_amount')) {
      lines.push(`   退款金额: ¥${data.daily.refundAmount.toLocaleString()}`);
    }
    if (types.includes('refund_rate')) {
      lines.push(`   退款率: ${data.daily.refundRate}%`);
    }
    if (types.includes('avg_order_amount')) {
      lines.push(`   客单价: ¥${data.daily.avgOrderAmount.toLocaleString()}`);
    }

    // 月累计数据
    if (config.includeMonthly === 1) {
      lines.push('');
      lines.push('📈 当月累计');
      lines.push(`   订单数: ${data.monthly.orderCount} 单`);
      lines.push(`   订单金额: ¥${data.monthly.orderAmount.toLocaleString()}`);
      if (types.includes('monthly_signed_count')) {
        lines.push(`   签收单数: ${data.monthly.signedCount} 单`);
      }
      if (types.includes('monthly_signed_amount')) {
        lines.push(`   签收金额: ¥${data.monthly.signedAmount.toLocaleString()}`);
      }
      if (types.includes('monthly_signed_rate')) {
        lines.push(`   签收率: ${data.monthly.signedRate}%`);
      }
      if (types.includes('refund_count') || types.includes('refund_amount')) {
        lines.push(`   退款单数: ${data.monthly.refundCount} 单`);
        lines.push(`   退款金额: ¥${data.monthly.refundAmount.toLocaleString()}`);
      }
      if (types.includes('refund_rate')) {
        lines.push(`   退款率: ${data.monthly.refundRate}%`);
      }
      if (types.includes('avg_order_amount')) {
        lines.push(`   客单价: ¥${data.monthly.avgOrderAmount.toLocaleString()}`);
      }
    }

    if (config.includeRanking === 1 && data.topRanking?.length > 0) {
      lines.push('');
      lines.push('🏆 业绩排行榜');
      const medals = ['🥇', '🥈', '🥉'];
      const limit = config.rankingLimit || 10;
      data.topRanking.slice(0, limit).forEach((item: any, index: number) => {
        const medal = medals[index] || `${index + 1}.`;
        lines.push(`${medal} ${item.name}: ¥${item.amount.toLocaleString()} (${item.orderCount}单)`);
      });
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('📱 智能销售CRM');
    return lines.join('\n');
  }

  private generateMarkdownMessage(data: any, config: PerformanceReportConfig): string {
    const lines: string[] = [];
    const types = config.reportTypes || [];
    lines.push(`## 📊 ${config.name}`);
    lines.push('');
    lines.push(`> 📅 ${data.reportDateText}`);
    lines.push('');

    // 当日数据
    lines.push('### 💰 当日业绩');
    if (types.includes('order_count')) {
      lines.push(`- **订单数**: ${data.daily.orderCount} 单`);
    }
    if (types.includes('order_amount')) {
      lines.push(`- **订单金额**: ¥${data.daily.orderAmount.toLocaleString()}`);
    }
    if (types.includes('refund_count')) {
      lines.push(`- **退款单数**: ${data.daily.refundCount} 单`);
    }
    if (types.includes('refund_amount')) {
      lines.push(`- **退款金额**: ¥${data.daily.refundAmount.toLocaleString()}`);
    }
    if (types.includes('refund_rate')) {
      lines.push(`- **退款率**: ${data.daily.refundRate}%`);
    }
    if (types.includes('avg_order_amount')) {
      lines.push(`- **客单价**: ¥${data.daily.avgOrderAmount.toLocaleString()}`);
    }
    lines.push('');

    // 月累计数据
    if (config.includeMonthly === 1) {
      lines.push('### 📈 当月累计');
      lines.push(`- **订单数**: ${data.monthly.orderCount} 单`);
      lines.push(`- **订单金额**: ¥${data.monthly.orderAmount.toLocaleString()}`);
      if (types.includes('monthly_signed_count')) {
        lines.push(`- **签收单数**: ${data.monthly.signedCount} 单`);
      }
      if (types.includes('monthly_signed_amount')) {
        lines.push(`- **签收金额**: ¥${data.monthly.signedAmount.toLocaleString()}`);
      }
      if (types.includes('monthly_signed_rate')) {
        lines.push(`- **签收率**: ${data.monthly.signedRate}%`);
      }
      if (types.includes('refund_count') || types.includes('refund_amount')) {
        lines.push(`- **退款单数**: ${data.monthly.refundCount} 单`);
        lines.push(`- **退款金额**: ¥${data.monthly.refundAmount.toLocaleString()}`);
      }
      if (types.includes('refund_rate')) {
        lines.push(`- **退款率**: ${data.monthly.refundRate}%`);
      }
      if (types.includes('avg_order_amount')) {
        lines.push(`- **客单价**: ¥${data.monthly.avgOrderAmount.toLocaleString()}`);
      }
      lines.push('');
    }

    if (config.includeRanking === 1 && data.topRanking?.length > 0) {
      lines.push('### 🏆 业绩排行榜');
      lines.push('');
      const medals = ['🥇', '🥈', '🥉'];
      const limit = config.rankingLimit || 10;
      data.topRanking.slice(0, limit).forEach((item: any, index: number) => {
        const medal = medals[index] || `${index + 1}.`;
        lines.push(`${medal} **${item.name}**: ¥${item.amount.toLocaleString()} (${item.orderCount}单)`);
        lines.push('');
      });
    }

    lines.push('---');
    lines.push('*智能销售CRM*');
    return lines.join('\n');
  }

  private async sendDingtalkMessage(webhook: string, secret: string | undefined, message: string, useMarkdown: boolean): Promise<{ success: boolean; message: string }> {
    try {
      let url = webhook;
      if (secret) {
        const timestamp = Date.now();
        const stringToSign = `${timestamp}\n${secret}`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(stringToSign);
        const sign = encodeURIComponent(hmac.digest('base64'));
        url = `${webhook}&timestamp=${timestamp}&sign=${sign}`;
      }

      const body = useMarkdown ? {
        msgtype: 'markdown',
        markdown: { title: '业绩日报', text: message }
      } : {
        msgtype: 'text',
        text: { content: message }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json() as { errcode: number; errmsg: string };
      return result.errcode === 0
        ? { success: true, message: '发送成功' }
        : { success: false, message: result.errmsg };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  private async sendWechatWorkMessage(webhook: string, message: string, useMarkdown: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const body = useMarkdown ? {
        msgtype: 'markdown',
        markdown: { content: message }
      } : {
        msgtype: 'text',
        text: { content: message }
      };

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json() as { errcode: number; errmsg: string };
      return result.errcode === 0
        ? { success: true, message: '发送成功' }
        : { success: false, message: result.errmsg };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export const performanceReportScheduler = new PerformanceReportScheduler();
export default performanceReportScheduler;
