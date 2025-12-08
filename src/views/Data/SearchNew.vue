<template>
  <div class="customer-search-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon class="title-icon"><Search /></el-icon>
          客户查询
        </h1>
        <p class="page-description">支持精确匹配和模糊搜索，输入关键信息即可快速定位客户</p>
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-header">
        <h3>查询条件</h3>
        <p class="search-tip">支持：客户姓名、手机号、客户编码、订单号、物流单号、售后单号</p>
      </div>

      <div class="search-form">
        <div class="search-input-group">
          <div class="input-item">
            <el-input
              v-model="searchForm.keyword"
              placeholder="请输入客户姓名、手机号、客户编码、订单号、物流单号或售后单号"
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

      <!-- 结果列表 - 新设计 -->
      <div v-if="searchResults.length > 0" class="result-list">
        <div
          v-for="(result, index) in searchResults"
          :key="index"
          class="result-item"
        >
          <div class="result-card-new">
            <!-- 左侧：客户基本信息 -->
            <div class="customer-section">
              <div class="section-header">
                <el-icon class="section-icon"><User /></el-icon>
                <span>客户信息</span>
              </div>
              <div class="customer-main">
                <div class="customer-avatar">
                  {{ result.customerName?.charAt(0) || '客' }}
                </div>
                <div class="customer-basic">
                  <h4 class="customer-name">{{ result.customerName || '未知客户' }}</h4>
                  <div class="customer-tags">
                    <el-tag v-if="result.customerCode" size="small" type="info">{{ result.customerCode }}</el-tag>
                    <el-tag v-if="result.matchType" size="small" type="success">匹配：{{ result.matchType }}</el-tag>
                  </div>
                </div>
              </div>
              <!-- 如果是通过订单匹配的，显示订单信息 -->
              <div v-if="result.matchedOrderNo || result.matchedTrackingNo" class="matched-order-info">
                <span v-if="result.matchedOrderNo" class="order-tag">
                  <el-icon><Tickets /></el-icon>
                  订单号：{{ result.matchedOrderNo }}
                </span>
                <span v-if="result.matchedTrackingNo" class="tracking-tag">
                  <el-icon><Van /></el-icon>
                  物流单号：{{ result.matchedTrackingNo }}
                </span>
              </div>
              <div class="customer-details-grid">
                <div class="detail-item">
                  <span class="detail-label">手机号</span>
                  <span class="detail-value">{{ displaySensitiveInfoNew(result.phone, SensitiveInfoType.PHONE) }}</span>
                </div>
                <div class="detail-item" v-if="result.gender">
                  <span class="detail-label">性别</span>
                  <span class="detail-value">{{ result.gender === 'male' ? '男' : '女' }}</span>
                </div>
                <div class="detail-item" v-if="result.age">
                  <span class="detail-label">年龄</span>
                  <span class="detail-value">{{ result.age }}岁</span>
                </div>
                <div class="detail-item" v-if="result.level">
                  <span class="detail-label">等级</span>
                  <el-tag size="small" :type="getLevelType(result.level)">{{ getLevelText(result.level) }}</el-tag>
                </div>
                <div class="detail-item full-width" v-if="result.address">
                  <span class="detail-label">地址</span>
                  <span class="detail-value address">{{ result.address }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">创建时间</span>
                  <span class="detail-value">{{ result.createTime }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">订单数</span>
                  <span class="detail-value">{{ result.orderCount || 0 }}单</span>
                </div>
              </div>
            </div>

            <!-- 右侧：归属人信息 -->
            <div class="owner-section">
              <div class="section-header">
                <el-icon class="section-icon owner"><UserFilled /></el-icon>
                <span>当前归属人</span>
              </div>
              <div class="owner-card-new">
                <div class="owner-avatar">
                  {{ result.ownerName?.charAt(0) || '未' }}
                </div>
                <div class="owner-info-new">
                  <div class="owner-name">{{ result.ownerName || '未分配' }}</div>
                  <div class="owner-department">{{ result.ownerDepartment || '未知部门' }}</div>
                  <div class="owner-phone" v-if="result.ownerPhone">
                    {{ displaySensitiveInfoNew(result.ownerPhone, SensitiveInfoType.PHONE) }}
                  </div>
                </div>
                <div class="owner-status-badge">
                  <el-tag :type="result.ownerName ? 'success' : 'info'" size="small">
                    {{ result.ownerName ? '已分配' : '待分配' }}
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search, User, RefreshLeft, UserFilled, DocumentRemove, Tickets, Van
} from '@element-plus/icons-vue'
import { useCustomerStore } from '@/stores/customer'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'

// 路由
const route = useRoute()

// 使用store
const customerStore = useCustomerStore()
const userStore = useUserStore()
const orderStore = useOrderStore()

// 响应式数据
const searching = ref(false)
const hasSearched = ref(false)
const searchResults = ref<any[]>([])

// 搜索表单
const searchForm = reactive({
  keyword: ''
})

// 监听路由参数变化，自动执行搜索
watch(
  () => route.query.keyword,
  (newKeyword) => {
    if (newKeyword && typeof newKeyword === 'string') {
      searchForm.keyword = newKeyword
      handleSearch()
    }
  },
  { immediate: true }
)

// 页面挂载时检查URL参数
onMounted(() => {
  const keyword = route.query.keyword
  if (keyword && typeof keyword === 'string') {
    searchForm.keyword = keyword
    handleSearch()
  }
})

// 搜索方法 - 支持多种搜索条件
const handleSearch = async () => {
  console.log('[客户查询] ========== 开始搜索 ==========')
  console.log('[客户查询] 搜索关键词:', searchForm.keyword)

  if (!searchForm.keyword.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  hasSearched.value = true
  searching.value = true
  const keyword = searchForm.keyword.trim().toLowerCase()

  try {
    // 确保数据已加载
    if (customerStore.customers.length === 0) {
      await customerStore.loadCustomers()
    }

    // 获取所有数据
    const customers = customerStore.customers
    const users = userStore.users
    const orders = orderStore.getOrders()

    console.log('[客户查询] 从store获取数据:')
    console.log('  - 客户数:', customers.length)
    console.log('  - 用户数:', users.length)
    console.log('  - 订单数:', orders.length)

    const results: any[] = []
    const matchedCustomerIds = new Set<string>()

    // 1. 先从客户表搜索：姓名、手机号、客户编码
    for (const customer of customers) {
      let matched = false
      let matchType = ''

      if (customer.name?.toLowerCase().includes(keyword)) {
        matched = true
        matchType = '客户姓名'
      } else if (customer.phone?.includes(keyword)) {
        matched = true
        matchType = '手机号'
      } else if (customer.code?.toLowerCase().includes(keyword)) {
        matched = true
        matchType = '客户编码'
      }

      if (matched && !matchedCustomerIds.has(customer.id)) {
        matchedCustomerIds.add(customer.id)
        const owner = users.find((u: any) => u.id === customer.salesPersonId)

        results.push({
          customerName: customer.name || '未知',
          phone: customer.phone || '',
          customerCode: customer.code || '',
          gender: customer.gender || '',
          age: customer.age || 0,
          level: customer.level || '',
          address: customer.address || '',
          createTime: customer.createTime || '',
          orderCount: customer.orderCount || 0,
          ownerName: owner?.name || '未分配',
          ownerPhone: '',
          ownerDepartment: owner?.department || '未知部门',
          matchType
        })
      }
    }

    // 2. 从订单表搜索：订单号、物流单号、售后单号
    for (const order of orders) {
      let matched = false
      let matchType = ''

      // 订单号匹配
      if (order.orderNumber?.toLowerCase().includes(keyword)) {
        matched = true
        matchType = '订单号'
      }
      // 物流单号匹配
      else if (order.trackingNumber?.toLowerCase().includes(keyword)) {
        matched = true
        matchType = '物流单号'
      }
      // 售后单号匹配（如果有的话）
      else if ((order as any).afterSaleNumber?.toLowerCase().includes(keyword)) {
        matched = true
        matchType = '售后单号'
      }

      if (matched) {
        // 查找对应的客户
        const customer = customers.find((c: any) => c.id === order.customerId)
        if (customer && !matchedCustomerIds.has(customer.id)) {
          matchedCustomerIds.add(customer.id)
          const owner = users.find((u: any) => u.id === customer.salesPersonId)

          results.push({
            customerName: customer.name || '未知',
            phone: customer.phone || '',
            customerCode: customer.code || '',
            gender: customer.gender || '',
            age: customer.age || 0,
            level: customer.level || '',
            address: customer.address || '',
            createTime: customer.createTime || '',
            orderCount: customer.orderCount || 0,
            ownerName: owner?.name || '未分配',
            ownerPhone: '',
            ownerDepartment: owner?.department || '未知部门',
            matchType,
            // 额外显示匹配的订单信息
            matchedOrderNo: order.orderNumber,
            matchedTrackingNo: order.trackingNumber
          })
        }
      }
    }

    searchResults.value = results

    console.log('[客户查询] 搜索完成，结果数:', results.length)

    if (results.length > 0) {
      ElMessage.success(`找到 ${results.length} 条匹配记录`)
    } else {
      ElMessage.info('未找到匹配的客户信息')
    }

  } catch (error) {
    console.error('[客户查询] 搜索失败:', error)
    ElMessage.error('搜索失败，请重试')
  } finally {
    searching.value = false
  }
}

const handleReset = () => {
  searchForm.keyword = ''
  hasSearched.value = false
  searchResults.value = []
}

// 获取客户等级类型
const getLevelType = (level: string) => {
  const levelMap: Record<string, string> = {
    'diamond': 'danger',
    'gold': 'warning',
    'silver': 'success',
    'bronze': 'info',
    'normal': ''
  }
  return levelMap[level] || 'info'
}

// 获取客户等级文本
const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    'diamond': '钻石客户',
    'gold': '金牌客户',
    'silver': '银牌客户',
    'bronze': '铜牌客户',
    'normal': '普通客户'
  }
  return levelMap[level] || level || '普通客户'
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

.result-card-new {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  overflow: hidden;
  transition: all 0.2s ease;
}

.result-card-new:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.customer-section {
  flex: 2;
  padding: 24px;
  border-right: 1px solid #e5e7eb;
}

.owner-section {
  flex: 1;
  padding: 24px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.section-icon {
  color: #3b82f6;
}

.section-icon.owner {
  color: #10b981;
}

.customer-main {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.customer-basic {
  flex: 1;
}

.customer-tags {
  margin-top: 4px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.matched-order-info {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #0369a1;
}

.matched-order-info .order-tag,
.matched-order-info .tracking-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

.matched-order-info .el-icon {
  font-size: 14px;
}

.customer-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  min-width: 60px;
}

.detail-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.detail-value.address {
  text-align: right;
  word-break: break-all;
}

.owner-card-new {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  flex: 1;
  justify-content: center;
}

.owner-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.owner-info-new {
  text-align: center;
}

.owner-status-badge {
  margin-top: 8px;
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
  flex-shrink: 0;
}

.customer-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.owner-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.owner-department {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 2px;
}

.owner-phone {
  font-size: 13px;
  color: #6b7280;
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
  margin: 0;
  color: #6b7280;
}

@media (max-width: 1200px) {
  .customer-details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .customer-search-container {
    padding: 16px;
  }

  .result-card-new {
    flex-direction: column;
  }

  .customer-section {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
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
