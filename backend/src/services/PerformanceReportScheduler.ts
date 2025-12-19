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

      // 获取所有启用的配置
      const configs = await configRepo.find({
        where: { isEnabled: 1 }
      });

      if (configs.length === 0) return;

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = now.getDay(); // 0=周日, 1=周一, ...
      const currentDate = now.getDate();

      for (const config of configs) {
        try {
          // 检查是否到了发送时间
          if (!this.shouldSendNow(config, currentTime, currentDay, currentDate, now)) {
            continue;
          }

          // 检查今天是否已经发送过
          if (this.hasSentToday(config, now)) {
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
   * 检查今天是否已经发送过
   */
  private hasSentToday(config: PerformanceReportConfig, now: Date): boolean {
    if (!config.lastSentAt) return false;

    const lastSent = new Date(config.lastSentAt);
    return lastSent.toDateString() === now.toDateString();
  }

  /**
   * 发送报表
   */
  private async sendReport(config: PerformanceReportConfig): Promise<void> {
    const dataSource = getDataSource();
    if (!dataSource) return;

    // 生成报表数据
    const reportData = await this.generateReportData(
      config.reportTypes,
      config.viewScope,
      config.targetDepartments || []
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

    // 更新发送状态
    const configRepo = dataSource.getRepository(PerformanceReportConfig);
    config.lastSentAt = new Date();
    config.lastSentStatus = result.success ? 'success' : 'failed';
    config.lastSentMessage = result.message;
    await configRepo.save(config);

    if (result.success) {
      logger.info(`📊 [业绩报表] ✅ 发送成功: ${config.name}`);
    } else {
      logger.error(`📊 [业绩报表] ❌ 发送失败: ${config.name} - ${result.message}`);
    }
  }

  /**
   * 生成报表数据
   */
  private async generateReportData(
    reportTypes: string[],
    viewScope: string,
    targetDepartments: string[]
  ): Promise<any> {
    const dataSource = getDataSource();
    if (!dataSource) return {};

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const orderRepo = dataSource.getRepository(Order);

    // 查询昨日数据
    const dailyQuery = orderRepo.createQueryBuilder('o')
      .where('DATE(o.created_at) = :date', { date: yesterday.toISOString().split('T')[0] });

    // 查询本月数据
    const monthlyQuery = orderRepo.createQueryBuilder('o')
      .where('o.created_at >= :start', { start: monthStart });

    if (viewScope === 'department' && targetDepartments.length > 0) {
      dailyQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
      monthlyQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
    }

    const dailyStats = await dailyQuery
      .select([
        `SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN 1 ELSE 0 END) as orderCount`,
        `COALESCE(SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN o.total_amount ELSE 0 END), 0) as orderAmount`,
        `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as signedCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as signedAmount`
      ])
      .getRawOne();

    const monthlyStats = await monthlyQuery
      .select([
        `SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN 1 ELSE 0 END) as orderCount`,
        `COALESCE(SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN o.total_amount ELSE 0 END), 0) as orderAmount`,
        `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as signedCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as signedAmount`
      ])
      .getRawOne();

    const monthlySignedRate = monthlyStats?.orderCount > 0
      ? ((monthlyStats.signedCount / monthlyStats.orderCount) * 100).toFixed(1)
      : '0.0';

    // 获取排名
    const userRepo = dataSource.getRepository(User);
    let rankingQuery = orderRepo.createQueryBuilder('o')
      .select([
        'o.created_by as userId',
        `COALESCE(SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN o.total_amount ELSE 0 END), 0) as totalAmount`,
        `SUM(CASE WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded') AND (o.status != 'pending_transfer' OR o.mark_type = 'normal') THEN 1 ELSE 0 END) as orderCount`
      ])
      .where('o.created_at >= :start', { start: monthStart })
      .groupBy('o.created_by')
      .orderBy('totalAmount', 'DESC')
      .limit(3);

    if (viewScope === 'department' && targetDepartments.length > 0) {
      rankingQuery = rankingQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
    }

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
      reportDate: yesterday.toISOString().split('T')[0],
      reportDateText: this.formatDateText(yesterday),
      daily: {
        orderCount: parseInt(dailyStats?.orderCount || '0'),
        orderAmount: parseFloat(dailyStats?.orderAmount || '0'),
        signedCount: parseInt(dailyStats?.signedCount || '0'),
        signedAmount: parseFloat(dailyStats?.signedAmount || '0')
      },
      monthly: {
        orderCount: parseInt(monthlyStats?.orderCount || '0'),
        orderAmount: parseFloat(monthlyStats?.orderAmount || '0'),
        signedCount: parseInt(monthlyStats?.signedCount || '0'),
        signedAmount: parseFloat(monthlyStats?.signedAmount || '0'),
        signedRate: monthlySignedRate
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
    lines.push(`📊 ${config.name}`);
    lines.push(`━━━━━━━━━━━━━━━━`);
    lines.push(`📅 ${data.reportDateText}`);
    lines.push('');
    lines.push('💰 当日业绩');
    lines.push(`   订单数: ${data.daily.orderCount} 单`);
    lines.push(`   订单金额: ¥${data.daily.orderAmount.toLocaleString()}`);

    if (config.includeMonthly === 1) {
      lines.push('');
      lines.push('📈 本月累计');
      lines.push(`   订单数: ${data.monthly.orderCount} 单`);
      lines.push(`   订单金额: ¥${data.monthly.orderAmount.toLocaleString()}`);
      lines.push(`   签收单数: ${data.monthly.signedCount} 单`);
      lines.push(`   签收金额: ¥${data.monthly.signedAmount.toLocaleString()}`);
      lines.push(`   签收率: ${data.monthly.signedRate}%`);
    }

    if (config.includeRanking === 1 && data.topRanking?.length > 0) {
      lines.push('');
      lines.push('🏆 业绩排行榜');
      const medals = ['🥇', '🥈', '🥉'];
      data.topRanking.slice(0, 3).forEach((item: any, index: number) => {
        lines.push(`   ${medals[index]} ${item.name}: ¥${item.amount.toLocaleString()} (${item.orderCount}单)`);
      });
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('📱 智能销售CRM');
    return lines.join('\n');
  }

  private generateMarkdownMessage(data: any, config: PerformanceReportConfig): string {
    const lines: string[] = [];
    lines.push(`## 📊 ${config.name}`);
    lines.push('');
    lines.push(`> 📅 ${data.reportDateText}`);
    lines.push('');
    lines.push('### 💰 当日业绩');
    lines.push(`- **订单数**: ${data.daily.orderCount} 单`);
    lines.push(`- **订单金额**: ¥${data.daily.orderAmount.toLocaleString()}`);
    lines.push('');

    if (config.includeMonthly === 1) {
      lines.push('### 📈 本月累计');
      lines.push(`- **订单数**: ${data.monthly.orderCount} 单`);
      lines.push(`- **订单金额**: ¥${data.monthly.orderAmount.toLocaleString()}`);
      lines.push(`- **签收单数**: ${data.monthly.signedCount} 单`);
      lines.push(`- **签收金额**: ¥${data.monthly.signedAmount.toLocaleString()}`);
      lines.push(`- **签收率**: ${data.monthly.signedRate}%`);
      lines.push('');
    }

    if (config.includeRanking === 1 && data.topRanking?.length > 0) {
      lines.push('### 🏆 业绩排行榜');
      const medals = ['🥇', '🥈', '🥉'];
      data.topRanking.slice(0, 3).forEach((item: any, index: number) => {
        lines.push(`${medals[index]} **${item.name}**: ¥${item.amount.toLocaleString()} (${item.orderCount}单)`);
      });
      lines.push('');
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
