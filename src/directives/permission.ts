import type { Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

interface PermissionBinding {
  permission?: string | string[]
  role?: string | string[]
  mode?: 'any' | 'all'
  invert?: boolean
}

/**
 * 权限指令
 * 用法：
 * v-permission="'user:create'"
 * v-permission="['user:create', 'user:edit']"
 * v-permission="{ permission: 'user:create', mode: 'all' }"
 * v-permission="{ role: 'admin' }"
 * v-permission="{ role: ['admin', 'manager'], mode: 'any' }"
 */
export const permission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  }
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding) {
  const userStore = useUserStore()
  let hasPermission = true

  // 解析绑定值
  let config: PermissionBinding = {}
  
  if (typeof binding.value === 'string') {
    config.permission = binding.value
  } else if (Array.isArray(binding.value)) {
    config.permission = binding.value
  } else if (typeof binding.value === 'object') {
    config = { ...binding.value }
  }

  const { permission, role, mode = 'any', invert = false } = config

  // 检查角色权限
  if (role) {
    const roles = Array.isArray(role) ? role : [role]
    const userRoles = userStore.roles || []
    
    if (mode === 'all') {
      hasPermission = roles.every(r => userRoles.includes(r))
    } else {
      hasPermission = roles.some(r => userRoles.includes(r))
    }
  }

  // 检查具体权限
  if (permission && hasPermission) {
    const permissions = Array.isArray(permission) ? permission : [permission]
    
    if (mode === 'all') {
      hasPermission = permissions.every(p => userStore.hasPermission(p))
    } else {
      hasPermission = permissions.some(p => userStore.hasPermission(p))
    }
  }

  // 如果是管理员，默认拥有所有权限
  if (userStore.isAdmin) {
    hasPermission = true
  }

  // 反转权限检查
  if (invert) {
    hasPermission = !hasPermission
  }

  // 控制元素显示/隐藏
  if (hasPermission) {
    el.style.display = ''
    el.style.visibility = 'visible'
  } else {
    el.style.display = 'none'
    el.style.visibility = 'hidden'
  }
}

export default permission