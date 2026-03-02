/**
 * 部署模式配置
 * 支持私有部署和SaaS两种模式
 */

export type DeployMode = 'private' | 'saas'

export interface DeployConfig {
  mode: DeployMode
  isPrivate: () => boolean
  isSaaS: () => boolean
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

  // 判断是否为私有部署模式
  isPrivate: () => deployConfig.mode === 'private',

  // 判断是否为SaaS模式
  isSaaS: () => deployConfig.mode === 'saas',

  // 私有部署配置
  private: {
    licenseKey: process.env.LICENSE_KEY,
    licenseServer: process.env.LICENSE_SERVER || 'https://admin.yourdomain.com'
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
  console.log('='.repeat(50))
  console.log('CRM系统部署配置')
  console.log('='.repeat(50))
  console.log(`部署模式: ${deployConfig.mode}`)
  console.log(`是否私有部署: ${deployConfig.isPrivate()}`)
  console.log(`是否SaaS模式: ${deployConfig.isSaaS()}`)

  if (deployConfig.isPrivate()) {
    console.log('\n私有部署配置:')
    console.log(`  授权码: ${deployConfig.private.licenseKey ? '已配置' : '未配置'}`)
    console.log(`  授权服务器: ${deployConfig.private.licenseServer}`)
  } else {
    console.log('\nSaaS配置:')
    console.log(`  租户ID: ${deployConfig.saas.tenantId || '未配置'}`)
    console.log(`  租户授权码: ${deployConfig.saas.tenantLicenseKey ? '已配置' : '未配置'}`)
  }

  console.log('='.repeat(50))
}
