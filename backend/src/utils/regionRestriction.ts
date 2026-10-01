/**
 * 地区限制检查工具（限制地区客户下单 / 限制地区客户创建客户资料 / 部门+地区下单限制）
 *
 * 配置存储：system_configs KV（零建表），三个 key：
 *   - regionCustomerRestrictions   （group=customer_settings）限制地区客户创建客户资料
 *   - regionOrderRestrictions      （group=customer_settings）限制地区客户下单
 *   - departmentRegionRestrictions （group=order_settings）    部门+地区下单限制
 *
 * 🔒 租户隔离说明：
 *   本文件所有查询均使用【显式 tenantId where 条件】（tenantId ? tenantId : IsNull()），
 *   不依赖 AsyncLocalStorage 租户上下文，可在任何调用环境（主应用 / 企微侧边栏 / 定时任务）下
 *   安全工作，杜绝 A 租户配置影响 B 租户。
 *
 * 匹配规则：
 *   1. 结构化匹配：客户 province/city/district 与限制记录逐级 AND 比较（value/label 双重比对），
 *      记录未选到的层级跳过（选省=限全省，选省+市=限全市，选到区=限该区）。
 *   2. 文本兜底匹配：针对境外/无省市区客户，用地址文本做【完整链 AND】匹配——
 *      限制记录的省名(+市名+区名)必须全部出现在同一段地址文本中才算命中，防止"南山区"重名误伤。
 */

import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { log } from '../config/logger';

// ========== 类型定义 ==========

/** 单条地区限制记录（省市区三级，选到哪级限到哪级，后面可不选） */
export interface RegionRecord {
  id?: string;
  province?: string;       // 省 value（拼音）
  provinceName?: string;   // 省名（中文）
  city?: string;           // 市 value（拼音），可空=限全省
  cityName?: string;       // 市名（中文）
  district?: string;       // 区 value（拼音），可空=限全市
  districtName?: string;   // 区名（中文）
  reason?: string;         // 原因（选填），写了就随拦截提示一并显示
  isEnabled?: boolean;     // 是否启用（默认启用）
}

/** 部门+地区下单限制记录 */
export interface DepartmentRegionRecord {
  id?: string;
  departmentId: string;
  departmentName?: string;
  regions: RegionRecord[];
  isEnabled?: boolean;
}

/** 待检查的地址输入 */
export interface AddressInput {
  province?: string | null;
  city?: string | null;
  district?: string | null;
  /** 地址文本列表（address/detailAddress/overseasAddress/receiverAddress 等），用于文本兜底匹配 */
  addressTexts?: (string | null | undefined)[];
}

export interface RegionCheckResult {
  allowed: boolean;
  message?: string;
  limitType?: 'region_customer' | 'region_order' | 'department_region';
  matchedRegion?: RegionRecord;
}

// ========== 配置读取（显式租户隔离） ==========

const REGION_CONFIG_KEYS = {
  customer: { configKey: 'regionCustomerRestrictions', configGroup: 'customer_settings' },
  order: { configKey: 'regionOrderRestrictions', configGroup: 'customer_settings' },
} as const;

/** 读取租户的地区限制配置（裸 repo + 显式 where，不依赖租户上下文） */
export const getRegionRestrictionConfig = async (
  type: 'customer' | 'order',
  tenantId: string | null | undefined
): Promise<RegionRecord[]> => {
  try {
    const repo = AppDataSource.getRepository(SystemConfig);
    const { configKey, configGroup } = REGION_CONFIG_KEYS[type];
    const config = await repo.findOne({
      where: {
        configKey,
        configGroup,
        // 🔒 显式租户条件：SaaS 下只读本租户的配置；私有化（无租户）读 tenant_id IS NULL 的配置
        tenantId: tenantId ? tenantId : IsNull(),
      },
    });

    if (!config) return [];
    const value = JSON.parse(config.configValue);
    return Array.isArray(value) ? value : [];
  } catch (error) {
    log.error(`[地区限制] 读取配置失败 type=${type}:`, error);
    return [];
  }
};

/** 保存租户的地区限制配置 */
export const saveRegionRestrictionConfig = async (
  type: 'customer' | 'order',
  tenantId: string | null | undefined,
  records: RegionRecord[]
): Promise<void> => {
  const repo = AppDataSource.getRepository(SystemConfig);
  const { configKey, configGroup } = REGION_CONFIG_KEYS[type];
  let config = await repo.findOne({
    where: {
      configKey,
      configGroup,
      tenantId: tenantId ? tenantId : IsNull(),
    },
  });

  if (config) {
    config.configValue = JSON.stringify(records);
  } else {
    config = repo.create({
      tenantId: tenantId || null,
      configKey,
      configValue: JSON.stringify(records),
      valueType: 'json',
      configGroup,
      description: type === 'customer' ? '限制地区客户创建客户资料' : '限制地区客户下单',
      isEnabled: true,
      isSystem: true,
    });
  }
  await repo.save(config);
};

/** 读取部门+地区下单限制配置 */
export const getDepartmentRegionRestrictionConfig = async (
  tenantId: string | null | undefined
): Promise<DepartmentRegionRecord[]> => {
  try {
    const repo = AppDataSource.getRepository(SystemConfig);
    const config = await repo.findOne({
      where: {
        configKey: 'departmentRegionRestrictions',
        configGroup: 'order_settings',
        tenantId: tenantId ? tenantId : IsNull(),
      },
    });

    if (!config) return [];
    const value = JSON.parse(config.configValue);
    return Array.isArray(value) ? value : [];
  } catch (error) {
    log.error('[地区限制] 读取部门地区限制配置失败:', error);
    return [];
  }
};

/** 保存部门+地区下单限制配置 */
export const saveDepartmentRegionRestrictionConfig = async (
  tenantId: string | null | undefined,
  records: DepartmentRegionRecord[]
): Promise<void> => {
  const repo = AppDataSource.getRepository(SystemConfig);
  let config = await repo.findOne({
    where: {
      configKey: 'departmentRegionRestrictions',
      configGroup: 'order_settings',
      tenantId: tenantId ? tenantId : IsNull(),
    },
  });

  if (config) {
    config.configValue = JSON.stringify(records);
  } else {
    config = repo.create({
      tenantId: tenantId || null,
      configKey: 'departmentRegionRestrictions',
      configValue: JSON.stringify(records),
      valueType: 'json',
      configGroup: 'order_settings',
      description: '部门+地区下单限制',
      isEnabled: true,
      isSystem: true,
    });
  }
  await repo.save(config);
};

// ========== 匹配逻辑 ==========

/** 单级比较：客户值与记录值/记录中文名 任一相等即命中（客户库存拼音 value，老数据可能是中文） */
const matchLevel = (customerVal: string | null | undefined, recVal?: string, recName?: string): boolean => {
  if (!customerVal) return false;
  const v = String(customerVal).trim();
  if (recVal && v === recVal) return true;
  if (recName && v === recName) return true;
  return false;
};

/** 结构化匹配：逐级 AND，记录未选到的层级跳过 */
const matchStructured = (addr: AddressInput, rec: RegionRecord): boolean => {
  if (!rec.province && !rec.provinceName) return false;
  // 省级必须命中
  if (!matchLevel(addr.province, rec.province, rec.provinceName)) return false;
  // 记录选了市才检查市
  if (rec.city || rec.cityName) {
    if (!matchLevel(addr.city, rec.city, rec.cityName)) return false;
    // 记录选了区才检查区
    if (rec.district || rec.districtName) {
      if (!matchLevel(addr.district, rec.district, rec.districtName)) return false;
    }
  }
  return true;
};

/** 限制记录的完整行政链（省+市+区，按已填的算） */
const regionChainNames = (rec: RegionRecord): string[] => {
  return [rec.provinceName, rec.cityName, rec.districtName].filter((s): s is string => !!s && !!String(s).trim());
};

/**
 * 文本兜底匹配：针对境外/无省市区客户钻空子。
 * 完整链 AND：省名(+市名+区名)必须【全部】出现在同一段地址文本中才算命中，
 * 例如限制"广东省 深圳市 南山区"，文本需同时含"广东省""深圳市""南山区"。
 */
const matchTexts = (addr: AddressInput, rec: RegionRecord): boolean => {
  const chain = regionChainNames(rec);
  if (chain.length === 0) return false;
  const texts = (addr.addressTexts || []).filter((t): t is string => !!t && !!String(t).trim());
  if (texts.length === 0) return false;
  return texts.some(text => {
    const t = String(text);
    return chain.every(seg => t.includes(seg.trim()));
  });
};

/** 单条记录是否命中
 *  - 客户有结构化省市区时：只走结构化匹配（客户所在地区以省市区字段为准），
 *    避免地址文本中偶然出现限制地名（如收货地址含其他城市名）造成误拦截；
 *  - 无结构化省市区（境外/未选省市区）时：才用地址文本兜底匹配，防止钻空子。
 */
const isRecordMatched = (addr: AddressInput, rec: RegionRecord): boolean => {
  if (rec.isEnabled === false) return false;
  const hasStructured = !!(addr.province || addr.city || addr.district);
  if (hasStructured) {
    return matchStructured(addr, rec);
  }
  return matchTexts(addr, rec);
};

/** 限制记录的显示标签（如"广东省 深圳市 南山区"） */
export const getRegionLabel = (rec: RegionRecord): string => {
  return regionChainNames(rec).join(' ') || (rec.province || rec.city || rec.district || '');
};

/** 拼装拦截提示：有原因则显示原因，无则通用提示 */
const appendReason = (base: string, reason?: string): string => {
  if (reason && String(reason).trim()) {
    return `${base}，原因：${String(reason).trim()}。如有疑问请联系管理员`;
  }
  return `${base}，如有疑问请联系管理员`;
};

// ========== 检查入口 ==========

/**
 * 检查地区限制（建户 / 下单通用）
 * @param type 'customer'=限制地区客户创建客户资料，'order'=限制地区客户下单
 * @param tenantId 租户ID（显式传入，保证隔离）
 * @param addr 客户地址（结构化省市区 + 地址文本列表）
 */
export const checkRegionRestriction = async (
  type: 'customer' | 'order',
  tenantId: string | null | undefined,
  addr: AddressInput
): Promise<RegionCheckResult> => {
  try {
    const records = await getRegionRestrictionConfig(type, tenantId);
    if (records.length === 0) return { allowed: true };

    const matched = records.find(rec => isRecordMatched(addr, rec));
    if (!matched) return { allowed: true };

    const label = getRegionLabel(matched);
    const base = type === 'customer'
      ? `该客户所在地区（${label}）已被限制创建客户资料，暂时无法添加`
      : `该客户所在地区（${label}）已被限制下单，暂时无法下单`;
    return {
      allowed: false,
      message: appendReason(base, matched.reason),
      limitType: type === 'customer' ? 'region_customer' : 'region_order',
      matchedRegion: matched,
    };
  } catch (error) {
    // 检查异常放行，不阻塞正常业务
    log.error('[地区限制] 检查失败（放行）:', error);
    return { allowed: true };
  }
};

/**
 * 检查部门+地区下单限制
 * @param departmentId 下单人所属部门（未配置该部门则放行）
 */
export const checkDepartmentRegionRestriction = async (
  tenantId: string | null | undefined,
  departmentId: string | null | undefined,
  addr: AddressInput
): Promise<RegionCheckResult> => {
  try {
    if (!departmentId) return { allowed: true };

    const records = await getDepartmentRegionRestrictionConfig(tenantId);
    if (records.length === 0) return { allowed: true };

    const deptRecord = records.find(
      d => d.departmentId === String(departmentId) && d.isEnabled !== false && Array.isArray(d.regions)
    );
    if (!deptRecord || deptRecord.regions.length === 0) return { allowed: true };

    const matched = deptRecord.regions.find(rec => isRecordMatched(addr, rec));
    if (!matched) return { allowed: true };

    const label = getRegionLabel(matched);
    const deptName = deptRecord.departmentName || '当前部门';
    const base = `该客户所在地区（${label}）已被限制在【${deptName}】下单，暂时无法下单`;
    return {
      allowed: false,
      message: appendReason(base, matched.reason),
      limitType: 'department_region',
      matchedRegion: matched,
    };
  } catch (error) {
    log.error('[地区限制] 部门地区检查失败（放行）:', error);
    return { allowed: true };
  }
};
