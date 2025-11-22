import { createApp } from 'vue'

console.log('[Debug] 开始创建Vue应用...')

// 创建一个最简单的Vue应用
const app = createApp({
  template: `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: green;">✅ Vue应用正常工作！</h1>
      <p>当前时间: {{ currentTime }}</p>
      <p>localStorage测试: {{ localStorageTest }}</p>
      <button @click="testClick" style="padding: 10px; margin: 10px;">点击测试</button>
      <div v-if="clickCount > 0">按钮已点击 {{ clickCount }} 次</div>
    </div>
  `,
  data() {
    return {
      currentTime: new Date().toLocaleString(),
      clickCount: 0,
      localStorageTest: 'testing...'
    }
  },
  methods: {
    testClick() {
      this.clickCount++
      console.log('[Debug] 按钮点击:', this.clickCount)
    }
  },
  mounted() {
    console.log('[Debug] Vue组件已挂载')
    
    // 测试localStorage
    try {
      localStorage.setItem('debug-test', 'success')
      const result = localStorage.getItem('debug-test')
      this.localStorageTest = result === 'success' ? '✅ 正常' : '❌ 失败'
      localStorage.removeItem('debug-test')
    } catch (error) {
      this.localStorageTest = '❌ 错误: ' + error.message
    }
    
    // 更新时间
    setInterval(() => {
      this.currentTime = new Date().toLocaleString()
    }, 1000)
  }
})

console.log('[Debug] Vue应用已创建，准备挂载...')

// 等待DOM加载
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Debug] DOM已加载，开始挂载应用...')
  
  const appElement = document.getElementById('app')
  if (appElement) {
    console.log('[Debug] 找到app元素，开始挂载...')
    app.mount('#app')
    console.log('[Debug] Vue应用挂载成功！')
  } else {
    console.error('[Debug] 未找到#app元素')
  }
})

// 如果DOM已经加载完成
if (document.readyState === 'loading') {
  console.log('[Debug] DOM正在加载中...')
} else {
  console.log('[Debug] DOM已经加载完成，立即挂载应用...')
  const appElement = document.getElementById('app')
  if (appElement) {
    console.log('[Debug] 找到app元素，开始挂载...')
    app.mount('#app')
    console.log('[Debug] Vue应用挂载成功！')
  } else {
    console.error('[Debug] 未找到#app元素')
  }
}