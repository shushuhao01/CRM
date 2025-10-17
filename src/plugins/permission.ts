// Vue权限插件
import type { App } from 'vue'
import { hasPermission, hasAnyPermission, hasAllPermissions, permissionDirective } from '@/utils/permission'

export default {
  install(app: App) {
    // 注册权限指令
    app.directive('permission', {
      mounted(el: HTMLElement, binding) {
        permissionDirective(el, binding)
      },
      updated(el: HTMLElement, binding) {
        permissionDirective(el, binding)
      }
    })

    // 注册全局属性
    app.config.globalProperties.$hasPermission = hasPermission
    app.config.globalProperties.$hasAnyPermission = hasAnyPermission
    app.config.globalProperties.$hasAllPermissions = hasAllPermissions
  }
}

// 声明全局属性类型
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $hasPermission: typeof hasPermission
    $hasAnyPermission: typeof hasAnyPermission
    $hasAllPermissions: typeof hasAllPermissions
  }
}