/**
 * 租户操作日志服务
 *
 * 功能：
 * 1. 记录租户操作日志
 * 2. 查询日志列表（分页、筛选）
 * 3. 获取日志详情
 */

import { AppDataSource } from '../config/database';
import { TenantLog } from '../entities/TenantLog';
import { Request } from 'express';

export interface LogOptions {
  tenantId: string;
  action: string;
  operator: string;
  operatorId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogQueryOptions {
  tenantId?: string;
  action?: string;
  operatorId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export class TenantLogService {
  /**
   * 记录操作日志
   */
  static async log(options: LogOptions): Promise<TenantLog> {
    const logRepo = AppDataSource.getRepository(TenantLog);

    const log = logRepo.create({
      tenantId: options.tenantId,
      action: options.action,
      operator: options.operator,
      operatorId: options.operatorId,
      details: options.details ? JSON.stringify(options.details) : undefined,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    await logRepo.save(log);

    console.log(`📝 租户操作日志: [${options.action}] ${options.operator} -> ${options.tenantId}`);

    return log;
  }

  /**
   * 从 Request 对象记录日志
   */
  static async logFromRequest(
    req: Request,
    tenantId: string,
    action: string,
    details?: any
  ): Promise<TenantLog> {
    const operator = (req as any).admin?.username || 'Unknown';
    const operatorId = (req as any).admin?.id || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.log({
      tenantId,
      action,
      operator,
      operatorId,
      details,
      ipAddress,
      userAgent
    });
  }

  /**
   * 查询日志列表
   */
  static async queryLogs(options: LogQueryOptions = {}) {
    const logRepo = AppDataSource.getRepository(TenantLog);

    const {
      tenantId,
      action,
      operatorId,
      startDate,
      endDate,
      page = 1,
      pageSize = 20
    } = options;

    const queryBuilder = logRepo.createQueryBuilder('log');

    // 筛选条件
    if (tenantId) {
      queryBuilder.andWhere('log.tenantId = :tenantId', { tenantId });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (operatorId) {
      queryBuilder.andWhere('log.operatorId = :operatorId', { operatorId });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    // 排序
    queryBuilder.orderBy('log.createdAt', 'DESC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // 执行查询
    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 获取日志详情
   */
  static async getLogById(id: string): Promise<TenantLog | null> {
    const logRepo = AppDataSource.getRepository(TenantLog);
    return logRepo.findOne({ where: { id } });
  }

  /**
   * 获取租户最近的操作日志
   */
  static async getRecentLogs(tenantId: string, limit: number = 10): Promise<TenantLog[]> {
    const logRepo = AppDataSource.getRepository(TenantLog);

    return logRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  /**
   * 获取操作统计
   */
  static async getActionStats(tenantId?: string) {
    const logRepo = AppDataSource.getRepository(TenantLog);

    const queryBuilder = logRepo.createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action');

    if (tenantId) {
      queryBuilder.where('log.tenantId = :tenantId', { tenantId });
    }

    const results = await queryBuilder.getRawMany();

    return results.map(r => ({
      action: r.action,
      count: parseInt(r.count)
    }));
  }
}
