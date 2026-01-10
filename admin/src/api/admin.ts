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
  getRecentLicenses: () =>
    request.get('/dashboard/recent-licenses'),
  getExpiringLicenses: () =>
    request.get('/dashboard/expiring-licenses'),
  getRecentLogs: () =>
    request.get('/dashboard/recent-logs'),

  // 授权管理（私有客户）
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
  getAdminUsers: () =>
    request.get('/auth/users'),
  createAdminUser: (data: any) =>
    request.post('/auth/users', data),
  updateAdminUser: (id: string, data: any) =>
    request.put(`/auth/users/${id}`, data)
}
