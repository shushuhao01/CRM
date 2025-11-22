<template>
  <div id="app" class="app-container">
    <h1>CRM 系统 - 最小测试版本</h1>
    <div class="status-info">
      <p>当前时间: {{ currentTime }}</p>
      <p>Vue版本: {{ vueVersion }}</p>
      <p>应用状态: 正常运行</p>
    </div>
    
    <div class="test-buttons">
      <el-button type="primary" @click="testBasicFunction">测试基础功能</el-button>
      <el-button type="success" @click="testLocalStorage">测试LocalStorage</el-button>
      <el-button type="warning" @click="testRouter">测试路由</el-button>
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

const router = useRouter()
const currentTime = ref('')
const vueVersion = ref('')
const logs = ref([])

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

const addLog = (message) => {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
}

const testBasicFunction = () => {
  addLog('基础功能测试 - 成功')
}

const testLocalStorage = () => {
  try {
    localStorage.setItem('test', 'value')
    const value = localStorage.getItem('test')
    addLog(`LocalStorage测试 - 成功: ${value}`)
  } catch (error) {
    addLog(`LocalStorage测试 - 失败: ${error.message}`)
  }
}

const testRouter = () => {
  try {
    addLog(`当前路由: ${router.currentRoute.value.path}`)
  } catch (error) {
    addLog(`路由测试 - 失败: ${error.message}`)
  }
}

onMounted(() => {
  vueVersion.value = '3.x'
  updateTime()
  setInterval(updateTime, 1000)
  addLog('应用已启动')
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