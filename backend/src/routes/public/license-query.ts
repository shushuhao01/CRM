/**
 * 公开授权查询API - 供私有部署系统验证授权使用
 * 无需认证，但需要提供授权码和机器码
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

import { log } from '../../config/logger';
const router = Router();

/**
 * 安全解析JSON
 */
function safeJsonParse(val: any): any {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

/**
 * 查询授权信息（公开API）
 * POST /api/v1/public/license-query/verify
 *
 * 用途：私有部署系统验证授权码有效性
 *
 * 请求参数：
 * - licenseKey: 授权码（必填）
 * - machineId: 机器码（可选，用于绑定机器）
 *
 * 返回：
 * - valid: 授权是否有效
 * - licenseInfo: 授权详细信息（仅在有效时返回）
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { licenseKey, machineId } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: '请提供授权码'
      });
    }

    // 只处理私有部署授权码（PRIVATE-前缀）
    if (!licenseKey.toUpperCase().startsWith('PRIVATE-')) {
      return res.status(400).json({
        success: false,
        message: '该API仅支持私有部署授权码查询（PRIVATE-前缀）',
        errorType: 'INVALID_LICENSE_TYPE'
      });
    }

    // 查询授权信息
    const rows = await AppDataSource.query(
      `SELECT l.*, pc.customer_name as company_name
       FROM licenses l
       LEFT JOIN private_customers pc ON l.private_customer_id = pc.id
       WHERE l.license_key = ? AND l.customer_type = 'private'`,
      [licenseKey]
    );
    const lic = rows[0];

    // 记录查询日志
    const logId = uuidv4();
    const logData = {
      id: logId,
      license_id: lic?.id || null,
      license_key: licenseKey,
      action: 'public_query',
      result: lic ? 'success' : 'failed',
      message: lic ? '公开API查询成功' : '授权码不存在',
      ip_address: ip,
      user_agent: userAgent,
      machine_id: machineId || null
    };

    await AppDataSource.query(
      `INSERT INTO license_logs (id, license_id, license_key, action, result, message, ip_address, user_agent, machine_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [logData.id, logData.license_id, logData.license_key, logData.action, logData.result, logData.message, logData.ip_address, logData.user_agent, logData.machine_id]
    ).catch((err) => {
      log.error('[LicenseQuery] 记录日志失败:', err);
    });

    if (!lic) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: '授权码不存在或已失效'
      });
    }

    // 检查授权状态
    if (lic.status === 'revoked') {
      return res.json({
        success: true,
        valid: false,
        message: '该授权已被吊销',
        licenseInfo: {
          status: 'revoked',
          revokedAt: lic.revoked_at
        }
      });
    }

    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      return res.json({
        success: true,
        valid: false,
        message: '授权已过期',
        licenseInfo: {
          status: 'expired',
          expiresAt: lic.expires_at
        }
      });
    }

    // 授权有效，返回详细信息
    res.json({
      success: true,
      valid: true,
      message: '授权有效',
      licenseInfo: {
        licenseKey: lic.license_key,
        customerName: lic.customer_name || lic.company_name,
        licenseType: lic.license_type,
        maxUsers: lic.max_users,
        maxStorageGb: lic.max_storage_gb,
        features: safeJsonParse(lic.features),
        status: lic.status,
        expiresAt: lic.expires_at,
        activatedAt: lic.activated_at,
        createdAt: lic.created_at
      }
    });
  } catch (error: any) {
    log.error('[LicenseQuery] 查询失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败，请稍后重试'
    });
  }
});

/**
 * 批量查询授权信息（可选功能）
 * POST /api/v1/public/license-query/batch
 *
 * 请求参数：
 * - licenseKeys: 授权码数组（最多10个）
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { licenseKeys } = req.body;

    if (!Array.isArray(licenseKeys) || licenseKeys.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供授权码数组'
      });
    }

    if (licenseKeys.length > 10) {
      return res.status(400).json({
        success: false,
        message: '单次最多查询10个授权码'
      });
    }

    // 只处理私有部署授权码
    const validKeys = licenseKeys.filter((key: string) =>
      typeof key === 'string' && key.toUpperCase().startsWith('PRIVATE-')
    );

    if (validKeys.length === 0) {
      return res.status(400).json({
        success: false,
        message: '该API仅支持私有部署授权码查询（PRIVATE-前缀）'
      });
    }

    const placeholders = validKeys.map(() => '?').join(',');
    const rows = await AppDataSource.query(
      `SELECT l.license_key, l.status, l.expires_at, l.max_users, l.customer_name
       FROM licenses l
       WHERE l.license_key IN (${placeholders}) AND l.customer_type = 'private'`,
      validKeys
    );

    const results = validKeys.map((key: string) => {
      const lic = rows.find((r: any) => r.license_key === key);
      if (!lic) {
        return { licenseKey: key, valid: false, message: '授权码不存在' };
      }
      if (lic.status === 'revoked') {
        return { licenseKey: key, valid: false, message: '授权已吊销' };
      }
      if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
        return { licenseKey: key, valid: false, message: '授权已过期' };
      }
      return {
        licenseKey: key,
        valid: true,
        message: '授权有效',
        maxUsers: lic.max_users,
        expiresAt: lic.expires_at
      };
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    log.error('[LicenseQuery] 批量查询失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败，请稍后重试'
    });
  }
});

export default router;
