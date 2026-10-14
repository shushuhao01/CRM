/**
 * 年龄/性别限制检查工具（限制年龄/性别客户创建客户资料 / 部门+年龄/性别下单限制）
 *
 * 配置存储：system_configs KV（零建表），两个 key：
 *   - ageGenderCustomerRestrictions   （group=customer_settings）客户配置：限制建户的年龄/性别
 *   - departmentAgeGenderRestrictions （group=order_settings）    订单配置：部门+年龄/性别下单限制
 *
 * 🔒 租户隔离：与 regionRestriction 同款，全部使用【显式 tenantId where 条件】
 *    （tenantId ? tenantId : IsNull()），不依赖 AsyncLocalStorage。
 *
 * 约定：
 *   - ageMin/ageMax = 0 表示该侧不限制；两者都为 0 视为年龄不限制。
 *   - genders 为空表示性别不限制；性别为「未知/未填」时不拦截（异常放行）。
 *   - 年龄缺失时不拦截。
 *   - departmentIds 含 '__ALL__' 表示全部部门。
 */

import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { log } from '../config/logger';

/** 特殊部门ID：代表全部部门 */
export const ALL_DEPARTMENTS = '__ALL__';

// ========== 类型定义 ==========

/** 客户配置：年龄/性别限制（单套统一规则） */
export interface AgeGenderCustomerConfig {
  ageEnabled: boolean;
  ageMin: number; // 0 = 该侧不限制
  ageMax: number; // 0 = 该侧不限制
  genderEnabled: boolean;
  genders: string[]; // 允许的性别（male/female），空=不限制
}

/** 订单配置：部门+年龄/性别下单限制记录 */
export interface DepartmentAgeGenderRecord {
  id?: string;
  departmentIds: string[]; // ['__ALL__'] = 全部部门
  departmentNames?: string[];
  isEnabled?: boolean;
  ageEnabled: boolean;
  ageMin: number;
  ageMax: number;
  genderEnabled: boolean;
  genders: string[];
  reason?: string; // 原因（选填），写了就随拦截提示一并显示
}

/** 待检查的年龄/性别输入 */
export interface AgeGenderInput {
  age?: number | string | null;
  gender?: string | null;
}

export interface AgeGenderCheckResult {
  allowed: boolean;
  message?: string;
  limitType?: 'age_customer' | 'gender_customer' | 'department_age' | 'department_gender';
}

const DEFAULT_CUSTOMER_CONFIG: AgeGenderCustomerConfig = {
  ageEnabled: false,
  ageMin: 0,
  ageMax: 0,
  genderEnabled: false,
  genders: [],
};

// ========== 通用辅助 ==========

const GENDER_LABELS: Record<string, string> = { male: '男', female: '女' };
const genderLabel = (g: string): string => GENDER_LABELS[g] || g;

/** 拼装拦截提示：有原因则显示原因，无则通用提示 */
const appendReason = (base: string, reason?: string): string => {
  if (reason && String(reason).trim()) {
    return `${base}，原因：${String(reason).trim()}。如有疑问请联系管理员`;
  }
  return `${base}，如有疑问请联系管理员`;
};

/** 年龄区间的可读描述 */
const ageRangeDesc = (min: number, max: number): string => {
  if (min > 0 && max > 0) return `${min}-${max}岁`;
  if (min > 0) return `不低于${min}岁`;
  if (max > 0) return `不高于${max}岁`;
  return '不限';
};

const parseAge = (age?: number | string | null): number | null => {
  if (age === null || age === undefined || age === '') return null;
  const n = Number(age);
  return Number.isFinite(n) ? n : null;
};

/** 检查年龄：命中返回违反类型，未命中/无值返回 null（无值放行） */
const checkAge = (
  ageRaw: number | string | null | undefined,
  enabled: boolean,
  min: number,
  max: number
): 'below' | 'above' | null => {
  if (!enabled) return null;
  if (!(min > 0) && !(max > 0)) return null; // 两侧都不限制=不限制
  const age = parseAge(ageRaw);
  if (age === null) return null; // 年龄缺失放行
  if (min > 0 && age < min) return 'below';
  if (max > 0 && age > max) return 'above';
  return null;
};

/** 检查性别是否被拦截（true=拦截）。未知/未填放行 */
const isGenderBlocked = (
  genderRaw: string | null | undefined,
  enabled: boolean,
  genders: string[]
): boolean => {
  if (!enabled) return false;
  if (!Array.isArray(genders) || genders.length === 0) return false; // 不限制
  const g = genderRaw ? String(genderRaw).trim() : '';
  if (!g || g === 'unknown') return false; // 未知放行
  return !genders.includes(g);
};

// ========== 配置读取/保存（显式租户隔离） ==========

/** 读取客户年龄/性别限制配置 */
export const getAgeGenderCustomerConfig = async (
  tenantId: string | null | undefined
): Promise<AgeGenderCustomerConfig> => {
  try {
    const repo = AppDataSource.getRepository(SystemConfig);
    const config = await repo.findOne({
      where: {
        configKey: 'ageGenderCustomerRestrictions',
        configGroup: 'customer_settings',
        tenantId: tenantId ? tenantId : IsNull(),
      },
    });

    if (!config) return { ...DEFAULT_CUSTOMER_CONFIG };
    const value = JSON.parse(config.configValue);
    return {
      ageEnabled: !!value?.ageEnabled,
      ageMin: Number(value?.ageMin) || 0,
      ageMax: Number(value?.ageMax) || 0,
      genderEnabled: !!value?.genderEnabled,
      genders: Array.isArray(value?.genders) ? value.genders.map(String) : [],
    };
  } catch (error) {
    log.error('[年龄性别限制] 读取客户配置失败:', error);
    return { ...DEFAULT_CUSTOMER_CONFIG };
  }
};

/** 保存客户年龄/性别限制配置 */
export const saveAgeGenderCustomerConfig = async (
  tenantId: string | null | undefined,
  cfg: AgeGenderCustomerConfig
): Promise<void> => {
  const repo = AppDataSource.getRepository(SystemConfig);
  let config = await repo.findOne({
    where: {
      configKey: 'ageGenderCustomerRestrictions',
      configGroup: 'customer_settings',
      tenantId: tenantId ? tenantId : IsNull(),
    },
  });

  if (config) {
    config.configValue = JSON.stringify(cfg);
  } else {
    config = repo.create({
      tenantId: tenantId || null,
      configKey: 'ageGenderCustomerRestrictions',
      configValue: JSON.stringify(cfg),
      valueType: 'json',
      configGroup: 'customer_settings',
      description: '限制年龄/性别客户创建客户资料',
      isEnabled: true,
      isSystem: true,
    });
  }
  await repo.save(config);
};

/** 规范化部门+年龄/性别记录（兼容旧的单部门 departmentId 字段） */
const normalizeDepartmentRecord = (raw: any): DepartmentAgeGenderRecord => {
  let ids: string[] = [];
  if (Array.isArray(raw?.departmentIds)) {
    ids = raw.departmentIds.map(String);
  } else if (raw?.departmentId) {
    ids = [String(raw.departmentId)];
  }
  let names: string[] = [];
  if (Array.isArray(raw?.departmentNames)) {
    names = raw.departmentNames.map(String);
  } else if (raw?.departmentName) {
    names = [String(raw.departmentName)];
  }
  return {
    id: raw?.id,
    departmentIds: ids,
    departmentNames: names,
    isEnabled: raw?.isEnabled !== false,
    ageEnabled: !!raw?.ageEnabled,
    ageMin: Number(raw?.ageMin) || 0,
    ageMax: Number(raw?.ageMax) || 0,
    genderEnabled: !!raw?.genderEnabled,
    genders: Array.isArray(raw?.genders) ? raw.genders.map(String) : [],
    reason: raw?.reason,
  };
};

/** 读取部门+年龄/性别下单限制配置 */
export const getDepartmentAgeGenderRestrictions = async (
  tenantId: string | null | undefined
): Promise<DepartmentAgeGenderRecord[]> => {
  try {
    const repo = AppDataSource.getRepository(SystemConfig);
    const config = await repo.findOne({
      where: {
        configKey: 'departmentAgeGenderRestrictions',
        configGroup: 'order_settings',
        tenantId: tenantId ? tenantId : IsNull(),
      },
    });

    if (!config) return [];
    const value = JSON.parse(config.configValue);
    return Array.isArray(value) ? value.map(normalizeDepartmentRecord) : [];
  } catch (error) {
    log.error('[年龄性别限制] 读取部门年龄性别配置失败:', error);
    return [];
  }
};

/** 保存部门+年龄/性别下单限制配置 */
export const saveDepartmentAgeGenderRestrictions = async (
  tenantId: string | null | undefined,
  records: DepartmentAgeGenderRecord[]
): Promise<void> => {
  const repo = AppDataSource.getRepository(SystemConfig);
  let config = await repo.findOne({
    where: {
      configKey: 'departmentAgeGenderRestrictions',
      configGroup: 'order_settings',
      tenantId: tenantId ? tenantId : IsNull(),
    },
  });

  if (config) {
    config.configValue = JSON.stringify(records);
  } else {
    config = repo.create({
      tenantId: tenantId || null,
      configKey: 'departmentAgeGenderRestrictions',
      configValue: JSON.stringify(records),
      valueType: 'json',
      configGroup: 'order_settings',
      description: '部门+年龄/性别下单限制',
      isEnabled: true,
      isSystem: true,
    });
  }
  await repo.save(config);
};

// ========== 检查入口 ==========

/**
 * 检查客户建户的年龄/性别限制（客户配置）
 * @param tenantId 租户ID（显式传入，保证隔离）
 * @param input 待检查的年龄/性别
 */
export const checkCustomerAgeGenderRestriction = async (
  tenantId: string | null | undefined,
  input: AgeGenderInput
): Promise<AgeGenderCheckResult> => {
  try {
    const cfg = await getAgeGenderCustomerConfig(tenantId);

    const ageHit = checkAge(input.age, cfg.ageEnabled, cfg.ageMin, cfg.ageMax);
    if (ageHit) {
      const desc = ageRangeDesc(cfg.ageMin, cfg.ageMax);
      const base = `该客户年龄（${parseAge(input.age)}岁）不符合创建客户资料的要求（允许${desc}），暂时无法添加`;
      return { allowed: false, message: appendReason(base), limitType: 'age_customer' };
    }

    if (isGenderBlocked(input.gender, cfg.genderEnabled, cfg.genders)) {
      const labels = cfg.genders.map(genderLabel).join('、');
      const base = `该客户性别不符合创建客户资料的要求（仅允许${labels}），暂时无法添加`;
      return { allowed: false, message: appendReason(base), limitType: 'gender_customer' };
    }

    return { allowed: true };
  } catch (error) {
    // 检查异常放行，不阻塞正常业务
    log.error('[年龄性别限制] 客户检查失败（放行）:', error);
    return { allowed: true };
  }
};

/**
 * 检查部门+年龄/性别下单限制（订单配置）
 * @param departmentId 下单人所属部门（未配置该部门且无全部部门规则则放行）
 * @param input 待检查的年龄/性别
 */
export const checkDepartmentAgeGenderRestriction = async (
  tenantId: string | null | undefined,
  departmentId: string | null | undefined,
  input: AgeGenderInput
): Promise<AgeGenderCheckResult> => {
  try {
    if (!departmentId) return { allowed: true };

    const records = await getDepartmentAgeGenderRestrictions(tenantId);
    if (records.length === 0) return { allowed: true };

    const deptId = String(departmentId);
    const record = records.find(
      r =>
        r.isEnabled !== false &&
        (r.departmentIds.includes(ALL_DEPARTMENTS) || r.departmentIds.includes(deptId))
    );
    if (!record) return { allowed: true };

    const isAll = record.departmentIds.includes(ALL_DEPARTMENTS);
    const deptName =
      (record.departmentNames || []).length > 0
        ? (record.departmentNames || []).join('、')
        : isAll
          ? '全部部门'
          : '当前部门';

    const ageHit = checkAge(input.age, record.ageEnabled, record.ageMin, record.ageMax);
    if (ageHit) {
      const desc = ageRangeDesc(record.ageMin, record.ageMax);
      const base = `该客户年龄（${parseAge(input.age)}岁）不符合在【${deptName}】下单的要求（允许${desc}），暂时无法下单`;
      return { allowed: false, message: appendReason(base, record.reason), limitType: 'department_age' };
    }

    if (isGenderBlocked(input.gender, record.genderEnabled, record.genders)) {
      const labels = record.genders.map(genderLabel).join('、');
      const base = `该客户性别不符合在【${deptName}】下单的要求（仅允许${labels}），暂时无法下单`;
      return { allowed: false, message: appendReason(base, record.reason), limitType: 'department_gender' };
    }

    return { allowed: true };
  } catch (error) {
    log.error('[年龄性别限制] 部门检查失败（放行）:', error);
    return { allowed: true };
  }
};
