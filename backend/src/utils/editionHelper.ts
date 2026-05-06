/**
 * 版本/版次工具函数
 * 用于社区版/专业版功能判断、导出限制等
 */

/** 社区版可用的模块ID列表 */
export const COMMUNITY_MODULES = ['dashboard', 'customer', 'order', 'logistics', 'service'] as const;

/** 社区版导出数量上限 */
export const COMMUNITY_EXPORT_LIMIT = 100;

/** 社区版最大用户数 */
export const COMMUNITY_MAX_USERS = 3;

/** 社区版最大存储空间(GB) */
export const COMMUNITY_MAX_STORAGE_GB = 2;

/**
 * 判断指定模块是否在功能列表中启用
 * @param features 当前授权的功能/模块列表
 * @param moduleId 要检查的模块ID
 */
export function isFeatureEnabled(features: string[] | null | undefined, moduleId: string): boolean {
  if (!features || !Array.isArray(features)) return false;
  return features.includes(moduleId);
}

/**
 * 判断当前授权是否为社区版
 * @param licenseType 授权类型
 */
export function isCommunityEdition(licenseType: string | null | undefined): boolean {
  return licenseType === 'community';
}

/**
 * 判断当前授权是否为社区版（通过授权码前缀）
 * @param licenseKey 授权码
 */
export function isCommunityLicenseKey(licenseKey: string | null | undefined): boolean {
  return !!licenseKey && licenseKey.startsWith('COMMUNITY-');
}

/**
 * 获取社区版的功能限制描述（用于升级提示）
 */
export function getCommunityLimits() {
  return {
    maxUsers: COMMUNITY_MAX_USERS,
    maxStorageGb: COMMUNITY_MAX_STORAGE_GB,
    exportLimit: COMMUNITY_EXPORT_LIMIT,
    modules: [...COMMUNITY_MODULES],
    disabledModules: ['wecom', 'finance', 'performance', 'serviceManagement'],
    upgradeUrl: 'https://www.yunkes.com/pricing'
  };
}

/**
 * 获取导出上限（社区版100条，其他版本不限或按套餐配置）
 * @param licenseType 授权类型
 * @param packageExportLimit 套餐配置的导出上限（可选）
 */
export function getExportLimit(licenseType: string | null | undefined, packageExportLimit?: number): number {
  if (isCommunityEdition(licenseType)) {
    return COMMUNITY_EXPORT_LIMIT;
  }
  return packageExportLimit || 0; // 0 表示不限制
}
