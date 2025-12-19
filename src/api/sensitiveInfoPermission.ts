import request from '@/utils/request'

export interface SensitiveInfoPermissionMatrix {
  [infoType: string]: {
    [roleCode: string]: boolean
  }
}

/**
 * 获取敏感信息权限配置
 */
export const getSensitiveInfoPermissions = () => {
  return request.get<{ success: boolean; data: SensitiveInfoPermissionMatrix }>('/sensitive-info-permissions')
}

/**
 * 保存敏感信息权限配置
 */
export const saveSensitiveInfoPermissions = (permissions: SensitiveInfoPermissionMatrix) => {
  return request.put<{ success: boolean; message: string }>('/sensitive-info-permissions', { permissions })
}

/**
 * 检查特定角色对特定敏感信息的权限
 */
export const checkSensitiveInfoPermission = (infoType: string, roleCode: string) => {
  return request.get<{ success: boolean; data: { infoType: string; roleCode: string; hasPermission: boolean } }>(
    `/sensitive-info-permissions/check/${infoType}/${roleCode}`
  )
}
