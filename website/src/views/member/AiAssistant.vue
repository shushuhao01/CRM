<template>
  <div class="ai-assistant-page">
    <h2 class="page-title">AI助手</h2>

    <div class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div class="tab-content">
      <WecomAiAssistant :active-tab="activeTab" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WecomAiAssistant from './wecom/WecomAiAssistant.vue'

const activeTab = ref('intro')

const tabs = [
  { key: 'intro', icon: '📖', label: '功能介绍' },
  { key: 'activate', icon: '🚀', label: '开通与充值' },
  { key: 'orders', icon: '📋', label: '订单记录' },
  { key: 'usage', icon: '📊', label: '使用概览' },
]
</script>

<style scoped>
.ai-assistant-page { max-width: 900px; }
.page-title { font-size: 22px; font-weight: 600; margin-bottom: 20px; color: #1F2937; }

.tab-nav {
  display: flex; gap: 4px; margin-bottom: 20px;
  background: #F5F7FA; border-radius: 12px; padding: 4px;
}
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px; border: none; background: transparent;
  border-radius: 8px; cursor: pointer; font-size: 14px;
  color: #4B5563; transition: all 0.25s; white-space: nowrap;
  font-weight: 500;
}
.tab-btn:hover { background: rgba(255,255,255,0.6); color: #1F2937; }
.tab-btn.active {
  background: #fff; color: #6366f1; font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.tab-icon { font-size: 16px; }
.tab-content { min-height: 400px; }
</style>

