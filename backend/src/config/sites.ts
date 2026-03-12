/**
 * 网站地址配置
 *
 * 统一管理所有系统的访问地址
 */

export const SITE_CONFIG = {
  // CRM系统登录地址
  CRM_URL: process.env.CRM_URL || 'https://crm.yunkes.com',

  // 官网地址
  WEBSITE_URL: process.env.WEBSITE_URL || 'https://yunkes.com',

  // API地址
  API_URL: process.env.API_URL || 'https://api.yunkes.com',

  // Admin后台地址
  ADMIN_URL: process.env.ADMIN_URL || 'https://admin.yunkes.com'
};

// 导出便捷方法
export const getSiteUrl = (type: 'crm' | 'website' | 'api' | 'admin'): string => {
  const urlMap = {
    crm: SITE_CONFIG.CRM_URL,
    website: SITE_CONFIG.WEBSITE_URL,
    api: SITE_CONFIG.API_URL,
    admin: SITE_CONFIG.ADMIN_URL
  };

  return urlMap[type];
};

export default SITE_CONFIG;
