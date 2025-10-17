<template>
  <div class="debug-container">
    <h2>用户权限调试信息</h2>
    
    <el-card class="debug-card">
      <template #header>
        <span>当前用户信息</span>
      </template>
      
      <div class="debug-info">
        <div class="info-item">
          <strong>用户ID:</strong> {{ userStore.currentUser?.id || 'null' }}
        </div>
        <div class="info-item">
          <strong>用户名:</strong> {{ userStore.currentUser?.name || 'null' }}
        </div>
        <div class="info-item">
          <strong>角色 (role):</strong> {{ userStore.currentUser?.role || 'null' }}
        </div>
        <div class="info-item">
          <strong>用户角色 (userRole):</strong> {{ userStore.currentUser?.userRole || 'null' }}
        </div>
        <div class="info-item">
          <strong>权限级别:</strong> {{ userStore.currentUser?.permissionLevel || 'null' }}
        </div>
        <div class="info-item">
          <strong>数据范围:</strong> {{ userStore.currentUser?.dataScope || 'null' }}
        </div>
      </div>
    </el-card>

    <el-card class="debug-card">
      <template #header>
        <span>权限检查结果</span>
      </template>
      
      <div class="debug-info">
        <div class="info-item">
          <strong>isLoggedIn:</strong> 
          <el-tag :type="userStore.isLoggedIn ? 'success' : 'danger'">
            {{ userStore.isLoggedIn }}
          </el-tag>
        </div>
        <div class="info-item">
          <strong>isAdmin:</strong> 
          <el-tag :type="userStore.isAdmin ? 'success' : 'danger'">
            {{ userStore.isAdmin }}
          </el-tag>
        </div>
        <div class="info-item">
          <strong>isSuperAdmin:</strong> 
          <el-tag :type="userStore.isSuperAdmin ? 'success' : 'danger'">
            {{ userStore.isSuperAdmin }}
          </el-tag>
        </div>
        <div class="info-item">
          <strong>isManager:</strong> 
          <el-tag :type="userStore.isManager ? 'success' : 'danger'">
            {{ userStore.isManager }}
          </el-tag>
        </div>
        <div class="info-item">
          <strong>token:</strong> {{ userStore.token || 'null' }}
        </div>
      </div>
    </el-card>

    <el-card class="debug-card">
      <template #header>
        <span>权限常量检查</span>
      </template>
      
      <div class="debug-info">
        <div class="info-item">
          <strong>UserRole.SUPER_ADMIN:</strong> {{ UserRole.SUPER_ADMIN }}
        </div>
        <div class="info-item">
          <strong>当前用户userRole === UserRole.SUPER_ADMIN:</strong> 
          <el-tag :type="(userStore.currentUser?.userRole === UserRole.SUPER_ADMIN) ? 'success' : 'danger'">
            {{ userStore.currentUser?.userRole === UserRole.SUPER_ADMIN }}
          </el-tag>
        </div>
        <div class="info-item">
          <strong>当前用户role === 'admin':</strong> 
          <el-tag :type="(userStore.currentUser?.role === 'admin') ? 'success' : 'danger'">
            {{ userStore.currentUser?.role === 'admin' }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <el-card class="debug-card">
      <template #header>
        <span>操作测试</span>
      </template>
      
      <div class="debug-actions">
        <el-button @click="refreshUserInfo">刷新用户信息</el-button>
        <el-button @click="testSuperAdminAccess">测试超级管理员访问</el-button>
        <el-button @click="navigateToSuperAdminPanel">导航到超级管理员面板</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { UserRole } from '@/services/permission'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const router = useRouter()

const refreshUserInfo = () => {
  console.log('当前用户信息:', userStore.currentUser)
  console.log('isSuperAdmin:', userStore.isSuperAdmin)
  ElMessage.success('用户信息已刷新，请查看控制台')
}

const testSuperAdminAccess = () => {
  if (userStore.isSuperAdmin) {
    ElMessage.success('超级管理员权限验证通过')
  } else {
    ElMessage.error('超级管理员权限验证失败')
  }
}

const navigateToSuperAdminPanel = () => {
  router.push('/system/super-admin-panel').catch(err => {
    console.error('导航失败:', err)
    ElMessage.error('导航失败: ' + err.message)
  })
}
</script>

<style scoped>
.debug-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.debug-card {
  margin-bottom: 20px;
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
}

.debug-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>