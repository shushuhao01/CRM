import { AppDataSource } from '../config/database';
import { OperationLog } from '../entities/OperationLog';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../config/logger';

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
  pending_shipment: '待发货', shipped: '已发货', in_transit: '运输中',
  delivered: '已签收', signed: '已签收', cancelled: '已取消',
  returned: '已退回', abnormal: '包裹异常', package_abnormal: '包裹异常',
  lost: '丢件', refunded: '已退款', completed: '已完成',
  partial_shipped: '部分发货', received: '已签收',
};

export function translateStatus(status: string): string {
  return ORDER_STATUS_CN[status] || status;
}
