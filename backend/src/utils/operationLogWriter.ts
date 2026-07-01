import { AppDataSource } from '../config/database';
import { OperationLog } from '../entities/OperationLog';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../config/logger';

// 缓存 enableOpLog 检查结果，避免每次都查 DB
let opLogEnabledCache: boolean = true;
let opLogCacheTime: number = 0;
const CACHE_TTL = 60_000; // 60秒缓存

/**
 * 检查业务操作日志是否被管理后台（SAAS）禁用
 * 从 admin_system_config JSON 中读取 enableOpLog
 * 如果找不到该配置，默认启用（私有部署不受此管控）
 */
async function isOpLogEnabled(): Promise<boolean> {
  const now = Date.now();
  if (now - opLogCacheTime < CACHE_TTL) {
    return opLogEnabledCache;
  }
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => []);
    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}');
      opLogEnabledCache = data.enableOpLog !== false; // 默认启用
    } else {
      opLogEnabledCache = true; // 无配置时默认启用
    }
    opLogCacheTime = now;
  } catch {
    opLogEnabledCache = true; // 出错时默认启用
  }
  return opLogEnabledCache;
}

export interface WriteOperationLogParams {
  module: string;
  resourceType: string;
  resourceId: string;
  action: string;
  description: string;
  userId?: string;
  username?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeOperationLog(params: WriteOperationLogParams): Promise<void> {
  try {
    // 检查管理后台是否禁用了业务操作日志（SAAS租户场景）
    if (!(await isOpLogEnabled())) {
      return;
    }
    const repo = AppDataSource.getRepository(OperationLog);
    const entry = repo.create({
      id: uuidv4(),
      module: params.module,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      description: params.description,
      userId: params.userId || null,
      username: params.username || null,
      tenantId: params.tenantId || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
    await repo.save(entry);
  } catch (err: any) {
    log.error(`[操作日志] 写入失败 (${params.module}/${params.action}): ${err.message}`);
  }
}

export function extractUserInfo(req: any): { userId: string; username: string; tenantId: string; ipAddress: string } {
  const currentUser = (req as any).currentUser || {};
  const jwtUser = (req as any).user || {};
  return {
    userId: currentUser.id || jwtUser.id || jwtUser.userId || '',
    username: currentUser.realName || currentUser.name || jwtUser.realName || jwtUser.name || jwtUser.username || '',
    tenantId: jwtUser.tenantId || currentUser.tenantId || '',
    ipAddress: req.ip || req.headers?.['x-forwarded-for'] || '',
  };
}

const ORDER_STATUS_CN: Record<string, string> = {
  pending_review: '待审核', approved: '已审核', rejected: '已驳回',
  pending_transfer: '待流转', pending_audit: '待审核', audit_rejected: '审核拒绝',
  pending_shipment: '待发货', shipped: '已发货', in_transit: '运输中',
  delivered: '已签收', signed: '已签收', cancelled: '已取消',
  returned: '已退回', logistics_returned: '物流退回', logistics_cancelled: '物流取消',
  package_exception: '包裹异常', abnormal: '包裹异常',
  rejected_returned: '拒收已退回', after_sales_created: '已建售后',
  lost: '丢件', refunded: '已退款', completed: '已完成',
  partial_shipped: '部分发货', received: '已签收',
  pending_cancel: '待取消审核', cancel_failed: '取消失败', confirmed: '已确认',
  paid: '已付款',
};

export function translateStatus(status: string): string {
  return ORDER_STATUS_CN[status] || status;
}
