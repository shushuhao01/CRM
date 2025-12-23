<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`物流轨迹 - ${trackingNo}`"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="trace-container">
      <!-- 顺丰手机号验证提示 -->
      <el-alert
        v-if="needPhoneVerify && !traceResult?.success"
        title="顺丰运单需要手机号验证"
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
              重新查询
            </el-button>
          </div>
        </template>
      </el-alert>

      <!-- 基本信息 -->
      <div class="trace-header" v-if="traceResult">
        <div class="header-info">
          <div class="company-info">
            <span class="company-name">{{ traceResult.companyName }}</span>
            <el-tag :type="getStatusType(traceResult.status)" size="small">
              {{ traceResult.statusText }}
            </el-tag>
          </div>
          <div class="tracking-no">单号：{{ traceResult.trackingNo }}</div>
        </div>
        <el-button @click="handleRefresh" :loading="refreshing" size="small">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="errorMessage && !needPhoneVerify"
        :title="errorMessage"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 物流轨迹时间线（🔥 确保最新的在最上面） -->
      <div class="trace-timeline" v-if="traceResult && traceResult.traces.length > 0">
        <el-timeline>
          <el-timeline-item
            v-for="(trace, index) in sortedTraces"
            :key="index"
            :timestamp="trace.time"
            :type="index === 0 ? 'primary' : 'info'"
            :size="index === 0 ? 'large' : 'normal'"
            placement="top"
          >
            <div class="trace-item" :class="{ 'trace-item-first': index === 0 }">
              <div class="trace-status">{{ trace.status }}</div>
              <div class="trace-desc">{{ trace.description }}</div>
              <div class="trace-meta" v-if="trace.location || trace.operator">
                <span v-if="trace.location" class="trace-location">
                  <el-icon><Location /></el-icon>
                  {{ trace.location }}
                </span>
                <span v-if="trace.operator" class="trace-operator">
                  <el-icon><User /></el-icon>
                  {{ trace.operator }}
                </span>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-else-if="!loading && !errorMessage && !needPhoneVerify"
        description="暂无物流轨迹信息"
        :image-size="100"
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleViewDetail" type="primary" plain>
          查看详情
        </el-button>
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Location, User } from '@element-plus/icons-vue'
import { logisticsApi, type LogisticsTrackResult } from '@/api/logistics'

interface Props {
  visible: boolean
  trackingNo: string
  companyCode?: string
  phone?: string  // 可选的手机号参数
}

const props = withDefaults(defineProps<Props>(), {
  companyCode: '',
  phone: ''
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const router = useRouter()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const loading = ref(false)
const refreshing = ref(false)
const errorMessage = ref('')
const traceResult = ref<LogisticsTrackResult | null>(null)
const phoneInput = ref('')  // 用户输入的手机号后4位
const needPhoneVerify = ref(false)  // 是否需要手机号验证

/**
 * 🔥 计算属性：按时间倒序排列的轨迹（最新的在最上面）
 * 同时去重，避免重复显示
 */
const sortedTraces = computed(() => {
  if (!traceResult.value?.traces?.length) return []

  // 去重：根据时间和描述去重
  const seen = new Set<string>()
  const uniqueTraces = traceResult.value.traces.filter(trace => {
    const key = `${trace.time}-${trace.description}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // 按时间排序（倒序，最新的在前面）
  return [...uniqueTraces].sort((a, b) => {
    // 🔥 改进时间解析，支持多种格式
    const parseTime = (timeStr: string): number => {
      if (!timeStr) return 0
      // 尝试直接解析
      let time = new Date(timeStr).getTime()
      if (!isNaN(time)) return time
      // 尝试替换中文格式
      const normalized = timeStr.replace(/年|月/g, '-').replace(/日/g, ' ')
      time = new Date(normalized).getTime()
      return isNaN(time) ? 0 : time
    }
    const timeA = parseTime(a.time)
    const timeB = parseTime(b.time)
    return timeB - timeA  // 倒序
  })
})

// 监听visible变化，自动查询
watch(() => props.visible, (newVal) => {
  if (newVal && props.trackingNo) {
    // 重置状态
    phoneInput.value = ''
    needPhoneVerify.value = false
    queryTrace()
  }
})

// 监听trackingNo变化
watch(() => props.trackingNo, (newVal) => {
  if (props.visible && newVal) {
    phoneInput.value = ''
    needPhoneVerify.value = false
    queryTrace()
  }
})

/**
 * 查询物流轨迹
 */
const queryTrace = async (phone?: string) => {
  if (!props.trackingNo) return

  loading.value = true
  errorMessage.value = ''
  needPhoneVerify.value = false

  try {
    // 使用传入的手机号或props中的手机号
    const phoneToUse = phone || props.phone || undefined
    const response = await logisticsApi.queryTrace(props.trackingNo, props.companyCode || undefined, phoneToUse)

    console.log('[物流轨迹弹窗] API响应:', response)

    if (response.success && response.data) {
      const data = response.data

      // 🔥 根据最新轨迹判断真实状态
      if (data.success && data.traces && data.traces.length > 0) {
        // 先按时间排序找到最新的轨迹
        const sortedTraces = [...data.traces].sort((a, b) => {
          const timeA = new Date(a.time).getTime()
          const timeB = new Date(b.time).getTime()
          return timeB - timeA
        })
        const latestTrace = sortedTraces[0]

        // 根据最新轨迹判断状态
        let realStatus = data.status || 'in_transit'
        let realStatusText = data.statusText || '运输中'

        if (latestTrace.description?.includes('签收') ||
            latestTrace.description?.includes('已签收') ||
            latestTrace.description?.includes('已送达') ||
            latestTrace.description?.includes('代收') ||
            latestTrace.status === '80' ||
            latestTrace.status === '8000') {
          realStatus = 'delivered'
          realStatusText = '已签收'
        } else if (latestTrace.description?.includes('派送') ||
                   latestTrace.description?.includes('派件')) {
          realStatus = 'out_for_delivery'
          realStatusText = '派送中'
        } else if (latestTrace.description?.includes('到达') ||
                   latestTrace.description?.includes('运输')) {
          realStatus = 'in_transit'
          realStatusText = '运输中'
        } else if (latestTrace.description?.includes('揽收') ||
                   latestTrace.description?.includes('收件')) {
          realStatus = 'picked_up'
          realStatusText = '已揽收'
        }

        // 更新状态
        data.status = realStatus
        data.statusText = realStatusText
      }

      traceResult.value = data

      // 🔥 检查业务层面是否成功
      if (!data.success) {
        // 🔥 检查是否需要手机号验证
        // 1. 后端返回 need_phone_verify 状态
        // 2. 或者是顺丰运单且routes为空
        if (data.status === 'need_phone_verify' ||
            (data.companyCode === 'SF' &&
             (data.statusText?.includes('routes为空') ||
              data.statusText?.includes('未查询到物流轨迹') ||
              data.traces.length === 0))) {
          needPhoneVerify.value = true
          errorMessage.value = '该运单需要手机号验证才能查询'
        } else {
          // 🔥 给出友好提示，而不是显示技术性错误
          errorMessage.value = getFriendlyNoTraceMessage(data.statusText)
        }
      }
    } else {
      // 🔥 给出友好提示
      errorMessage.value = getFriendlyNoTraceMessage(response.message)
    }
  } catch (error) {
    console.error('查询物流轨迹失败:', error)
    errorMessage.value = '查询失败: ' + (error instanceof Error ? error.message : '未知错误')
  } finally {
    loading.value = false
  }
}

/**
 * 使用手机号重新查询
 */
const handleRetryWithPhone = () => {
  if (!phoneInput.value || phoneInput.value.length !== 4) {
    ElMessage.warning('请输入手机号后4位')
    return
  }
  queryTrace(phoneInput.value)
}

/**
 * 刷新轨迹
 */
const handleRefresh = async () => {
  if (!props.trackingNo) return

  refreshing.value = true

  try {
    // 🔥 刷新时也要传递手机号
    const phoneToUse = phoneInput.value || props.phone || undefined
    console.log('[物流轨迹弹窗] 刷新物流，使用手机号:', phoneToUse ? phoneToUse.slice(-4) + '****' : '未提供')

    const response = await logisticsApi.queryTrace(props.trackingNo, props.companyCode || undefined, phoneToUse)

    if (response.success && response.data) {
      traceResult.value = response.data
      ElMessage.success('刷新成功')
    } else {
      ElMessage.warning(response.message || '刷新失败')
    }
  } catch (_error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

/**
 * 获取状态类型
 */
const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'delivered': 'success',
    'out_for_delivery': 'warning',
    'in_transit': 'primary',
    'picked_up': 'info',
    'exception': 'danger',
    'rejected': 'danger',
    'returned': 'info'
  }
  return typeMap[status] || 'info'
}

/**
 * 🔥 获取友好的无物流信息提示
 * 针对刚发货的订单给出更友好的提示
 */
const getFriendlyNoTraceMessage = (originalMessage?: string) => {
  // 如果是API未配置等技术性错误，给出友好提示
  if (originalMessage?.includes('API未配置') ||
      originalMessage?.includes('未查询到') ||
      originalMessage?.includes('routes为空') ||
      originalMessage?.includes('查询失败') ||
      !originalMessage) {
    return '暂无物流信息，快递可能刚揽收，建议12-24小时后再查询'
  }
  // 其他情况返回原始消息
  return originalMessage
}

/**
 * 查看详情
 */
const handleViewDetail = () => {
  router.push({
    path: '/logistics/track',
    query: {
      trackingNo: props.trackingNo,
      company: props.companyCode
    }
  })
  handleClose()
}

/**
 * 关闭弹窗
 */
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.trace-container {
  min-height: 200px;
}

.trace-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.header-info {
  flex: 1;
}

.company-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.company-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.tracking-no {
  font-size: 14px;
  color: #606266;
  font-family: 'Courier New', monospace;
}

.trace-timeline {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
}

.trace-item {
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #dcdfe6;
  transition: all 0.3s ease;
}

.trace-item:hover {
  background: #f0f2f5;
}

.trace-item-first {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9eb 100%);
  border-left-color: #409eff;
}

.trace-status {
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.trace-item-first .trace-status {
  color: #409eff;
}

.trace-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
}

.trace-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.trace-location,
.trace-operator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.phone-verify-form {
  display: flex;
  align-items: center;
  margin-top: 8px;
}
</style>
