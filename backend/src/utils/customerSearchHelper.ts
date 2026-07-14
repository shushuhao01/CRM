/**
 * 🔥 客户搜索性能辅助工具
 *
 * 背景：多个列表接口（订单/发货/绩效/代收/通话/售后等）搜索手机号时，
 * 原实现使用 EXISTS 关联子查询连接 customers 表，且带有
 * CONVERT(... USING utf8mb4) COLLATE ... 类型转换，导致索引完全失效，
 * 主表每一行都要执行一次子查询（全表扫描 × N），几千条数据即可超时30秒。
 *
 * 方案：改为"两步查询"——
 *   第一步：在 customers 表上单独执行一次索引友好的查询，命中客户ID列表；
 *   第二步：主表用 customer_id IN (:...ids) 精确匹配（可走索引）。
 */
import { Customer } from '../entities/Customer';
import { getTenantRepo } from './tenantRepo';
import { log } from '../config/logger';

/** 手机号形态：7~15位纯数字 */
export function isPhoneLike(keyword: string): boolean {
  return /^\d{7,15}$/.test(keyword.trim());
}

/**
 * 根据关键词列表，在 customers 表中查找命中的客户ID（自动带租户隔离）
 *
 * 匹配规则：
 * - 手机号形态关键词：phone 精确匹配 OR other_phones JSON 精确包含（快）
 * - 其他关键词（fuzzy=true 时）：phone LIKE OR other_phones CAST LIKE（单表扫描，仍远快于关联子查询）
 *
 * @param keywords 关键词数组（已去空）
 * @param options.fuzzy 非手机号关键词是否做模糊匹配（默认 true）
 * @param options.includeCustomerCode 是否同时模糊匹配客户编码 customer_code（默认 false）
 * @param options.maxIds 返回ID数量上限，防止 IN 列表过大（默认 5000）
 * @returns 命中的客户ID数组（可能为空）
 */
export async function findCustomerIdsByKeywords(
  keywords: string[],
  options?: { fuzzy?: boolean; includeCustomerCode?: boolean; maxIds?: number }
): Promise<string[]> {
  const list = (keywords || []).map(k => String(k).trim()).filter(k => k.length > 0);
  if (list.length === 0) return [];

  const fuzzy = options?.fuzzy !== false;
  const includeCode = options?.includeCustomerCode === true;
  const maxIds = options?.maxIds || 5000;

  try {
    const customerRepo = getTenantRepo(Customer);
    const qb = customerRepo.createQueryBuilder('c').select('c.id', 'id');

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    // 🔥 批量关键词分批构建 OR 条件（单表查询，customers 表规模下毫秒级）
    list.forEach((kw, i) => {
      if (isPhoneLike(kw)) {
        // 手机号：精确匹配（phone 可走索引，other_phones 用 JSON 精确包含）
        conditions.push(`(c.phone = :pkw${i} OR JSON_CONTAINS(c.other_phones, JSON_QUOTE(:pkw${i})))`);
        params[`pkw${i}`] = kw;
      } else if (fuzzy) {
        const sub: string[] = [
          `c.phone LIKE :fkw${i}`,
          `CAST(c.other_phones AS CHAR) LIKE :fkw${i}`
        ];
        if (includeCode) {
          sub.push(`c.customer_code LIKE :fkw${i}`);
        }
        conditions.push(`(${sub.join(' OR ')})`);
        params[`fkw${i}`] = `%${kw}%`;
      } else if (includeCode) {
        conditions.push(`c.customer_code LIKE :ckw${i}`);
        params[`ckw${i}`] = `%${kw}%`;
      }
    });

    if (conditions.length === 0) return [];

    const rows = await qb
      .andWhere(`(${conditions.join(' OR ')})`)
      .setParameters(params)
      .limit(maxIds)
      .getRawMany();

    return rows.map((r: any) => r.id).filter(Boolean);
  } catch (e) {
    log.warn('[customerSearchHelper] 客户ID查询失败，跳过备用手机号匹配:', e);
    return [];
  }
}
