/**
 * AI助手核心服务 - V4.0新增
 */
import { AppDataSource } from '../config/database';
import { WecomAiModel } from '../entities/WecomAiModel';
import { WecomAiAgent } from '../entities/WecomAiAgent';
import { WecomAiLog } from '../entities/WecomAiLog';

export class WecomAiService {

  /**
   * 获取默认AI模型
   */
  async getDefaultModel(tenantId: string): Promise<WecomAiModel | null> {
    return await AppDataSource.getRepository(WecomAiModel).findOne({
      where: { tenantId, isDefault: true, isEnabled: true }
    });
  }

  /**
   * 记录AI调用日志
   */
  async logAiCall(tenantId: string, data: {
    agentId?: number; agentName?: string; operationType: string; targetDescription?: string;
    inputTokens?: number; outputTokens?: number; totalTokens?: number; durationMs?: number;
    status: 'success' | 'fail' | 'timeout'; errorMessage?: string;
    requestPayload?: string; responsePayload?: string;
  }): Promise<void> {
    const log = AppDataSource.getRepository(WecomAiLog).create({ ...data, tenantId });
    await AppDataSource.getRepository(WecomAiLog).save(log);
  }

  /**
   * 获取AI使用量统计
   */
  async getUsageStats(tenantId: string): Promise<{ used: number; quota: number; percent: number }> {
    const result = await AppDataSource.getRepository(WecomAiLog)
      .createQueryBuilder('log')
      .select('SUM(log.totalTokens)', 'totalUsed')
      .where('log.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const used = Number(result?.totalUsed || 0);
    const quota = 10000; // TODO: 从配额配置获取

    return { used, quota, percent: quota > 0 ? Math.round((used / quota) * 100) : 0 };
  }
}

export const wecomAiService = new WecomAiService();
