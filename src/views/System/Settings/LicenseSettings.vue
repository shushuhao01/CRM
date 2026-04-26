<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>授权信息</span>
        <div class="header-actions">
          <el-button
            v-if="licenseData?.activated"
            @click="showReactivateDialog = true"
            :icon="Key"
            plain
          >
            重新激活授权码
          </el-button>
          <el-button
            @click="handleSync"
            type="primary"
            :loading="syncing"
            :icon="Refresh"
          >
            同步授权信息
          </el-button>
        </div>
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
          <span>系统授权已过期{{ licenseData.expiresAt ? `（${formatDate(licenseData.expiresAt)}）` : '' }}，当前处于只读模式，无法新增/修改/删除数据。</span>
          <div class="alert-actions">
            <a v-if="memberCenterUrl" :href="memberCenterUrl" target="_blank" class="alert-btn alert-btn-primary">去会员中心续费</a>
            <a href="javascript:void(0)" class="alert-btn alert-btn-success" @click="openContactService">联系客服续费</a>
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
          <span>系统授权将在 {{ licenseData.daysUntilExpiry }} 天后到期{{ licenseData.expiresAt ? `（${formatDate(licenseData.expiresAt)}）` : '' }}，到期后将无法新增数据。请及时续费。</span>
          <div class="alert-actions">
            <a v-if="memberCenterUrl" :href="memberCenterUrl" target="_blank" class="alert-btn alert-btn-primary">去会员中心续费</a>
            <a href="javascript:void(0)" class="alert-btn alert-btn-success" @click="openContactService">联系客服续费</a>
          </div>
        </div>
      </template>
    </el-alert>

    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <p style="margin-top: 8px; color: #909399;">加载授权信息中...</p>
    </div>

    <div v-else-if="!licenseData?.activated" class="not-activated-section">
      <el-empty description="系统尚未激活授权" :image-size="120" />
      <div class="activate-form">
        <p class="activate-hint">请输入授权码激活系统，支持 SaaS 租户授权码（TENANT-）和私有部署授权码（PRIVATE-）</p>
        <div class="activate-input-row">
          <el-input
            v-model="activateLicenseKey"
            placeholder="请输入授权码，如 TENANT-XXXX-... 或 PRIVATE-XXXX-..."
            size="large"
            clearable
            style="max-width: 480px;"
            @keyup.enter="handleActivate"
          />
          <el-button type="primary" size="large" :loading="activating" @click="handleActivate" :disabled="!activateLicenseKey.trim()">
            激活系统
          </el-button>
        </div>
        <div v-if="activateResult" class="activate-result">
          <el-alert v-if="activateResult.success" type="success" :closable="false" show-icon>
            <template #title>
              <div>{{ activateResult.message }}</div>
              <div v-if="activateResult.defaultAdmin" style="margin-top: 8px; font-size: 13px;">
                <strong>默认管理员账号：</strong>{{ activateResult.defaultAdmin.username }}
                <strong style="margin-left: 12px;">密码：</strong>{{ activateResult.defaultAdmin.password }}
                <span style="color: #E6A23C; margin-left: 8px;">（请及时修改密码！）</span>
              </div>
            </template>
          </el-alert>
          <el-alert v-else type="error" :title="activateResult.message" :closable="false" show-icon />
        </div>
      </div>
    </div>

    <template v-else>
      <!-- 顶部概览卡片 -->
      <div class="license-status-row">
        <div class="status-card" :class="statusClass">
          <div class="status-icon">{{ statusIcon }}</div>
          <div class="status-info">
            <div class="status-label">授权状态</div>
            <div class="status-value">{{ statusText }}</div>
          </div>
        </div>
        <div class="status-card" :class="deployTypeClass">
          <div class="status-icon">{{ detailData?.deployType === 'saas' ? '☁️' : '�️' }}</div>
          <div class="status-info">
            <div class="status-label">部署类型</div>
            <div class="status-value">{{ deployTypeText }}</div>
          </div>
        </div>
        <div class="status-card info">
          <div class="status-icon">👥</div>
          <div class="status-info">
            <div class="status-label">{{ userLimitLabel }}</div>
            <div class="status-value" v-if="detailData?.userLimitMode === 'online' || detailData?.userLimitMode === 'both'">{{ detailData?.onlineCount ?? 0 }} / {{ detailData?.maxOnlineSeats ?? '-' }}</div>
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

      <!-- 使用量进度条区域 -->
      <div class="usage-bars-row">
        <div v-if="detailData?.userLimitMode === 'online' || detailData?.userLimitMode === 'both'" class="usage-section">
          <div class="usage-header">
            <span>在线席位使用情况</span>
            <span class="usage-nums">{{ detailData?.onlineCount || 0 }} / {{ detailData?.maxOnlineSeats ?? '-' }}</span>
          </div>
          <el-progress :percentage="seatUsagePercent" :color="seatUsageColor" :stroke-width="10" />
        </div>
        <div v-if="detailData?.maxUsers && detailData?.currentUsers != null" class="usage-section">
          <div class="usage-header">
            <span>注册用户数</span>
            <span class="usage-nums">{{ detailData.currentUsers }} / {{ detailData.maxUsers }}</span>
          </div>
          <el-progress :percentage="userUsagePercent" :color="userUsageColor" :stroke-width="10" />
        </div>
        <div v-if="detailData?.maxStorageGb" class="usage-section">
          <div class="usage-header">
            <span>存储空间</span>
            <span class="usage-nums">{{ storageUsedText }} / {{ detailData.maxStorageGb }} GB</span>
          </div>
          <el-progress :percentage="storageUsagePercent" :color="storageUsageColor" :stroke-width="10" />
        </div>
      </div>

      <!-- 详细授权信息 -->
      <div class="detail-section">
        <div class="detail-title">授权详情</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户名称">
            <span class="detail-value-main">{{ detailData?.customerName || licenseData?.customerName || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="授权码">
            <div class="license-key-field">
              <span class="detail-value-mono">{{ showFullLicenseKey ? fullLicenseKey : (detailData?.licenseKey || '-') }}</span>
              <el-tooltip content="查看完整授权码" placement="top" v-if="fullLicenseKey">
                <el-icon class="license-key-action" @click="showFullLicenseKey = !showFullLicenseKey">
                  <View v-if="!showFullLicenseKey" /><Hide v-else />
                </el-icon>
              </el-tooltip>
              <el-tooltip content="复制授权码" placement="top" v-if="fullLicenseKey">
                <el-icon class="license-key-action" @click="copyLicenseKey">
                  <CopyDocument />
                </el-icon>
              </el-tooltip>
            </div>
          </el-descriptions-item>

          <el-descriptions-item v-if="detailData?.tenantId" label="租户ID">
            <span class="detail-value-mono">{{ detailData.tenantId }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailData?.tenantCode" label="租户编码">
            <el-tag size="small" type="info">{{ detailData.tenantCode }}</el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="部署类型">
            <el-tag :type="detailData?.deployType === 'saas' ? 'success' : 'primary'" size="small">
              {{ deployTypeText }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="套餐">
            <el-tag type="warning" size="small" effect="plain">{{ detailData?.packageName || licenseTypeText }}</el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="授权状态">
            <el-tag :type="licenseData?.expired ? 'danger' : (licenseData?.nearExpiry ? 'warning' : 'success')">
              {{ statusText }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户限制模式">
            <el-tag v-if="detailData?.userLimitMode === 'online'" type="success" size="small">在线席位制</el-tag>
            <el-tag v-else-if="detailData?.userLimitMode === 'both'" type="warning" size="small">混合模式</el-tag>
            <el-tag v-else size="small">总用户数制</el-tag>
          </el-descriptions-item>

          <el-descriptions-item v-if="detailData?.userLimitMode === 'online' || detailData?.userLimitMode === 'both'" label="在线席位">
            <span>{{ detailData?.onlineCount ?? 0 }} / {{ detailData?.maxOnlineSeats ?? '-' }} 席位</span>
            <span style="color: #909399; margin-left: 8px; font-size: 12px;">（已注册 {{ detailData?.currentUsers ?? '-' }} 人）</span>
          </el-descriptions-item>

          <el-descriptions-item label="最大用户数">{{ detailData?.maxUsers ?? licenseData?.maxUsers ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前用户数">
            {{ detailData?.currentUsers ?? '-' }}
            <span v-if="detailData?.remainingUsers != null" style="color: #909399; margin-left: 4px; font-size: 12px;">
              （剩余 {{ detailData.remainingUsers }} 个名额）
            </span>
          </el-descriptions-item>

          <el-descriptions-item v-if="detailData?.maxStorageGb" label="存储空间">
            {{ storageUsedText }} / {{ detailData.maxStorageGb }} GB
          </el-descriptions-item>

          <el-descriptions-item label="激活时间">{{ detailData?.activatedAt ? formatDateTime(detailData.activatedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="到期时间">
            {{ licenseData?.expiresAt ? formatDate(licenseData.expiresAt) : '永久有效' }}
            <el-tag v-if="licenseData?.nearExpiry" type="warning" size="small" style="margin-left: 8px;">
              {{ licenseData.daysUntilExpiry }}天后到期
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailData?.lastVerifyAt" label="最后验证时间">{{ formatDateTime(detailData.lastVerifyAt) }}</el-descriptions-item>

          <el-descriptions-item v-if="featuresList.length > 0" label="授权功能" :span="2">
            <div class="features-tags">
              <el-tag v-for="f in featuresList" :key="f.code" size="small" type="success" effect="plain" style="margin: 2px 4px;">
                {{ f.label }}
              </el-tag>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 同步说明 -->
      <div class="sync-hint">
        <el-icon><InfoFilled /></el-icon>
        <span>系统每30分钟自动从管理后台同步授权信息。如运营方刚完成续费或扩容，可点击上方"同步授权信息"按钮立即同步。</span>
      </div>
    </template>

    <!-- 重新激活授权码弹窗 -->
    <el-dialog
      v-model="showReactivateDialog"
      title="重新激活授权码"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="reactivate-dialog-content">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px;">
          <template #title>输入新的授权码后，系统将使用新授权码的权限和配置替换当前授权。</template>
        </el-alert>
        <el-form label-width="80px">
          <el-form-item label="新授权码">
            <el-input
              v-model="reactivateKey"
              placeholder="请输入新的授权码（TENANT-... 或 PRIVATE-...）"
              size="large"
              clearable
              @keyup.enter="handleReactivate"
            />
          </el-form-item>
        </el-form>
        <div v-if="reactivateResult" style="margin-top: 12px;">
          <el-alert v-if="reactivateResult.success" type="success" :title="reactivateResult.message" :closable="false" show-icon />
          <el-alert v-else type="error" :title="reactivateResult.message" :closable="false" show-icon />
        </div>
      </div>
      <template #footer>
        <el-button @click="showReactivateDialog = false" :disabled="reactivating">取消</el-button>
        <el-button type="primary" @click="handleReactivate" :loading="reactivating" :disabled="!reactivateKey.trim()">
          {{ reactivating ? '验证中...' : '确认激活' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Loading, InfoFilled, Key, View, Hide, CopyDocument } from '@element-plus/icons-vue'
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
  deployType?: string
  maxUsers?: number
  customerName?: string
  expiresAt?: string | null
  features?: any
}

interface LicenseDetail {
  licenseKey?: string
  fullLicenseKey?: string
  customerName?: string
  tenantId?: string
  tenantCode?: string
  deployType?: string
  licenseType?: string
  packageName?: string
  packageCode?: string
  maxUsers?: number
  currentUsers?: number
  remainingUsers?: number
  userLimitMode?: string
  maxOnlineSeats?: number
  onlineCount?: number
  maxStorageGb?: number
  usedStorageMb?: number
  features?: any
  packageFeatures?: any
  expiresAt?: string | null
  activatedAt?: string | null
  lastVerifyAt?: string | null
  status?: string
  contact?: string
  phone?: string
  email?: string
}

const loading = ref(true)
const syncing = ref(false)
const licenseData = ref<LicenseStatus | null>(null)
const detailData = ref<LicenseDetail | null>(null)

// 激活相关
const activateLicenseKey = ref('')
const activating = ref(false)
const activateResult = ref<{ success: boolean; message: string; defaultAdmin?: any } | null>(null)

// 重新激活弹窗
const showReactivateDialog = ref(false)
const reactivateKey = ref('')
const reactivating = ref(false)
const reactivateResult = ref<{ success: boolean; message: string } | null>(null)

// 授权码显示/复制
const showFullLicenseKey = ref(false)
const fullLicenseKey = ref('')

const copyLicenseKey = async () => {
  if (!fullLicenseKey.value) return
  try {
    await navigator.clipboard.writeText(fullLicenseKey.value)
    ElMessage.success('授权码已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 功能模块英文→中文映射
const featureNameMap: Record<string, string> = {
  dashboard: '数据看板',
  customer: '客户管理',
  order: '订单管理',
  'service-management': '服务管理',
  performance: '业绩统计',
  logistics: '物流管理',
  service: '售后管理',
  data: '资料管理',
  finance: '财务管理',
  product: '商品管理',
  wecom: '企微管理',
  system: '系统管理',
  all: '全部功能',
  call: '电话功能',
  sms: '短信功能',
  ai: 'AI 助手',
  report: '报表功能'
}

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

const deployTypeClass = computed(() => {
  return detailData.value?.deployType === 'saas' ? 'info-saas' : 'info-private'
})

const deployTypeText = computed(() => {
  const dt = detailData.value?.deployType || licenseData.value?.deployType
  if (dt === 'saas') return 'SaaS 云端版'
  if (dt === 'private') return '私有部署版'
  return '-'
})

const licenseTypeText = computed(() => {
  const type = detailData.value?.licenseType || licenseData.value?.licenseType
  if (type === 'perpetual') return '永久买断'
  if (type === 'annual') return '年度授权'
  if (type === 'trial') return '试用版'
  if (type === 'saas') return 'SaaS 订阅'
  if (type === 'private') return '私有部署'
  return type || '-'
})

const userLimitLabel = computed(() => {
  const mode = detailData.value?.userLimitMode
  if (mode === 'online') return '在线席位'
  if (mode === 'both') return '在线席位'
  return '用户数'
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

const storageUsedText = computed(() => {
  const mb = detailData.value?.usedStorageMb || 0
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB'
  return mb.toFixed(1) + ' MB'
})

const storageUsagePercent = computed(() => {
  if (!detailData.value?.maxStorageGb || detailData.value.usedStorageMb == null) return 0
  const usedGb = detailData.value.usedStorageMb / 1024
  return Math.min(100, Math.round((usedGb / detailData.value.maxStorageGb) * 100))
})

const storageUsageColor = computed(() => {
  const percent = storageUsagePercent.value
  if (percent >= 90) return '#F56C6C'
  if (percent >= 70) return '#E6A23C'
  return '#67C23A'
})

const featuresList = computed(() => {
  const f = detailData.value?.features || detailData.value?.packageFeatures
  if (!f) return [] as { code: string; label: string }[]
  let codes: string[] = []
  if (Array.isArray(f)) {
    codes = f.filter((item: any) => typeof item === 'string')
  } else if (typeof f === 'object') {
    codes = Object.entries(f)
      .filter(([, v]) => v)
      .map(([k]) => k)
  }
  return codes.map(code => ({
    code,
    label: featureNameMap[code] || code
  }))
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

const formatDateTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
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
      fullLicenseKey.value = detailData.value?.fullLicenseKey || ''
      showFullLicenseKey.value = false
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

    // 处理未激活的情况（后端返回 success:true + data.activated:false）
    if (res?.activated === false || res?.data?.activated === false) {
      ElMessage.warning(res.message || res?.data?.message || '系统尚未激活，请先输入授权码进行激活')
      await loadLicenseInfo()
      return
    }

    // 显示同步结果
    const msg = res?.message || '授权信息同步成功'
    ElMessage.success(msg)
    // 重新加载显示最新数据
    await loadLicenseInfo()
  } catch (error: any) {
    ElMessage.error(error?.message || '同步失败，请检查网络连接')
    // 同步失败也刷新一下状态
    await loadLicenseInfo()
  } finally {
    syncing.value = false
  }
}

// 激活授权（首次）
const handleActivate = async () => {
  const key = activateLicenseKey.value.trim()
  if (!key) return
  activating.value = true
  activateResult.value = null
  try {
    const res = await request.post('/license/activate', { licenseKey: key }) as any
    activateResult.value = {
      success: true,
      message: res?.message || '系统激活成功',
      defaultAdmin: res?.data?.defaultAdmin
    }
    // 激活成功后重新加载授权信息
    setTimeout(() => loadLicenseInfo(), 1500)
  } catch (error: any) {
    activateResult.value = {
      success: false,
      message: error?.message || '激活失败，请检查授权码是否正确'
    }
  } finally {
    activating.value = false
  }
}

// 重新激活授权码
const handleReactivate = async () => {
  const key = reactivateKey.value.trim()
  if (!key) return
  reactivating.value = true
  reactivateResult.value = null
  try {
    const res = await request.post('/license/activate', { licenseKey: key }) as any
    reactivateResult.value = {
      success: true,
      message: res?.message || '授权码重新激活成功，新的授权信息已生效'
    }
    ElMessage.success('授权码重新激活成功')
    // 重新加载
    setTimeout(async () => {
      await loadLicenseInfo()
      showReactivateDialog.value = false
      reactivateKey.value = ''
      reactivateResult.value = null
    }, 1500)
  } catch (error: any) {
    reactivateResult.value = {
      success: false,
      message: error?.message || '激活失败，请检查授权码是否正确'
    }
  } finally {
    reactivating.value = false
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

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* === 顶部概览卡片 === */
.license-status-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 10px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  transition: box-shadow 0.2s;
}

.status-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.status-card.success { background: #f0f9eb; border-color: #c2e7b0; }
.status-card.warning { background: #fdf6ec; border-color: #f5dab1; }
.status-card.danger  { background: #fef0f0; border-color: #fbc4c4; }
.status-card.info-saas { background: linear-gradient(135deg, #ecf5ff, #f0f9eb); border-color: #b3d8ff; }
.status-card.info-private { background: linear-gradient(135deg, #ecf5ff, #f5f7fa); border-color: #b3d8ff; }

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
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === 使用量进度条 === */
.usage-bars-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.usage-section {
  padding: 14px 16px;
  background: #f8f9fb;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.usage-nums {
  font-weight: 600;
  color: #303133;
}

/* === 详细授权信息 === */
.detail-section {
  margin-top: 24px;
}

.detail-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.detail-value-main {
  font-weight: 600;
  color: #303133;
}

.detail-value-mono {
  font-family: 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  color: #606266;
  letter-spacing: 0.5px;
}

.license-key-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.license-key-action {
  cursor: pointer;
  color: #909399;
  font-size: 15px;
  transition: color 0.2s;
}

.license-key-action:hover {
  color: #409eff;
}

.features-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

/* === 同步说明 === */
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

/* === 预警 alert 中的续费入口 === */
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

.alert-btn-primary { background: #409eff; color: #fff; }
.alert-btn-primary:hover { background: #337ecc; color: #fff; }
.alert-btn-success { background: #67c23a; color: #fff; }
.alert-btn-success:hover { background: #529b2e; color: #fff; }

/* === 未激活区域 === */
.not-activated-section {
  text-align: center;
  padding: 20px 0;
}

.activate-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
}

.activate-hint {
  color: #909399;
  font-size: 14px;
  margin: 0 0 16px;
}

.activate-input-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.activate-result {
  margin-top: 16px;
}

/* === 重新激活弹窗 === */
.reactivate-dialog-content {
  padding: 0 4px;
}

/* === 响应式 === */
@media (max-width: 1024px) {
  .license-status-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .license-status-row {
    grid-template-columns: 1fr;
  }
  .header-actions {
    flex-direction: column;
    gap: 4px;
  }
}
</style>

