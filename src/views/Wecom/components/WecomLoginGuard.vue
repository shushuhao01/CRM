<template>
  <div class="wecom-login-guard">
    <!-- 已登录：显示子内容 -->
    <slot v-if="isWecomReady" />

    <!-- 登录中 -->
    <div v-else-if="isWecomLogging" class="login-loading">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p>正在验证企微身份...</p>
    </div>

    <!-- 需要登录 -->
    <div v-else class="login-prompt">
      <div class="login-card">
        <el-icon :size="48" color="#1890ff"><Connection /></el-icon>
        <h3>企微身份验证</h3>
        <p class="login-desc">查看会话内容需要验证企业微信身份，请使用企业微信扫码登录</p>

        <!-- 企微登录组件容器 -->
        <div id="wecom-login-container" ref="loginContainerRef" class="login-container"></div>

        <div class="login-tips">
          <el-icon><InfoFilled /></el-icon>
          <span>扫码后即可查看会话消息内容，登录态会自动保持</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Loading, Connection, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useWecomOpenData } from '../composables/useWecomOpenData'

const props = defineProps<{
  configId?: number
}>()

const emit = defineEmits<{
  (e: 'login-success', data: { corpId: string; userId: string }): void
  (e: 'login-fail', error: any): void
}>()

const {
  isWecomReady,
  isWecomLogging,
  needWecomLogin,
  getLoginConfig,
  handleLoginSuccess
} = useWecomOpenData()

const loginContainerRef = ref<HTMLElement | null>(null)

/**
 * 初始化企微登录组件
 */
const initLoginComponent = async () => {
  const config = await getLoginConfig()
  if (!config?.appId) {
    ElMessage.warning('企微登录配置未完成，请联系管理员')
    return
  }

  // 等待容器渲染
  await new Promise(r => setTimeout(r, 100))

  try {
    // 使用 @wecom/jssdk 的 createWWLoginPanel
    const { createWWLoginPanel, WWLoginType } = await import('@wecom/jssdk')

    createWWLoginPanel({
      el: '#wecom-login-container',
      params: {
        login_type: 'ServiceApp' as any,
        appid: config.appId,
        redirect_uri: window.location.href.split('?')[0],
        state: 'chat_archive_login',
        redirect_type: 'callback' as any,
      },
      onLoginSuccess: async ({ code }: { code: string }) => {
        const success = await handleLoginSuccess(code)
        if (success) {
          emit('login-success', { corpId: '', userId: '' })
        } else {
          emit('login-fail', new Error('登录验证失败'))
        }
      },
      onLoginFail: (err: any) => {
        console.error('企微登录失败:', err)
        ElMessage.error('企微登录失败，请重试')
        emit('login-fail', err)
      }
    })
  } catch (e: any) {
    console.error('初始化登录组件失败:', e)
    // 降级：显示手动输入方式或提示
    ElMessage.error('登录组件加载失败: ' + (e.message || '请检查网络'))
  }
}

// 当需要登录时，初始化登录组件
watch(needWecomLogin, (need) => {
  if (need) {
    setTimeout(initLoginComponent, 200)
  }
}, { immediate: true })

onMounted(() => {
  // 检查URL中是否有回调的code（从redirect_uri跳转回来的情况）
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')
  if (code && state === 'chat_archive_login') {
    // 清除URL中的code参数
    const url = new URL(window.location.href)
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    window.history.replaceState({}, '', url.toString())
    // 处理登录
    handleLoginSuccess(code)
  }
})
</script>

<style scoped lang="scss">
.wecom-login-guard {
  height: 100%;
}

.login-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;

  p {
    margin-top: 12px;
    font-size: 14px;
  }
}

.login-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 400px;
}

.login-card {
  text-align: center;
  max-width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  h3 {
    margin: 16px 0 8px;
    font-size: 18px;
    color: #1F2937;
  }

  .login-desc {
    color: #6B7280;
    font-size: 14px;
    margin-bottom: 24px;
    line-height: 1.6;
  }
}

.login-container {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #E5E7EB;
  border-radius: 8px;
  margin: 16px 0;
}

.login-tips {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  color: #9CA3AF;
  font-size: 12px;
  margin-top: 16px;
}
</style>
