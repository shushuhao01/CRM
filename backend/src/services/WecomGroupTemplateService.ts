/**
 * 群模板服务 - V4.0新增
 */
import { AppDataSource } from '../config/database';
import { WecomGroupTemplate } from '../entities/WecomGroupTemplate';

export class WecomGroupTemplateService {
  async getTemplates(tenantId: string, configId?: number) {
    const where: any = { tenantId };
    if (configId) where.wecomConfigId = configId;
    return await AppDataSource.getRepository(WecomGroupTemplate).find({ where, order: { createdAt: 'DESC' } });
  }
}

export const wecomGroupTemplateService = new WecomGroupTemplateService();

