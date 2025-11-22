<template>
  <div class="app-container">
    <h1>CRM 系统 - 逐步测试版本</h1>
    <div class="status-info">
      <p>当前时间: {{ currentTime }}</p>
      <p>Vue版本: {{ vueVersion }}</p>
      <p>用户状态: {{ userStore.isLoggedIn ? '已登录' : '未登录' }}</p>
      <p>应用状态: {{ appStore.globalLoading ? '加载中' : '正常' }}</p>
    </div>
    
    <div class="test-buttons">
      <el-button type="primary" @click="testStores">测试Stores</el-button>
      <el-button type="success" @click="testUserStore">测试用户Store</el-button>
      <el-button type="warning" @click="testAppStore">测试应用Store</el-button>
    </div>
    
    <div class="logs" v-if="logs.length > 0">
      <h3>日志记录:</h3>
      <div v-for="(log, index) in logs" :key="index" class="log-item">
        {{ log }}
      </div>
    </div>
    
    <!-- 路由视图 -->
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const currentTime = ref('')
const vueVersion = ref('')
const logs = ref([])

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

const addLog = (message) => {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
}

const testStores = () => {
  try {
    addLog('测试Stores - 开始')
    addLog(`用户Store状态: ${userStore ? '正常' : '异常'}`)
    addLog(`应用Store状态: ${appStore ? '正常' : '异常'}`)
    addLog('测试Stores - 成功')
  } catch (error) {
    addLog(`测试Stores - 失败: ${error.message}`)
  }
}

const testUserStore = () => {
  try {
    addLog('测试用户Store - 开始')
    addLog(`登录状态: ${userStore.isLoggedIn}`)
    addLog(`当前用户: ${userStore.currentUser ? userStore.currentUser.name : '无'}`)
    addLog('测试用户Store - 成功')
  } catch (error) {
    addLog(`测试用户Store - 失败: ${error.message}`)
  }
}

const testAppStore = () => {
  try {
    addLog('测试应用Store - 开始')
    addLog(`全局加载状态: ${appStore.globalLoading}`)
    addLog(`加载文本: ${appStore.globalLoadingText || '无'}`)
    addLog('测试应用Store - 成功')
  } catch (error) {
    addLog(`测试应用Store - 失败: ${error.message}`)
  }
}

onMounted(() => {
  vueVersion.value = '3.x'
  updateTime()
  setInterval(updateTime, 1000)
  addLog('应用已启动')
  
  // 自动测试stores
  setTimeout(() => {
    testStores()
  }, 1000)
})
</script>

<style scoped>
.app-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.status-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
}

.test-buttons {
  margin: 20px 0;
}

.test-buttons .el-button {
  margin-right: 10px;
}

.logs {
  margin-top: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 5px;
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  padding: 2px 0;
  font-family: monospace;
  font-size: 12px;
}
</style>