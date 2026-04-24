/**
 * 企微客户同步定时任务
 *
 * 功能：
 * 1. 定时遍历所有启用的企微配置，自动同步企微客户数据
 * 2. 每个租户每小时最多同步1次（限流）
 * 3. 同步限额：每个租户默认最多5000客户
 * 4. 可手动触发同步
 */
import { AppDataSource } from '../config/database';
import { WecomConfig } from '../entities/WecomConfig';
import { WecomUserBinding } from '../entities/WecomUserBinding';
import { WecomCustomer } from '../entities/WecomCustomer';
import WecomApiService from './WecomApiService';
import { WecomChatArchiveService } from './WecomChatArchiveService';
import { log } from '../config/logger';

// 同步限流：记录每个配置的最后同步时间
const lastSyncTimeMap: Map<number, number> = new Map();

// 默认限流间隔：1小时
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

// 默认客户上限
const DEFAULT_CUSTOMER_LIMIT = 5000;

export class WecomSyncScheduler {
  /**
   * 运行一轮自动同步
   * 遍历所有启用的企微配置，逐个同步客户
   */
  async runAutoSync(): Promise<void> {
    log.info('[WecomSync] 开始自动同步...');

    try {
      const configRepo = AppDataSource.getRepository(WecomConfig);
      const configs = await configRepo.find({ where: { isEnabled: true } });

      if (configs.length === 0) {
        log.info('[WecomSync] 没有启用的企微配置，跳过同步');
        return;
      }

      log.info(`[WecomSync] 找到 ${configs.length} 个启用的配置`);

      for (const config of configs) {
        try {
          await this.syncConfigCustomers(config);
        } catch (error: any) {
          log.error(`[WecomSync] 配置 ${config.name}(${config.id}) 客户同步失败:`, error.message);
        }

        // 会话存档同步（仅对配置了chatArchiveSecret的配置）
        if (config.chatArchiveSecret) {
          try {
            const archiveResult = await WecomChatArchiveService.syncChatRecords(config);
            if (archiveResult.permitUsers > 0) {
              log.info(`[WecomSync] 配置 ${config.name}(${config.id}) 会话存档同步: ${archiveResult.permitUsers}个开通成员`);
            }
          } catch (error: any) {
            log.error(`[WecomSync] 配置 ${config.name}(${config.id}) 会话存档同步失败:`, error.message);
          }
        }
      }

      log.info('[WecomSync] 自动同步完成');
    } catch (error: any) {
      log.error('[WecomSync] 自动同步出错:', error.message);
    }
  }

  /**
   * 同步单个配置下的客户
   */
  async syncConfigCustomers(config: WecomConfig): Promise<{ syncCount: number; skipped: boolean }> {
    const configId = config.id;

    // 限流检查：每个配置每小时最多同步一次
    const lastSync = lastSyncTimeMap.get(configId);
    if (lastSync && Date.now() - lastSync < SYNC_INTERVAL_MS) {
      const remainMin = Math.ceil((SYNC_INTERVAL_MS - (Date.now() - lastSync)) / 60000);
      log.info(`[WecomSync] 配置 ${config.name}(${configId}) 限流中，${remainMin}分钟后可再次同步`);
      return { syncCount: 0, skipped: true };
    }

    // 检查是否有外部联系人Secret
    if (!(config as any).externalContactSecret && !config.contactSecret && !config.corpSecret) {
      log.info(`[WecomSync] 配置 ${config.name}(${configId}) 缺少Secret，跳过`);
      return { syncCount: 0, skipped: true };
    }

    // 获取该配置下已绑定的成员
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const bindings = await bindingRepo.find({
      where: { wecomConfigId: configId, isEnabled: true }
    });

    if (bindings.length === 0) {
      log.info(`[WecomSync] 配置 ${config.name}(${configId}) 没有绑定成员，跳过`);
      return { syncCount: 0, skipped: true };
    }

    log.info(`[WecomSync] 开始同步配置 ${config.name}(${configId})，${bindings.length} 个绑定成员`);

    // 记录同步开始时间
    lastSyncTimeMap.set(configId, Date.now());

    // 获取AccessToken
    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
    const customerRepo = AppDataSource.getRepository(WecomCustomer);
    let syncCount = 0;

    // 检查当前客户数量（限额检查）
    const currentCount = await customerRepo.count({
      where: { wecomConfigId: configId }
    });

    if (currentCount >= DEFAULT_CUSTOMER_LIMIT) {
      log.warn(`[WecomSync] 配置 ${config.name}(${configId}) 客户数已达上限 ${DEFAULT_CUSTOMER_LIMIT}，跳过同步`);
      return { syncCount: 0, skipped: true };
    }

    const remainQuota = DEFAULT_CUSTOMER_LIMIT - currentCount;

    for (const binding of bindings) {
      if (syncCount >= remainQuota) {
        log.warn(`[WecomSync] 已达到客户上限，停止同步`);
        break;
      }

      try {
        const externalUserIds = await WecomApiService.getExternalContactList(accessToken, binding.wecomUserId);

        for (const externalUserId of externalUserIds) {
          if (syncCount >= remainQuota) break;

          try {
            const detail = await WecomApiService.getExternalContactDetail(accessToken, externalUserId);
            const externalContact = detail.external_contact;
            const followUser = detail.follow_user?.[0];

            // 查找或创建
            let customer = await customerRepo.findOne({
              where: { wecomConfigId: configId, externalUserId }
            });

            if (!customer) {
              customer = customerRepo.create({
                wecomConfigId: configId,
                corpId: config.corpId,
                externalUserId,
                tenantId: config.tenantId
              });
            }

            customer.name = externalContact.name;
            customer.avatar = externalContact.avatar;
            customer.type = externalContact.type;
            customer.gender = externalContact.gender;
            customer.corpName = externalContact.corp_name;
            customer.position = externalContact.position;
            customer.followUserId = binding.wecomUserId;
            customer.followUserName = binding.wecomUserName;
            customer.remark = followUser?.remark;
            customer.description = followUser?.description;
            customer.addTime = followUser?.createtime ? new Date(followUser.createtime * 1000) : null;
            customer.addWay = followUser?.add_way;
            customer.tagIds = followUser?.tags ? JSON.stringify(followUser.tags.map((t: any) => t.tag_id)) : null;
            customer.status = 'normal';

            await customerRepo.save(customer);
            syncCount++;
          } catch (e: any) {
            log.error(`[WecomSync] 同步客户 ${externalUserId} 出错:`, e.message);
          }
        }
      } catch (e: any) {
        log.error(`[WecomSync] 同步成员 ${binding.wecomUserId} 的客户出错:`, e.message);
      }
    }

    log.info(`[WecomSync] 配置 ${config.name}(${configId}) 同步完成，同步 ${syncCount} 个客户`);
    return { syncCount, skipped: false };
  }

  /**
   * 手动触发指定配置的同步（跳过限流）
   */
  async manualSync(configId: number): Promise<{ syncCount: number }> {
    // 清除限流记录
    lastSyncTimeMap.delete(configId);

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      throw new Error('企微配置不存在或已禁用');
    }

    return this.syncConfigCustomers(config);
  }
}

export const wecomSyncScheduler = new WecomSyncScheduler();

