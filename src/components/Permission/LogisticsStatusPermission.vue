<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else class="no-permission">
    <el-result
      icon="warning"
      title="权限不足"
      sub-title="您没有访问物流状态更新功能的权限，请联系管理员"
    >
      <template #extra>
        <el-button @click="$router.go(-1)">返回上一页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useLogisticsStatusStore } from '@/stores/logisticsStatus'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const logisticsStatusStore = useLogisticsStatusStore()

// 检查用户是否有访问权限
const hasAccess = computed(() => {
  console.log('[物流状态权限] 开始检查权限...')
  console.log('[物流状态权限] 当前用户:', userStore.currentUser)
  console.log('[物流状态权限] 用户角色:', userStore.currentUser?.role)
  console.log('[物流状态权限] 用户权限列表:', userStore.permissions)

  // 超级管理员有完全访问权限
  if (userStore.isSuperAdmin) {
    console.log('[物流状态权限] ✅ 超级管理员权限通过')
    return true
  }

  // 检查用户是否在白名单中或有特殊权限
  if (userStore.isWhitelistMember) {
    console.log('[物流状态权限] ✅ 白名单成员权限通过')
    return true
  }

  // 检查用户是否有物流状态更新权限标识
  if (userStore.permissions.includes('logistics:status') ||
      userStore.permissions.includes('logistics:status:update')) {
    console.log('[物流状态权限] ✅ 物流状态权限标识通过')
    return true
  }

  // 客服角色有权限访问（支持多种角色标识）
  const role = userStore.currentUser?.role
  if (role === 'customer_service' || role === '客服' || role === '客服人员') {
    console.log('[物流状态权限] ✅ 客服角色权限通过')
    return true
  }

  // 检查用户角色是否为管理员或部门负责人
  if (role === 'admin' || role === 'super_admin' || role === '管理员' || role === '超级管理员' ||
      role === 'manager' || role === 'department_manager' || role === '部门经理' ||
      role === 'department_head' || role === '部门负责人') {
    console.log('[物流状态权限] ✅ 管理员/经理角色权限通过')
    return true
  }

  // 检查用户是否在指定的物流管理部门
  if (userStore.currentUser?.department === 'logistics' &&
      userStore.currentUser?.position === 'supervisor') {
    console.log('[物流状态权限] ✅ 物流部门主管权限通过')
    return true
  }

  console.log('[物流状态权限] ❌ 权限检查未通过')
  return false
})

// 组件挂载时获取用户权限
onMounted(async () => {
  try {
    await logisticsStatusStore.fetchUserPermission()

    if (!hasAccess.value) {
      ElMessage.warning('您没有访问此功能的权限')
    }
  } catch (error) {
    console.error('获取用户权限失败:', error)
    ElMessage.error('权限验证失败，请重新登录')
  }
})
</script>

<style scoped>
.no-permission {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
</style>
