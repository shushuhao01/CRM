import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import AppTest from './App-test.vue'

console.log('开始初始化测试版本应用...')

try {
  const app = createApp(AppTest)
  
  console.log('创建应用实例成功')
  
  // 注册Pinia
  app.use(createPinia())
  console.log('Pinia注册成功')
  
  // 注册Element Plus
  app.use(ElementPlus)
  console.log('Element Plus注册成功')
  
  // 注册路由
  app.use(router)
  console.log('路由注册成功')
  
  // 全局错误处理
  app.config.errorHandler = (err, vm, info) => {
    console.error('Vue应用错误:', err)
    console.error('错误信息:', info)
    console.error('组件实例:', vm)
  }
  
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountApp()
    })
  } else {
    mountApp()
  }
  
  function mountApp() {
    const appElement = document.getElementById('app')
    if (appElement) {
      console.log('找到#app元素，开始挂载应用')
      app.mount('#app')
      console.log('应用挂载成功')
    } else {
      console.error('未找到#app元素')
    }
  }
  
} catch (error) {
  console.error('应用初始化失败:', error)
}