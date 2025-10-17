<template>
  <div class="track-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>物流跟踪详情</h2>
          <div class="header-meta">
            <span class="tracking-no">{{ trackingInfo.trackingNo }}</span>
            <el-tag :type="getStatusColor(trackingInfo.status)" size="large">
              {{ getStatusText(trackingInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="handleRefresh" :icon="Refresh" :loading="loading">
          刷新轨迹
        </el-button>
        <el-button @click="handleShare" :icon="Share">
          分享
        </el-button>
        <el-button @click="handlePrint" :icon="Printer">
          打印
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧轨迹信息 -->
      <el-col :span="16">
        <!-- 基本信息卡片 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="label">物流单号：</span>
              <span class="value">{{ trackingInfo.trackingNo }}</span>
            </div>
            <div class="info-item">
              <span class="label">物流公司：</span>
              <span class="value">{{ trackingInfo.companyName }}</span>
            </div>
            <div class="info-item">
              <span class="label">发件人：</span>
              <span class="value">{{ trackingInfo.senderName }}</span>
            </div>
            <div class="info-item">
              <span class="label">收件人：</span>
              <span class="value">{{ trackingInfo.receiverName }}</span>
            </div>
            <div class="info-item">
              <span class="label">发件地址：</span>
              <span class="value">{{ trackingInfo.senderAddress }}</span>
            </div>
            <div class="info-item">
              <span class="label">收件地址：</span>
              <span class="value">{{ trackingInfo.receiverAddress }}</span>
            </div>
            <div class="info-item">
              <span class="label">发货时间：</span>
              <span class="value">{{ trackingInfo.shipTime }}</span>
            </div>
            <div class="info-item">
              <span class="label">预计送达：</span>
              <span class="value">{{ trackingInfo.estimatedTime }}</span>
            </div>
          </div>
        </el-card>

        <!-- 物流轨迹 -->
        <el-card class="track-card">
          <template #header>
            <div class="card-header">
              <span>物流轨迹</span>
              <span class="track-count">共 {{ trackingHistory.length }} 条记录</span>
            </div>
          </template>
          
          <div v-loading="loading" class="track-timeline">
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in trackingHistory"
                :key="index"
                :timestamp="item.time"
                :type="getTimelineType(item.type)"
                :size="index === 0 ? 'large' : 'normal'"
                placement="top"
              >
                <div class="track-item">
                  <div class="track-status" :class="item.type">
                    {{ item.status }}
                  </div>
                  <div class="track-description">
                    {{ item.description }}
                  </div>
                  <div class="track-location" v-if="item.location">
                    <el-icon><Location /></el-icon>
                    {{ item.location }}
                  </div>
                  <div class="track-operator" v-if="item.operator">
                    操作员：{{ item.operator }}
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧信息 -->
      <el-col :span="8">
        <!-- 状态统计 -->
        <el-card class="status-card">
          <template #header>
            <div class="card-header">
              <span>配送进度</span>
            </div>
          </template>
          
          <div class="progress-info">
            <el-progress
              :percentage="getProgressPercentage()"
              :color="getProgressColor()"
              :stroke-width="8"
              text-inside
            />
            <div class="progress-text">
              {{ getProgressText() }}
            </div>
          </div>
        </el-card>

        <!-- 时效信息 -->
        <el-card class="time-card">
          <template #header>
            <div class="card-header">
              <span>时效信息</span>
            </div>
          </template>
          
          <div class="time-info">
            <div class="time-item">
              <span class="label">已用时长：</span>
              <span class="value">{{ getUsedTime() }}</span>
            </div>
            <div class="time-item" v-if="trackingInfo.status !== 'delivered'">
              <span class="label">预计剩余：</span>
              <span class="value">{{ getRemainingTime() }}</span>
            </div>
            <div class="time-item">
              <span class="label">服务标准：</span>
              <span class="value">{{ trackingInfo.serviceType || '标准快递' }}</span>
            </div>
          </div>
        </el-card>

        <!-- 联系信息 -->
        <el-card class="contact-card">
          <template #header>
            <div class="card-header">
              <span>联系信息</span>
            </div>
          </template>
          
          <div class="contact-info">
            <div class="contact-item">
              <span class="label">客服电话：</span>
              <span class="value">{{ trackingInfo.servicePhone || '400-800-8888' }}</span>
            </div>
            <div class="contact-item">
              <span class="label">投诉电话：</span>
              <span class="value">{{ trackingInfo.complaintPhone || '400-800-9999' }}</span>
            </div>
            <div class="contact-item">
              <span class="label">官方网站：</span>
              <el-link :href="trackingInfo.website" target="_blank" type="primary">
                {{ trackingInfo.website || 'www.express.com' }}
              </el-link>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft,
  Refresh,
  Share,
  Printer,
  Location
} from '@element-plus/icons-vue'

// 路由
const router = useRouter()
const route = useRoute()

// 响应式数据
const loading = ref(false)

// 超时ID跟踪
const timeoutIds = new Set<number>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 物流信息
const trackingInfo = reactive({
  trackingNo: '',
  companyName: '',
  companyCode: '',
  senderName: '',
  senderAddress: '',
  receiverName: '',
  receiverAddress: '',
  shipTime: '',
  estimatedTime: '',
  status: '',
  serviceType: '',
  servicePhone: '',
  complaintPhone: '',
  website: ''
})

// 物流轨迹
const trackingHistory = ref([])

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap = {
    'pending': 'info',
    'picked_up': 'warning',
    'in_transit': 'primary',
    'out_for_delivery': 'warning',
    'delivered': 'success',
    'exception': 'danger',
    'returned': 'info'
  }
  return colorMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap = {
    'pending': '待发货',
    'picked_up': '已揽收',
    'in_transit': '运输中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'returned': '已退回'
  }
  return textMap[status] || '未知状态'
}

/**
 * 获取时间轴类型
 */
const getTimelineType = (type: string) => {
  const typeMap = {
    'success': 'success',
    'warning': 'warning',
    'danger': 'danger',
    'info': 'primary'
  }
  return typeMap[type] || 'primary'
}

/**
 * 获取进度百分比
 */
const getProgressPercentage = () => {
  const statusMap = {
    'pending': 0,
    'picked_up': 20,
    'in_transit': 60,
    'out_for_delivery': 80,
    'delivered': 100,
    'exception': 50,
    'returned': 0
  }
  return statusMap[trackingInfo.status] || 0
}

/**
 * 获取进度颜色
 */
const getProgressColor = () => {
  const colorMap = {
    'pending': '#909399',
    'picked_up': '#E6A23C',
    'in_transit': '#409EFF',
    'out_for_delivery': '#E6A23C',
    'delivered': '#67C23A',
    'exception': '#F56C6C',
    'returned': '#909399'
  }
  return colorMap[trackingInfo.status] || '#909399'
}

/**
 * 获取进度文本
 */
const getProgressText = () => {
  return getStatusText(trackingInfo.status)
}

/**
 * 获取已用时长
 */
const getUsedTime = () => {
  if (!trackingInfo.shipTime) return '-'
  
  const shipTime = new Date(trackingInfo.shipTime)
  const now = new Date()
  const diff = now.getTime() - shipTime.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return `${days}天${hours}小时`
  } else {
    return `${hours}小时`
  }
}

/**
 * 获取剩余时长
 */
const getRemainingTime = () => {
  if (!trackingInfo.estimatedTime) return '-'
  
  const estimatedTime = new Date(trackingInfo.estimatedTime)
  const now = new Date()
  const diff = estimatedTime.getTime() - now.getTime()
  
  if (diff <= 0) return '已超时'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return `${days}天${hours}小时`
  } else {
    return `${hours}小时`
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.back()
}

/**
 * 刷新轨迹
 */
const handleRefresh = () => {
  loadTrackingData()
}

/**
 * 分享
 */
const handleShare = () => {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success('链接已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制链接')
  })
}

/**
 * 打印
 */
const handlePrint = () => {
  window.print()
}

/**
 * 加载物流数据
 */
const loadTrackingData = async () => {
  if (isUnmounted.value) return
  
  loading.value = true
  
  try {
    const trackingNo = route.params.trackingNo || route.query.trackingNo
    const companyCode = route.query.company
    
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 1000)
      timeoutIds.add(timeoutId)
    })
    
    // 检查组件是否已卸载
    if (isUnmounted.value) return
    
    // 模拟数据
    Object.assign(trackingInfo, {
      trackingNo: trackingNo || 'SF1234567890123',
      companyName: '顺丰速运',
      companyCode: companyCode || 'SF',
      senderName: '北京总仓',
      senderAddress: '北京市朝阳区建国路88号',
      receiverName: '张三',
      receiverAddress: '上海市浦东新区陆家嘴环路1000号',
      shipTime: '2024-01-10 09:30:00',
      estimatedTime: '2024-01-12 18:00:00',
      status: 'delivered',
      serviceType: '顺丰特快',
      servicePhone: '95338',
      complaintPhone: '400-889-5338',
      website: 'https://www.sf-express.com'
    })
    
    // 模拟物流轨迹
    trackingHistory.value = [
      {
        time: '2024-01-12 14:30:00',
        status: '已签收',
        description: '您的快件已由本人签收，感谢使用顺丰速运',
        location: '上海市浦东新区',
        operator: '张配送员',
        type: 'success'
      },
      {
        time: '2024-01-12 09:15:00',
        status: '派送中',
        description: '快件正在派送途中，配送员将尽快与您联系',
        location: '上海市浦东新区营业点',
        operator: '张配送员',
        type: 'warning'
      },
      {
        time: '2024-01-12 06:20:00',
        status: '到达目的地',
        description: '快件已到达目的地分拣中心',
        location: '上海浦东分拣中心',
        type: 'info'
      },
      {
        time: '2024-01-11 22:45:00',
        status: '运输中',
        description: '快件正在从北京运往上海',
        location: '北京分拣中心',
        type: 'info'
      },
      {
        time: '2024-01-11 15:30:00',
        status: '已发出',
        description: '快件已从北京分拣中心发出',
        location: '北京分拣中心',
        type: 'info'
      },
      {
        time: '2024-01-10 09:30:00',
        status: '已揽收',
        description: '顺丰速运已收取快件',
        location: '北京市朝阳区营业点',
        operator: '李收件员',
        type: 'info'
      }
    ]
    
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('加载物流信息失败')
    }
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadTrackingData()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 设置组件卸载状态
  isUnmounted.value = true
  
  // 清理所有未完成的 setTimeout
  timeoutIds.forEach(id => clearTimeout(id))
  timeoutIds.clear()
})
</script>

<style scoped>
.track-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-info h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tracking-no {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #409EFF;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.info-card,
.track-card,
.status-card,
.time-card,
.contact-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-count {
  color: #909399;
  font-size: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  color: #909399;
  margin-right: 8px;
  min-width: 80px;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
}

.track-timeline {
  padding: 20px 0;
}

.track-item {
  padding-left: 20px;
}

.track-status {
  font-weight: bold;
  margin-bottom: 8px;
}

.track-status.success {
  color: #67C23A;
}

.track-status.warning {
  color: #E6A23C;
}

.track-status.danger {
  color: #F56C6C;
}

.track-status.info {
  color: #409EFF;
}

.track-description {
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
}

.track-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 14px;
  margin-bottom: 4px;
}

.track-operator {
  color: #909399;
  font-size: 14px;
}

.progress-info {
  text-align: center;
}

.progress-text {
  margin-top: 15px;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.time-info,
.contact-info {
  space-y: 12px;
}

.time-item,
.contact-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #F5F7FA;
}

.time-item:last-child,
.contact-item:last-child {
  border-bottom: none;
}

.time-item .label,
.contact-item .label {
  color: #909399;
}

.time-item .value,
.contact-item .value {
  color: #303133;
  font-weight: 500;
}

@media print {
  .page-header .header-actions {
    display: none;
  }
  
  .track-detail {
    padding: 0;
  }
}
</style>