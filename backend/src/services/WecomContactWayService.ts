/**
 * 活码管理服务
 * V4.0新增: 处理活码的业务逻辑，包括企微API对接
 */
import { AppDataSource } from '../config/database';
import { WecomContactWay } from '../entities/WecomContactWay';
import { WecomContactWayDailyStat } from '../entities/WecomContactWayDailyStat';

export class WecomContactWayService {

  /**
   * 创建活码（调用企微API add_contact_way）
   */
  async createContactWay(tenantId: string, data: Partial<WecomContactWay>): Promise<WecomContactWay> {
    const repo = AppDataSource.getRepository(WecomContactWay);

    // TODO: 调用企微 API POST /cgi-bin/externalcontact/add_contact_way
    // 获取 config_id 和 qr_code

    const contactWay = repo.create({ ...data, tenantId });
    return await repo.save(contactWay);
  }

  /**
   * 更新活码（调用企微API update_contact_way）
   */
  async updateContactWay(tenantId: string, id: number, data: Partial<WecomContactWay>): Promise<WecomContactWay | null> {
    const repo = AppDataSource.getRepository(WecomContactWay);

    const contactWay = await repo.findOne({ where: { id, tenantId } });
    if (!contactWay) return null;

    // TODO: 调用企微 API POST /cgi-bin/externalcontact/update_contact_way

    Object.assign(contactWay, data);
    return await repo.save(contactWay);
  }

  /**
   * 删除活码（调用企微API del_contact_way）
   */
  async deleteContactWay(tenantId: string, id: number): Promise<boolean> {
    const repo = AppDataSource.getRepository(WecomContactWay);

    const contactWay = await repo.findOne({ where: { id, tenantId } });
    if (!contactWay) return false;

    // TODO: 调用企微 API POST /cgi-bin/externalcontact/del_contact_way

    await repo.remove(contactWay);
    return true;
  }

  /**
   * 记录活码添加事件（由回调触发）
   */
  async recordAddEvent(tenantId: string, contactWayId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // 更新每日统计
    const statRepo = AppDataSource.getRepository(WecomContactWayDailyStat);
    let stat = await statRepo.findOne({ where: { tenantId, contactWayId, statDate: today } });

    if (stat) {
      stat.addCount += 1;
      stat.netCount = stat.addCount - stat.lossCount;
      await statRepo.save(stat);
    } else {
      stat = statRepo.create({ tenantId, contactWayId, statDate: today, addCount: 1, lossCount: 0, netCount: 1 });
      await statRepo.save(stat);
    }

    // 更新活码总计数
    const cwRepo = AppDataSource.getRepository(WecomContactWay);
    await cwRepo.increment({ id: contactWayId }, 'totalAddCount', 1);
  }

  /**
   * 记录活码流失事件（由回调触发）
   */
  async recordLossEvent(tenantId: string, contactWayId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const statRepo = AppDataSource.getRepository(WecomContactWayDailyStat);
    let stat = await statRepo.findOne({ where: { tenantId, contactWayId, statDate: today } });

    if (stat) {
      stat.lossCount += 1;
      stat.netCount = stat.addCount - stat.lossCount;
      await statRepo.save(stat);
    } else {
      stat = statRepo.create({ tenantId, contactWayId, statDate: today, addCount: 0, lossCount: 1, netCount: -1 });
      await statRepo.save(stat);
    }

    const cwRepo = AppDataSource.getRepository(WecomContactWay);
    await cwRepo.increment({ id: contactWayId }, 'totalLossCount', 1);
  }
}

export const wecomContactWayService = new WecomContactWayService();
