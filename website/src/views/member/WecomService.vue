<template>
  <div class="wecom-service-page">
    <h2 class="page-title">企微服务</h2>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <template v-else>
      <!-- Tab 导航 -->
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
          <span v-if="tab.badge" class="tab-badge" :class="tab.badgeType">{{ tab.badge }}</span>
        </button>
      </div>

      <!-- Tab 内容 -->
      <div class="tab-content">
        <WecomIntro v-if="activeTab === 'intro'" :wecom-data="wecomData" />
        <WecomAuth v-else-if="activeTab === 'auth'" :wecom-data="wecomData" @refresh="fetchWecomStatus" />
        <WecomPricing v-else-if="activeTab === 'pricing'" :wecom-data="wecomData" @refresh="fetchWecomStatus" />
        <WecomRenewTab v-else-if="activeTab === 'renew'" :wecom-data="wecomData" @refresh="fetchWecomStatus" />
        <WecomAiAssistant v-else-if="activeTab === 'ai-intro'" active-tab="intro" />
        <WecomAiAssistant v-else-if="activeTab === 'ai-activate'" active-tab="activate" />
        <WecomAiAssistant v-else-if="activeTab === 'ai-orders'" active-tab="orders" />
        <WecomAiAssistant v-else-if="activeTab === 'ai-usage'" active-tab="usage" />
        <WecomUsage v-else-if="activeTab === 'usage'" />
        <WecomOrders v-else-if="activeTab === 'orders'" />
        <WecomHelp v-else-if="activeTab === 'help'" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMemberToken } from '@/api/member'
import WecomIntro from './wecom/WecomIntro.vue'
import WecomAuth from './wecom/WecomAuth.vue'
import WecomPricing from './wecom/WecomPricing.vue'
import WecomRenewTab from './wecom/WecomRenew.vue'
import WecomUsage from './wecom/WecomUsage.vue'
import WecomOrders from './wecom/WecomOrders.vue'
import WecomHelp from './wecom/WecomHelp.vue'
import WecomAiAssistant from './wecom/WecomAiAssistant.vue'

const loading = ref(true)
const activeTab = ref('intro')

const wecomData = ref<any>({
  hasWecomConfig: false,
  configs: [],
  chatArchiveAuth: false,
  currentPlan: null,
  presetPackages: [],
  renewalDiscount: 0.9,
  stats: { configCount: 0, customerCount: 0, bindingCount: 0 },
  vasConfig: null
})

const tabs = computed(() => {
  const plan = wecomData.value.currentPlan
  const items = [
    { key: 'intro', icon: '📖', label: '能力总览', badge: '', badgeType: '' },
    {
      key: 'auth',
      icon: '🔑',
      label: '开通授权',
      badge: wecomData.value.hasWecomConfig ? '已绑定' : '未绑定',
      badgeType: wecomData.value.hasWecomConfig ? 'success' : 'warning'
    },
    { key: 'pricing', icon: '💰', label: '套餐与配额', badge: '', badgeType: '' },
    {
      key: 'renew',
      icon: '🔄',
      label: '续费与增购',
      badge: plan?.status === 'active' && plan?.daysRemaining <= 30 ? '即将到期' : '',
      badgeType: 'warning'
    },
    { key: 'ai-intro', icon: '🤖', label: 'AI助手', badge: '', badgeType: '' },
    { key: 'ai-activate', icon: '🚀', label: 'AI开通充值', badge: '', badgeType: '' },
    { key: 'ai-orders', icon: '📋', label: 'AI订单记录', badge: '', badgeType: '' },
    { key: 'ai-usage', icon: '📊', label: 'AI使用概览', badge: '', badgeType: '' },
    { key: 'usage', icon: '📊', label: '用量统计', badge: '', badgeType: '' },
    { key: 'orders', icon: '📋', label: '订单记录', badge: '', badgeType: '' },
    { key: 'help', icon: '❓', label: '帮助与支持', badge: '', badgeType: '' }
  ]
  return items
})

const fetchWecomStatus = async () => {
  loading.value = true
  try {
    const token = getMemberToken()
    const res = await fetch('/api/v1/public/member/wecom', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      wecomData.value = json.data
    }
  } catch (e) {
    console.error('[WecomService] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchWecomStatus())
</script>

<style scoped>
.wecom-service-page { max-width: 900px; }
.page-title { font-size: 22px; font-weight: 600; margin-bottom: 20px; color: #1F2937; }

.loading-state { text-align: center; padding: 60px 0; color: #9CA3AF; }
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #E5E7EB; border-top-color: #4C6EF5;
  border-radius: 50%; animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* V4 胶囊Tab 导航 */
.tab-nav {
  display: flex; gap: 4px; margin-bottom: 20px;
  background: #F5F7FA; border-radius: 12px; padding: 4px;
  overflow-x: auto;
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
  background: #fff; color: #4C6EF5; font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.tab-icon { font-size: 16px; }
.tab-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 10px;
  font-weight: 600; line-height: 1.4;
}
.tab-badge.success { background: #ECFDF5; color: #10B981; }
.tab-badge.warning { background: #FFFBEB; color: #D97706; }

/* Tab 内容 */
.tab-content { min-height: 400px; }

@media (max-width: 600px) {
  .tab-nav { gap: 2px; padding: 3px; }
  .tab-btn { padding: 8px 10px; font-size: 13px; }
  .tab-icon { display: none; }
}
</style>

