/**
 * v-permission 指令
 * 用于按钮级权限控制，无权限时隐藏元素
 *
 * 用法:
 *   v-permission="'settings:admins:create'"          // 单个权限
 *   v-permission="['settings:admins:create', 'settings:admins:edit']"  // 任一权限满足即可
 */
import type { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  }
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding) {
  const { value } = binding
  if (!value) return

  const userStore = useUserStore()

  let hasPermission = false

  if (typeof value === 'string') {
    hasPermission = userStore.hasPermission(value)
  } else if (Array.isArray(value)) {
    hasPermission = userStore.hasAnyPermission(value)
  }

  if (!hasPermission) {
    // 隐藏元素而不是移除，避免布局跳动
    el.style.display = 'none'
  } else {
    el.style.display = ''
  }
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}

export default permissionDirective

