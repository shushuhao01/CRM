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
  // 超级管理员有完全访问权限
  if (userStore.isSuperAdmin) {
    return true
  }

  // 检查用户是否在白名单中或有特殊权限
  if (userStore.isWhitelistMember) {
    return true
  }

  // 检查用户是否有物流状态更新权限
  if (userStore.permissions.includes('logistics:status')) {
    return true
  }

  // 客服角色有权限访问
  if (userStore.currentUser?.role === 'customer_service') {
    return true
  }

  // 检查用户角色是否为管理员或部门负责人
  if (userStore.currentUser?.role === 'manager' ||
      userStore.currentUser?.role === 'department_head') {
    return true
  }

  // 检查用户是否在指定的物流管理部门
  if (userStore.currentUser?.department === 'logistics' &&
      userStore.currentUser?.position === 'supervisor') {
    return true
  }

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
