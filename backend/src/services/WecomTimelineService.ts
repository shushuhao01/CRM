/**
 * 会话轨迹服务 - V4.0新增
 */
import { AppDataSource } from '../config/database';
import { WecomCustomerEvent } from '../entities/WecomCustomerEvent';

export class WecomTimelineService {
  async getTimeline(tenantId: string, externalUserId: string, configId?: number) {
    const qb = AppDataSource.getRepository(WecomCustomerEvent).createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.externalUserId = :externalUserId', { externalUserId });
    if (configId) qb.andWhere('e.wecomConfigId = :configId', { configId });
    qb.orderBy('e.eventTime', 'DESC');
    return await qb.getMany();
  }

  async recordEvent(tenantId: string, data: Partial<WecomCustomerEvent>) {
    const event = AppDataSource.getRepository(WecomCustomerEvent).create({ ...data, tenantId, eventTime: new Date() });
    return await AppDataSource.getRepository(WecomCustomerEvent).save(event);
  }
}

export const wecomTimelineService = new WecomTimelineService();

