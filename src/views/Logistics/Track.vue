<template>
  <div class="logistics-track">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>物流跟踪</h2>
      <div class="header-actions">
        <el-button @click="handleExport" :icon="Download">
          导出轨迹
        </el-button>
      </div>
    </div>

    <!-- 查询区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="物流单号">
          <el-input
            v-model="searchForm.trackingNo"
            placeholder="请输入物流单号"
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select
            v-model="searchForm.company"
            placeholder="请选择物流公司"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="company in logisticsCompanies"
              :key="company.code"
              :label="company.name"
              :value="company.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary" :icon="Search" :loading="loading">
            查询轨迹
          </el-button>
          <el-button @click="handleReset" :icon="Refresh">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 跟踪结果 -->
    <el-card v-if="trackingResult.trackingNo" class="result-card">
      <template #header>
        <div class="card-header">
          <div class="header-info">
            <h3>{{ trackingResult.trackingNo }}</h3>
            <el-tag :style="getOrderStatusStyle(trackingResult.status)" size="large" effect="plain">
              {{ getUnifiedStatusText(trackingResult.status) }}
            </el-tag>
          </div>
          <div class="header-actions">
            <el-button @click="handleViewDetail" type="primary" size="small">
              查看详情
            </el-button>
            <el-button @click="refreshTracking" :icon="Refresh" size="small" :loading="refreshLoading">
              刷新轨迹
            </el-button>
          </div>
        </div>
      </template>

      <!-- 基本信息 -->
      <div class="basic-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">物流公司：</span>
            <span class="value">{{ trackingResult.companyName }}</span>
          </div>
          <div class="info-item">
            <span class="label">收货人：</span>
            <span class="value">{{ trackingResult.receiverName }}</span>
          </div>
          <div class="info-item">
            <span class="label">联系电话：</span>
            <span class="value">{{ trackingResult.receiverPhone }}</span>
          </div>
          <div class="info-item">
            <span class="label">收货地址：</span>
            <span class="value">{{ trackingResult.receiverAddress }}</span>
          </div>
          <div class="info-item">
            <span class="label">发货时间：</span>
            <span class="value">{{ trackingResult.shipTime }}</span>
          </div>
          <div class="info-item">
            <span class="label">预计送达：</span>
            <span class="value">{{ trackingResult.estimatedTime }}</span>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 物流轨迹 -->
      <div class="tracking-timeline">
        <h4>物流轨迹</h4>
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in trackingHistory"
            :key="index"
            :timestamp="item.time"
            :type="index === 0 ? 'primary' : 'info'"
            :size="index === 0 ? 'large' : 'normal'"
            placement="top"
          >
            <div class="timeline-content" :class="{ 'timeline-content-first': index === 0 }">
              <div class="timeline-status">{{ item.status }}</div>
              <div class="timeline-desc">{{ item.description }}</div>
              <div class="timeline-meta">
                <div class="timeline-location" v-if="item.location">
                  <el-icon><Location /></el-icon>
                  <span>{{ item.location }}</span>
                </div>
                <div class="timeline-operator" v-if="item.operator">
                  <el-icon><User /></el-icon>
                  <span>{{ item.operator }}</span>
                </div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>

    <!-- 空状态 -->
    <el-empty v-else description="请输入物流单号查询轨迹信息" />

    <!-- 批量查询对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量查询"
      width="600px"
    >
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="物流单号">
          <el-input
            v-model="batchForm.trackingNos"
            type="textarea"
            :rows="6"
            placeholder="请输入物流单号，每行一个"
          />
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select
            v-model="batchForm.company"
            placeholder="请选择物流公司"
            style="width: 100%"
          >
            <el-option
              v-for="company in logisticsCompanies"
              :key="company.code"
              :label="company.name"
              :value="company.code"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchDialogVisible = false">取消</el-button>
          <el-button @click="handleBatchQuery" type="primary" :loading="batchLoading">
            批量查询
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 手机号验证对话框（统一组件） -->
    <PhoneVerifyDialog
      v-model:visible="phoneVerifyDialogVisible"
      :tracking-no="pendingTrackingNo"
      :loading="loading"
      @submit="handlePhoneVerifySubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import PhoneVerifyDialog from '@/components/Logistics/PhoneVerifyDialog.vue'
import {
  Search,
  Refresh,
  Download,
  Location,
  User,
  Box,
  Check,
  Warning
} from '@element-plus/icons-vue'

// 路由
const route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 响应式数据
const loading = ref(false)
const refreshLoading = ref(false)
const batchLoading = ref(false)
const batchDialogVisible = ref(false)

// 手机号验证相关
const phoneVerifyDialogVisible = ref(false)
const pendingTrackingNo = ref('')
const pendingCompanyCode = ref('')

// 超时ID跟踪，用于清理异步操作
const timeoutIds = new Set<NodeJS.Timeout>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 搜索表单
const searchForm = reactive({
  trackingNo: '',
  company: ''
})

// 批量查询表单
const batchForm = reactive({
  trackingNos: '',
  company: ''
})

// 跟踪结果
const trackingResult = reactive({
  trackingNo: '',
  companyName: '',
  status: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  shipTime: '',
  estimatedTime: ''
})

// 物流轨迹
interface TrackingItem {
  time: string
  status: string
  description: string
  location: string
  operator: string
  type: string
}
const trackingHistory = ref<TrackingItem[]>([])

// 物流公司列表 - 从API获取
const logisticsCompanies = ref<Array<{ code: string; name: string }>>([])
const loadingCompanies = ref(false)

// 从API加载物流公司列表
const loadLogisticsCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.get('/logistics/companies/active')

    if (response && Array.isArray(response)) {
      logisticsCompanies.value = response.map((item: { code: string; name: string }) => ({
        code: item.code,
        name: item.name
      }))
      console.log('[物流跟踪] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else if (response && response.data && Array.isArray(response.data)) {
      logisticsCompanies.value = response.data.map((item: { code: string; name: string }) => ({
        code: item.code,
        name: item.name
      }))
      console.log('[物流跟踪] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else {
      console.warn('[物流跟踪] API返回数据格式异常，使用默认列表')
      useDefaultCompanies()
    }
  } catch (error) {
    console.error('[物流跟踪] 加载物流公司列表失败:', error)
    useDefaultCompanies()
  } finally {
    loadingCompanies.value = false
  }
}

// 使用默认物流公司列表（API失败时的备用）
const useDefaultCompanies = () => {
  logisticsCompanies.value = [
    { code: 'SF', name: '顺丰速运' },
    { code: 'YTO', name: '圆通速递' },
    { code: 'ZTO', name: '中通快递' },
    { code: 'STO', name: '申通快递' },
    { code: 'YD', name: '韵达速递' },
    { code: 'HTKY', name: '百世快递' },
    { code: 'JD', name: '京东物流' },
    { code: 'EMS', name: '中国邮政' }
  ]
}

/**
 * 🔥 手机号加密显示
 */
const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 7) return phone
  // 保留前3位和后4位，中间用*替换
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'pending': 'info',
    'shipped': 'warning',
    'in_transit': 'primary',
    'delivering': 'primary',
    'delivered': 'success',
    'exception': 'danger'
  }
  return colorMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'pending': '待发货',
    'shipped': '已发货',
    'picked_up': '已揽收',
    'in_transit': '运输中',
    'delivering': '派送中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '异常'
  }
  return textMap[status] || '未知'
}

/**
 * 获取时间轴图标
 */
const getTimelineIcon = (status: string) => {
  const iconMap: Record<string, any> = {
    '已签收': Check,
    '派送中': Box,
    '运输中': Box,
    '已发货': Box,
    '异常': Warning
  }
  return iconMap[status] || Box
}

/**
 * 查询物流轨迹 - 简化版
 * 前端只传单号和可选的物流公司，后端自动匹配手机号
 */
const handleSearch = async (phone?: string) => {
  const trackingNum = searchForm.trackingNo.trim()

  if (!trackingNum) {
    ElMessage.warning('请输入物流单号')
    return
  }

  if (isUnmounted.value) return

  loading.value = true

  try {
    const companyCode = searchForm.company || undefined

    // 直接调用后端API，后端会自动：
    // 1. 根据单号匹配物流公司
    // 2. 从数据库查询订单获取手机号
    // 3. 调用物流API返回结果
    const { logisticsApi } = await import('@/api/logistics')
    const response = await logisticsApi.queryTrace(trackingNum, companyCode, phone)

    if (!response?.success || !response.data) {
      ElMessage.info(response?.message || '暂无物流信息')
      return
    }

    const data = response.data

    // 需要手机号验证
    if (data.status === 'need_phone_verify' || data.statusText?.includes('手机号') || data.statusText?.includes('可能原因')) {
      pendingTrackingNo.value = trackingNum
      pendingCompanyCode.value = companyCode || ''
      phoneVerifyDialogVisible.value = true
      return
    }

    // 查询失败
    if (!data.success) {
      ElMessage.info(getFriendlyNoTraceMessage(data.statusText))
      return
    }

    // 处理轨迹数据
    if (data.traces?.length > 0) {
      // 去重并排序
      const seen = new Set<string>()
      trackingHistory.value = data.traces
        .filter((t: any) => {
          const key = `${t.time}-${t.description}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .map((t: any) => ({
          time: t.time,
          status: t.status,
          description: t.description,
          location: t.location || '',
          operator: t.operator || '',
          type: getTraceType(t.status)
        }))
        .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())
    } else {
      trackingHistory.value = []
    }

    // 判断状态
    let realStatus = data.status || 'shipped'
    let deliveredTime = ''
    if (trackingHistory.value.length > 0) {
      const latest = trackingHistory.value[0]
      if (latest.description?.includes('签收') || latest.description?.includes('代收')) {
        realStatus = 'delivered'
        deliveredTime = latest.time
      } else if (latest.description?.includes('派送')) {
        realStatus = 'out_for_delivery'
      } else if (latest.description?.includes('运输') || latest.description?.includes('到达')) {
        realStatus = 'in_transit'
      }
    }

    // 更新结果
    Object.assign(trackingResult, {
      trackingNo: data.trackingNo || trackingNum,
      companyName: data.companyName || getCompanyName(data.companyCode) || '',
      status: realStatus,
      receiverName: '',
      receiverPhone: '',
      receiverAddress: '',
      shipTime: '',
      estimatedTime: realStatus === 'delivered' ? (deliveredTime ? `已签收 (${deliveredTime})` : '已签收') : (data.estimatedDeliveryTime || '')
    })

    // 补充订单信息
    try {
      const { orderApi } = await import('@/api/order')
      const orderRes = await orderApi.getOrderByTrackingNo(trackingNum)
      if (orderRes?.success && orderRes.data) {
        const o = orderRes.data as any
        trackingResult.receiverName = o.customerName || ''
        trackingResult.receiverPhone = maskPhoneNumber(o.receiverPhone || o.phone || o.customerPhone || '')
        trackingResult.receiverAddress = o.shippingAddress || o.address || ''
        trackingResult.shipTime = o.shipTime || o.shippedAt || ''
      }
    } catch {
      // 忽略，订单信息是可选的
    }

    ElMessage.success(trackingHistory.value.length > 0 ? '查询成功' : '暂无物流轨迹')
  } catch (err: any) {
    console.error('[物流跟踪] 查询失败:', err)
    ElMessage.error('查询失败: ' + (err.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

/**
 * 使用手机号重新查询（统一组件回调）
 */
const handlePhoneVerifySubmit = (phone: string) => {
  phoneVerifyDialogVisible.value = false
  // 恢复搜索表单
  searchForm.trackingNo = pendingTrackingNo.value
  searchForm.company = pendingCompanyCode.value
  // 带手机号重新查询
  handleSearch(phone)
}

/**
 * 获取轨迹类型
 */
const getTraceType = (status: string) => {
  const typeMap: Record<string, string> = {
    '已签收': 'success',
    '派送中': 'primary',
    '运输中': 'info',
    '已发货': 'warning',
    '异常': 'danger',
    'delivered': 'success',
    'delivering': 'primary',
    'in_transit': 'info',
    'shipped': 'warning',
    'exception': 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 重置搜索
 */
const handleReset = () => {
  searchForm.trackingNo = ''
  searchForm.company = ''
  Object.assign(trackingResult, {
    trackingNo: '',
    companyName: '',
    status: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    shipTime: '',
    estimatedTime: ''
  })
  trackingHistory.value = []
}

/**
 * 刷新轨迹（调用真实快递API）
 */
const refreshTracking = async () => {
  if (!trackingResult.trackingNo || isUnmounted.value) return

  refreshLoading.value = true

  try {
    // 🔥 尝试获取手机号
    let phoneToUse = ''
    try {
      const { orderApi } = await import('@/api/order')
      const orderResponse = await orderApi.getOrderByTrackingNo(trackingResult.trackingNo)
      if (orderResponse?.success && orderResponse.data) {
        const orderData = orderResponse.data as any
        phoneToUse = orderData.receiverPhone || orderData.phone || orderData.customerPhone || ''
      }
    } catch {
      // 忽略
    }

    console.log('[物流跟踪] 刷新轨迹，使用手机号:', phoneToUse ? phoneToUse.slice(-4) + '****' : '未提供')

    const { logisticsApi } = await import('@/api/logistics')
    // 🔥 使用queryTrace而不是refreshTrace，这样可以传递手机号
    const response = await logisticsApi.queryTrace(
      trackingResult.trackingNo,
      searchForm.company || undefined,
      phoneToUse || undefined
    )

    if (isUnmounted.value) return

    if (response.success && response.data) {
      const data = response.data

      // 更新轨迹
      let sortedTraces: any[] = []
      if (data.traces && Array.isArray(data.traces)) {
        // 🔥 去重并排序
        const seen = new Set<string>()
        const uniqueTraces = data.traces.filter((trace: any) => {
          const key = `${trace.time}-${trace.description}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        sortedTraces = uniqueTraces.map((trace: any) => ({
          time: trace.time,
          status: trace.status,
          description: trace.description,
          location: trace.location || '',
          operator: trace.operator || '',
          type: getTraceType(trace.status)
        })).sort((a: any, b: any) => {
          const timeA = new Date(a.time).getTime()
          const timeB = new Date(b.time).getTime()
          return timeB - timeA
        })

        trackingHistory.value = sortedTraces
      }

      // 🔥 修复：根据最新轨迹判断真实状态（和初始查询逻辑一致）
      let realStatus = data.status || 'shipped'
      if (sortedTraces.length > 0) {
        const latestTrace = sortedTraces[0]
        // 检查是否已签收
        if (latestTrace.description?.includes('签收') ||
            latestTrace.description?.includes('已签收') ||
            latestTrace.description?.includes('已送达') ||
            latestTrace.description?.includes('代收') ||
            latestTrace.status === '80' ||
            latestTrace.status === '8000') {
          realStatus = 'delivered'
        } else if (latestTrace.description?.includes('派送') ||
                   latestTrace.description?.includes('派件')) {
          realStatus = 'out_for_delivery'
        } else if (latestTrace.description?.includes('到达') ||
                   latestTrace.description?.includes('运输')) {
          realStatus = 'in_transit'
        } else if (latestTrace.description?.includes('揽收') ||
                   latestTrace.description?.includes('收件')) {
          realStatus = 'picked_up'
        }
      }

      // 更新状态
      trackingResult.status = realStatus

      ElMessage.success('轨迹已刷新')
    } else {
      ElMessage.warning(response.message || '刷新失败')
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('刷新失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  } finally {
    if (!isUnmounted.value) {
      refreshLoading.value = false
    }
  }
}

/**
 * 查看详情
 */
const handleViewDetail = () => {
  if (!trackingResult.trackingNo) {
    ElMessage.warning('请先查询物流轨迹')
    return
  }

  safeNavigator.push(`/logistics/track/detail/${trackingResult.trackingNo}`)
}

/**
 * 导出轨迹
 */
const handleExport = () => {
  if (!trackingResult.trackingNo) {
    ElMessage.warning('请先查询物流轨迹')
    return
  }

  ElMessage.success('导出功能开发中...')
}

/**
 * 批量查询
 */
const handleBatchQuery = async () => {
  if (!batchForm.trackingNos.trim()) {
    ElMessage.warning('请输入物流单号')
    return
  }

  if (isUnmounted.value) return

  batchLoading.value = true

  try {
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 2000)
      timeoutIds.add(timeoutId)
    })

    if (!isUnmounted.value) {
      ElMessage.success('批量查询完成')
      batchDialogVisible.value = false
    }
  } catch {
    if (!isUnmounted.value) {
      ElMessage.error('批量查询失败')
    }
  } finally {
    if (!isUnmounted.value) {
      batchLoading.value = false
    }
  }
}

/**
 * 获取物流公司名称
 */
const getCompanyName = (code: string) => {
  const company = logisticsCompanies.value.find(c => c.code === code)
  return company?.name || ''
}

/**
 * 🔥 获取友好的无物流信息提示
 * 针对刚发货的订单给出更友好的提示
 */
const getFriendlyNoTraceMessage = (originalMessage?: string) => {
  if (!originalMessage) {
    return '暂无物流信息，快递可能刚揽收，建议12-24小时后再查询'
  }

  // 🔥 保留后端返回的详细错误信息
  if (originalMessage.includes('手机号') ||
      originalMessage.includes('验证') ||
      originalMessage.includes('运单号不存在') ||
      originalMessage.includes('无权限') ||
      originalMessage.includes('可能原因')) {
    return originalMessage
  }

  // 如果是API未配置等技术性错误，给出友好提示
  if (originalMessage.includes('API未配置') ||
      originalMessage.includes('routes为空') ||
      originalMessage.includes('未查询到物流轨迹')) {
    return '暂无物流信息，快递可能刚揽收，建议12-24小时后再查询'
  }

  // 其他情况返回原始消息
  return originalMessage
}

// 生命周期钩子
onMounted(async () => {
  // 🔥 优化：不再加载全量订单
  console.log('[物流跟踪] 🚀 页面初始化（优化版）...')
  const startTime = Date.now()

  // 🔥 从API加载物流公司列表
  await loadLogisticsCompanies()

  const loadTime = Date.now() - startTime
  console.log(`[物流跟踪] ✅ 页面初始化完成，耗时: ${loadTime}ms`)

  // 检查路由参数并自动搜索
  checkRouteParamsAndSearch()
})

// 🔥 检查路由参数并执行搜索
const checkRouteParamsAndSearch = () => {
  const trackingNo = route.query.trackingNo as string
  const company = route.query.company as string

  console.log('[物流跟踪] 检查路由参数 - trackingNo:', trackingNo, ', company:', company)

  if (trackingNo) {
    // 只有当单号变化时才更新和搜索
    if (searchForm.trackingNo !== trackingNo) {
      searchForm.trackingNo = trackingNo
      if (company) {
        searchForm.company = company
      }
      // 自动执行搜索
      console.log('[物流跟踪] 路由参数变化，自动执行搜索')
      handleSearch()
    }
  }
}

// 🔥 组件被激活时（从keep-alive缓存恢复）
onActivated(() => {
  console.log('[物流跟踪] 🔄 组件激活（onActivated）')
  // 重新检查路由参数
  checkRouteParamsAndSearch()
})

// 🔥 监听路由参数变化
watch(
  () => route.query,
  (newQuery) => {
    console.log('[物流跟踪] 路由参数变化:', newQuery)
    if (newQuery.trackingNo) {
      checkRouteParamsAndSearch()
    }
  },
  { deep: true }
)

// 组件卸载时清理异步操作
onBeforeUnmount(() => {
  // 设置组件卸载状态
  isUnmounted.value = true

  // 清理所有未完成的超时操作
  timeoutIds.forEach(timeoutId => {
    clearTimeout(timeoutId)
  })
  timeoutIds.clear()
})
</script>

<style scoped>
.logistics-track {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card,
.result-card {
  margin-bottom: 20px;
}

.search-form {
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h3 {
  margin: 0;
  color: #303133;
}

.basic-info {
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.info-item .value {
  color: #303133;
}

.tracking-timeline h4 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

/* 🔥 优化物流轨迹样式，类似顺丰官网 */
.timeline-content {
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #dcdfe6;
  transition: all 0.3s ease;
}

.timeline-content:hover {
  background: #f0f2f5;
}

.timeline-content-first {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9eb 100%);
  border-left-color: #409eff;
}

.timeline-status {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  margin-bottom: 6px;
}

.timeline-content-first .timeline-status {
  color: #409eff;
}

.timeline-desc {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 8px;
}

.timeline-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.timeline-location,
.timeline-operator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .timeline-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
