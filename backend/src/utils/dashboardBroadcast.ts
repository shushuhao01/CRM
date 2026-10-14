/**
 * 数据看板变更广播
 *
 * 业务数据（订单/客户/业绩等）写成功后调用，通知同租户在线用户的「数据看板」自动刷新。
 * 采用动态导入避免与 services/WebSocketService 形成循环依赖；
 * WebSocket 未初始化或推送失败时静默返回，绝不影响业务主流程。
 */

export type DashboardChangeScope =
  | 'orders'
  | 'customers'
  | 'performance'
  | 'logistics';

export function notifyDashboardDataChanged(
  scope: DashboardChangeScope,
  tenantId?: string | null
): void {
  try {
    import('../services/WebSocketService')
      .then(({ webSocketService }) => {
        if (!webSocketService || !webSocketService.isInitialized()) return;
        webSocketService.broadcast('dashboard:data_changed', { scope }, tenantId || undefined);
      })
      .catch(() => {
        // 忽略：广播失败不影响业务写入
      });
  } catch {
    // 忽略：任何异常都不影响业务写入
  }
}
