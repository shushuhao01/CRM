/**
 * 管理后台权限码常量定义
 * 与后端 admin/roles.ts 中的 PERMISSION_TREE 保持一致
 */

// ============ 菜单模块码（用于侧边栏菜单显隐控制）============
export const MENU_MODULES = {
  DASHBOARD: 'dashboard',
  CUSTOMER_MANAGEMENT: 'customer-management',
  PRIVATE_CUSTOMERS: 'private-customers',
  TENANT_CUSTOMERS: 'tenant-customers',
  MODULES: 'modules',
  SMS_MANAGEMENT: 'sms-management',
  WECOM_MANAGEMENT: 'wecom-management',
  PAYMENT: 'payment',
  VERSIONS: 'versions',
  API: 'api',
  SETTINGS: 'settings'
} as const

// ============ 详细权限码（用于按钮级权限控制）============
export const PERMISSIONS = {
  // 仪表盘
  DASHBOARD_VIEW: 'dashboard:view',

  // 客户管理
  CUSTOMER_ALL_VIEW: 'customer-management:all:view',
  CUSTOMER_ALL_EDIT: 'customer-management:all:edit',
  CUSTOMER_ALL_FOLLOWUP: 'customer-management:all:followup',
  CUSTOMER_RENEWAL_VIEW: 'customer-management:renewal:view',

  // 私有客户
  PRIVATE_LIST_VIEW: 'private-customers:list:view',
  PRIVATE_LIST_CREATE: 'private-customers:list:create',
  PRIVATE_LIST_EDIT: 'private-customers:list:edit',
  PRIVATE_LIST_DELETE: 'private-customers:list:delete',
  PRIVATE_DETAIL_VIEW: 'private-customers:detail:view',
  PRIVATE_DETAIL_RENEW: 'private-customers:detail:renew',
  PRIVATE_DETAIL_REVOKE: 'private-customers:detail:revoke',
  PRIVATE_DETAIL_RESET_PWD: 'private-customers:detail:reset-password',

  // 租户客户
  TENANT_LIST_VIEW: 'tenant-customers:list:view',
  TENANT_LIST_CREATE: 'tenant-customers:list:create',
  TENANT_LIST_EDIT: 'tenant-customers:list:edit',
  TENANT_LIST_DELETE: 'tenant-customers:list:delete',
  TENANT_PACKAGES_VIEW: 'tenant-customers:packages:view',
  TENANT_PACKAGES_CREATE: 'tenant-customers:packages:create',
  TENANT_PACKAGES_EDIT: 'tenant-customers:packages:edit',
  TENANT_PACKAGES_DELETE: 'tenant-customers:packages:delete',
  TENANT_DETAIL_VIEW: 'tenant-customers:detail:view',
  TENANT_DETAIL_RENEW: 'tenant-customers:detail:renew',
  TENANT_DETAIL_SUSPEND: 'tenant-customers:detail:suspend',
  TENANT_DETAIL_RESET_PWD: 'tenant-customers:detail:reset-password',

  // 模块服务
  MODULE_LIST_VIEW: 'modules:list:view',
  MODULE_LIST_CREATE: 'modules:list:create',
  MODULE_LIST_EDIT: 'modules:list:edit',
  MODULE_LIST_DELETE: 'modules:list:delete',
  MODULE_CONFIG_VIEW: 'modules:config:view',
  MODULE_CONFIG_EDIT: 'modules:config:edit',
  MODULE_DISTRIBUTE_VIEW: 'modules:distribute:view',
  MODULE_DISTRIBUTE_EDIT: 'modules:distribute:edit',
  MODULE_MESSAGE_VIEW: 'modules:message:view',
  MODULE_MESSAGE_EDIT: 'modules:message:edit',

  // 短信管理
  SMS_TEMPLATE_REVIEW_VIEW: 'sms-management:template-review:view',
  SMS_TEMPLATE_REVIEW_EDIT: 'sms-management:template-review:edit',
  SMS_TEMPLATES_VIEW: 'sms-management:templates:view',
  SMS_TEMPLATES_CREATE: 'sms-management:templates:create',
  SMS_TEMPLATES_EDIT: 'sms-management:templates:edit',
  SMS_TEMPLATES_DELETE: 'sms-management:templates:delete',
  SMS_RECORDS_VIEW: 'sms-management:records:view',
  SMS_CRM_CONFIG_VIEW: 'sms-management:crm-config:view',
  SMS_CRM_CONFIG_EDIT: 'sms-management:crm-config:edit',
  SMS_STATISTICS_VIEW: 'sms-management:statistics:view',
  SMS_QUOTA_PACKAGES_VIEW: 'sms-management:quota-packages:view',
  SMS_QUOTA_PACKAGES_EDIT: 'sms-management:quota-packages:edit',

  // 企微管理
  WECOM_OVERVIEW_VIEW: 'wecom-management:overview:view',
  WECOM_TENANT_AUTH_VIEW: 'wecom-management:tenant-auth:view',
  WECOM_TENANT_AUTH_EDIT: 'wecom-management:tenant-auth:edit',
  WECOM_PACKAGE_TEMPLATES_VIEW: 'wecom-management:package-templates:view',
  WECOM_PACKAGE_TEMPLATES_EDIT: 'wecom-management:package-templates:edit',
  WECOM_TENANT_PACKAGES_VIEW: 'wecom-management:tenant-packages:view',
  WECOM_TENANT_PACKAGES_EDIT: 'wecom-management:tenant-packages:edit',
  WECOM_QUOTA_MONITOR_VIEW: 'wecom-management:quota-monitor:view',
  WECOM_CHAT_ARCHIVE_VIEW: 'wecom-management:chat-archive:view',
  WECOM_CHAT_ARCHIVE_EDIT: 'wecom-management:chat-archive:edit',
  WECOM_VAS_CONFIG_VIEW: 'wecom-management:vas-config:view',
  WECOM_VAS_CONFIG_EDIT: 'wecom-management:vas-config:edit',
  WECOM_VAS_ORDERS_VIEW: 'wecom-management:vas-orders:view',
  WECOM_VAS_ORDERS_EDIT: 'wecom-management:vas-orders:edit',
  WECOM_SYSTEM_CONFIG_VIEW: 'wecom-management:system-config:view',
  WECOM_SYSTEM_CONFIG_EDIT: 'wecom-management:system-config:edit',
  // 企微管理V4.0新增权限码
  WECOM_SUITE_APP_VIEW: 'wecom-management:suite-app:view',
  WECOM_SUITE_APP_EDIT: 'wecom-management:suite-app:edit',
  WECOM_SUITE_APP_CALLBACK: 'wecom-management:suite-app:callback',
  WECOM_CONFIG_QUOTA_VIEW: 'wecom-management:config-quota:view',
  WECOM_CONFIG_QUOTA_EDIT: 'wecom-management:config-quota:edit',
  WECOM_PURCHASE_ORDERS_VIEW: 'wecom-management:purchase-orders:view',
  WECOM_PURCHASE_ORDERS_EDIT: 'wecom-management:purchase-orders:edit',
  WECOM_AI_MANAGEMENT_VIEW: 'wecom-management:ai-management:view',
  WECOM_AI_MANAGEMENT_EDIT: 'wecom-management:ai-management:edit',
  WECOM_AI_BILLING_VIEW: 'wecom-management:ai-billing:view',
  WECOM_AI_BILLING_EDIT: 'wecom-management:ai-billing:edit',
  WECOM_ACQUISITION_QUOTA_VIEW: 'wecom-management:acquisition-quota:view',
  WECOM_ACQUISITION_QUOTA_EDIT: 'wecom-management:acquisition-quota:edit',
  WECOM_DATA_STATS_VIEW: 'wecom-management:data-stats:view',
  WECOM_AUDIT_LOG_VIEW: 'wecom-management:audit-log:view',
  WECOM_AUDIT_LOG_EXPORT: 'wecom-management:audit-log:export',

  // 支付管理
  PAYMENT_LIST_VIEW: 'payment:list:view',
  PAYMENT_LIST_EDIT: 'payment:list:edit',
  PAYMENT_CONFIG_VIEW: 'payment:config:view',
  PAYMENT_CONFIG_EDIT: 'payment:config:edit',
  PAYMENT_REPORTS_VIEW: 'payment:reports:view',
  PAYMENT_REPORTS_EXPORT: 'payment:reports:export',

  // 版本发布
  VERSION_LIST_VIEW: 'versions:list:view',
  VERSION_LIST_EDIT: 'versions:list:edit',
  VERSION_LIST_DELETE: 'versions:list:delete',
  VERSION_UPLOAD_VIEW: 'versions:upload:view',
  VERSION_UPLOAD_EDIT: 'versions:upload:edit',
  VERSION_CHANGELOG_VIEW: 'versions:changelog:view',
  VERSION_CHANGELOG_EDIT: 'versions:changelog:edit',

  // 接口管理
  API_LIST_VIEW: 'api:list:view',
  API_LIST_CREATE: 'api:list:create',
  API_LIST_EDIT: 'api:list:edit',
  API_LIST_DELETE: 'api:list:delete',

  // 系统设置
  SETTINGS_ADMINS_VIEW: 'settings:admins:view',
  SETTINGS_ADMINS_CREATE: 'settings:admins:create',
  SETTINGS_ADMINS_EDIT: 'settings:admins:edit',
  SETTINGS_ADMINS_DELETE: 'settings:admins:delete',
  SETTINGS_ROLES_VIEW: 'settings:roles:view',
  SETTINGS_ROLES_CREATE: 'settings:roles:create',
  SETTINGS_ROLES_EDIT: 'settings:roles:edit',
  SETTINGS_ROLES_DELETE: 'settings:roles:delete',
  SETTINGS_BASIC_VIEW: 'settings:basic:view',
  SETTINGS_BASIC_EDIT: 'settings:basic:edit',
  SETTINGS_NOTIFICATION_TEMPLATES_VIEW: 'settings:notification-templates:view',
  SETTINGS_NOTIFICATION_TEMPLATES_EDIT: 'settings:notification-templates:edit',
  SETTINGS_NOTIFICATION_SERVICE_VIEW: 'settings:notification-service:view',
  SETTINGS_NOTIFICATION_SERVICE_EDIT: 'settings:notification-service:edit',
  SETTINGS_OPERATION_LOGS_VIEW: 'settings:operation-logs:view',
  SETTINGS_RECYCLE_BIN_VIEW: 'settings:recycle-bin:view',
  SETTINGS_RECYCLE_BIN_RESTORE: 'settings:recycle-bin:restore',
  SETTINGS_RECYCLE_BIN_DELETE: 'settings:recycle-bin:delete'
} as const

/**
 * 二级菜单路径与所需权限码的映射表
 * 用于侧边栏二级菜单的显隐控制
 */
export const MENU_PERMISSION_MAP: Record<string, string> = {
  // 客户管理
  '/customer-management/all': PERMISSIONS.CUSTOMER_ALL_VIEW,
  '/customer-management/renewal-reminders': PERMISSIONS.CUSTOMER_RENEWAL_VIEW,
  // 私有客户
  '/private-customers/list': PERMISSIONS.PRIVATE_LIST_VIEW,
  // 租户客户
  '/tenant-customers/list': PERMISSIONS.TENANT_LIST_VIEW,
  // 套餐管理（独立一级菜单）
  '/package-management/packages': PERMISSIONS.TENANT_PACKAGES_VIEW,
  '/package-management/capacity': PERMISSIONS.TENANT_PACKAGES_VIEW,
  // 模块服务
  '/modules/list': PERMISSIONS.MODULE_LIST_VIEW,
  '/modules/config': PERMISSIONS.MODULE_CONFIG_VIEW,
  '/modules/distribute': PERMISSIONS.MODULE_DISTRIBUTE_VIEW,
  '/modules/message-management': PERMISSIONS.MODULE_MESSAGE_VIEW,
  // 短信管理
  '/sms-management/template-review': PERMISSIONS.SMS_TEMPLATE_REVIEW_VIEW,
  '/sms-management/templates': PERMISSIONS.SMS_TEMPLATES_VIEW,
  '/sms-management/records': PERMISSIONS.SMS_RECORDS_VIEW,
  '/sms-management/crm-config': PERMISSIONS.SMS_CRM_CONFIG_VIEW,
  '/sms-management/statistics': PERMISSIONS.SMS_STATISTICS_VIEW,
  '/sms-management/quota-packages': PERMISSIONS.SMS_QUOTA_PACKAGES_VIEW,
  // 企微管理（V4.0重构）
  '/wecom-management/overview': PERMISSIONS.WECOM_OVERVIEW_VIEW,
  '/wecom-management/suite-app': PERMISSIONS.WECOM_SUITE_APP_VIEW,
  '/wecom-management/tenant-auth': PERMISSIONS.WECOM_TENANT_AUTH_VIEW,
  '/wecom-management/config-quota': PERMISSIONS.WECOM_CONFIG_QUOTA_VIEW,
  '/wecom-management/pricing': PERMISSIONS.WECOM_PACKAGE_TEMPLATES_VIEW,
  '/wecom-management/tenant-packages': PERMISSIONS.WECOM_TENANT_PACKAGES_VIEW,
  '/wecom-management/purchase-orders': PERMISSIONS.WECOM_PURCHASE_ORDERS_VIEW,
  '/wecom-management/ai-management': PERMISSIONS.WECOM_AI_MANAGEMENT_VIEW,
  '/wecom-management/vas-orders': PERMISSIONS.WECOM_VAS_ORDERS_VIEW,
  '/wecom-management/quota-monitor': PERMISSIONS.WECOM_QUOTA_MONITOR_VIEW,
  '/wecom-management/acquisition-usage': PERMISSIONS.WECOM_ACQUISITION_QUOTA_VIEW,
  '/wecom-management/data-stats': PERMISSIONS.WECOM_DATA_STATS_VIEW,
  '/wecom-management/audit-log': PERMISSIONS.WECOM_AUDIT_LOG_VIEW,
  '/wecom-management/system-config': PERMISSIONS.WECOM_SYSTEM_CONFIG_VIEW,
  // 支付管理
  '/payment/list': PERMISSIONS.PAYMENT_LIST_VIEW,
  '/payment/config': PERMISSIONS.PAYMENT_CONFIG_VIEW,
  '/payment/reports': PERMISSIONS.PAYMENT_REPORTS_VIEW,
  // 版本发布
  '/versions/list': PERMISSIONS.VERSION_LIST_VIEW,
  '/versions/upload': PERMISSIONS.VERSION_UPLOAD_VIEW,
  '/versions/changelog': PERMISSIONS.VERSION_CHANGELOG_VIEW,
  // 接口管理
  '/api/list': PERMISSIONS.API_LIST_VIEW,
  // 系统设置
  '/settings/admins': PERMISSIONS.SETTINGS_ADMINS_VIEW,
  '/settings/roles': PERMISSIONS.SETTINGS_ROLES_VIEW,
  '/settings/basic': PERMISSIONS.SETTINGS_BASIC_VIEW,
  '/settings/notification-templates': PERMISSIONS.SETTINGS_NOTIFICATION_TEMPLATES_VIEW,
  '/settings/notification-service': PERMISSIONS.SETTINGS_NOTIFICATION_SERVICE_VIEW,
  '/settings/operation-logs': PERMISSIONS.SETTINGS_OPERATION_LOGS_VIEW,
  '/settings/recycle-bin': PERMISSIONS.SETTINGS_RECYCLE_BIN_VIEW
}

