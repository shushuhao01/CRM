/**
 * AI质检服务 - V4.0新增
 */
import { AppDataSource } from '../config/database';
import { WecomAiInspectStrategy } from '../entities/WecomAiInspectStrategy';
import { WecomAiInspectResult } from '../entities/WecomAiInspectResult';

export class WecomAiInspectService {
  async getStrategies(tenantId: string) {
    return await AppDataSource.getRepository(WecomAiInspectStrategy).find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async analyzeConversation(_tenantId: string, _strategyId: number, _conversationId: string) {
    // TODO: 调用AI模型分析会话内容
    // 1. 获取策略配置
    // 2. 获取会话消息
    // 3. 构建Prompt
    // 4. 调用AI模型
    // 5. 解析结果并保存
    return null;
  }
}

export const wecomAiInspectService = new WecomAiInspectService();

