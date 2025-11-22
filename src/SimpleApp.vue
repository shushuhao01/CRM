<template>
  <div id="simple-app" style="padding: 20px; font-family: Arial, sans-serif;">
    <h1 style="color: #409eff;">CRM系统 - 简化测试版</h1>
    <div style="margin: 20px 0;">
      <p>当前时间: {{ currentTime }}</p>
      <p>Vue版本: {{ vueVersion }}</p>
      <p>应用状态: {{ appStatus }}</p>
    </div>
    
    <div style="margin: 20px 0;">
      <el-button type="primary" @click="testFunction">测试按钮</el-button>
      <el-button type="success" @click="testLocalStorage">测试LocalStorage</el-button>
    </div>
    
    <div v-if="message" style="margin: 20px 0; padding: 10px; background: #f0f9ff; border: 1px solid #409eff; border-radius: 4px;">
      {{ message }}
    </div>
    
    <div style="margin: 20px 0;">
      <h3>测试日志:</h3>
      <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
        <div v-for="(log, index) in logs" :key="index" style="margin: 2px 0; font-family: monospace; font-size: 12px;">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { version } from 'vue'

const currentTime = ref('')
const vueVersion = ref(version)
const appStatus = ref('初始化中...')
const message = ref('')
const logs = ref<string[]>([])

let timeInterval: number | null = null

const addLog = (text: string) => {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.push(`[${timestamp}] ${text}`)
  console.log(`[SimpleApp] ${text}`)
}

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

const testFunction = () => {
  message.value = '按钮点击测试成功！'
  addLog('按钮点击测试执行')
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

const testLocalStorage = () => {
  try {
    const testKey = 'simple_test'
    const testValue = 'test_value_' + Date.now()
    
    localStorage.setItem(testKey, testValue)
    const retrieved = localStorage.getItem(testKey)
    
    if (retrieved === testValue) {
      message.value = 'LocalStorage测试成功！'
      addLog('LocalStorage读写测试通过')
    } else {
      message.value = 'LocalStorage测试失败：值不匹配'
      addLog('LocalStorage测试失败：值不匹配')
    }
    
    localStorage.removeItem(testKey)
  } catch (error) {
    message.value = 'LocalStorage测试失败：' + (error as Error).message
    addLog('LocalStorage测试失败：' + (error as Error).message)
  }
  
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

onMounted(() => {
  addLog('SimpleApp组件已挂载')
  appStatus.value = '运行中'
  updateTime()
  
  timeInterval = window.setInterval(updateTime, 1000)
  
  addLog('定时器已启动')
  addLog(`Vue版本: ${version}`)
  addLog('组件初始化完成')
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
    addLog('定时器已清理')
  }
  addLog('SimpleApp组件已卸载')
})
</script>

<style scoped>
#simple-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

h1 {
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}
</style>