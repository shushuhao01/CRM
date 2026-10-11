<template>
  <div class="channel-redirect">
    <div class="container channel-redirect-inner">
      <div class="channel-redirect-spinner" />
      <p class="channel-redirect-text">{{ tip }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveChannel, setChannelCookie, normalizeChannel } from '@/api/site'

const route = useRoute()
const router = useRouter()
const tip = ref('正在跳转…')

onMounted(async () => {
  const code = normalizeChannel(route.params.code)
  if (!code) {
    // 编码非法：仍跳首页，避免用户流失
    router.replace('/')
    return
  }
  // 先落地渠道来源，确保跳转后的页面埋点能带上渠道码
  setChannelCookie(code)
  try {
    const data = await resolveChannel(code)
    const target = data?.targetPath || '/'
    const sep = target.includes('?') ? '&' : '?'
    router.replace(`${target}${sep}ch=${encodeURIComponent(code)}`)
  } catch {
    // 渠道已停用 / 已删除 / 解析失败：仍重定向到首页，避免用户流失
    router.replace('/')
  }
})
</script>

<style scoped>
.channel-redirect {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56vh;
}

.channel-redirect-inner {
  text-align: center;
  max-width: 480px;
  padding: 60px 20px;
}

.channel-redirect-spinner {
  width: 42px;
  height: 42px;
  margin: 0 auto;
  border: 3px solid var(--border, #e5e7eb);
  border-top-color: var(--primary, #6366f1);
  border-radius: 50%;
  animation: channel-spin 0.8s linear infinite;
}

.channel-redirect-text {
  margin-top: 20px;
  color: var(--text-secondary, #6b7280);
  font-size: 16px;
}

@keyframes channel-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
