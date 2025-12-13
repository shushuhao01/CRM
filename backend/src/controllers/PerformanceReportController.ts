import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { PerformanceReportConfig } from '../entities/PerformanceReportConfig';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// 业绩报表类型定义
export const REPORT_TYPES = [
  // 主要指标（始终显示）
  { value: 'order_count', label: '订单数量', category: '订单指标', description: '当日/当月订单总数', primary: true },
  { value: 'order_amount', label: '订单金额', category: '订单指标', description: '当日/当月订单总金额', primary: true },
  { value: 'monthly_signed_count', label: '本月签收单数', category: '签收指标', description: '当月签收订单数', primary: true },
  { value: 'monthly_signed_amount', label: '本月签收金额', category: '签收指标', description: '当月签收金额', primary: true },
  { value: 'monthly_signed_rate', label: '本月签收率', category: '签收指标', description: '本月签收订单占比', primary: true },
  // 更多指标（折叠显示）
  { value: 'refund_count', label: '退款单数', category: '退款指标', description: '当日/当月退款订单数', primary: false },
  { value: 'refund_amount', label: '退款金额', category: '退款指标', description: '当日/当月退款金额', primary: false },
  { value: 'refund_rate', label: '退款率', category: '退款指标', description: '退款订单占比', primary: false },
  { value: 'new_customer', label: '新增客户', category: '客户指标', description: '当日/当月新增客户数', primary: false },
  { value: 'active_customer', label: '活跃客户', category: '客户指标', description: '有订单的客户数', primary: false },
  { value: 'avg_order_amount', label: '客单价', category: '效率指标', description: '平均每单金额', primary: false },
  { value: 'conversion_rate', label: '转化率', category: '效率指标', description: '下单客户/总客户', primary: false },
  { value: 'team_ranking', label: '团队排名', category: '排名数据', description: '部门业绩排名', primary: false },
  { value: 'personal_ranking', label: '个人排名', category: '排名数据', description: '销售人员业绩排名', primary: false }
];

export class PerformanceReportController {

  /**
   * 获取业绩报表配置列表
   */
  async getConfigs(_req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        console.log('[业绩报表] 数据库未连接，返回空列表');
        res.json({ success: true, data: [] });
        return;
      }

      try {
        const configRepo = dataSource.getRepository(PerformanceReportConfig);
        const configs = await configRepo.find({
          order: { createdAt: 'DESC' }
        });

        console.log(`[业绩报表] 查询到 ${configs.length} 个配置`);

        res.json({
          success: true,
          data: configs.map(config => ({
            id: config.id,
            name: config.name,
            isEnabled: config.isEnabled === 1,
            sendFrequency: config.sendFrequency,
            sendTime: config.sendTime,
            sendDays: config.sendDays || [],
            repeatType: config.repeatType,
            reportTypes: config.reportTypes || [],
            messageFormat: config.messageFormat || 'text',
            channelType: config.channelType,
            webhook: config.webhook,
            secret: config.secret ? '******' : '',
            viewScope: config.viewScope,
            targetDepartments: config.targetDepartments || [],
            includeMonthly: config.includeMonthly === 1,
            includeRanking: config.includeRanking === 1,
            rankingLimit: config.rankingLimit,
            lastSentAt: config.lastSentAt,
            lastSentStatus: config.lastSentStatus,
            createdByName: config.createdByName,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
          }))
        });
      } catch (dbError: any) {
        // 如果是表不存在的错误，返回空列表
        if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message?.includes('doesn\'t exist')) {
          console.log('[业绩报表] 表不存在，返回空列表');
          res.json({ success: true, data: [] });
          return;
        }
        throw dbError;
      }
    } catch (error) {
      console.error('获取业绩报表配置失败:', error);
      res.status(500).json({ success: false, message: '获取业绩报表配置失败' });
    }
  }

  /**
   * 创建业绩报表配置
   */
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const {
        name, sendFrequency, sendTime, sendDays, repeatType,
        reportTypes, messageFormat, channelType, webhook, secret,
        viewScope, targetDepartments, includeMonthly, includeRanking, rankingLimit
      } = req.body;

      if (!name || !channelType || !webhook) {
        res.status(400).json({ success: false, message: '名称、通知渠道和Webhook不能为空' });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const configRepo = dataSource.getRepository(PerformanceReportConfig);

      const config = configRepo.create({
        id: uuidv4(),
        name,
        isEnabled: 1,
        sendFrequency: sendFrequency || 'daily',
        sendTime: sendTime || '09:00',
        sendDays: sendDays || null,
        repeatType: repeatType || 'workday',
        reportTypes: reportTypes || ['order_count', 'order_amount', 'monthly_signed_count', 'monthly_signed_amount'],
        messageFormat: messageFormat || 'image',
        channelType,
        webhook,
        secret: secret || null,
        viewScope: viewScope || 'company',
        targetDepartments: targetDepartments || null,
        includeMonthly: includeMonthly !== false ? 1 : 0,
        includeRanking: includeRanking !== false ? 1 : 0,
        rankingLimit: rankingLimit || 10,
        createdBy: currentUser?.id,
        createdByName: currentUser?.realName || currentUser?.username || '系统'
      });

      await configRepo.save(config);

      console.log(`[业绩报表] ✅ 创建配置成功: ${name}`);

      res.json({
        success: true,
        message: '业绩报表配置创建成功',
        data: config
      });
    } catch (error) {
      console.error('创建业绩报表配置失败:', error);
      res.status(500).json({ success: false, message: '创建业绩报表配置失败' });
    }
  }

  /**
   * 更新业绩报表配置
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const configRepo = dataSource.getRepository(PerformanceReportConfig);
      const config = await configRepo.findOne({ where: { id } });

      if (!config) {
        res.status(404).json({ success: false, message: '配置不存在' });
        return;
      }

      const {
        name, isEnabled, sendFrequency, sendTime, sendDays, repeatType,
        reportTypes, messageFormat, channelType, webhook, secret,
        viewScope, targetDepartments, includeMonthly, includeRanking, rankingLimit
      } = req.body;

      if (name !== undefined) config.name = name;
      if (isEnabled !== undefined) config.isEnabled = isEnabled ? 1 : 0;
      if (sendFrequency !== undefined) config.sendFrequency = sendFrequency;
      if (sendTime !== undefined) config.sendTime = sendTime;
      if (sendDays !== undefined) config.sendDays = sendDays;
      if (repeatType !== undefined) config.repeatType = repeatType;
      if (reportTypes !== undefined) config.reportTypes = reportTypes;
      if (messageFormat !== undefined) config.messageFormat = messageFormat;
      if (channelType !== undefined) config.channelType = channelType;
      if (webhook !== undefined) config.webhook = webhook;
      if (secret !== undefined && secret !== '******') config.secret = secret || undefined;
      if (viewScope !== undefined) config.viewScope = viewScope;
      if (targetDepartments !== undefined) config.targetDepartments = targetDepartments;
      if (includeMonthly !== undefined) config.includeMonthly = includeMonthly ? 1 : 0;
      if (includeRanking !== undefined) config.includeRanking = includeRanking ? 1 : 0;
      if (rankingLimit !== undefined) config.rankingLimit = rankingLimit;

      await configRepo.save(config);

      res.json({
        success: true,
        message: '配置更新成功',
        data: config
      });
    } catch (error) {
      console.error('更新业绩报表配置失败:', error);
      res.status(500).json({ success: false, message: '更新配置失败' });
    }
  }

  /**
   * 删除业绩报表配置
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const configRepo = dataSource.getRepository(PerformanceReportConfig);
      const result = await configRepo.delete({ id });

      if (result.affected === 0) {
        res.status(404).json({ success: false, message: '配置不存在' });
        return;
      }

      res.json({ success: true, message: '配置删除成功' });
    } catch (error) {
      console.error('删除业绩报表配置失败:', error);
      res.status(500).json({ success: false, message: '删除配置失败' });
    }
  }

  /**
   * 获取报表类型选项
   */
  async getReportTypes(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: REPORT_TYPES
    });
  }

  /**
   * 预览业绩数据
   */
  async previewReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportTypes, viewScope, targetDepartments } = req.body;
      const reportData = await this.generateReportData(
        reportTypes || ['order_count', 'order_amount'],
        viewScope || 'company',
        targetDepartments || []
      );

      res.json({
        success: true,
        data: reportData
      });
    } catch (error) {
      console.error('预览业绩数据失败:', error);
      res.status(500).json({ success: false, message: '预览失败' });
    }
  }

  /**
   * 测试发送业绩报表
   */
  async testSend(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const configRepo = dataSource.getRepository(PerformanceReportConfig);
      const config = await configRepo.findOne({ where: { id } });

      if (!config) {
        res.status(404).json({ success: false, message: '配置不存在' });
        return;
      }

      // 生成报表数据
      const reportData = await this.generateReportData(
        config.reportTypes,
        config.viewScope,
        config.targetDepartments || []
      );

      // 根据消息格式生成内容
      const useMarkdown = config.messageFormat === 'image'; // image格式使用Markdown展示
      const messageContent = useMarkdown
        ? this.generateMarkdownMessage(reportData, config)
        : this.generateTextMessage(reportData, config);

      // 发送消息
      let result: { success: boolean; message: string; details?: any };
      if (config.channelType === 'dingtalk') {
        result = await this.sendDingtalkMessage(config.webhook, config.secret, messageContent, useMarkdown);
      } else if (config.channelType === 'wechat_work') {
        result = await this.sendWechatWorkMessage(config.webhook, messageContent, useMarkdown);
      } else {
        result = { success: false, message: '不支持的渠道类型' };
      }

      // 更新发送状态
      config.lastSentAt = new Date();
      config.lastSentStatus = result.success ? 'success' : 'failed';
      config.lastSentMessage = result.message;
      await configRepo.save(config);

      res.json(result);
    } catch (error) {
      console.error('测试发送失败:', error);
      res.status(500).json({ success: false, message: '测试发送失败' });
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

    // 🔥 统一的业绩计算规则：
    // 不计入下单业绩的状态: pending_cancel, cancelled, audit_rejected, logistics_returned, logistics_cancelled, refunded
    // 待流转状态需要特殊处理：只有markType='normal'的才计入业绩

    // 查询昨日数据
    const dailyQuery = orderRepo.createQueryBuilder('o')
      .where('DATE(o.created_at) = :date', { date: yesterday.toISOString().split('T')[0] });

    // 查询本月数据
    const monthlyQuery = orderRepo.createQueryBuilder('o')
      .where('o.created_at >= :start', { start: monthStart });

    // 如果是部门视角，添加部门过滤
    if (viewScope === 'department' && targetDepartments.length > 0) {
      dailyQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
      monthlyQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
    }

    // 获取统计数据
    // 🔥 使用新的业绩计算规则：
    // - 下单业绩：排除取消、拒绝、退回等状态，待流转只算正常发货单
    // - 发货业绩：shipped, delivered, rejected, rejected_returned
    // - 签收业绩：delivered
    const dailyStats = await dailyQuery
      .select([
        // 下单业绩（排除无效状态，待流转只算正常发货单）
        `SUM(CASE
          WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')
          AND (o.status != 'pending_transfer' OR o.mark_type = 'normal')
          THEN 1 ELSE 0 END) as orderCount`,
        `COALESCE(SUM(CASE
          WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')
          AND (o.status != 'pending_transfer' OR o.mark_type = 'normal')
          THEN o.total_amount ELSE 0 END), 0) as orderAmount`,
        // 发货业绩
        `SUM(CASE WHEN o.status IN ('shipped', 'delivered', 'rejected', 'rejected_returned') THEN 1 ELSE 0 END) as shippedCount`,
        `COALESCE(SUM(CASE WHEN o.status IN ('shipped', 'delivered', 'rejected', 'rejected_returned') THEN o.total_amount ELSE 0 END), 0) as shippedAmount`,
        // 签收业绩
        `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as signedCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as signedAmount`,
        // 退款统计
        `SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) as refundCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN o.total_amount ELSE 0 END), 0) as refundAmount`
      ])
      .getRawOne();

    const monthlyStats = await monthlyQuery
      .select([
        // 下单业绩
        `SUM(CASE
          WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')
          AND (o.status != 'pending_transfer' OR o.mark_type = 'normal')
          THEN 1 ELSE 0 END) as orderCount`,
        `COALESCE(SUM(CASE
          WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')
          AND (o.status != 'pending_transfer' OR o.mark_type = 'normal')
          THEN o.total_amount ELSE 0 END), 0) as orderAmount`,
        // 发货业绩
        `SUM(CASE WHEN o.status IN ('shipped', 'delivered', 'rejected', 'rejected_returned') THEN 1 ELSE 0 END) as shippedCount`,
        `COALESCE(SUM(CASE WHEN o.status IN ('shipped', 'delivered', 'rejected', 'rejected_returned') THEN o.total_amount ELSE 0 END), 0) as shippedAmount`,
        // 签收业绩
        `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as signedCount`,
        `COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as signedAmount`
      ])
      .getRawOne();

    // 计算签收率
    const dailySignedRate = dailyStats?.orderCount > 0
      ? ((dailyStats.signedCount / dailyStats.orderCount) * 100).toFixed(1)
      : '0.0';
    const monthlySignedRate = monthlyStats?.orderCount > 0
      ? ((monthlyStats.signedCount / monthlyStats.orderCount) * 100).toFixed(1)
      : '0.0';

    // 🔥 获取本月业绩排名（前三名）- 使用新的业绩计算规则
    const userRepo = dataSource.getRepository(User);
    let rankingQuery = orderRepo.createQueryBuilder('o')
      .select([
        'o.created_by as userId',
        // 只统计有效订单的金额
        `COALESCE(SUM(CASE
          WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')
          AND (o.status != 'pending_transfer' OR o.mark_type = 'normal')
          THEN o.total_amount ELSE 0 END), 0) as totalAmount`,
        // 只统计有效订单数
        `SUM(CASE
          WHEN o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')
          AND (o.status != 'pending_transfer' OR o.mark_type = 'normal')
          THEN 1 ELSE 0 END) as orderCount`
      ])
      .where('o.created_at >= :start', { start: monthStart })
      .groupBy('o.created_by')
      .orderBy('totalAmount', 'DESC')
      .limit(3);

    // 如果是部门视角，添加部门过滤
    if (viewScope === 'department' && targetDepartments.length > 0) {
      rankingQuery = rankingQuery.andWhere('o.department_id IN (:...depts)', { depts: targetDepartments });
    }

    const rankingData = await rankingQuery.getRawMany();

    // 获取用户名称
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
          userId: item.userId,
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
        signedAmount: parseFloat(dailyStats?.signedAmount || '0'),
        signedRate: dailySignedRate,
        refundCount: parseInt(dailyStats?.refundCount || '0'),
        refundAmount: parseFloat(dailyStats?.refundAmount || '0')
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

  /**
   * 生成文本消息
   */
  private generateTextMessage(data: any, config: PerformanceReportConfig): string {
    const lines: string[] = [];

    lines.push(`📊 ${config.name}`);
    lines.push(`━━━━━━━━━━━━━━━━`);
    lines.push(`📅 ${data.reportDateText}`);
    lines.push('');

    // 当日数据（只显示订单数和订单金额，不显示签收数据）
    lines.push('💰 当日业绩');
    if (config.reportTypes.includes('order_count')) {
      lines.push(`   订单数: ${data.daily.orderCount} 单`);
    }
    if (config.reportTypes.includes('order_amount')) {
      lines.push(`   订单金额: ¥${data.daily.orderAmount.toLocaleString()}`);
    }

    // 月累计数据（包含签收数据）
    if (config.includeMonthly === 1) {
      lines.push('');
      lines.push('📈 本月累计');
      lines.push(`   订单数: ${data.monthly.orderCount} 单`);
      lines.push(`   订单金额: ¥${data.monthly.orderAmount.toLocaleString()}`);
      if (config.reportTypes.includes('monthly_signed_count')) {
        lines.push(`   签收单数: ${data.monthly.signedCount} 单`);
      }
      if (config.reportTypes.includes('monthly_signed_amount')) {
        lines.push(`   签收金额: ¥${data.monthly.signedAmount.toLocaleString()}`);
      }
      if (config.reportTypes.includes('monthly_signed_rate')) {
        lines.push(`   签收率: ${data.monthly.signedRate}%`);
      }
    }

    // 业绩排名（前三名）
    if (config.includeRanking === 1 && data.topRanking && data.topRanking.length > 0) {
      lines.push('');
      lines.push('🏆 业绩排行榜');
      const medals = ['🥇', '🥈', '🥉'];
      data.topRanking.slice(0, 3).forEach((item: any, index: number) => {
        const medal = medals[index] || `${index + 1}.`;
        lines.push(`   ${medal} ${item.name}: ¥${item.amount.toLocaleString()} (${item.orderCount}单)`);
      });
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('📱 智能销售CRM');

    return lines.join('\n');
  }

  /**
   * 格式化日期文本
   */
  private formatDateText(date: Date): string {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = weekDays[date.getDay()];
    return `${year}年${month}月${day}日 (${weekDay})`;
  }

  /**
   * 生成Markdown格式消息（更精美的展示）
   */
  private generateMarkdownMessage(data: any, config: PerformanceReportConfig): string {
    const lines: string[] = [];

    lines.push(`## 📊 ${config.name}`);
    lines.push('');
    lines.push(`> 📅 ${data.reportDateText}`);
    lines.push('');

    // 当日数据
    lines.push('### 💰 当日业绩');
    if (config.reportTypes.includes('order_count')) {
      lines.push(`- **订单数**: ${data.daily.orderCount} 单`);
    }
    if (config.reportTypes.includes('order_amount')) {
      lines.push(`- **订单金额**: ¥${data.daily.orderAmount.toLocaleString()}`);
    }
    lines.push('');

    // 月累计数据
    if (config.includeMonthly === 1) {
      lines.push('### 📈 本月累计');
      lines.push(`- **订单数**: ${data.monthly.orderCount} 单`);
      lines.push(`- **订单金额**: ¥${data.monthly.orderAmount.toLocaleString()}`);
      if (config.reportTypes.includes('monthly_signed_count')) {
        lines.push(`- **签收单数**: ${data.monthly.signedCount} 单`);
      }
      if (config.reportTypes.includes('monthly_signed_amount')) {
        lines.push(`- **签收金额**: ¥${data.monthly.signedAmount.toLocaleString()}`);
      }
      if (config.reportTypes.includes('monthly_signed_rate')) {
        lines.push(`- **签收率**: ${data.monthly.signedRate}%`);
      }
      lines.push('');
    }

    // 业绩排名（前三名）
    if (config.includeRanking === 1 && data.topRanking && data.topRanking.length > 0) {
      lines.push('### 🏆 业绩排行榜');
      const medals = ['🥇', '🥈', '🥉'];
      data.topRanking.slice(0, 3).forEach((item: any, index: number) => {
        const medal = medals[index] || `${index + 1}.`;
        lines.push(`${medal} **${item.name}**: ¥${item.amount.toLocaleString()} (${item.orderCount}单)`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('*智能销售CRM*');

    return lines.join('\n');
  }

  /**
   * 发送钉钉消息
   */
  private async sendDingtalkMessage(webhook: string, secret: string | undefined, message: string, useMarkdown: boolean = false): Promise<{ success: boolean; message: string; details?: any }> {
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

      // 根据消息格式选择不同的消息类型
      const body = useMarkdown ? {
        msgtype: 'markdown',
        markdown: {
          title: '业绩日报',
          text: message
        }
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

      if (result.errcode === 0) {
        return { success: true, message: '钉钉消息发送成功', details: result };
      } else {
        return { success: false, message: `钉钉发送失败: ${result.errmsg}`, details: result };
      }
    } catch (error: any) {
      return { success: false, message: `钉钉发送异常: ${error.message}` };
    }
  }

  /**
   * 发送企业微信消息
   */
  private async sendWechatWorkMessage(webhook: string, message: string, useMarkdown: boolean = false): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log(`[业绩报表] 发送企业微信消息...`);

      // 根据消息格式选择不同的消息类型
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

      console.log(`[业绩报表] 企业微信响应:`, result);

      if (result.errcode === 0) {
        return { success: true, message: '企业微信消息发送成功', details: result };
      } else {
        return { success: false, message: `企业微信发送失败: ${result.errmsg}`, details: result };
      }
    } catch (error: any) {
      return { success: false, message: `企业微信发送异常: ${error.message}` };
    }
  }
}
