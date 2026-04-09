import { log } from './logger';
/**
 * 部署模式配置
 * 支持私有部署和SaaS两种模式
 *
 * ⚠️ 安全机制：SaaS 模式需要经过 SaaSGuardService 的 RSA 签名验证
 *   即使 DEPLOY_MODE=saas，若无有效的 SAAS_LICENSE_TOKEN，
 *   isSaaS() 将返回 false，系统自动降级为私有部署模式
 */

export type DeployMode = 'private' | 'saas'

export interface DeployConfig {
  mode: DeployMode
  /** 实际生效的模式（经过 SaaS 许可验证后的结果） */
  effectiveMode: DeployMode
  isPrivate: () => boolean
  isSaaS: () => boolean
  /** 强制设置生效模式（由 SaaSGuardService 调用） */
  setEffectiveMode: (mode: DeployMode) => void
  private: {
    licenseKey?: string
    licenseServer?: string
  }
  saas: {
    tenantId?: string
    tenantLicenseKey?: string
  }
}

/**
 * 部署配置
 */
export const deployConfig: DeployConfig = {
  // 从环境变量读取部署模式，默认为私有部署
  mode: (process.env.DEPLOY_MODE as DeployMode) || 'private',

  // 实际生效模式（初始与 mode 相同，SaaS 验证失败后会被降级为 private）
  effectiveMode: (process.env.DEPLOY_MODE as DeployMode) || 'private',

  // 判断是否为私有部署模式（基于实际生效模式）
  isPrivate: () => deployConfig.effectiveMode === 'private',

  // 判断是否为SaaS模式（基于实际生效模式，需通过 SaaS 许可验证）
  isSaaS: () => deployConfig.effectiveMode === 'saas',

  // 强制设置生效模式
  setEffectiveMode: (mode: DeployMode) => {
    deployConfig.effectiveMode = mode
  },

  // 私有部署配置
  private: {
    licenseKey: process.env.LICENSE_KEY,
    licenseServer: process.env.LICENSE_SERVER || 'https://admin.yunkes.com'
  },

  // SaaS配置
  saas: {
    tenantId: process.env.TENANT_ID,
    tenantLicenseKey: process.env.TENANT_LICENSE_KEY
  }
}

/**
 * 获取当前部署模式
 */
export const getDeployMode = (): DeployMode => {
  return deployConfig.mode
}

/**
 * 判断是否为私有部署模式
 */
export const isPrivateMode = (): boolean => {
  return deployConfig.isPrivate()
}

/**
 * 判断是否为SaaS模式
 */
export const isSaaSMode = (): boolean => {
  return deployConfig.isSaaS()
}

/**
 * 打印部署配置信息
 */
export const printDeployConfig = (): void => {
  log.info('='.repeat(50))
  log.info('CRM系统部署配置')
  log.info('='.repeat(50))
  log.info(`配置的部署模式: ${deployConfig.mode}`)
  log.info(`实际生效模式: ${deployConfig.effectiveMode}`)
  if (deployConfig.mode === 'saas' && deployConfig.effectiveMode === 'private') {
    log.warn(`⚠️ SaaS 许可验证未通过，已自动降级为私有部署模式`)
  }
  log.info(`是否私有部署: ${deployConfig.isPrivate()}`)
  log.info(`是否SaaS模式: ${deployConfig.isSaaS()}`)

  if (deployConfig.isPrivate()) {
    log.info('\n私有部署配置:')
    log.info(`  授权码: ${deployConfig.private.licenseKey ? '已配置' : '未配置'}`)
    log.info(`  授权服务器: ${deployConfig.private.licenseServer}`)
  } else {
    log.info('\nSaaS配置:')
    log.info(`  租户ID: ${deployConfig.saas.tenantId || '未配置'}`)
    log.info(`  租户授权码: ${deployConfig.saas.tenantLicenseKey ? '已配置' : '未配置'}`)
  }

  log.info('='.repeat(50))
}
