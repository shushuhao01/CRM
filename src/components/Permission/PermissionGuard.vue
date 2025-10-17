<template>
  <div v-if="hasPermission" :class="wrapperClass">
    <slot />
  </div>
  <div v-else-if="showFallback" :class="fallbackClass">
    <slot name="fallback">
      <div class="permission-denied">
        <el-icon><Lock /></el-icon>
        <span>{{ fallbackMessage }}</span>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

interface Props {
  // 需要的权限（可以是字符串或字符串数组）
  permission?: string | string[]
  // 需要的角色（可以是字符串或字符串数组）
  role?: string | string[]
  // 权限检查模式：'any' 表示满足任一权限即可，'all' 表示需要满足所有权限
  mode?: 'any' | 'all'
  // 是否显示无权限时的提示
  showFallback?: boolean
  // 无权限时的提示信息
  fallbackMessage?: string
  // 包装器样式类
  wrapperClass?: string
  // 无权限提示的样式类
  fallbackClass?: string
  // 是否反转权限检查（当没有权限时显示内容）
  invert?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'any',
  showFallback: false,
  fallbackMessage: '您没有权限访问此内容',
  wrapperClass: '',
  fallbackClass: 'permission-fallback',
  invert: false
})

const userStore = useUserStore()

// 检查权限
const hasPermission = computed(() => {
  let result = true

  // 检查角色权限
  if (props.role) {
    const roles = Array.isArray(props.role) ? props.role : [props.role]
    const userRoles = userStore.roles || []
    
    if (props.mode === 'all') {
      result = roles.every(role => userRoles.includes(role))
    } else {
      result = roles.some(role => userRoles.includes(role))
    }
  }

  // 检查具体权限
  if (props.permission && result) {
    const permissions = Array.isArray(props.permission) ? props.permission : [props.permission]
    
    if (props.mode === 'all') {
      result = permissions.every(permission => userStore.hasPermission(permission))
    } else {
      result = permissions.some(permission => userStore.hasPermission(permission))
    }
  }

  // 如果是管理员，默认拥有所有权限
  if (userStore.isAdmin) {
    result = true
  }

  // 反转权限检查
  return props.invert ? !result : result
})
</script>

<style scoped>
.permission-denied {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #909399;
  font-size: 14px;
}

.permission-denied .el-icon {
  font-size: 16px;
}

.permission-fallback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60px;
}
</style>