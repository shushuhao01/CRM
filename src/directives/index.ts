import type { App } from 'vue'
import permission from './permission'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/utils/permission'

/**
 * 注册全局指令和全局属性
 */
export function setupDirectives(app: App) {
  // 注册权限指令（richer version，支持 role / invert / mode）
  app.directive('permission', permission)

  // 注册全局权限检查方法（供模板中使用 $hasPermission）
  app.config.globalProperties.$hasPermission = hasPermission
  app.config.globalProperties.$hasAnyPermission = hasAnyPermission
  app.config.globalProperties.$hasAllPermissions = hasAllPermissions
}

export default setupDirectives
