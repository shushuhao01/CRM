/**
 * 订单模块 - 共享辅助函数
 * 从 orders.ts 拆分出来的工具函数和类型定义
 */
import { OrderStatusHistory } from '../../entities/OrderStatusHistory';
import { SystemConfig } from '../../entities/SystemConfig';
import { DepartmentOrderLimit } from '../../entities/DepartmentOrderLimit';
import { Order } from '../../entities/Order';
import { getTenantRepo } from '../../utils/tenantRepo';

import { log } from '../../config/logger';
// ========== 类型定义 ==========

export interface OrderLimitCheckResult {
  allowed: boolean;
  message?: string;
  limitType?: 'order_count' | 'single_amount' | 'total_amount';
}

// ========== 辅助函数 ==========

/** 保存订单状态历史记录 */
export const saveStatusHistory = async (
  orderId: string,
  status: string,
  operatorId: string | number | null,
  operatorName: string,
  notes?: string,
  options?: {
    operatorDepartment?: string;
    actionType?: string;
    changeDetail?: string;
  }
): Promise<void> => {
  try {
    const statusHistoryRepository = getTenantRepo(OrderStatusHistory);
    const history = statusHistoryRepository.create({
      orderId,
      status: status as any,
      operatorId: operatorId ? Number(operatorId) : undefined,
      operatorName,
      operatorDepartment: options?.operatorDepartment || undefined,
      actionType: options?.actionType || 'status_change',
      changeDetail: options?.changeDetail || undefined,
      notes
    });
    await statusHistoryRepository.save(history);
    log.info(`[状态历史] ✅ 保存成功: orderId=${orderId}, status=${status}, operator=${operatorName}, dept=${options?.operatorDepartment || '-'}, type=${options?.actionType || 'status_change'}`);
  } catch (error) {
    log.error(`[状态历史] ❌ 保存失败:`, error);
  }
};

/**
 * 格式化时间为北京时间友好格式 (YYYY/MM/DD HH:mm:ss)
 * 数据库已配置为北京时区，createdAt存储的已经是北京时间，不需要再转换
 */
export const formatToBeijingTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

/** 格式化日期为本地时区的YYYY-MM-DD格式，避免UTC转换导致的日期偏移 */
export const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 将北京时间日期字符串转换为UTC时间字符串（用于数据库查询）
 * 注释掉：数据库已配置为北京时区，不需要转换为UTC时间
 */
export const _beijingDateToUTC = (dateStr: string, timeStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  const beijingDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  const utcDate = new Date(beijingDate.getTime() - 8 * 60 * 60 * 1000);

  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(utcDate.getUTCDate()).padStart(2, '0');
  const utcHours = String(utcDate.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
  const utcSeconds = String(utcDate.getUTCSeconds()).padStart(2, '0');

  return `${utcYear}-${utcMonth}-${utcDay} ${utcHours}:${utcMinutes}:${utcSeconds}`;
};

/** 验证部门下单限制 */
export const checkDepartmentOrderLimit = async (
  departmentId: string,
  customerId: string,
  orderAmount: number
): Promise<OrderLimitCheckResult> => {
  try {
    const limitRepository = getTenantRepo(DepartmentOrderLimit);
    const limit = await limitRepository.findOne({
      where: { departmentId, isEnabled: true }
    });

    if (!limit) {
      return { allowed: true };
    }

    const orderRepository = getTenantRepo(Order);

    // 检查下单次数限制
    if (limit.orderCountEnabled && limit.maxOrderCount > 0) {
      const orderCount = await orderRepository.count({
        where: {
          customerId,
          createdByDepartmentId: departmentId
        }
      });

      if (orderCount >= limit.maxOrderCount) {
        return {
          allowed: false,
          message: `该客户在本部门已下单${orderCount}次，已达到最大下单次数限制(${limit.maxOrderCount}次)，请联系管理员`,
          limitType: 'order_count'
        };
      }
    }

    // 检查单笔金额限制
    if (limit.singleAmountEnabled && limit.maxSingleAmount > 0) {
      if (orderAmount > Number(limit.maxSingleAmount)) {
        return {
          allowed: false,
          message: `订单金额¥${orderAmount.toFixed(2)}超出单笔金额限制(¥${Number(limit.maxSingleAmount).toFixed(2)})，请联系管理员`,
          limitType: 'single_amount'
        };
      }
    }

    // 检查累计金额限制
    if (limit.totalAmountEnabled && limit.maxTotalAmount > 0) {
      const result = await orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.customerId = :customerId', { customerId })
        .andWhere('order.createdByDepartmentId = :departmentId', { departmentId })
        .getRawOne();

      const currentTotal = Number(result?.total || 0);
      const newTotal = currentTotal + orderAmount;

      if (newTotal > Number(limit.maxTotalAmount)) {
        return {
          allowed: false,
          message: `该客户在本部门累计金额将达到¥${newTotal.toFixed(2)}，超出累计金额限制(¥${Number(limit.maxTotalAmount).toFixed(2)})，请联系管理员`,
          limitType: 'total_amount'
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    log.error('检查部门下单限制失败:', error);
    return { allowed: true };
  }
};

/** 获取订单流转配置 */
export const getOrderTransferConfig = async (): Promise<{ mode: string; delayMinutes: number }> => {
  try {
    const configRepository = getTenantRepo(SystemConfig);
    const modeConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferMode', configGroup: 'order_settings', isEnabled: true }
    });
    const delayConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferDelayMinutes', configGroup: 'order_settings', isEnabled: true }
    });
    return {
      mode: modeConfig?.configValue || 'delayed',
      delayMinutes: delayConfig ? Number(delayConfig.configValue) : 3
    };
  } catch {
    return { mode: 'delayed', delayMinutes: 3 };
  }
};

/** 获取状态标题 */
export function getStatusTitle(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': '待确认',
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'confirmed': '已确认',
    'paid': '已支付',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunded': '已退款',
    'audit_rejected': '审核拒绝',
    'cancel_failed': '取消被拒',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'logistics_returned': '物流退回',
    'logistics_cancelled': '物流取消',
    'package_exception': '包裹异常',
    'after_sales_created': '已建售后'
  };
  return statusMap[status] || status;
}

/** 根据操作类型获取标题 */
export function getActionTypeTitle(actionType: string | undefined, status: string): string {
  const actionTitleMap: Record<string, string> = {
    'create': '订单创建',
    'edit': '编辑订单',
    'submit_audit': '提交审核',
    'audit_approve': '审核通过',
    'audit_reject': '审核拒绝',
    'cancel_approve': '取消申请通过',
    'cancel_reject': '取消申请拒绝',
    'status_change': getStatusTitle(status)
  };
  return actionTitleMap[actionType || 'status_change'] || getStatusTitle(status);
}

/** 获取售后标题 */
export function getAfterSalesTitle(type: string, status: string): string {
  const typeTexts: Record<string, string> = {
    'return': '退货申请',
    'exchange': '换货申请',
    'repair': '维修申请',
    'refund': '退款申请'
  };
  const statusTexts: Record<string, string> = {
    'pending': '已提交',
    'processing': '处理中',
    'resolved': '已解决',
    'closed': '已关闭'
  };
  return `${typeTexts[type] || '售后申请'} - ${statusTexts[status] || status}`;
}

