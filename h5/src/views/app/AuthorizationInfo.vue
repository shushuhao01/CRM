<template>
  <div class="page-container" style="padding-bottom: 20px;">
    <van-nav-bar title="授权信息" left-arrow @click-left="$router.back()" />

    <div v-if="loading" class="loading-wrap">
      <van-loading type="spinner" color="#6366f1" />
    </div>

    <template v-else-if="info">
      <!-- 租户基本信息 -->
      <div class="tenant-hero">
        <div class="tenant-avatar">
          <svg width="48" height="48" viewBox="0 0 44 44" fill="none">
            <defs><linearGradient id="tlg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs>
            <rect width="44" height="44" rx="10" fill="url(#tlg)"/>
            <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
            <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
            <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
            <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
          </svg>
        </div>
        <div class="tenant-name">{{ info.tenantName }}</div>
        <div class="tenant-code">{{ info.tenantCode }}</div>
        <div class="tenant-status" :class="statusClass">{{ statusText }}</div>
      </div>

      <!-- 套餐信息 -->
      <div class="card">
        <div class="section-title">套餐信息</div>
        <van-cell-group :border="false">
          <van-cell title="当前套餐" :value="info.packageName" />
          <van-cell title="到期时间" :value="info.expireDate" />
          <van-cell title="剩余天数">
            <template #value>
              <span :class="{ 'text-warn': info.remainingDays <= 3 }">{{ info.remainingDays }}天</span>
            </template>
          </van-cell>
          <van-cell title="最大用户数" :value="`${info.currentUsers || 0} / ${info.maxUsers || 0}`" />
        </van-cell-group>
      </div>

      <!-- 套餐权益 -->
      <div v-if="info.packageFeatures && info.packageFeatures.length > 0" class="card">
        <div class="section-title">套餐权益</div>
        <div class="feature-list">
          <div v-for="(feat, idx) in info.packageFeatures" :key="idx" class="feature-item">
            <van-icon name="success" color="#10b981" size="16" />
            <span>{{ feat }}</span>
          </div>
        </div>
      </div>

      <!-- 联系信息 -->
      <div class="card">
        <div class="section-title">账户信息</div>
        <van-cell-group :border="false">
          <van-cell title="联系人" :value="info.contact" />
          <van-cell title="手机号" :value="info.phone" />
          <van-cell title="注册时间" :value="info.createdAt" />
        </van-cell-group>
      </div>

      <!-- 登录入口 -->
      <div class="card">
        <div class="section-title">系统入口</div>
        <div class="entry-list">
          <div class="entry-item" @click="openUrl(info.crmUrl)">
            <div class="entry-icon" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            </div>
            <div class="entry-text">
              <div class="entry-name">CRM系统</div>
              <div class="entry-desc">管理客户、订单、数据分析</div>
            </div>
            <van-icon name="arrow" color="#c0c4cc" />
          </div>
          <div class="entry-item" @click="openUrl(info.memberUrl)">
            <div class="entry-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="entry-text">
              <div class="entry-name">会员中心</div>
              <div class="entry-desc">套餐管理、续费、账单查询</div>
            </div>
            <van-icon name="arrow" color="#c0c4cc" />
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-wrap">
      <van-empty description="暂无授权信息" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getTenantInfo } from '@/api/app'

interface TenantInfo {
  tenantId: string
  tenantName: string
  tenantCode: string
  contact: string
  phone: string
  email: string
  packageName: string
  packageFeatures: string[]
  maxUsers: number
  currentUsers: number
  maxStorageGb: number
  expireDate: string
  remainingDays: number
  status: string
  licenseStatus: string
  createdAt: string
  crmUrl: string
  memberUrl: string
}

const loading = ref(true)
const info = ref<TenantInfo | null>(null)

const statusClass = computed(() => {
  if (!info.value) return ''
  if (info.value.remainingDays <= 0) return 'expired'
  if (info.value.remainingDays <= 3) return 'warning'
  return 'active'
})

const statusText = computed(() => {
  if (!info.value) return ''
  if (info.value.remainingDays <= 0) return '已过期'
  return '使用中'
})

function openUrl(url: string) {
  if (url) window.open(url, '_blank')
}

onMounted(async () => {
  try {
    const { data } = await getTenantInfo()
    if (data?.success && data.data) {
      info.value = data.data
    }
  } catch (e) {
    console.error('[AuthorizationInfo] 获取授权信息失败:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-wrap {
  padding: 40px 0;
}

/* 租户头部 */
.tenant-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px 20px;
}
.tenant-avatar { margin-bottom: 12px; }
.tenant-name {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}
.tenant-code {
  font-size: 13px;
  color: #6366f1;
  background: #eef2ff;
  padding: 2px 12px;
  border-radius: 20px;
  margin-top: 6px;
  font-weight: 500;
}
.tenant-status {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 20px;
}
.tenant-status.active {
  color: #059669;
  background: #d1fae5;
}
.tenant-status.warning {
  color: #d97706;
  background: #fef3c7;
}
.tenant-status.expired {
  color: #dc2626;
  background: #fee2e2;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  padding: 0 0 12px;
  letter-spacing: 1px;
}

.text-warn {
  color: #ef4444;
  font-weight: 600;
}

/* 套餐权益 */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

/* 系统入口 */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.entry-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.entry-item:active {
  background: #f3f4f6;
}
.entry-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.entry-text {
  flex: 1;
}
.entry-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}
.entry-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}
</style>
