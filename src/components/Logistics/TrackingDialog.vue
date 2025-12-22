<template>
  <el-dialog
    v-model="visible"
    title="物流轨迹"
    width="600px"
    @close="handleClose"
  >
    <!-- 手机号验证提示 -->
    <el-alert
      v-if="needPhoneVerify"
      title="该运单需要手机号验证才能查询物流轨迹"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template #default>
        <div class="phone-verify-form">
          <span>请输入收件人或寄件人手机号后4位：</span>
          <el-input
            v-model="phoneInput"
            placeholder="手机号后4位"
            maxlength="4"
            style="width: 120px; margin: 0 8px"
            @keyup.enter="handleRetryWithPhone"
          />
          <el-button type="primary" size="small" @click="handleRetryWithPhone" :loading="loading">
            查询
          </el-button>
        </div>
      </template>
    </el-alert>

    <div class="tracking-header">
      <div class="tracking-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="快递单号">
            <el-tag type="primary">{{ trackingNo }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="物流公司">
            {{ logisticsCompany || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(currentStatus)">
              {{ getStatusText(currentStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ lastUpdateTime || '暂无数据' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <div class="tracking-content">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="trackingList.length === 0 && !needPhoneVerify" class="empty-container">
        <el-empty description="暂无物流轨迹信息" />
      </div>

      <div v-else-if="trackingList.length > 0" class="timeline-container">
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in trackingList"
            :key="index"
            :timestamp="item.time"
            :type="getTimelineType(item, index)"
            :size="index === 0 ? 'large' : 'normal'"
            placement="top"
          >
            <el-card class="timeline-card" :class="{ 'latest': index === 0 }">
              <div class="timeline-content">
                <div class="timeline-description">
                  {{ item.description }}
                </div>
                <div v-if="item.location" class="timeline-location">
                  <el-icon><Location /></el-icon>
                  {{ item.location }}
                </div>
                <div v-if="item.operator" class="timeline-operator">
                  <el-icon><User /></el-icon>
                  操作员：{{ item.operator }}
                </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Location, User, Refresh } from '@element-plus/icons-vue'
import { logisticsApi } from '@/api/logistics'

interface Props {
  modelValue: boolean
  trackingNo: string
  logisticsCompany?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

interface TrackingInfo {
  time: string
  description: string
  location?: string
  operator?: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const loading = ref(false)
const trackingList = ref<TrackingInfo[]>([])
const needPhoneVerify = ref(false)
const phoneInput = ref('')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 计算属性
const currentStatus = computed(() => {
  if (trackingList.value.length === 0) return ''
  const latest = trackingList.value[0]

  // 根据描述判断状态
  const description = latest.description.toLowerCase()
  if (description.includes('签收') || description.includes('已收货')) {
    return 'delivered'
  } else if (description.includes('拒收') || description.includes('拒绝')) {
    return 'rejected'
  } else if (description.includes('派送') || description.includes('配送')) {
    return 'delivering'
  } else if (description.includes('运输') || description.includes('转运')) {
    return 'shipping'
  } else if (description.includes('揽收') || description.includes('收件')) {
    return 'picked'
  }
  return 'unknown'
})

const lastUpdateTime = computed(() => {
  if (trackingList.value.length === 0) return ''
  return trackingList.value[0].time
})

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    delivered: '已签收',
    rejected: '拒收',
    delivering: '派送中',
    shipping: '运输中',
    picked: '已揽收',
    unknown: '未知状态'
  }
  return statusMap[status] || status
}

// 获取状态类型
const getStatusType = (status: string): string => {
  const statusMap: Record<string, string> = {
    delivered: 'success',
    rejected: 'danger',
    delivering: 'warning',
    shipping: 'info',
    picked: 'primary',
    unknown: 'info'
  }
  return statusMap[status] || 'info'
}

// 获取时间线类型
const getTimelineType = (item: TrackingInfo, index: number): string => {
  if (index === 0) {
    // 最新状态
    const description = item.description.toLowerCase()
    if (description.includes('签收')) return 'success'
    if (description.includes('拒收')) return 'danger'
    if (description.includes('派送')) return 'warning'
    return 'primary'
  }
  return 'info'
}

// 获取物流轨迹
const fetchTrackingInfo = async (phone?: string) => {
  if (!props.trackingNo) return

  loading.value = true
  needPhoneVerify.value = false

  try {
    // 🔥 直接调用物流API，支持手机号验证
    const response = await logisticsApi.queryTrace(
      props.trackingNo,
      props.logisticsCompany,
      phone
    )

    console.log('[物流轨迹弹窗] API响应:', response)

    if (response && response.success && response.data) {
      const data = response.data

      // 🔥 检查是否需要手机号验证
      if (data.status === 'need_phone_verify' ||
          (!data.success && data.statusText === '需要手机号验证')) {
        needPhoneVerify.value = true
        trackingList.value = []
        return
      }

      if (data.success && data.traces && data.traces.length > 0) {
        trackingList.value = data.traces.map((item: any) => ({
          time: item.time,
          description: item.description || item.status,
          location: item.location,
          operator: item.operator
        }))
      } else {
        trackingList.value = []
        if (data.statusText && !data.success) {
          ElMessage.warning(data.statusText)
        }
      }
    } else {
      trackingList.value = []
      ElMessage.warning(response?.message || '获取物流轨迹失败')
    }
  } catch (error) {
    console.error('获取物流轨迹失败:', error)
    ElMessage.error('获取物流轨迹失败，请重试')
    trackingList.value = []
  } finally {
    loading.value = false
  }
}

// 使用手机号重新查询
const handleRetryWithPhone = () => {
  if (!phoneInput.value || phoneInput.value.length !== 4) {
    ElMessage.warning('请输入手机号后4位')
    return
  }
  fetchTrackingInfo(phoneInput.value)
}

// 刷新物流轨迹
const handleRefresh = () => {
  phoneInput.value = ''
  fetchTrackingInfo()
}

// 处理关闭
const handleClose = () => {
  visible.value = false
  needPhoneVerify.value = false
  phoneInput.value = ''
}

// 监听弹窗打开，获取物流轨迹
watch(visible, (newVal) => {
  if (newVal && props.trackingNo) {
    needPhoneVerify.value = false
    phoneInput.value = ''
    fetchTrackingInfo()
  }
})

// 监听快递单号变化
watch(() => props.trackingNo, (newVal) => {
  if (newVal && visible.value) {
    needPhoneVerify.value = false
    phoneInput.value = ''
    fetchTrackingInfo()
  }
})
</script>

<style scoped>
.tracking-header {
  margin-bottom: 20px;
}

.tracking-content {
  max-height: 500px;
  overflow-y: auto;
}

.loading-container,
.empty-container {
  padding: 40px 0;
  text-align: center;
}

.timeline-container {
  padding: 10px 0;
}

.timeline-card {
  margin-bottom: 0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.timeline-card.latest {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.1);
}

.timeline-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.timeline-content {
  padding: 5px 0;
}

.timeline-description {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.timeline-location,
.timeline-operator {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.timeline-location .el-icon,
.timeline-operator .el-icon {
  margin-right: 4px;
  font-size: 12px;
}

.dialog-footer {
  text-align: right;
}

.phone-verify-form {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

:deep(.el-timeline-item__node--large) {
  width: 16px;
  height: 16px;
}

:deep(.el-timeline-item__content) {
  padding-left: 20px;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}
</style>
