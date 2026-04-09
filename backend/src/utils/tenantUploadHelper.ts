/**
 * 租户上传目录辅助工具
 *
 * SaaS模式下，按租户编码（tenantCode）隔离文件存储目录
 * 私有部署模式保持原样，不做目录隔离
 *
 * 目录结构对比：
 *   私有模式:  uploads/{subDir}/{filename}
 *   SaaS模式:  uploads/{tenantCode}/{subDir}/{filename}
 *
 * 使用方式：
 *   // 在 multer destination 回调中
 *   resolveTenantCode(req).then(code => {
 *     req.__tenantCode = code;
 *     const dir = getUploadDir(code, 'products');
 *     cb(null, dir);
 *   });
 *
 *   // 生成 URL
 *   const url = getUploadUrl(req.__tenantCode, 'products', filename);
 */

import path from 'path';
import fs from 'fs';
import { deployConfig } from '../config/deploy';
import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant';
import { TenantContextManager } from './tenantContext';
import { log } from '../config/logger';

// ========== 租户编码缓存（tenantId -> tenantCode） ==========
const tenantCodeCache = new Map<string, { code: string; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10分钟

/**
 * 根据租户ID查询租户编码（带内存缓存）
 */
async function lookupTenantCode(tenantId: string): Promise<string> {
  // 1. 检查缓存
  const cached = tenantCodeCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.code;
  }

  // 2. 查询数据库
  try {
    const tenant = await AppDataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
      select: ['id', 'code']
    });

    // 有编码用编码，否则回退到 tenantId（确保唯一性）
    const code = tenant?.code || tenantId;
    tenantCodeCache.set(tenantId, { code, ts: Date.now() });
    return code;
  } catch (err) {
    log.warn('[TenantUpload] 查询租户编码失败，回退使用tenantId:', (err as Error).message);
    return tenantId;
  }
}

// ========== 公开 API ==========

/**
 * 从 Express 请求对象解析租户编码
 * - SaaS模式：返回租户编码（如 T260303A1B2）
 * - 私有模式：返回 null
 */
export async function resolveTenantCode(req: any): Promise<string | null> {
  if (!deployConfig.isSaaS()) return null;
  const tenantId = req?.tenantId;
  if (!tenantId) return null;
  return await lookupTenantCode(tenantId);
}

/**
 * 从 TenantContext（AsyncLocalStorage）解析租户编码
 * 适用于没有 req 对象的场景（如 Service 层）
 */
export async function resolveTenantCodeFromContext(): Promise<string | null> {
  if (!deployConfig.isSaaS()) return null;
  const tenantId = TenantContextManager.getTenantId();
  if (!tenantId) return null;
  return await lookupTenantCode(tenantId);
}

/**
 * 获取上传目录的绝对路径
 * @param tenantCode 租户编码（null 则不隔离）
 * @param subDir     子目录名（如 avatars、products）
 *
 * 示例：
 *   getUploadDir('T260303A1B2', 'products') => /app/uploads/T260303A1B2/products
 *   getUploadDir(null, 'products')           => /app/uploads/products
 */
export function getUploadDir(tenantCode: string | null, subDir: string): string {
  if (tenantCode) {
    return path.join(process.cwd(), 'uploads', tenantCode, subDir);
  }
  return path.join(process.cwd(), 'uploads', subDir);
}

/**
 * 获取上传文件的 URL 路径（相对路径）
 * @param tenantCode 租户编码
 * @param subDir     子目录名
 * @param filename   文件名
 *
 * 示例：
 *   getUploadUrl('T260303A1B2', 'products', 'xxx.jpg') => /uploads/T260303A1B2/products/xxx.jpg
 *   getUploadUrl(null, 'products', 'xxx.jpg')           => /uploads/products/xxx.jpg
 */
export function getUploadUrl(tenantCode: string | null, subDir: string, filename: string): string {
  if (tenantCode) {
    return `/uploads/${tenantCode}/${subDir}/${filename}`;
  }
  return `/uploads/${subDir}/${filename}`;
}

/**
 * 清除租户编码缓存
 * @param tenantId 指定租户ID，不传则清除全部
 */
export function clearTenantCodeCache(tenantId?: string): void {
  if (tenantId) {
    tenantCodeCache.delete(tenantId);
  } else {
    tenantCodeCache.clear();
  }
}

/**
 * multer destination 回调的通用封装
 * 自动解析租户编码，设置到 req.__tenantCode 并返回正确的上传目录
 *
 * @param subDir 子目录名
 *
 * 使用方式：
 *   multer.diskStorage({ destination: createTenantDestination('products'), ... })
 */
export function createTenantDestination(subDir: string) {
  return (req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    resolveTenantCode(req)
      .then(tenantCode => {
        // 将租户编码挂到 req 上，供后续 URL 生成使用
        req.__tenantCode = tenantCode;
        const dir = getUploadDir(tenantCode, subDir);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      })
      .catch(() => {
        // 回退到无隔离的默认目录
        req.__tenantCode = null;
        const dir = path.join(process.cwd(), 'uploads', subDir);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      });
  };
}

