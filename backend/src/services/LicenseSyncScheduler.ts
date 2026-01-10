/**
 * License Sync Scheduler - 授权同步定时任务
 * 定期向管理后台同步授权信息，确保本地数据与后台一致
 */
import { licenseService } from './LicenseService';

class LicenseSyncScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private syncInterval: number = 30 * 60 * 1000; // 默认30分钟同步一次

  /**
   * 启动定时同步
   * @param intervalMinutes 同步间隔（分钟），默认30分钟
   */
  start(intervalMinutes: number = 30) {
    if (this.intervalId) {
      console.log('[LicenseSyncScheduler] 已在运行中');
      return;
    }

    this.syncInterval = intervalMinutes * 60 * 1000;

    // 启动时先同步一次
    this.sync();

    // 设置定时任务
    this.intervalId = setInterval(() => {
      this.sync();
    }, this.syncInterval);

    console.log(`[LicenseSyncScheduler] 已启动，同步间隔: ${intervalMinutes} 分钟`);
  }

  /**
   * 停止定时同步
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[LicenseSyncScheduler] 已停止');
    }
  }

  /**
   * 执行一次同步
   */
  async sync() {
    try {
      console.log('[LicenseSyncScheduler] 开始同步授权信息...');

      const result = await licenseService.verifyOnline();

      if (result.valid) {
        console.log(`[LicenseSyncScheduler] 同步成功，maxUsers: ${result.maxUsers}`);
      } else {
        console.warn(`[LicenseSyncScheduler] 同步失败: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('[LicenseSyncScheduler] 同步出错:', error);
      return { valid: false, message: '同步出错' };
    }
  }

  /**
   * 获取运行状态
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

export const licenseSyncScheduler = new LicenseSyncScheduler();
export default licenseSyncScheduler;
