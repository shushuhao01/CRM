<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>授权信息</span>
        <el-button
          @click="handleSync"
          type="primary"
          :loading="syncing"
          :icon="Refresh"
        >
          同步授权信息
        </el-button>
      </div>
    </template>

    <!-- 过期/即将到期预警 -->
    <el-alert
      v-if="licenseData?.expired"
      type="error"
      :closable="false"
      style="margin-bottom: 16px"
      show-icon
    >
      <template #title>
        <div class="alert-content">
          <span>⚠️ 系统授权已过期{{ licenseData.expiresAt ? `（${formatDate(licenseData.expiresAt)}）` : '' }}，当前处于只读模式，无法新增/修改/删除数据。</span>
          <div class="alert-actions">
            <a v-if="memberCenterUrl" :href="memberCenterUrl" target="_blank" class="alert-btn alert-btn-primary">🔑 去会员中心续费</a>
            <a href="javascript:void(0)" class="alert-btn alert-btn-success" @click="openContactService">💬 联系客服续费</a>
          </div>
        </div>
      </template>
    </el-alert>

    <el-alert
      v-else-if="licenseData?.nearExpiry"
      type="warning"
      :closable="false"
      style="margin-bottom: 16px"
      show-icon
    >
      <template #title>
        <div class="alert-content">
          <span>⏰ 系统授权将在 {{ licenseData.daysUntilExpiry }} 天后到期{{ licenseData.expiresAt ? `（${formatDate(licenseData.expiresAt)}）` : '' }}，到期后将无法新增数据。请及时续费。</span>
          <div class="alert-actions">
            <a v-if="memberCenterUrl" :href="memberCenterUrl" target="_blank" class="alert-btn alert-btn-primary">🔑 去会员中心续费</a>
            <a href="javascript:void(0)" class="alert-btn alert-btn-success" @click="openContactService">💬 联系客服续费</a>
          </div>
        </div>
      </template>
    </el-alert>

    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <p style="margin-top: 8px; color: #909399;">加载授权信息中...</p>
    </div>

    <div v-else-if="!licenseData?.activated" style="text-align: center; padding: 40px;">
      <el-empty description="系统尚未激活授权" />
    </div>

    <template v-else>
      <!-- 授权状态卡片 -->
      <div class="license-status-row">
        <div class="status-card" :class="statusClass">
          <div class="status-icon">{{ statusIcon }}</div>
          <div class="status-info">
            <div class="status-label">授权状态</div>
            <div class="status-value">{{ statusText }}</div>
          </div>
        </div>
        <div class="status-card info">
          <div class="status-icon">📋</div>
          <div class="status-info">
            <div class="status-label">授权类型</div>
            <div class="status-value">{{ licenseTypeText }}</div>
          </div>
        </div>
        <div class="status-card info">
          <div class="status-icon">👥</div>
          <div class="status-info">
            <div class="status-label">{{ detailData?.userLimitMode === 'online' ? '在线席位' : '用户数' }}</div>
            <div class="status-value" v-if="detailData?.userLimitMode === 'online'">{{ detailData?.onlineCount ?? 0 }} / {{ detailData?.maxOnlineSeats ?? '-' }} 席位</div>
            <div class="status-value" v-else>{{ detailData?.currentUsers ?? '-' }} / {{ detailData?.maxUsers ?? '-' }}</div>
          </div>
        </div>
        <div class="status-card info">
          <div class="status-icon">📅</div>
          <div class="status-info">
            <div class="status-label">到期时间</div>
            <div class="status-value">{{ licenseData?.expiresAt ? formatDate(licenseData.expiresAt) : '永久有效' }}</div>
          </div>
        </div>
      </div>

      <!-- 详细信息 -->
      <el-descriptions :column="2" border style="margin-top: 20px;">
        <el-descriptions-item label="客户名称">{{ detailData?.customerName || licenseData?.customerName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="授权码">{{ detailData?.licenseKey || '-' }}</el-descriptions-item>
        <el-descriptions-item label="授权类型">{{ licenseTypeText }}</el-descriptions-item>
        <el-descriptions-item label="授权状态">
          <el-tag :type="licenseData?.expired ? 'danger' : 'success'">
            {{ licenseData?.expired ? '已过期' : '有效' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户限制模式">
          <el-tag v-if="detailData?.userLimitMode === 'online'" type="success" size="small">在线席位制</el-tag>
          <el-tag v-else size="small">总用户数制</el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detailData?.userLimitMode === 'online'" label="在线席位">
          {{ detailData?.onlineCount ?? 0 }} / {{ detailData?.maxOnlineSeats ?? '-' }}
          <span style="color: #909399; margin-left: 4px;">（注册用户 {{ detailData?.currentUsers ?? '-' }} 人）</span>
        </el-descriptions-item>
        <template v-else>
          <el-descriptions-item label="最大用户数">{{ detailData?.maxUsers ?? licenseData?.maxUsers ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前用户数">
            {{ detailData?.currentUsers ?? '-' }}
            <span v-if="detailData?.remainingUsers != null" style="color: #909399; margin-left: 4px;">
              （剩余 {{ detailData.remainingUsers }}）
            </span>
          </el-descriptions-item>
        </template>
        <el-descriptions-item label="激活时间">{{ detailData?.activatedAt ? formatDate(detailData.activatedAt) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="到期时间">
          {{ licenseData?.expiresAt ? formatDate(licenseData.expiresAt) : '永久有效' }}
          <el-tag v-if="licenseData?.nearExpiry" type="warning" size="small" style="margin-left: 8px;">
            {{ licenseData.daysUntilExpiry }}天后到期
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 用户数/席位使用进度条 -->
      <div v-if="detailData?.userLimitMode === 'online' && detailData?.maxOnlineSeats" class="usage-section">
        <div class="usage-header">
          <span>在线席位使用情况</span>
          <span>{{ detailData.onlineCount || 0 }} / {{ detailData.maxOnlineSeats }}</span>
        </div>
        <el-progress
          :percentage="seatUsagePercent"
          :color="seatUsageColor"
          :stroke-width="12"
        />
      </div>
      <div v-else-if="detailData?.maxUsers && detailData?.currentUsers != null" class="usage-section">
        <div class="usage-header">
          <span>用户数使用情况</span>
          <span>{{ detailData.currentUsers }} / {{ detailData.maxUsers }}</span>
        </div>
        <el-progress
          :percentage="userUsagePercent"
          :color="userUsageColor"
          :stroke-width="12"
        />
      </div>

      <!-- 同步说明 -->
      <div class="sync-hint">
        <el-icon><InfoFilled /></el-icon>
        <span>系统每30分钟自动从管理后台同步授权信息。如运营方刚完成续费或扩容，可点击上方"同步授权信息"按钮立即同步。</span>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Loading, InfoFilled } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useConfigStore } from '@/stores/config'
import { getMemberCenterRenewUrl, getMemberCenterLoginUrl } from '@/utils/memberCenterUrl'

const configStore = useConfigStore()

// 会员中心续费URL — 使用统一工具自动识别
const memberCenterUrl = computed(() => {
  // 触发响应式依赖（确保 configStore 变化后重新计算）
  void configStore.systemConfig.websiteUrl
  return getMemberCenterRenewUrl() || getMemberCenterLoginUrl()
})

// 打开联系客服弹窗
const openContactService = () => {
  window.dispatchEvent(new CustomEvent('open-contact-service-dialog'))
}

interface LicenseStatus {
  activated: boolean
  expired: boolean
  nearExpiry?: boolean
  daysUntilExpiry?: number | null
  licenseType?: string
  maxUsers?: number
  customerName?: string
  expiresAt?: string | null
  features?: any
}

interface LicenseDetail {
  licenseKey?: string
  customerName?: string
  licenseType?: string
  maxUsers?: number
  currentUsers?: number
  remainingUsers?: number
  userLimitMode?: string
  maxOnlineSeats?: number
  onlineCount?: number
  features?: any
  expiresAt?: string | null
  activatedAt?: string | null
  status?: string
}

const loading = ref(true)
const syncing = ref(false)
const licenseData = ref<LicenseStatus | null>(null)
const detailData = ref<LicenseDetail | null>(null)

// 授权状态样式
const statusClass = computed(() => {
  if (licenseData.value?.expired) return 'danger'
  if (licenseData.value?.nearExpiry) return 'warning'
  return 'success'
})

const statusIcon = computed(() => {
  if (licenseData.value?.expired) return '❌'
  if (licenseData.value?.nearExpiry) return '⚠️'
  return '✅'
})

const statusText = computed(() => {
  if (licenseData.value?.expired) return '已过期'
  if (licenseData.value?.nearExpiry) return '即将到期'
  return '正常有效'
})

const licenseTypeText = computed(() => {
  const type = detailData.value?.licenseType || licenseData.value?.licenseType
  if (type === 'perpetual') return '永久买断'
  if (type === 'annual') return '年度授权'
  if (type === 'trial') return '试用版'
  return type || '-'
})

const userUsagePercent = computed(() => {
  if (!detailData.value?.maxUsers || detailData.value.currentUsers == null) return 0
  return Math.min(100, Math.round((detailData.value.currentUsers / detailData.value.maxUsers) * 100))
})

const userUsageColor = computed(() => {
  const percent = userUsagePercent.value
  if (percent >= 90) return '#F56C6C'
  if (percent >= 70) return '#E6A23C'
  return '#67C23A'
})

const seatUsagePercent = computed(() => {
  if (!detailData.value?.maxOnlineSeats) return 0
  return Math.min(100, Math.round(((detailData.value.onlineCount || 0) / detailData.value.maxOnlineSeats) * 100))
})

const seatUsageColor = computed(() => {
  const percent = seatUsagePercent.value
  if (percent >= 90) return '#F56C6C'
  if (percent >= 70) return '#E6A23C'
  return '#67C23A'
})

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// 加载授权信息
const loadLicenseInfo = async () => {
  loading.value = true
  try {
    const [statusRes, detailRes] = await Promise.allSettled([
      request.get('/license/status'),
      request.get('/license/info')
    ])

    if (statusRes.status === 'fulfilled') {
      licenseData.value = statusRes.value as unknown as LicenseStatus
    }
    if (detailRes.status === 'fulfilled') {
      detailData.value = detailRes.value as unknown as LicenseDetail
    }
  } catch (error) {
    console.error('加载授权信息失败:', error)
  } finally {
    loading.value = false
  }
}

// 手动同步授权信息
const handleSync = async () => {
  syncing.value = true
  try {
    const res = await request.post('/license/sync') as any
    if (res?.message) {
      ElMessage.success(res.message)
    } else {
      ElMessage.success('授权信息已同步')
    }
    // 重新加载显示最新数据
    await loadLicenseInfo()
  } catch (error: any) {
    ElMessage.error(error?.message || '同步失败，请检查网络连接')
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  loadLicenseInfo()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.license-status-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
}

.status-card.success {
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.status-card.warning {
  background: #fdf6ec;
  border-color: #f5dab1;
}

.status-card.danger {
  background: #fef0f0;
  border-color: #fbc4c4;
}

.status-icon {
  font-size: 28px;
  line-height: 1;
}

.status-info {
  flex: 1;
  min-width: 0;
}

.status-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.usage-section {
  margin-top: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.sync-hint {
  margin-top: 20px;
  padding: 12px 16px;
  background: #ecf5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #409eff;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.6;
}

.sync-hint .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .license-status-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 预警 alert 中的续费入口 */
.alert-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.alert-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.alert-btn-primary {
  background: #409eff;
  color: #fff;
}
.alert-btn-primary:hover {
  background: #337ecc;
  color: #fff;
}

.alert-btn-success {
  background: #67c23a;
  color: #fff;
}
.alert-btn-success:hover {
  background: #529b2e;
  color: #fff;
}
</style>

