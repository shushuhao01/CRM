/**
 * 自动匹配服务
 * V4.0: 企微客户与CRM客户的自动匹配推荐逻辑
 * 支持: 手机号精确匹配(high) + 姓名匹配(medium)
 */
import { AppDataSource } from '../config/database';
import { WecomCustomer } from '../entities/WecomCustomer';
import { WecomAutoMatchSuggestion } from '../entities/WecomAutoMatchSuggestion';
import { Customer } from '../entities/Customer';

export class WecomAutoMatchService {

  /**
   * 执行自动匹配流程
   */
  async runAutoMatch(tenantId: string, configId?: number): Promise<{ newPendingCount: number }> {
    const wecomRepo = AppDataSource.getRepository(WecomCustomer);
    const customerRepo = AppDataSource.getRepository(Customer);
    const suggestionRepo = AppDataSource.getRepository(WecomAutoMatchSuggestion);

    let newPendingCount = 0;

    // ====== 1. 手机号精确匹配 (high confidence) ======
    const phoneQb = wecomRepo.createQueryBuilder('wc')
      .where('wc.tenantId = :tenantId', { tenantId })
      .andWhere('wc.phone IS NOT NULL')
      .andWhere('wc.phone != :empty', { empty: '' })
      .andWhere('(wc.crmCustomerId IS NULL OR wc.crmCustomerId = :emptyCrm)', { emptyCrm: '' });
    if (configId) phoneQb.andWhere('wc.wecomConfigId = :configId', { configId });
    const phoneCustomers = await phoneQb.getMany();

    for (const wc of phoneCustomers) {
      const crmCustomer = await customerRepo.createQueryBuilder('c')
        .where('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.phone = :phone', { phone: wc.phone })
        .getOne();
      if (!crmCustomer) continue;

      const existing = await suggestionRepo.findOne({
        where: { tenantId, wecomCustomerId: wc.id, crmCustomerId: crmCustomer.id }
      });
      if (existing) continue;

      const suggestion = suggestionRepo.create({
        tenantId, wecomCustomerId: wc.id, crmCustomerId: crmCustomer.id,
        matchType: 'phone', matchField: wc.phone, confidence: 'high', status: 'pending'
      });
      await suggestionRepo.save(suggestion);
      newPendingCount++;
    }

    // ====== 2. 姓名匹配 (medium confidence) ======
    const nameQb = wecomRepo.createQueryBuilder('wc')
      .where('wc.tenantId = :tenantId', { tenantId })
      .andWhere('wc.name IS NOT NULL')
      .andWhere('wc.name != :empty', { empty: '' })
      .andWhere('(wc.crmCustomerId IS NULL OR wc.crmCustomerId = :emptyCrm)', { emptyCrm: '' });
    if (configId) nameQb.andWhere('wc.wecomConfigId = :configId', { configId });
    const nameCustomers = await nameQb.getMany();

    for (const wc of nameCustomers) {
      // 用备注名或昵称匹配CRM客户名
      const nameToMatch = (wc.remark || wc.name || '').trim();
      if (!nameToMatch || nameToMatch.length < 2) continue;

      const crmCustomer = await customerRepo.createQueryBuilder('c')
        .where('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.name = :name', { name: nameToMatch })
        .getOne();
      if (!crmCustomer) continue;

      // 避免重复建议
      const existing = await suggestionRepo.findOne({
        where: { tenantId, wecomCustomerId: wc.id, crmCustomerId: crmCustomer.id }
      });
      if (existing) continue;

      const suggestion = suggestionRepo.create({
        tenantId, wecomCustomerId: wc.id, crmCustomerId: crmCustomer.id,
        matchType: 'name', matchField: nameToMatch, confidence: 'medium', status: 'pending'
      });
      await suggestionRepo.save(suggestion);
      newPendingCount++;
    }

    return { newPendingCount };
  }

  /**
   * 获取待确认数量
   */
  async getPendingCount(tenantId: string): Promise<number> {
    return await AppDataSource.getRepository(WecomAutoMatchSuggestion).count({
      where: { tenantId, status: 'pending' }
    });
  }
}

export const wecomAutoMatchService = new WecomAutoMatchService();
