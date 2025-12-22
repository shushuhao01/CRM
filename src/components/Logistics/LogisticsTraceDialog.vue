<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`物流轨迹 - ${trackingNo}`"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="trace-container">
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
        v-if="errorMessage"
        :title="errorMessage"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 物流轨迹时间线 -->
      <div class="trace-timeline" v-if="traceResult && traceResult.traces.length > 0">
        <el-timeline>
          <el-timeline-item
            v-for="(trace, index) in traceResult.traces"
            :key="index"
            :timestamp="trace.time"
            :type="index === 0 ? 'primary' : 'info'"
            :size="index === 0 ? 'large' : 'normal'"
            placement="top"
          >
            <div class="trace-item">
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
        v-else-if="!loading && !errorMessage"
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
}

const props = withDefaults(defineProps<Props>(), {
  companyCode: ''
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

// 监听visible变化，自动查询
watch(() => props.visible, (newVal) => {
  if (newVal && props.trackingNo) {
    queryTrace()
  }
})

// 监听trackingNo变化
watch(() => props.trackingNo, (newVal) => {
  if (props.visible && newVal) {
    queryTrace()
  }
})

/**
 * 查询物流轨迹
 */
const queryTrace = async () => {
  if (!props.trackingNo) return

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await logisticsApi.queryTrace(props.trackingNo, props.companyCode || undefined)

    console.log('[物流轨迹弹窗] API响应:', response)

    if (response.success && response.data) {
      traceResult.value = response.data

      // 🔥 检查业务层面是否成功
      if (!response.data.success) {
        errorMessage.value = response.data.statusText || '查询失败'
      }
    } else {
      errorMessage.value = response.message || '查询失败'
    }
  } catch (error) {
    console.error('查询物流轨迹失败:', error)
    errorMessage.value = '查询失败: ' + (error instanceof Error ? error.message : '未知错误')
  } finally {
    loading.value = false
  }
}

/**
 * 刷新轨迹
 */
const handleRefresh = async () => {
  if (!props.trackingNo) return

  refreshing.value = true

  try {
    const response = await logisticsApi.refreshTrace(props.trackingNo, props.companyCode || undefined)

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
  padding-left: 10px;
}

.trace-status {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.trace-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 6px;
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
</style>
