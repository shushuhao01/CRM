<template>
  <div class="app-layout">
    <router-view />
    <van-tabbar v-model="activeTab" route>
      <van-tabbar-item icon="wap-home-o" to="/app/home">首页</van-tabbar-item>
      <van-tabbar-item icon="friends-o" to="/app/customers">客户</van-tabbar-item>
      <van-tabbar-item icon="chart-trending-o" to="/app/stats">数据</van-tabbar-item>
      <van-tabbar-item icon="contact-o" to="/app/profile">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getCurrentUser } from '@/api/auth'

const activeTab = ref(0)
const authStore = useAuthStore()

onMounted(async () => {
  if (authStore.token && !authStore.user) {
    try {
      const { data } = await getCurrentUser()
      if (data?.success && data.data) {
        authStore.setUser(data.data)
      }
    } catch (e) {
      console.error('[AppLayout] fetch user error:', e)
    }
  }
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #f5f6fa;
}
</style>
