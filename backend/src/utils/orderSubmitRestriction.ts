/**
 * 下单提交限制检查工具（订单配置：邮费最大金额限制 + 定金截图必填）
 *
 * 配置存储：system_configs KV（零建表），key：
 *   - orderSubmitRestrictions （group=order_settings）订单配置：
 *       . shippingFeeLimitEnabled  是否启用邮费最大金额限制
 *       . maxShippingFee           邮费上限（超出则拦截下单）
 *       . exemptOverseas           是否豁免境外地址客户（命中境外地址时不校验邮费上限）
 *       . depositScreenshotRequired 是否强制要求上传定金截图（默认 false）
 *
 * 🔒 租户隔离：与 ageGenderRestriction 同款，全部使用【显式 tenantId where 条件】
 *    （tenantId ? tenantId : IsNull()），不依赖 AsyncLocalStorage。
 *
 * 约定：
 *   - 配置整体不启用时不拦截。
 *   - 邮费上限：仅当 shippingFeeLimitEnabled 且 maxShippingFee > 0 时生效；
 *     豁免境外且客户为境外地址时，跳过邮费上限校验。
 *   - 定金截图必填：仅当 depositScreenshotRequired 为 true、且该订单【填写了定金金额（>0）】却未上传截图时拦截；
 *     若定金金额为 0（无定金），则无需截图，直接放行。
 */

import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { log } from '../config/logger';

// ========== 类型定义 ==========

/** 订单配置：下单提交限制（邮费上限 + 定金截图必填） */
export interface OrderSubmitRestrictionConfig {
  shippingFeeLimitEnabled: boolean;
  maxShippingFee: number;
  exemptOverseas: boolean;
  depositScreenshotRequired: boolean;
}

/** 待检查的输入 */
export interface OrderSubmitInput {
  shippingFee?: number | string | null;
  isOverseas?: boolean;
  /** 本单定金金额；仅当其 > 0 时才要求上传定金截图 */
  depositAmount?: number | string | null;
  hasDepositScreenshot?: boolean;
}

export interface OrderSubmitCheckResult {
  allowed: boolean;
  message?: string;
  limitType?: 'shipping_fee_limit' | 'deposit_screenshot_required';
}

const DEFAULT_CONFIG: OrderSubmitRestrictionConfig = {
  shippingFeeLimitEnabled: false,
  maxShippingFee: 0,
  exemptOverseas: false,
  depositScreenshotRequired: false,
};

const CONFIG_KEY = 'orderSubmitRestrictions';
const CONFIG_GROUP = 'order_settings';

// ========== 配置读取/保存（显式租户隔离） ==========

/** 读取下单提交限制配置 */
export const getOrderSubmitRestrictionConfig = async (
  tenantId: string | null | undefined
): Promise<OrderSubmitRestrictionConfig> => {
  try {
    const repo = AppDataSource.getRepository(SystemConfig);
    const config = await repo.findOne({
      where: {
        configKey: CONFIG_KEY,
        configGroup: CONFIG_GROUP,
        tenantId: tenantId ? tenantId : IsNull(),
      },
    });

    if (!config) return { ...DEFAULT_CONFIG };
    const value = JSON.parse(config.configValue);
    return {
      shippingFeeLimitEnabled: !!value?.shippingFeeLimitEnabled,
      maxShippingFee: Number(value?.maxShippingFee) || 0,
      exemptOverseas: !!value?.exemptOverseas,
      depositScreenshotRequired: !!value?.depositScreenshotRequired,
    };
  } catch (error) {
    log.error('[下单提交限制] 读取配置失败:', error);
    return { ...DEFAULT_CONFIG };
  }
};

/** 保存下单提交限制配置 */
export const saveOrderSubmitRestrictionConfig = async (
  tenantId: string | null | undefined,
  cfg: OrderSubmitRestrictionConfig
): Promise<void> => {
  const repo = AppDataSource.getRepository(SystemConfig);
  let config = await repo.findOne({
    where: {
      configKey: CONFIG_KEY,
      configGroup: CONFIG_GROUP,
      tenantId: tenantId ? tenantId : IsNull(),
    },
  });

  if (config) {
    config.configValue = JSON.stringify(cfg);
  } else {
    config = repo.create({
      tenantId: tenantId || null,
      configKey: CONFIG_KEY,
      configValue: JSON.stringify(cfg),
      valueType: 'json',
      configGroup: CONFIG_GROUP,
      description: '下单提交限制（邮费最大金额限制 + 定金截图必填）',
      isEnabled: true,
      isSystem: true,
    });
  }
  await repo.save(config);
};

// ========== 检查入口 ==========

/**
 * 检查下单提交限制（邮费上限 + 定金截图必填）
 * @param tenantId 租户ID（显式传入，保证隔离）
 * @param input 待检查的下单信息
 */
export const checkOrderSubmitRestrictions = async (
  tenantId: string | null | undefined,
  input: OrderSubmitInput
): Promise<OrderSubmitCheckResult> => {
  try {
    const cfg = await getOrderSubmitRestrictionConfig(tenantId);

    // 定金截图必填：仅当本单填写了定金金额（>0）却未上传截图时拦截（境外/地址无关，先于邮费校验）
    const depositAmount = Number(input.depositAmount) || 0;
    if (cfg.depositScreenshotRequired && depositAmount > 0 && !input.hasDepositScreenshot) {
      return {
        allowed: false,
        message: '该订单要求必须上传定金截图，请上传后再提交，如有疑问请联系管理员',
        limitType: 'deposit_screenshot_required',
      };
    }

    // 邮费最大金额限制：启用且设置了上限时校验；豁免境外地址时跳过
    if (cfg.shippingFeeLimitEnabled && cfg.maxShippingFee > 0) {
      if (cfg.exemptOverseas && input.isOverseas) {
        return { allowed: true };
      }
      const fee = Number(input.shippingFee) || 0;
      if (fee > cfg.maxShippingFee) {
        return {
          allowed: false,
          message: `邮费 ¥${fee.toFixed(2)} 超出允许的最大邮费 ¥${cfg.maxShippingFee.toFixed(2)}，请调整后再提交，如有疑问请联系管理员`,
          limitType: 'shipping_fee_limit',
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    // 检查异常放行，不阻塞正常业务
    log.error('[下单提交限制] 检查失败（放行）:', error);
    return { allowed: true };
  }
};
