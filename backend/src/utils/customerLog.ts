import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../config/logger';

/**
 * 创建客户操作日志
 */
export async function createCustomerLog(params: {
  customerId: string;
  logType: string;
  content: string;
  detail?: any;
  operatorId?: string;
  operatorName?: string;
  tenantId?: string;
}) {
  try {
    const id = uuidv4();
    await AppDataSource.query(`
      INSERT INTO customer_logs (id, tenant_id, customer_id, log_type, content, detail, operator_id, operator_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      id,
      params.tenantId || null,
      params.customerId,
      params.logType,
      params.content,
      params.detail ? JSON.stringify(params.detail) : null,
      params.operatorId || 'system',
      params.operatorName || '系统'
    ]);
  } catch (error) {
    // 日志写入失败不影响主流程
    log.error('写入客户日志失败:', error);
  }
}

