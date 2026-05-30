/**
 * 智能上下线规则定时执行服务
 * 每5分钟检查一次所有配置了智能规则的获客链接和活码
 */
import { AppDataSource } from '../config/database';
import { WecomAcquisitionSmartRule } from '../entities/WecomAcquisitionSmartRule';
import { WecomAcquisitionLink } from '../entities/WecomAcquisitionLink';
import { WecomContactWay } from '../entities/WecomContactWay';
import { log } from '../config/logger';

class SmartOnlineScheduler {
  async runCheck(): Promise<void> {
    try {
      await this.checkAcquisitionLinks();
      await this.checkContactWays();
    } catch (error: any) {
      log.error('[SmartOnline] Scheduler error:', error.message);
    }
  }

  private async checkAcquisitionLinks(): Promise<void> {
    try {
      const ruleRepo = AppDataSource.getRepository(WecomAcquisitionSmartRule);
      const linkRepo = AppDataSource.getRepository(WecomAcquisitionLink);

      const rules = await ruleRepo.find();
      if (rules.length === 0) return;

      const now = new Date();
      const bjNow = new Date(now.getTime() + 8 * 3600000);
      const currentHour = bjNow.getUTCHours();
      const currentMinute = bjNow.getUTCMinutes();
      const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const currentDay = bjNow.getUTCDay() || 7;

      for (const rule of rules) {
        if (!rule.linkId || rule.linkId < 0) continue;

        const link = await linkRepo.findOne({ where: { id: rule.linkId } });
        if (!link) continue;

        let shouldOffline = false;
        let offlineReason = '';

        // 检查非工作时间
        if (rule.workTimeEnabled && rule.workTimeStart && rule.workTimeEnd) {
          let workDays: number[] = [1, 2, 3, 4, 5];
          try { workDays = JSON.parse(rule.workDays || '[1,2,3,4,5]'); } catch {}
          const isWorkDay = workDays.includes(currentDay);
          const isWorkTime = currentTime >= rule.workTimeStart && currentTime <= rule.workTimeEnd;

          if (!isWorkDay || !isWorkTime) {
            shouldOffline = true;
            offlineReason = 'work_time';
          }
        }

        // 检查每日上限
        if (rule.dailyLimitEnabled && rule.dailyLimitPerUser) {
          const today = bjNow.toISOString().split('T')[0];
          let dailyStats: any[] = [];
          try { dailyStats = JSON.parse(link.dailyStats || '[]'); } catch {}
          const todayEntry = dailyStats.find((d: any) => d.date === today);
          const todayAdd = todayEntry?.add || 0;

          let userIds: string[] = [];
          try { userIds = JSON.parse(link.userIds || '[]'); } catch {}
          const perUserAdd = userIds.length > 0 ? Math.ceil(todayAdd / userIds.length) : todayAdd;

          if (perUserAdd >= rule.dailyLimitPerUser) {
            shouldOffline = true;
            offlineReason = 'daily_limit';
          }
        }

        // 检查流失率
        if (rule.lossRateEnabled && rule.lossRateThreshold) {
          const addCount = link.addCount || 0;
          const lossCount = link.lossCount || 0;
          if (addCount > 0) {
            const lossRate = Math.round((lossCount / addCount) * 100);
            if (lossRate >= rule.lossRateThreshold) {
              shouldOffline = true;
              offlineReason = 'loss_rate';
            }
          }
        }

        // 次日自动上线检查
        if (rule.nextDayAutoOnline && rule.nextDayOnlineTime && !link.isEnabled) {
          const timeDiff = this.getTimeDiffMinutes(currentTime, rule.nextDayOnlineTime);
          if (timeDiff >= 0 && timeDiff < 5) {
            const offlineBy = (link as any).offlineReason || '';
            const shouldExclude =
              (rule.nextDayExcludeManual && offlineBy === 'manual') ||
              (rule.nextDayExcludeLossRate && offlineBy === 'loss_rate');

            if (!shouldExclude) {
              link.isEnabled = true;
              (link as any).offlineReason = '';
              await linkRepo.save(link);
              log.info(`[SmartOnline] Auto-online link ${rule.linkId} at ${currentTime}`);
              continue;
            }
          }
        }

        // 执行下线
        if (shouldOffline && link.isEnabled) {
          link.isEnabled = false;
          (link as any).offlineReason = offlineReason;
          await linkRepo.save(link);
          log.info(`[SmartOnline] Auto-offline link ${rule.linkId}, reason: ${offlineReason}`);
        }

        // 恢复上线（非工作时间结束后）
        if (!shouldOffline && !link.isEnabled) {
          const offlineBy = (link as any).offlineReason || '';
          if (offlineBy === 'work_time') {
            link.isEnabled = true;
            (link as any).offlineReason = '';
            await linkRepo.save(link);
            log.info(`[SmartOnline] Auto-online link ${rule.linkId} (work time resumed)`);
          }
        }
      }
    } catch (e: any) {
      log.error('[SmartOnline] Check acquisition links error:', e.message);
    }
  }

  private async checkContactWays(): Promise<void> {
    try {
      const ruleRepo = AppDataSource.getRepository(WecomAcquisitionSmartRule);
      const cwRepo = AppDataSource.getRepository(WecomContactWay);

      const rules = await ruleRepo.find();
      if (rules.length === 0) return;

      const now = new Date();
      const bjNow = new Date(now.getTime() + 8 * 3600000);
      const currentHour = bjNow.getUTCHours();
      const currentMinute = bjNow.getUTCMinutes();
      const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const currentDay = bjNow.getUTCDay() || 7;

      for (const rule of rules) {
        if (!rule.linkId || rule.linkId > 0) continue;
        const cwId = Math.abs(rule.linkId);

        const cw = await cwRepo.findOne({ where: { id: cwId } });
        if (!cw) continue;

        let shouldOffline = false;
        let offlineReason = '';

        // 检查非工作时间
        if (rule.workTimeEnabled && rule.workTimeStart && rule.workTimeEnd) {
          let workDays: number[] = [1, 2, 3, 4, 5];
          try { workDays = JSON.parse(rule.workDays || '[1,2,3,4,5]'); } catch {}
          const isWorkDay = workDays.includes(currentDay);
          const isWorkTime = currentTime >= rule.workTimeStart && currentTime <= rule.workTimeEnd;
          if (!isWorkDay || !isWorkTime) {
            shouldOffline = true;
            offlineReason = 'work_time';
          }
        }

        // 检查每日上限
        if (rule.dailyLimitEnabled && rule.dailyLimitPerUser) {
          const todayAdd = cw.todayAddCount || 0;
          let userIds: string[] = [];
          try { userIds = JSON.parse(cw.userIds || '[]'); } catch {}
          const perUserAdd = userIds.length > 0 ? Math.ceil(todayAdd / userIds.length) : todayAdd;
          if (perUserAdd >= rule.dailyLimitPerUser) {
            shouldOffline = true;
            offlineReason = 'daily_limit';
          }
        }

        // 次日自动上线
        if (rule.nextDayAutoOnline && rule.nextDayOnlineTime && !cw.isEnabled) {
          const timeDiff = this.getTimeDiffMinutes(currentTime, rule.nextDayOnlineTime);
          if (timeDiff >= 0 && timeDiff < 5) {
            cw.isEnabled = true;
            await cwRepo.save(cw);
            log.info(`[SmartOnline] Auto-online contact way ${cwId}`);
            continue;
          }
        }

        if (shouldOffline && cw.isEnabled) {
          cw.isEnabled = false;
          await cwRepo.save(cw);
          log.info(`[SmartOnline] Auto-offline contact way ${cwId}, reason: ${offlineReason}`);
        }

        if (!shouldOffline && !cw.isEnabled) {
          cw.isEnabled = true;
          await cwRepo.save(cw);
          log.info(`[SmartOnline] Auto-online contact way ${cwId} (work time resumed)`);
        }
      }
    } catch (e: any) {
      log.error('[SmartOnline] Check contact ways error:', e.message);
    }
  }

  private getTimeDiffMinutes(current: string, target: string): number {
    const [ch, cm] = current.split(':').map(Number);
    const [th, tm] = target.split(':').map(Number);
    return (ch * 60 + cm) - (th * 60 + tm);
  }
}

export const smartOnlineScheduler = new SmartOnlineScheduler();
