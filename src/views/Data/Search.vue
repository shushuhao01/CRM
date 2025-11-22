<template>
  <div class="customer-search-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon class="title-icon"><Search /></el-icon>
          客户查询
        </h1>
        <p class="page-description">通过客户姓名、手机号、客户编码、订单号、物流单号等信息快速查询客户归属人</p>
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-header">
        <h3>查询条件</h3>
        <p class="search-tip">支持精确匹配和模糊搜索，输入关键信息即可快速定位客户</p>
      </div>

      <div class="search-form">
        <div class="search-input-group">
          <div class="input-item">
            <el-input
              v-model="searchForm.keyword"
              placeholder="请输入客户姓名、电话、编码、订单号或物流单号"
              clearable
              @keyup.enter="handleSearch"
              class="search-input"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>

        <div class="search-actions">
          <el-button
            type="primary"
            @click="handleSearch"
            :loading="searching"
            size="large"
            class="search-btn"
          >
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button
            @click="handleReset"
            size="large"
            class="reset-btn"
          >
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="hasSearched" class="result-section">
      <div class="result-header">
        <h3>查询结果</h3>
        <div class="result-stats">
          <span v-if="searchResults.length > 0">
            找到 <strong>{{ searchResults.length }}</strong> 条匹配记录
          </span>
          <span v-else class="no-result">
            未找到匹配的客户信息
          </span>
        </div>
      </div>

      <!-- 结果列表 -->
      <div v-if="searchResults.length > 0" class="result-list">
        <div
          v-for="(result, index) in searchResults"
          :key="index"
          class="result-item"
        >
          <div class="result-card">
            <div class="customer-info">
              <div class="customer-avatar">
                <el-icon><User /></el-icon>
              </div>
              <div class="customer-details">
                <h4 class="customer-name">{{ result.customerName }}</h4>
                <p class="customer-phone">{{ displaySensitiveInfoNew(result.phone, SensitiveInfoType.PHONE) }}</p>
              </div>
            </div>

            <div class="order-info">
              <div class="info-item">
                <span class="info-label">订单号</span>
                <span class="info-value">{{ result.orderNo }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">订单金额</span>
                <span class="info-value amount">¥{{ result.orderAmount.toLocaleString() }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">下单时间</span>
                <span class="info-value">{{ result.orderDate }}</span>
              </div>
              <div v-if="result.trackingNo" class="info-item">
                <span class="info-label">物流单号</span>
                <span class="info-value">{{ result.trackingNo }}</span>
              </div>
            </div>

            <div class="owner-info">
              <div class="owner-card">
                <div class="owner-header">
                  <el-icon class="owner-icon"><UserFilled /></el-icon>
                  <span class="owner-title">当前归属人</span>
                </div>
                <div class="owner-details">
                  <div class="owner-name">{{ result.ownerName }}</div>
                  <div class="owner-department">{{ result.ownerDepartment }}</div>
                  <div class="owner-contact">{{ displaySensitiveInfoNew(result.ownerPhone, SensitiveInfoType.PHONE) }}</div>
                </div>
                <div class="owner-status">
                  <el-tag :type="getOwnerStatusType(result.ownerStatus)">
                    {{ getOwnerStatusText(result.ownerStatus) }}
                  </el-tag>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>

      <!-- 无结果状态 -->
      <div v-else class="no-result-state">
        <div class="no-result-icon">
          <el-icon><DocumentRemove /></el-icon>
        </div>
        <h3>未找到匹配的客户信息</h3>
        <p>请检查输入的信息是否正确，或尝试其他搜索条件</p>
        <div class="search-suggestions">
          <h4>搜索建议：</h4>
          <ul>
            <li>确认手机号码格式正确（11位数字）</li>
            <li>检查订单号是否完整</li>
            <li>物流单号是否输入正确</li>
            <li>客户姓名支持模糊搜索</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div v-if="searchHistory.length > 0 && !hasSearched" class="history-section">
      <div class="history-header">
        <h3>最近搜索</h3>
        <el-button type="text" @click="clearHistory" class="clear-history">
          <el-icon><Delete /></el-icon>
          清空历史
        </el-button>
      </div>
      <div class="history-list">
        <div
          v-for="(item, index) in searchHistory"
          :key="index"
          class="history-item"
          @click="useHistorySearch(item)"
        >
          <div class="history-content">
            <el-icon class="history-icon"><Clock /></el-icon>
            <span class="history-text">{{ item.text }}</span>
          </div>
          <div class="history-time">{{ item.time }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search, User, RefreshLeft, UserFilled,
  DocumentRemove, Delete, Clock
} from '@element-plus/icons-vue'
import { useDataStore } from '@/stores/data'
import type { CustomerSearchParams } from '@/api/data'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'

// 使用状态管理
const dataStore = useDataStore()

// 响应式数据
const searching = computed(() => dataStore.searchLoading)
const hasSearched = ref(false)
const searchResults = computed(() => dataStore.searchResults)
const searchHistory = computed(() => dataStore.searchHistory)

// 搜索表单
const searchForm = reactive({
  keyword: ''
})

// 方法
const handleSearch = async () => {
  console.log('[客户查询] ========== 开始搜索 ==========')
  console.log('[客户查询] 搜索表单:', searchForm)

  // 检查是否填写了搜索关键词
  if (!searchForm.keyword.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  hasSearched.value = true

  try {
    const keyword = searchForm.keyword.trim()
    console.log('[客户查询] 搜索关键词（trim后）:', keyword)

    // 从localStorage获取真实数据
    const customerStore = localStorage.getItem('customer-store')
    const orderStoreRaw = localStorage.getItem('crm_store_order')  // 修复：使用正确的键名
    const userDatabase = localStorage.getItem('userDatabase')

    console.log('[客户查询] localStorage数据检查:')
    console.log('  - customerStore存在:', !!customerStore)
    console.log('  - orderStoreRaw存在:', !!orderStoreRaw)
    console.log('  - userDatabase存在:', !!userDatabase)

    if (!customerStore || !orderStoreRaw || !userDatabase) {
      console.error('[客户查询] ❌ 缺少必要数据')
      ElMessage.warning('系统数据未加载，请刷新页面重试')
      return
    }

    // 解析订单数据（支持新旧格式）
    let orders: any[] = []
    try {
      const parsed = JSON.parse(orderStoreRaw)
      console.log('[客户查询] 订单数据格式:', Object.keys(parsed))

      // 新格式：{ data: { orders: [...] } }
      if (parsed.data && parsed.data.orders) {
        orders = parsed.data.orders
        console.log('[客户查询] 使用新格式: { data: { orders: [...] } }')
      }
      // 旧格式：{ orders: [...] }
      else if (parsed.orders) {
        orders = parsed.orders
        console.log('[客户查询] 使用旧格式: { orders: [...] }')
      }
      // 直接是数组
      else if (Array.isArray(parsed)) {
        orders = parsed
        console.log('[客户查询] 使用数组格式: [...]')
      } else {
        console.error('[客户查询] ❌ 未知的订单数据格式:', parsed)
      }
    } catch (e) {
      console.error('[客户查询] ❌ 解析订单数据失败:', e)
      ElMessage.error('订单数据解析失败')
      return
    }

    // 解析客户和用户数据
    const customers = JSON.parse(customerStore).customers || []
    const users = JSON.parse(userDatabase) || []

    console.log('[客户查询] 搜索关键词:', keyword)
    console.log('[客户查询] 客户总数:', customers.length)
    console.log('[客户查询] 订单总数:', orders.length)
    console.log('[客户查询] 用户总数:', users.length)

    // 显示前3个客户和订单的示例数据
    if (customers.length > 0) {
      console.log('[客户查询] 客户示例:', customers.slice(0, 3).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        code: c.code
      })))
    }

    if (orders.length > 0) {
      console.log('[客户查询] 第一个订单完整对象:', orders[0])
      console.log('[客户查询] 第一个订单的所有字段:', Object.keys(orders[0]))
      console.log('[客户查询] 订单示例:', orders.slice(0, 3).map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerId: o.customerId,
        trackingNumber: o.trackingNumber,
        auditStatus: o.auditStatus
      })))
    }

    const searchResults: any[] = []
    let processedCount = 0
    let skippedCount = 0

    console.log('[客户查询] 开始遍历订单，订单数组长度:', orders.length)
    console.log('[客户查询] 订单数组类型:', Array.isArray(orders))

    // 使用for循环代替forEach，避免响应式数据问题
    for (let i = 0; i < orders.length; i++) {
      const order: any = orders[i]
      processedCount++

      if (i < 3) {
        console.log(`[客户查询] 处理第${i + 1}个订单:`, order.orderNumber, order.customerId)
      }

      // 查找对应的客户
      const customer = customers.find((c: any) => c.id === order.customerId)
      if (!customer) {
        skippedCount++
        console.warn('[客户查询] 订单找不到客户:', {
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          订单ID: order.id
        })
        continue
      }

      // 查找销售人员（归属人）
      const owner = users.find((u: any) => u.id === order.salesPersonId)

      let matched = false
      let matchType = ''

      // 匹配客户姓名（模糊匹配）
      if (customer.name && customer.name.includes(keyword)) {
        matched = true
        matchType = '客户姓名'
        console.log('[客户查询] ✅ 匹配客户姓名:', customer.name, '订单号:', order.orderNumber)
      }

      // 匹配客户电话（精确匹配）
      if (customer.phone && customer.phone === keyword) {
        matched = true
        matchType = '客户电话'
        console.log('[客户查询] ✅ 匹配客户电话:', customer.phone, '订单号:', order.orderNumber)
      }

      // 匹配客户编码（精确匹配）
      if (customer.code && customer.code === keyword) {
        matched = true
        matchType = '客户编码'
        console.log('[客户查询] ✅ 匹配客户编码:', customer.code, '订单号:', order.orderNumber)
      }

      // 匹配订单号（精确匹配或模糊匹配）
      if (order.orderNumber && (order.orderNumber === keyword || order.orderNumber.includes(keyword))) {
        matched = true
        matchType = '订单号'
        console.log('[客户查询] ✅ 匹配订单号:', order.orderNumber)
      }

      // 匹配物流单号（精确匹配或模糊匹配）
      if (order.trackingNumber && (order.trackingNumber === keyword || order.trackingNumber.includes(keyword))) {
        matched = true
        matchType = '物流单号'
        console.log('[客户查询] ✅ 匹配物流单号:', order.trackingNumber, '订单号:', order.orderNumber)
      }

      if (matched) {
        searchResults.push({
          customerName: customer.name || '未知',
          phone: customer.phone || '',
          customerCode: customer.code || '',
          orderNo: order.orderNumber || '',
          orderAmount: order.totalAmount || 0,
          orderDate: order.createTime ? order.createTime.split(' ')[0] : '',
          trackingNo: order.trackingNumber || '',
          ownerName: owner ? (owner.realName || owner.name || '未知') : '未知',
          ownerPhone: owner ? (owner.phone || '') : '',
          ownerDepartment: owner ? (owner.department || '未知部门') : '未知部门',
          ownerStatus: 'active',
          matchType: matchType
        })
      }
    }

    console.log('[客户查询] 处理订单数:', processedCount)
    console.log('[客户查询] 跳过订单数:', skippedCount)
    console.log('[客户查询] 搜索结果数量:', searchResults.length)

    // 去重（同一个客户可能有多个订单）
    const uniqueResults = searchResults.reduce((acc: unknown[], current: unknown) => {
      const exists = acc.find((item: unknown) =>
        item.customerName === current.customerName &&
        item.orderNo === current.orderNo
      )
      if (!exists) {
        acc.push(current)
      }
      return acc
    }, [])

    console.log('[客户查询] 去重后结果数量:', uniqueResults.length)
    console.log('[客户查询] 去重后结果:', uniqueResults)

    // 设置搜索结果 - 使用$patch确保响应式更新
    dataStore.$patch({
      searchResults: uniqueResults,
      searchLoading: false
    })

    console.log('[客户查询] dataStore.searchResults已更新:', dataStore.searchResults.length)
    console.log('[客户查询] hasSearched设置为true')

    // 保存搜索历史
    if (dataStore.addToSearchHistory) {
      dataStore.addToSearchHistory({
        text: keyword,
        time: new Date().toLocaleString('zh-CN'),
        params: {}
      })
    }

    if (uniqueResults.length > 0) {
      ElMessage.success(`找到 ${uniqueResults.length} 条匹配记录`)
      console.log('[客户查询] ✅ 搜索成功，应该显示结果')
    } else {
      ElMessage.info('未找到匹配的客户信息')
      console.log('[客户查询] ⚠️ 未找到匹配结果')
    }

  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请重试')
  }
}

const handleReset = () => {
  searchForm.keyword = ''
  hasSearched.value = false
}

const useHistorySearch = (historyItem: { text: string; time: string; params: CustomerSearchParams }) => {
  // 使用历史搜索关键词
  handleReset()
  searchForm.keyword = historyItem.text
  handleSearch()
}

const clearHistory = () => {
  dataStore.clearSearchHistory()
  ElMessage.success('搜索历史已清空')
}

const getOwnerStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'success',
    inactive: 'warning',
    offline: 'info'
  }
  return types[status] || ''
}

const getOwnerStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '在线',
    inactive: '忙碌',
    offline: '离线'
  }
  return texts[status] || status
}




</script>

<style scoped>
.customer-search-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.page-title {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.title-icon {
  margin-right: 12px;
  color: #3b82f6;
}

.page-description {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.search-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  overflow: hidden;
}

.search-header {
  padding: 24px 24px 0;
  border-bottom: 1px solid #e5e7eb;
}

.search-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.search-tip {
  margin: 0 0 20px 0;
  color: #6b7280;
  font-size: 14px;
}

.search-form {
  padding: 24px;
}

.search-input-group {
  margin-bottom: 24px;
}

.input-item {
  max-width: 600px;
  margin: 0 auto;
}

.input-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.input-label .el-icon {
  margin-right: 6px;
  color: #6b7280;
}

.search-input {
  height: 48px;
  font-size: 16px;
}

.search-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.search-btn {
  min-width: 120px;
  height: 48px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
}

.reset-btn {
  min-width: 100px;
  height: 48px;
  border-radius: 8px;
  font-size: 16px;
}

.result-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.result-header {
  padding: 24px 24px 0;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.result-header h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.result-stats {
  color: #6b7280;
  font-size: 14px;
}

.result-stats strong {
  color: #3b82f6;
  font-weight: 600;
}

.no-result {
  color: #ef4444;
}

.result-list {
  padding: 24px;
}

.result-item {
  margin-bottom: 20px;
}

.result-item:last-child {
  margin-bottom: 0;
}

.result-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 24px;
  align-items: start;
  transition: all 0.2s ease;
}

.result-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.customer-details {
  flex: 1;
}

.customer-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.customer-phone {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
  min-width: 60px;
}

.info-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.amount {
  color: #059669;
  font-weight: 600;
}

.owner-info {
  display: flex;
  flex-direction: column;
}

.owner-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.owner-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.owner-icon {
  color: #3b82f6;
  margin-right: 6px;
}

.owner-title {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.owner-details {
  margin-bottom: 12px;
}

.owner-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.owner-department {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
}

.owner-contact {
  font-size: 12px;
  color: #6b7280;
}

.owner-status {
  display: flex;
  justify-content: flex-start;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
}

.no-result-state {
  padding: 60px 24px;
  text-align: center;
}

.no-result-icon {
  font-size: 64px;
  color: #d1d5db;
  margin-bottom: 24px;
}

.no-result-state h3 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 20px;
}

.no-result-state p {
  margin: 0 0 32px 0;
  color: #6b7280;
}

.search-suggestions {
  max-width: 400px;
  margin: 0 auto;
  text-align: left;
  background: #f9fafb;
  padding: 20px;
  border-radius: 8px;
}

.search-suggestions h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 14px;
}

.search-suggestions ul {
  margin: 0;
  padding-left: 20px;
  color: #6b7280;
  font-size: 13px;
}

.search-suggestions li {
  margin-bottom: 4px;
}

.history-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.history-header {
  padding: 24px 24px 0;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.clear-history {
  color: #6b7280;
  padding: 0;
  margin-bottom: 16px;
}

.history-list {
  padding: 16px 24px 24px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.history-item:hover {
  background: #f3f4f6;
}

.history-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-icon {
  color: #6b7280;
  font-size: 14px;
}

.history-text {
  color: #374151;
  font-size: 14px;
}

.history-time {
  color: #9ca3af;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .result-card {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .owner-info {
    grid-column: 1 / -1;
  }

  .result-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .customer-search-container {
    padding: 16px;
  }

  .search-input-group {
    grid-template-columns: 1fr;
  }

  .result-card {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .search-actions {
    flex-direction: column;
  }

  .search-btn,
  .reset-btn {
    width: 100%;
  }
}
</style>
