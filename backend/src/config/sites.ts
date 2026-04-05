/**
 * 网站地址配置
 *
 * 统一管理所有系统的访问地址
 */

export const SITE_CONFIG = {
  // CRM系统登录地址（也用作登录链接）
  CRM_URL: process.env.CRM_URL || 'https://crm.yunkes.com',

  // 官网地址
  WEBSITE_URL: process.env.WEBSITE_URL || 'https://yunkes.com',

  // API地址
  API_URL: process.env.API_URL || 'https://api.yunkes.com',

  // Admin后台地址
  ADMIN_URL: process.env.ADMIN_URL || 'https://admin.yunkes.com',

  // 续费页面地址（指向官网价格页）
  RENEW_URL: process.env.RENEW_URL || 'https://yunkes.com/pricing'
};

// 导出便捷方法
export const getSiteUrl = (type: 'crm' | 'website' | 'api' | 'admin' | 'renew'): string => {
  const urlMap = {
    crm: SITE_CONFIG.CRM_URL,
    website: SITE_CONFIG.WEBSITE_URL,
    api: SITE_CONFIG.API_URL,
    admin: SITE_CONFIG.ADMIN_URL,
    renew: SITE_CONFIG.RENEW_URL
  };

  return urlMap[type];
};

export default SITE_CONFIG;
