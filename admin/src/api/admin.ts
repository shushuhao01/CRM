import request from './request'
import type {
  LicenseListParams,
  GenerateLicenseData,
  UpdateLicenseData,
  LogListParams,
  BillListParams,
  TenantListParams,
  CreateTenantData,
  UpdateTenantData,
  PackageListParams,
  PackageData,
  VersionListParams,
  CreateVersionData,
  AdminUserListParams,
  CreateAdminUserData,
  UpdateAdminUserData,
  ChangePasswordData,
  SystemSettingsData,
  OperationLogParams,
  ModuleListParams,
  ModuleData,
  ModuleConfigData,
  ApiConfigListParams,
  ApiConfigData,
  ApiCallLogParams,
  NotificationTemplateListParams,
  NotificationTemplateData,
  TestNotificationTemplateData,
  AdminRoleListParams,
  AdminRoleData
} from '@/types'

export const adminApi = {
  // 认证
  getCaptcha: () =>
    request.get('/auth/captcha'),
  login: (username: string, password: string, captchaId?: string, captchaCode?: string) =>
    request.post('/auth/login', { username, password, captchaId, captchaCode }),
  getProfile: () =>
    request.get('/auth/profile'),
  changePassword: (oldPassword: string, newPassword: string) =>
    request.put('/auth/password', { oldPassword, newPassword }),

  // 仪表盘
  getDashboardStats: () =>
    request.get('/dashboard/stats'),
  getDashboardTrend: (days?: number, period?: string) =>
    request.get('/dashboard/trend', { params: { days: days || 30, period } }),
  getDashboardActivities: (limit?: number) =>
    request.get('/dashboard/activities', { params: { limit: limit || 10 } }),
  getDashboardActivitiesPaginated: (params: { page: number; pageSize: number }) =>
    request.get('/dashboard/activities', { params }),
  getLicenseTypeStats: (period?: string) =>
    request.get('/dashboard/stats/license-types', { params: { period: period || 'all' } }),
  getRecentLicenses: () =>
    request.get('/dashboard/recent-licenses'),
  getExpiringLicenses: () =>
    request.get('/dashboard/expiring-licenses'),
  getRecentLogs: () =>
    request.get('/dashboard/recent-logs'),

  // 授权管理（私有客户）
  getLicenseStats: () =>
    request.get('/licenses/stats'),
  getLicenses: (params: LicenseListParams) =>
    request.get('/licenses', { params }),
  getLicenseDetail: (id: string) =>
    request.get(`/licenses/${id}`),
  generateLicense: (data: GenerateLicenseData) =>
    request.post('/licenses', data),
  createLicense: (data: GenerateLicenseData) =>
    request.post('/licenses', data),
  updateLicense: (id: string, data: UpdateLicenseData) =>
    request.put(`/licenses/${id}`, data),
  deleteLicense: (id: string) =>
    request.delete(`/licenses/${id}`),
  revokeLicense: (id: string) =>
    request.post(`/licenses/${id}/revoke`),
  renewLicense: (id: string, expiresAt: string) =>
    request.post(`/licenses/${id}/renew`, { expiresAt }),
  unlockPrivateCustomerAdmin: (id: string) =>
    request.post(`/private-customers/${id}/unlock-admin`),
  resetPrivateCustomerPassword: (id: string) =>
    request.post(`/private-customers/${id}/reset-admin-password`),
  getLicenseLogs: (id: string, params: LogListParams) =>
    request.get(`/licenses/${id}/logs`, { params }),
  clearLicenseLogs: (id: string) =>
    request.delete(`/licenses/${id}/logs`),
  getLicenseBills: (id: string, params: BillListParams) =>
    request.get(`/licenses/${id}/bills`, { params }),

  // 租户管理（租户客户）
  getTenants: (params: TenantListParams) =>
    request.get('/tenants', { params }),
  getTenant: (id: string) =>
    request.get(`/tenants/${id}`),
  createTenant: (data: CreateTenantData) =>
    request.post('/tenants', data),
  updateTenant: (id: string, data: UpdateTenantData) =>
    request.put(`/tenants/${id}`, data),
  deleteTenant: (id: string) =>
    request.delete(`/tenants/${id}`),
  regenerateTenantLicense: (id: string) =>
    request.post(`/tenants/${id}/regenerate-license`),
  suspendTenant: (id: string, reason?: string) =>
    request.post(`/tenants/${id}/suspend`, { reason }),
  resumeTenant: (id: string) =>
    request.post(`/tenants/${id}/resume`),
  renewTenant: (id: string, expireDate: string) =>
    request.post(`/tenants/${id}/renew`, { expireDate }),
  unlockTenantAdmin: (id: string) =>
    request.post(`/tenants/${id}/unlock-admin`),
  resetTenantCustomerPassword: (id: string) =>
    request.post(`/tenants/${id}/reset-admin-password`),
  getTenantLogs: (id: string, params: LogListParams) =>
    request.get(`/tenants/${id}/logs`, { params }),
  clearTenantLogs: (id: string) =>
    request.delete(`/tenants/${id}/logs`),
  getTenantBills: (id: string, params: BillListParams) =>
    request.get(`/tenants/${id}/bills`, { params }),

  // 扩容记录
  getCapacityOrdersByTenant: (tenantId: string, params?: { page?: number; pageSize?: number }) =>
    request.get('/capacity/orders', { params: { tenantId, ...params } }),
  getCapacityOrdersByLicense: (licenseId: string, params?: { page?: number; pageSize?: number }) =>
    request.get('/capacity/orders', { params: { licenseId, ...params } }),

  // 套餐管理
  getPackages: (params?: PackageListParams) =>
    request.get('/packages', { params }),
  getPackage: (id: string) =>
    request.get(`/packages/${id}`),
  createPackage: (data: PackageData) =>
    request.post('/packages', data),
  updatePackage: (id: string, data: Partial<PackageData>) =>
    request.put(`/packages/${id}`, data),
  deletePackage: (id: string) =>
    request.delete(`/packages/${id}`),

  // 版本管理
  getVersions: (params: VersionListParams) =>
    request.get('/versions', { params }),
  getVersion: (id: string) =>
    request.get(`/versions/${id}`),
  createVersion: (data: CreateVersionData) =>
    request.post('/versions', data),
  updateVersion: (id: string, data: Partial<CreateVersionData>) =>
    request.put(`/versions/${id}`, data),
  deleteVersion: (id: string) =>
    request.delete(`/versions/${id}`),
  publishVersion: (id: string) =>
    request.post(`/versions/${id}/publish`),
  deprecateVersion: (id: string) =>
    request.post(`/versions/${id}/deprecate`),

  // 管理员用户管理
  getAdminUsers: (params?: AdminUserListParams) =>
    request.get('/admin-users', { params }),
  getAdminUser: (id: string) =>
    request.get(`/admin-users/${id}`),
  createAdminUser: (data: CreateAdminUserData) =>
    request.post('/admin-users', data),
  updateAdminUser: (id: string, data: UpdateAdminUserData) =>
    request.put(`/admin-users/${id}`, data),
  deleteAdminUser: (id: string) =>
    request.delete(`/admin-users/${id}`),
  changeAdminPassword: (id: string, data: ChangePasswordData) =>
    request.put(`/admin-users/${id}/password`, data),
  resetAdminPassword: (id: string, data: ChangePasswordData) =>
    request.post(`/admin-users/${id}/reset-password`, data),
  lockAdminUser: (id: string) =>
    request.post(`/admin-users/${id}/lock`),
  unlockAdminUser: (id: string) =>
    request.post(`/admin-users/${id}/unlock`),

  // 系统设置
  getSystemSettings: () =>
    request.get('/system-settings'),
  updateSystemSettings: (data: SystemSettingsData) =>
    request.put('/system-settings', data),
  getOperationLogs: (params: OperationLogParams) =>
    request.get('/system-settings/logs', { params }),

  // 模块管理
  getModules: (params?: ModuleListParams) =>
    request.get('/modules', { params }),
  getModule: (id: string) =>
    request.get(`/modules/${id}`),
  createModule: (data: ModuleData) =>
    request.post('/modules', data),
  updateModule: (id: string, data: Partial<ModuleData>) =>
    request.put(`/modules/${id}`, data),
  deleteModule: (id: string) =>
    request.delete(`/modules/${id}`),
  enableModule: (id: string) =>
    request.post(`/modules/${id}/enable`),
  disableModule: (id: string) =>
    request.post(`/modules/${id}/disable`),
  getModuleConfig: (id: string) =>
    request.get(`/modules/${id}/config`),
  updateModuleConfig: (id: string, data: ModuleConfigData) =>
    request.put(`/modules/${id}/config`, data),

  // 接口管理
  getApiConfigs: (params?: ApiConfigListParams) =>
    request.get('/api-configs', { params }),
  getApiConfig: (id: string) =>
    request.get(`/api-configs/${id}`),
  createApiConfig: (data: ApiConfigData) =>
    request.post('/api-configs', data),
  updateApiConfig: (id: string, data: Partial<ApiConfigData>) =>
    request.put(`/api-configs/${id}`, data),
  deleteApiConfig: (id: string) =>
    request.delete(`/api-configs/${id}`),
  regenerateApiKey: (id: string) =>
    request.post(`/api-configs/${id}/regenerate-key`),
  getApiCallLogs: (params: ApiCallLogParams) =>
    request.get('/api-configs/logs', { params }),
  getApiConfigLogs: (id: string, params: ApiCallLogParams) =>
    request.get(`/api-configs/${id}/logs`, { params }),
  getApiStatistics: (id: string) =>
    request.get(`/api-configs/${id}/statistics`),
  getApiGlobalStatistics: () =>
    request.get('/api-configs/statistics'),
  getApiTrends: () =>
    request.get('/api-configs/trends'),

  // 通知模板管理
  getNotificationTemplates: (params?: NotificationTemplateListParams) =>
    request.get('/notification-templates', { params }),
  getNotificationTemplate: (id: string) =>
    request.get(`/notification-templates/${id}`),
  createNotificationTemplate: (data: NotificationTemplateData) =>
    request.post('/notification-templates', data),
  updateNotificationTemplate: (id: string, data: Partial<NotificationTemplateData>) =>
    request.put(`/notification-templates/${id}`, data),
  deleteNotificationTemplate: (id: string) =>
    request.delete(`/notification-templates/${id}`),
  testNotificationTemplate: (id: string, data: TestNotificationTemplateData) =>
    request.post(`/notification-templates/${id}/test`, data),

  // 回收站
  getRecycleBinList: (params: { page?: number; pageSize?: number; type?: string; keyword?: string }) =>
    request.get('/recycle-bin', { params }),
  restoreRecycleBinItem: (id: string, type: 'license' | 'tenant') =>
    request.post(`/recycle-bin/${id}/restore`, { type }),
  permanentDeleteRecycleBinItem: (id: string, type: 'license' | 'tenant') =>
    request.delete(`/recycle-bin/${id}/permanent`, { params: { type } }),
  emptyRecycleBin: () =>
    request.post('/recycle-bin/empty'),

  // 文件上传
  uploadFile: (formData: FormData) =>
    request.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // 版本更新任务
  checkForUpdate: () =>
    request.get('/update-tasks/check'),
  getVersionHistory: (params?: { page?: number; pageSize?: number }) =>
    request.get('/update-tasks/version-history', { params }),
  getUpdateTasks: (params?: { page?: number; pageSize?: number; status?: string }) =>
    request.get('/update-tasks', { params }),
  getUpdateTask: (id: string) =>
    request.get(`/update-tasks/${id}`),
  startUpdate: (versionId: string) =>
    request.post('/update-tasks/start', { versionId }),
  rollbackUpdate: (id: string) =>
    request.post(`/update-tasks/${id}/rollback`),

  // 版本包上传
  uploadVersionPackage: (formData: FormData) =>
    request.post('/upload/version-package', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // 移动应用配置
  getMobileAppPackages: () =>
    request.get('/mobile-app-config'),
  getMobileAppStats: () =>
    request.get('/mobile-app-config/stats'),
  createMobileAppConfig: (data: { platform: string; app_name?: string; version?: string; external_url?: string; description?: string; is_enabled?: boolean }) =>
    request.post('/mobile-app-config', data),
  uploadMobileAppPackage: (formData: FormData) =>
    request.post('/mobile-app-config/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateMobileAppConfig: (id: number, data: { app_name?: string; version?: string; external_url?: string; description?: string; is_enabled?: boolean }) =>
    request.put(`/mobile-app-config/${id}`, data),
  deleteMobileAppConfig: (id: number) =>
    request.delete(`/mobile-app-config/${id}`),

  // 客户管理（统一）
  getCustomerManagementStats: () =>
    request.get('/customer-management/stats'),
  // 所有客户列表
  getAllCustomers: (params: { page?: number; pageSize?: number; keyword?: string; customerType?: string; status?: string }) =>
    request.get('/customer-management/all-customers', { params }),
  // 续费提醒列表
  getRenewalReminders: (params: { page?: number; pageSize?: number; level?: string; customerType?: string }) =>
    request.get('/customer-management/renewal-reminders', { params }),
  // 添加跟进记录
  addFollowUp: (data: { customerId: string; customerType: string; content: string }) =>
    request.post('/customer-management/follow-up', data),
  // 获取跟进记录
  getFollowUps: (customerId: string, params: { customerType?: string; page?: number; pageSize?: number }) =>
    request.get(`/customer-management/follow-ups/${customerId}`, { params }),

  // ============ 角色管理 ============
  // 获取权限树
  getPermissionTree: () =>
    request.get('/roles/permission-tree'),
  // 获取角色列表
  getRoles: (params?: AdminRoleListParams) =>
    request.get('/roles', { params }),
  // 获取单个角色
  getRole: (id: string) =>
    request.get(`/roles/${id}`),
  // 创建角色
  createRole: (data: AdminRoleData) =>
    request.post('/roles', data),
  // 更新角色
  updateRole: (id: string, data: Partial<AdminRoleData>) =>
    request.put(`/roles/${id}`, data),
  // 删除角色
  deleteRole: (id: string) =>
    request.delete(`/roles/${id}`),
}
