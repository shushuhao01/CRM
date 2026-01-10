<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>授权信息</span>
        <el-button
          v-if="!licenseInfo && canActivate"
          type="primary"
          @click="showActivateDialog = true"
        >
          <el-icon><Key /></el-icon>
          激活系统
        </el-button>
        <el-button
          v-if="licenseInfo && canActivate"
          type="warning"
          @click="showActivateDialog = true"
        >
          <el-icon><Refresh /></el-icon>
          更新授权
        </el-button>
      </div>
    </template>

    <!-- 未激活状态 -->
    <div v-if="!licenseInfo" class="no-license">
      <el-empty description="系统尚未激活">
        <el-button type="primary" @click="showActivateDialog = true">
          立即激活
        </el-button>
      </el-empty>
    </div>

    <!-- 已激活状态 -->
    <div v-else class="license-info">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="授权状态">
          <el-tag :type="getStatusType(licenseInfo.status)" size="large">
            {{ getStatusText(licenseInfo.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="授权类型">
          {{ getLicenseTypeText(licenseInfo.licenseType) }}
        </el-descriptions-item>
        <el-descriptions-item label="客户名称">
          {{ licenseInfo.customerName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="最大用户数">
          {{ licenseInfo.maxUsers || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="授权码">
          {{ licenseInfo.licenseKey || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="激活时间">
          {{ formatDate(licenseInfo.activatedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="到期时间" :span="2">
          <span :class="{ 'text-danger': isExpiringSoon }">
            {{ licenseInfo.expiresAt ? formatDate(licenseInfo.expiresAt) : '永久有效' }}
            <el-tag v-if="isExpiringSoon" type="warning" size="small" style="margin-left: 8px;">
              即将到期
            </el-tag>
          </span>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 功能模块 -->
      <div v-if="licenseInfo.features" class="features-section">
        <h4>已授权功能模块</h4>
        <div class="features-list">
          <el-tag
            v-for="(enabled, feature) in licenseInfo.features"
            :key="feature"
            :type="enabled ? 'success' : 'info'"
            class="feature-tag"
          >
            {{ getFeatureName(feature as string) }}
          </el-tag>
        </div>
      </div>

      <!-- 到期提醒 -->
      <el-alert
        v-if="isExpired"
        title="授权已过期"
        type="error"
        description="您的授权已过期，部分功能可能受限。请联系平台管理员续期。"
        show-icon
        :closable="false"
        style="margin-top: 16px;"
      />
      <el-alert
        v-else-if="isExpiringSoon"
        title="授权即将到期"
        type="warning"
        :description="`您的授权将于 ${formatDate(licenseInfo.expiresAt)} 到期，请及时续期。`"
        show-icon
        :closable="false"
        style="margin-top: 16px;"
      />
    </div>

    <!-- 激活弹窗 -->
    <LicenseActivateDialog
      v-model="showActivateDialog"
      @activated="handleActivated"
    />
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import LicenseActivateDialog from '@/components/License/LicenseActivateDialog.vue'
import { getLicenseInfo } from '@/api/license'

const userStore = useUserStore()

interface LicenseInfo {
  licenseKey: string
  customerName: string
  licenseType: string
  maxUsers: number
  features: Record<string, boolean> | null
  expiresAt: string | null
  activatedAt: string
  status: string
}

const licenseInfo = ref<LicenseInfo | null>(null)
const loading = ref(false)
const showActivateDialog = ref(false)

// 是否有激活权限（仅超级管理员）
const canActivate = computed(() => {
  return userStore.currentUser?.role === 'super_admin'
})

// 是否已过期
const isExpired = computed(() => {
  if (!licenseInfo.value?.expiresAt) return false
  return new Date(licenseInfo.value.expiresAt) < new Date()
})

// 是否即将到期（30天内）
const isExpiringSoon = computed(() => {
  if (!licenseInfo.value?.expiresAt || isExpired.value) return false
  const expiresAt = new Date(licenseInfo.value.expiresAt)
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  return expiresAt < thirtyDaysLater
})

// 加载授权信息
const loadLicenseInfo = async () => {
  loading.value = true
  try {
    const result = await getLicenseInfo()
    if (result) {
      licenseInfo.value = result
    }
  } catch (error) {
    console.error('加载授权信息失败:', error)
  } finally {
    loading.value = false
  }
}

// 激活成功回调
const handleActivated = () => {
  ElMessage.success('授权更新成功')
  loadLicenseInfo()
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'success',
    expired: 'danger',
    revoked: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '已激活',
    expired: '已过期',
    revoked: '已吊销'
  }
  return texts[status] || status
}

// 获取授权类型文本
const getLicenseTypeText = (type: string) => {
  const types: Record<string, string> = {
    trial: '试用版',
    perpetual: '永久授权',
    annual: '年度授权',
    monthly: '月度授权'
  }
  return types[type] || type
}

// 获取功能名称
const getFeatureName = (feature: string) => {
  const names: Record<string, string> = {
    all: '全部功能',
    customer: '客户管理',
    order: '订单管理',
    product: '商品管理',
    logistics: '物流管理',
    performance: '业绩管理',
    finance: '财务管理',
    service: '售后服务',
    data: '数据分析',
    system: '系统管理'
  }
  return names[feature] || feature
}

// 格式化日期
const formatDate = (date: string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadLicenseInfo()
})
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-license {
  padding: 40px 0;
}

.license-info {
  .features-section {
    margin-top: 24px;

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #606266;
    }
  }

  .features-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .feature-tag {
    font-size: 13px;
  }
}

.text-danger {
  color: #f56c6c;
}
</style>
