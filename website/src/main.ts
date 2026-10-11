import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { sendHeartbeat } from './api/site'
import './styles/main.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// 在线心跳：每 60 秒上报一次，仅在页面可见时发送，供后台「实时在线」统计
const heartbeat = () => {
  if (document.visibilityState === 'visible') sendHeartbeat()
}
window.setInterval(heartbeat, 60 * 1000)
// 切回前台时立即补报一次，避免后台窗口期间被判定为离线
document.addEventListener('visibilitychange', heartbeat)
