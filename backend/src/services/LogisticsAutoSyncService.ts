/**
 * 物流状态自动同步服务
 *
 * 功能：
 * 1. 定时查询已发货订单的最新物流动态
 * 2. 根据物流动态关键词智能检测物流状态
 * 3. 安全地将物流状态映射为订单状态并更新
 *
 * 核心安全规则：
 * - 退回相关关键词永远优先于签收判断（防止"退回签收"被误判为"已签收"）
 * - 只有终态物流状态才同步更新订单状态（签收/拒收/异常/退回）
 * - 在途状态（揽收/运输/派送）只更新物流状态字段，不动订单状态
 * - 已退回的判定取决于当前订单状态（拒收→拒收已退回，其他→物流部退回）
 * - 终态订单不参与同步
 */

import { log } from '../config/logger';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderStatusHistory } from '../entities/OrderStatusHistory';

// ==================== 物流状态检测（核心逻辑）====================

/**
 * 🔥 从物流动态描述文本中智能检测物流状态
 *
 * 检测优先级（绝不能颠倒！）：
 * 1. 退回 returned     — 最高优先，防止"退回签收"误判
 * 2. 拒收 rejected     — 第二优先
 * 3. 签收 delivered    — 排在退回/拒收之后
 * 4. 异常 exception    — 派送异常
 * 5. 派送中 out_for_delivery
 * 6. 运输中 in_transit
 * 7. 已揽收 picked_up
 * 8. 待揽收 pending
 */
export function detectLogisticsStatus(description: string): string {
  if (!description) return 'unknown';

  const desc = description.toLowerCase();

  // ========== 1️⃣ 退回（最高优先级）==========
  // ⚠️ 必须在签收之前！"退回签收"、"仓库签收"、"发件人已签收退件" 都属退回
  if (
    desc.includes('退回') || desc.includes('退件') || desc.includes('返回') ||
    desc.includes('退货') || desc.includes('寄回') || desc.includes('已退回') ||
    desc.includes('原路返回') || desc.includes('退回发件') || desc.includes('返回发件') ||
    desc.includes('退回中') || desc.includes('正在退回') || desc.includes('退件中') ||
    desc.includes('退回途中') || desc.includes('逆向物流') || desc.includes('退货物流') ||
    desc.includes('返件') || desc.includes('回寄') || desc.includes('拦截退回') ||
    desc.includes('截件退回') || desc.includes('拦截成功') ||
    // 🔥 关键：退回签收场景（含"签收"但属退回！）
    desc.includes('退回签收') || desc.includes('退回派送') || desc.includes('仓库签收') ||
    desc.includes('退回仓库') || desc.includes('返回仓库') || desc.includes('退回网点') ||
    desc.includes('退回发件人') || desc.includes('退回寄件人') || desc.includes('退回原寄') ||
    desc.includes('返回原地') || desc.includes('退件入库') || desc.includes('退件签收') ||
    desc.includes('发件人已签收') || desc.includes('发件人取回') || desc.includes('退回到付件')
  ) {
    return 'returned';
  }

  // ========== 2️⃣ 拒收 ==========
  if (
    desc.includes('拒收') || desc.includes('拒绝') || desc.includes('拒签') ||
    desc.includes('客户拒') || desc.includes('收件人拒') || desc.includes('买家拒') ||
    desc.includes('不要了') || desc.includes('取消订单') ||
    desc.includes('拒绝签收') || desc.includes('拒绝收货') || desc.includes('拒绝接收') ||
    desc.includes('用户拒收') || desc.includes('顾客拒收') || desc.includes('客户不要') ||
    desc.includes('客户不需要') || desc.includes('客户不收') || desc.includes('不接受') ||
    desc.includes('已拒收') || desc.includes('已拒签') || desc.includes('到付拒收') ||
    desc.includes('拒付')
  ) {
    return 'rejected';
  }

  // ========== 3️⃣ 已签收（排在退回/拒收之后！）==========
  if (
    desc.includes('签收') || desc.includes('已收货') || desc.includes('已取件') ||
    desc.includes('代收') || desc.includes('本人签收') || desc.includes('已签') ||
    desc.includes('已送达') || desc.includes('妥投') || desc.includes('派送成功') ||
    desc.includes('已领取') || desc.includes('已自提') || desc.includes('派送至本人') ||
    desc.includes('投递成功') || desc.includes('收件完成') || desc.includes('快件已送达') ||
    desc.includes('已完成') || desc.includes('已交付') || desc.includes('已投柜') ||
    desc.includes('已投递') || desc.includes('已放入') || desc.includes('已存入') ||
    // 驿站/快递柜
    desc.includes('驿站代收') || desc.includes('快递柜') || desc.includes('丰巢') ||
    desc.includes('菜鸟驿站') || desc.includes('妈妈驿站') || desc.includes('蜂巢') ||
    desc.includes('智能柜') || desc.includes('自提柜') || desc.includes('收发室') ||
    // 各种代收
    desc.includes('门卫代收') || desc.includes('前台代收') || desc.includes('物业代收') ||
    desc.includes('家人代收') || desc.includes('同事代收') || desc.includes('邻居代收') ||
    desc.includes('保安代收') || desc.includes('保安室') || desc.includes('传达室') ||
    desc.includes('值班室') || desc.includes('收件箱') || desc.includes('超市代收') ||
    desc.includes('便利店代收') || desc.includes('小区代收') || desc.includes('网点代收') ||
    desc.includes('他人代收') || desc.includes('授权代收') || desc.includes('委托代收') ||
    desc.includes('亲属代收') || desc.includes('代签收') || desc.includes('驿站已签收') ||
    // 放置场景（经客户同意放置 = 视为签收）
    desc.includes('客户同意放') || desc.includes('放在前台') || desc.includes('放前台') ||
    desc.includes('放门口') || desc.includes('放门卫') || desc.includes('放物业') ||
    desc.includes('放驿站') || desc.includes('放快递柜') || desc.includes('存放驿站') ||
    desc.includes('存放快递柜') || desc.includes('投放快递柜') || desc.includes('投入快递柜') ||
    desc.includes('已放置') || desc.includes('已存放') || desc.includes('已投放') ||
    desc.includes('放置于') || desc.includes('存放于') || desc.includes('投放于') ||
    desc.includes('放指定位置') || desc.includes('放约定位置') || desc.includes('按要求放置') ||
    desc.includes('已按要求') || desc.includes('已按客户要求') ||
    // 货架/超市/代收点（经同意放置）
    desc.includes('放货架') || desc.includes('放超市') || desc.includes('放小卖部') ||
    desc.includes('放代收点') || desc.includes('经同意放') || desc.includes('经客户同意') ||
    // 取件码/通知取件（已投递到快递柜/驿站）
    desc.includes('取件码') || desc.includes('取货码') || desc.includes('请凭取件码') ||
    desc.includes('请及时取件') || desc.includes('请尽快取件') ||
    desc.includes('已通知取件') || desc.includes('短信通知取件') || desc.includes('已发送取件') ||
    // 自提
    desc.includes('自提点') || desc.includes('自提成功') || desc.includes('提货成功') ||
    desc.includes('已取走') || desc.includes('取件成功') || desc.includes('领取成功') ||
    desc.includes('客户领取成功') ||
    // 各快递公司完成表述
    desc.includes('已妥投') || desc.includes('投妥') || desc.includes('配送完成') ||
    desc.includes('送达完成') || desc.includes('完成配送') || desc.includes('完成送达') ||
    desc.includes('客户已收') || desc.includes('收方已收') ||
    desc.includes('已派送完成') || desc.includes('派件完成') || desc.includes('送货完成') ||
    desc.includes('快件签收') || desc.includes('包裹签收') ||
    desc.includes('寄存成功') || desc.includes('入柜成功') || desc.includes('入站成功') ||
    // 公司前台
    desc.includes('公司前台')
  ) {
    return 'delivered';
  }

  // ========== 4️⃣ 异常 ==========
  if (
    desc.includes('异常') || desc.includes('问题件') || desc.includes('滞留') ||
    desc.includes('延误') || desc.includes('无法派送') || desc.includes('地址不详') ||
    desc.includes('联系不上') || desc.includes('电话无人接听') || desc.includes('无人接听') ||
    desc.includes('超区') || desc.includes('破损') || desc.includes('丢失') ||
    desc.includes('遗失') || desc.includes('短少') || desc.includes('缺失') ||
    desc.includes('无法联系') || desc.includes('地址错误') || desc.includes('地址有误') ||
    desc.includes('停发') || desc.includes('暂停') ||
    desc.includes('不派送') || desc.includes('无法投递') || desc.includes('投递失败') ||
    desc.includes('派送失败') || desc.includes('配送失败') || desc.includes('多次派送未成功') ||
    desc.includes('派送不成功') || desc.includes('派送异常') || desc.includes('配送异常') ||
    desc.includes('派件异常') || desc.includes('投递异常') || desc.includes('送货异常') ||
    desc.includes('无人签收') || desc.includes('无人收件') || desc.includes('无人在家') ||
    desc.includes('不在家') || desc.includes('家中无人') || desc.includes('未能联系') ||
    desc.includes('未能送达') || desc.includes('无法到达') || desc.includes('无法送达') ||
    desc.includes('送达失败') || desc.includes('尝试派送') || desc.includes('再次派送') ||
    // 超时未取
    desc.includes('超时未取') || desc.includes('逾期未取') || desc.includes('过期未取') ||
    desc.includes('长时间未取') || desc.includes('已超时') || desc.includes('已逾期') ||
    // 管控
    desc.includes('安检扣留') || desc.includes('海关扣留') || desc.includes('扣件') ||
    desc.includes('禁运') || desc.includes('违禁') || desc.includes('限制寄递') ||
    // 破损
    desc.includes('包装破损') || desc.includes('内件破损') || desc.includes('外包装破损') ||
    desc.includes('货损') || desc.includes('货差') || desc.includes('少件') ||
    desc.includes('内件不符') || desc.includes('重量不符') || desc.includes('信息不符') ||
    // 地址/电话问题
    desc.includes('地址不完整') || desc.includes('地址模糊') || desc.includes('地址不清') ||
    desc.includes('电话空号') || desc.includes('电话停机') || desc.includes('电话关机') ||
    desc.includes('电话错误') || desc.includes('号码有误') || desc.includes('手机关机') ||
    desc.includes('手机停机') || desc.includes('无效电话') || desc.includes('联系方式有误') ||
    // 不可抗力
    desc.includes('天气原因') || desc.includes('不可抗力') || desc.includes('自然灾害')
  ) {
    return 'exception';
  }

  // ========== 5️⃣ 派送中 ==========
  if (
    desc.includes('派送') || desc.includes('配送') || desc.includes('派件') ||
    desc.includes('正在投递') || desc.includes('快递员') || desc.includes('送货') ||
    desc.includes('正在派送') || desc.includes('派送员') || desc.includes('配送员') ||
    desc.includes('出库派送') || desc.includes('安排派送') || desc.includes('开始派送') ||
    desc.includes('正在为您') || desc.includes('即将送达') || desc.includes('预计今天') ||
    desc.includes('预计送达') || desc.includes('末端派送') || desc.includes('站点派送') ||
    desc.includes('骑手') || desc.includes('小哥') || desc.includes('师傅') ||
    desc.includes('正在为你') || desc.includes('正在送往') || desc.includes('正在送货') ||
    desc.includes('即将派送') || desc.includes('马上派送') || desc.includes('已出发') ||
    desc.includes('派送途中') || desc.includes('配送途中') || desc.includes('送货途中') ||
    desc.includes('正在配送') || desc.includes('快件正在') || desc.includes('包裹正在') ||
    desc.includes('预计今日') || desc.includes('今日送达') || desc.includes('今天送达') ||
    desc.includes('电话联系') || desc.includes('联系收件人') || desc.includes('联系客户') ||
    desc.includes('正在联系') || desc.includes('派送上门') || desc.includes('上门派送') ||
    desc.includes('配送上门') || desc.includes('送货上门') || desc.includes('出发配送') ||
    desc.includes('已到达网点') || desc.includes('已到达站点') || desc.includes('网点派送')
  ) {
    return 'out_for_delivery';
  }

  // ========== 6️⃣ 运输中 ==========
  if (
    desc.includes('运输') || desc.includes('转运') || desc.includes('发往') ||
    desc.includes('到达') || desc.includes('离开') || desc.includes('中转') ||
    desc.includes('装车') || desc.includes('卸车') || desc.includes('分拨') ||
    desc.includes('发出') || desc.includes('在途') || desc.includes('途中') ||
    desc.includes('干线') || desc.includes('航班') || desc.includes('班车') ||
    desc.includes('已发出') || desc.includes('正发往') || desc.includes('运往') ||
    desc.includes('分拣') || desc.includes('扫描') || desc.includes('处理中') ||
    desc.includes('集散') || desc.includes('转运中心') || desc.includes('分拨中心') ||
    desc.includes('营业部') || desc.includes('网点') ||
    desc.includes('已离开') || desc.includes('已到达') || desc.includes('已装车') ||
    desc.includes('已卸车') || desc.includes('已分拣') || desc.includes('已出仓') ||
    desc.includes('已入仓') || desc.includes('出仓') || desc.includes('入仓') ||
    desc.includes('正在运往') || desc.includes('货物在途') ||
    desc.includes('快件在途') || desc.includes('包裹在途') || desc.includes('正在运输') ||
    desc.includes('运输途中') || desc.includes('转运途中') || desc.includes('中转站') ||
    desc.includes('分拣中心') || desc.includes('处理中心') || desc.includes('操作中心') ||
    desc.includes('配送中心') || desc.includes('物流中心') ||
    desc.includes('已交航空') || desc.includes('航空运输') || desc.includes('陆运') ||
    desc.includes('铁路运输') || desc.includes('高铁运输') || desc.includes('城际运输') ||
    desc.includes('已封车') || desc.includes('等待装车') || desc.includes('等待发出') ||
    // 转寄/改派/改地址 → 运输中（包裹被重新路由）
    desc.includes('转寄') || desc.includes('改派') || desc.includes('改地址')
  ) {
    return 'in_transit';
  }

  // ========== 7️⃣ 已揽收 ==========
  if (
    desc.includes('揽收') || desc.includes('收件') || desc.includes('已收') ||
    desc.includes('取件') || desc.includes('揽件') || desc.includes('已揽') ||
    desc.includes('已取') || desc.includes('上门取件') || desc.includes('快递员已取') ||
    desc.includes('寄件成功') || desc.includes('已寄出') || desc.includes('商家已发货') ||
    desc.includes('已收取') || desc.includes('快件已收') || desc.includes('包裹已收') ||
    desc.includes('揽收成功') || desc.includes('取件成功') || desc.includes('已揽件') ||
    desc.includes('快递员上门') || desc.includes('上门收件') || desc.includes('到件扫描') ||
    desc.includes('收入扫描') || desc.includes('寄件人已') || desc.includes('寄方已') ||
    desc.includes('卖家已发货') || desc.includes('商家发货') || desc.includes('已接单')
  ) {
    return 'picked_up';
  }

  // ========== 8️⃣ 待揽收 ==========
  if (
    desc.includes('待揽') || desc.includes('等待') || desc.includes('下单') ||
    desc.includes('已下单') || desc.includes('待取件') || desc.includes('待上门') ||
    desc.includes('预约取件') || desc.includes('等待揽收') ||
    desc.includes('等待上门') || desc.includes('预约上门') || desc.includes('等待取件') ||
    desc.includes('快递员即将') || desc.includes('快递员正在赶来')
  ) {
    return 'pending';
  }

  // 默认运输中
  return 'in_transit';
}

// ==================== 快递100 API 状态码映射 ====================

/**
 * 快递100 state 状态码映射
 */
export function mapKuaidi100State(state: string | number): string {
  const map: Record<string, string> = {
    '0': 'in_transit',       // 在途中
    '1': 'picked_up',        // 已揽收
    '2': 'exception',        // 疑难件
    '3': 'delivered',        // 已签收
    '4': 'rejected',         // 退签
    '5': 'out_for_delivery', // 派件中
    '6': 'returned',         // 退回
    '7': 'exception',        // 转投（异常处理）
    '10': 'in_transit',      // 待清关
    '11': 'in_transit',      // 清关中
    '12': 'in_transit',      // 已清关
    '13': 'exception',       // 清关异常
    '14': 'rejected',        // 拒签
  };
  return map[String(state)] || 'in_transit';
}

// ==================== 物流状态 → 订单状态安全映射 ====================

/**
 * 🔥 核心：根据物流状态和当前订单状态，安全地确定目标订单状态
 *
 * 规则：
 * - 在途状态（pending/picked_up/in_transit/out_for_delivery）→ 不更新订单状态
 * - delivered → 仅当订单当前是 shipped 时，更新为 delivered
 * - rejected → 仅当订单当前是 shipped 时，更新为 rejected
 * - exception → 仅当订单当前是 shipped 时，更新为 package_exception
 * - returned → 根据当前状态判断：
 *   - rejected → rejected_returned（拒收后退回）
 *   - shipped → logistics_returned（物流原因退回）
 *   - package_exception → logistics_returned（异常后退回）
 *
 * @returns 目标订单状态，null 表示不更新
 */
export function mapLogisticsToOrderStatus(
  logisticsStatus: string,
  currentOrderStatus: string
): string | null {
  // 🔒 终态订单不参与同步
  const terminalStatuses = [
    'delivered', 'rejected_returned', 'cancelled', 'after_sales_created',
    'logistics_cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected'
  ];
  if (terminalStatuses.includes(currentOrderStatus)) {
    return null;
  }

  // 🔒 只处理这些订单状态
  const processableStatuses = ['shipped', 'rejected', 'package_exception'];
  if (!processableStatuses.includes(currentOrderStatus)) {
    return null;
  }

  switch (logisticsStatus) {
    case 'delivered':
      // 只有 shipped 才能变 delivered
      return currentOrderStatus === 'shipped' ? 'delivered' : null;

    case 'rejected':
      // 只有 shipped 才能变 rejected
      return currentOrderStatus === 'shipped' ? 'rejected' : null;

    case 'exception':
      // 只有 shipped 才能变 package_exception
      return currentOrderStatus === 'shipped' ? 'package_exception' : null;

    case 'returned':
      // 🔥 退回的目标取决于当前订单状态
      if (currentOrderStatus === 'rejected') return 'rejected_returned';
      if (currentOrderStatus === 'shipped') return 'logistics_returned';
      if (currentOrderStatus === 'package_exception') return 'logistics_returned';
      return null;

    default:
      // pending, picked_up, in_transit, out_for_delivery → 不更新订单状态
      return null;
  }
}

// ==================== 自动同步服务 ====================

export interface AutoSyncResult {
  totalProcessed: number;
  statusUpdated: number;
  logisticsUpdated: number;
  errors: number;
  details: Array<{
    orderNumber: string;
    oldLogisticsStatus: string;
    newLogisticsStatus: string;
    oldOrderStatus: string;
    newOrderStatus: string | null;
    description: string;
  }>;
}

class LogisticsAutoSyncService {
  private isRunning = false;

  /**
   * 🔥 执行一次完整的物流状态自动同步
   *
   * 流程：
   * 1. 查询所有需要同步的订单（shipped/rejected/package_exception 且有快递单号）
   * 2. 获取每个订单的最新物流动态（从数据库 latestLogisticsInfo 字段）
   * 3. 检测物流状态
   * 4. 安全映射到订单状态
   * 5. 更新数据库
   */
  async runAutoSync(tenantId?: string): Promise<AutoSyncResult> {
    if (this.isRunning) {
      log.warn('[物流自动同步] 上一次同步尚未完成，跳过本次');
      return { totalProcessed: 0, statusUpdated: 0, logisticsUpdated: 0, errors: 0, details: [] };
    }

    this.isRunning = true;
    const result: AutoSyncResult = {
      totalProcessed: 0,
      statusUpdated: 0,
      logisticsUpdated: 0,
      errors: 0,
      details: [],
    };

    try {
      log.info('[物流自动同步] ========== 开始执行 ==========');

      const orderRepository = AppDataSource!.getRepository(Order);

      // 1️⃣ 查询需要同步的订单
      const queryBuilder = orderRepository.createQueryBuilder('order')
        .where('order.status IN (:...statuses)', {
          statuses: ['shipped', 'rejected', 'package_exception']
        })
        .andWhere('order.trackingNumber IS NOT NULL')
        .andWhere("order.trackingNumber != ''")
        .andWhere('order.latestLogisticsInfo IS NOT NULL')
        .andWhere("order.latestLogisticsInfo != ''");

      // 租户隔离
      if (tenantId) {
        queryBuilder.andWhere('order.tenantId = :tenantId', { tenantId });
      }

      const orders = await queryBuilder
        .select([
          'order.id',
          'order.orderNumber',
          'order.status',
          'order.logisticsStatus',
          'order.trackingNumber',
          'order.expressCompany',
          'order.latestLogisticsInfo',
          'order.tenantId'
        ])
        .getMany();

      log.info(`[物流自动同步] 查询到 ${orders.length} 个待同步订单`);
      result.totalProcessed = orders.length;

      // 2️⃣ 逐个处理
      for (const order of orders) {
        try {
          await this.processOrder(order, orderRepository, result);
        } catch (err: any) {
          result.errors++;
          log.error(`[物流自动同步] 处理订单 ${order.orderNumber} 失败:`, err.message);
        }
      }

      log.info(`[物流自动同步] ========== 完成 ==========`);
      log.info(`[物流自动同步] 统计: 处理=${result.totalProcessed}, 订单状态更新=${result.statusUpdated}, 物流状态更新=${result.logisticsUpdated}, 错误=${result.errors}`);

      // 3️⃣ 记录同步结果到日志
      if (result.details.length > 0) {
        for (const d of result.details) {
          if (d.newOrderStatus) {
            log.info(`[物流自动同步] 📋 ${d.orderNumber}: 订单 ${d.oldOrderStatus}→${d.newOrderStatus}, 物流 ${d.oldLogisticsStatus}→${d.newLogisticsStatus}, 动态: "${d.description.substring(0, 50)}"`);
          }
        }
      }

    } catch (error: any) {
      log.error('[物流自动同步] 执行失败:', error.message);
      result.errors++;
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * 处理单个订单的物流状态同步
   */
  private async processOrder(
    order: Order,
    orderRepository: any,
    result: AutoSyncResult
  ): Promise<void> {
    const description = order.latestLogisticsInfo || '';
    if (!description) return;

    // 检测物流状态
    const newLogisticsStatus = detectLogisticsStatus(description);
    if (newLogisticsStatus === 'unknown') return;

    const oldLogisticsStatus = order.logisticsStatus || '';
    const oldOrderStatus = order.status;
    let orderStatusChanged = false;

    // 更新物流状态字段（始终更新）
    const updateData: any = {};
    if (newLogisticsStatus !== oldLogisticsStatus) {
      updateData.logisticsStatus = newLogisticsStatus;
      result.logisticsUpdated++;
    }

    // 🔥 安全映射：物流状态 → 订单状态
    const targetOrderStatus = mapLogisticsToOrderStatus(newLogisticsStatus, oldOrderStatus);

    if (targetOrderStatus && targetOrderStatus !== oldOrderStatus) {
      updateData.status = targetOrderStatus;
      orderStatusChanged = true;
      result.statusUpdated++;

      // 签收时记录签收时间
      if (targetOrderStatus === 'delivered') {
        updateData.deliveredAt = new Date();
      }
    }

    // 有变更才更新数据库
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await orderRepository.update(order.id, updateData);

      // 记录订单状态变更历史
      if (orderStatusChanged && targetOrderStatus) {
        try {
          const { ensureStatusHistoryTable } = await import('../routes/orders/orderHelpers');
          await ensureStatusHistoryTable();
          const historyRepo = AppDataSource!.getRepository(OrderStatusHistory);
          const historyRecord = historyRepo.create({
            orderId: order.id,
            status: targetOrderStatus as any,
            notes: `[自动同步] 物流动态: "${description.substring(0, 100)}" → 物流状态: ${newLogisticsStatus} → 订单状态: ${targetOrderStatus}`,
            operatorName: '系统自动同步',
            actionType: 'auto_sync'
          });
          await historyRepo.save(historyRecord);
        } catch (historyErr: any) {
          // 历史记录失败不影响主流程
          log.warn(`[物流自动同步] 保存状态历史失败(不影响主流程): ${historyErr.message}`);
        }
      }

      // 记录详情
      result.details.push({
        orderNumber: order.orderNumber,
        oldLogisticsStatus,
        newLogisticsStatus,
        oldOrderStatus,
        newOrderStatus: targetOrderStatus,
        description: description.substring(0, 100)
      });
    }
  }

  /**
   * 获取运行状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
    };
  }
}

// 导出单例
export const logisticsAutoSyncService = new LogisticsAutoSyncService();

