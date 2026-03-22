import request from './request'

export const adminApi = {
  // 认证
  login: (username: string, password: string) =>
    request.post('/auth/login', { username, password }),
  getProfile: () =>
    request.get('/auth/profile'),
  changePassword: (oldPassword: string, newPassword: string) =>
    request.put('/auth/password', { oldPassword, newPassword }),

  // 仪表盘
  getDashboardStats: () =>
    request.get('/dashboard/stats'),
  getDashboardTrend: (days?: number) =>
    request.get('/dashboard/trend', { params: { days: days || 30 } }),
  getDashboardActivities: (limit?: number) =>
    request.get('/dashboard/activities', { params: { limit: limit || 10 } }),
  getRecentLicenses: () =>
    request.get('/dashboard/recent-licenses'),
  getExpiringLicenses: () =>
    request.get('/dashboard/expiring-licenses'),
  getRecentLogs: () =>
    request.get('/dashboard/recent-logs'),

  // 授权管理（私有客户）
  getLicenseStats: () =>
    request.get('/licenses/stats'),
  getLicenses: (params: any) =>
    request.get('/licenses', { params }),
  getLicenseDetail: (id: string) =>
    request.get(`/licenses/${id}`),
  generateLicense: (data: any) =>
    request.post('/licenses', data),
  createLicense: (data: any) =>
    request.post('/licenses', data),
  updateLicense: (id: string, data: any) =>
    request.put(`/licenses/${id}`, data),
  deleteLicense: (id: string) =>
    request.delete(`/licenses/${id}`),
  revokeLicense: (id: string) =>
    request.post(`/licenses/${id}/revoke`),
  renewLicense: (id: string, expiresAt: string) =>
    request.post(`/licenses/${id}/renew`, { expiresAt }),
  unlockPrivateCustomerAdmin: (id: string) =>
    request.post(`/private-customers/${id}/unlock-admin`),
  getLicenseLogs: (id: string, params: any) =>
    request.get(`/licenses/${id}/logs`, { params }),
  getLicenseBills: (id: string, params: any) =>
    request.get(`/licenses/${id}/bills`, { params }),

  // 租户管理（租户客户）
  getTenants: (params: any) =>
    request.get('/tenants', { params }),
  getTenant: (id: string) =>
    request.get(`/tenants/${id}`),
  createTenant: (data: any) =>
    request.post('/tenants', data),
  updateTenant: (id: string, data: any) =>
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
  getTenantLogs: (id: string, params: any) =>
    request.get(`/tenants/${id}/logs`, { params }),
  getTenantBills: (id: string, params: any) =>
    request.get(`/tenants/${id}/bills`, { params }),

  // 套餐管理
  getPackages: (params?: any) =>
    request.get('/packages', { params }),
  getPackage: (id: string) =>
    request.get(`/packages/${id}`),
  createPackage: (data: any) =>
    request.post('/packages', data),
  updatePackage: (id: string, data: any) =>
    request.put(`/packages/${id}`, data),
  deletePackage: (id: string) =>
    request.delete(`/packages/${id}`),

  // 版本管理
  getVersions: (params: any) =>
    request.get('/versions', { params }),
  getVersion: (id: string) =>
    request.get(`/versions/${id}`),
  createVersion: (data: any) =>
    request.post('/versions', data),
  updateVersion: (id: string, data: any) =>
    request.put(`/versions/${id}`, data),
  deleteVersion: (id: string) =>
    request.delete(`/versions/${id}`),
  publishVersion: (id: string) =>
    request.post(`/versions/${id}/publish`),
  deprecateVersion: (id: string) =>
    request.post(`/versions/${id}/deprecate`),

  // 管理员用户管理
  getAdminUsers: (params?: any) =>
    request.get('/admin-users', { params }),
  getAdminUser: (id: string) =>
    request.get(`/admin-users/${id}`),
  createAdminUser: (data: any) =>
    request.post('/admin-users', data),
  updateAdminUser: (id: string, data: any) =>
    request.put(`/admin-users/${id}`, data),
  deleteAdminUser: (id: string) =>
    request.delete(`/admin-users/${id}`),
  changeAdminPassword: (id: string, data: any) =>
    request.put(`/admin-users/${id}/password`, data),
  resetAdminPassword: (id: string, data: any) =>
    request.post(`/admin-users/${id}/reset-password`, data),
  lockAdminUser: (id: string) =>
    request.post(`/admin-users/${id}/lock`),
  unlockAdminUser: (id: string) =>
    request.post(`/admin-users/${id}/unlock`),

  // 系统设置
  getSystemSettings: () =>
    request.get('/system-settings'),
  updateSystemSettings: (data: any) =>
    request.put('/system-settings', data),
  getOperationLogs: (params: any) =>
    request.get('/system-settings/logs', { params }),

  // 模块管理
  getModules: (params?: any) =>
    request.get('/modules', { params }),
  getModule: (id: string) =>
    request.get(`/modules/${id}`),
  createModule: (data: any) =>
    request.post('/modules', data),
  updateModule: (id: string, data: any) =>
    request.put(`/modules/${id}`, data),
  deleteModule: (id: string) =>
    request.delete(`/modules/${id}`),
  enableModule: (id: string) =>
    request.post(`/modules/${id}/enable`),
  disableModule: (id: string) =>
    request.post(`/modules/${id}/disable`),
  getModuleConfig: (id: string) =>
    request.get(`/modules/${id}/config`),
  updateModuleConfig: (id: string, data: any) =>
    request.put(`/modules/${id}/config`, data),

  // 接口管理
  getApiConfigs: (params?: any) =>
    request.get('/api-configs', { params }),
  getApiConfig: (id: string) =>
    request.get(`/api-configs/${id}`),
  createApiConfig: (data: any) =>
    request.post('/api-configs', data),
  updateApiConfig: (id: string, data: any) =>
    request.put(`/api-configs/${id}`, data),
  deleteApiConfig: (id: string) =>
    request.delete(`/api-configs/${id}`),
  regenerateApiKey: (id: string) =>
    request.post(`/api-configs/${id}/regenerate-key`),
  getApiCallLogs: (params: any) =>
    request.get('/api-configs/logs', { params }),
  getApiConfigLogs: (id: string, params: any) =>
    request.get(`/api-configs/${id}/logs`, { params }),
  getApiStatistics: (id: string) =>
    request.get(`/api-configs/${id}/statistics`),
  getApiGlobalStatistics: () =>
    request.get('/api-configs/statistics'),
  getApiTrends: () =>
    request.get('/api-configs/trends'),

  // 通知模板管理
  getNotificationTemplates: (params?: any) =>
    request.get('/notification-templates', { params }),
  getNotificationTemplate: (id: string) =>
    request.get(`/notification-templates/${id}`),
  createNotificationTemplate: (data: any) =>
    request.post('/notification-templates', data),
  updateNotificationTemplate: (id: string, data: any) =>
    request.put(`/notification-templates/${id}`, data),
  deleteNotificationTemplate: (id: string) =>
    request.delete(`/notification-templates/${id}`),
  testNotificationTemplate: (id: string, data: any) =>
    request.post(`/notification-templates/${id}/test`, data),

  // 文件上传
  uploadFile: (formData: FormData) =>
    request.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
}
