/**
 * VAS到期自动检查服务
 * 定时检测增值服务(会话存档等)的到期时间，自动停用过期租户
 */
import { AppDataSource } from '../config/database';
import { log } from '../config/logger';

class VasExpiryCheckService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /**
   * 启动定时检查（默认每小时检查一次）
   */
  start(intervalMinutes = 60) {
    if (this.timer) {
      log.warn('[VasExpiryCheck] 服务已在运行中，跳过重复启动');
      return;
    }

    // 启动后延迟30秒执行第一次（等数据库就绪）
    setTimeout(() => this.check(), 30 * 1000);

    this.timer = setInterval(() => this.check(), intervalMinutes * 60 * 1000);
    log.info(`[VasExpiryCheck] 增值服务到期检查已启动（间隔：${intervalMinutes}分钟）`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      log.info('[VasExpiryCheck] 服务已停止');
    }
  }

  /**
   * 执行到期检查
   */
  async check(): Promise<{ expiredCount: number; closedOrderCount: number }> {
    if (this.running) {
      log.debug('[VasExpiryCheck] 上一次检查仍在进行，跳过');
      return { expiredCount: 0, closedOrderCount: 0 };
    }

    this.running = true;
    let expiredCount = 0;
    let closedOrderCount = 0;

    try {
      if (!AppDataSource?.isInitialized) {
        log.debug('[VasExpiryCheck] 数据库未就绪，跳过');
        return { expiredCount: 0, closedOrderCount: 0 };
      }

      // 1. 检测 wecom_archive_settings 表是否存在
      const tableCheck = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings'`
      ).catch(() => [{ cnt: 0 }]);

      if (!tableCheck[0]?.cnt) {
        log.debug('[VasExpiryCheck] wecom_archive_settings 表不存在，跳过检查');
        return { expiredCount: 0, closedOrderCount: 0 };
      }

      // 2. 查找已过期但状态仍为 active 的存档设置
      const expiredRows = await AppDataSource.query(
        "SELECT tenant_id, expire_date FROM wecom_archive_settings WHERE status = 'active' AND expire_date IS NOT NULL AND expire_date < NOW()"
      ).catch(() => []);

      for (const row of expiredRows) {
        try {
          // 更新存档设置为过期
          await AppDataSource.query(
            "UPDATE wecom_archive_settings SET status = 'expired', updated_at = NOW() WHERE tenant_id = ?",
            [row.tenant_id]
          );

          // 撤销租户的会话存档授权
          await AppDataSource.query(
            'UPDATE tenants SET wecom_chat_archive_auth = 0 WHERE id = ?',
            [row.tenant_id]
          );

          // 获取租户名称用于日志
          const tenantRows = await AppDataSource.query(
            'SELECT name FROM tenants WHERE id = ?', [row.tenant_id]
          ).catch(() => []);
          const tenantName = tenantRows[0]?.name || row.tenant_id;

          log.info(`[VasExpiryCheck] 租户「${tenantName}」的会话存档增值服务已过期（到期时间: ${row.expire_date}），已自动停用`);
          expiredCount++;
        } catch (err: any) {
          log.error(`[VasExpiryCheck] 处理租户 ${row.tenant_id} 到期失败:`, err.message);
        }
      }

      // 3. 关闭超时未支付的VAS订单（超过30分钟）
      try {
        const result = await AppDataSource.query(
          `UPDATE payment_orders SET status = 'closed', remark = CONCAT(IFNULL(remark, ''), '\n[系统] 超时未支付自动关闭'), updated_at = NOW()
           WHERE package_id = 'vas_chat_archive' AND status = 'pending' AND expire_time IS NOT NULL AND expire_time < NOW()`
        );
        closedOrderCount = result.affectedRows || 0;
        if (closedOrderCount > 0) {
          log.info(`[VasExpiryCheck] 已关闭 ${closedOrderCount} 个超时未支付的VAS订单`);
        }
      } catch (err: any) {
        log.error('[VasExpiryCheck] 关闭超时订单失败:', err.message);
      }

      // 4. 即将过期提前警告（7天内到期）
      try {
        const warningRows = await AppDataSource.query(
          `SELECT was2.tenant_id, was2.expire_date, t.name AS tenantName
           FROM wecom_archive_settings was2
           LEFT JOIN tenants t ON was2.tenant_id = t.id
           WHERE was2.status = 'active' AND was2.expire_date IS NOT NULL
             AND was2.expire_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)`
        ).catch(() => []);

        if (warningRows.length > 0) {
          log.warn(`[VasExpiryCheck] ${warningRows.length} 个租户的会话存档即将在7天内到期: ${warningRows.map((r: any) => r.tenantName || r.tenant_id).join(', ')}`);
        }
      } catch {}

      if (expiredCount > 0 || closedOrderCount > 0) {
        log.info(`[VasExpiryCheck] 检查完成: ${expiredCount} 个租户过期停用, ${closedOrderCount} 个超时订单关闭`);
      }
    } catch (error: any) {
      log.error('[VasExpiryCheck] 到期检查异常:', error.message);
    } finally {
      this.running = false;
    }

    return { expiredCount, closedOrderCount };
  }
}

export const vasExpiryCheckService = new VasExpiryCheckService();

