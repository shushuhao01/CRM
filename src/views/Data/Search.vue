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
  Search, Phone, Document, Van, User, RefreshLeft, UserFilled,
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
  // 检查是否填写了搜索关键词
  if (!searchForm.keyword.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  hasSearched.value = true

  try {
    const keyword = searchForm.keyword.trim()
    const searchParams: CustomerSearchParams = {}
    
    // 根据关键词的特征判断搜索类型
    if (/^1[3-9]\d{9}$/.test(keyword)) {
      // 手机号格式（11位数字，以1开头）
      searchParams.phone = keyword
    } else if (/^[A-Z]{2}\d{12}$/.test(keyword)) {
      // 客户编码格式（2个字母 + 12位数字）
      searchParams.customerCode = keyword
    } else if (/^[A-Z0-9]{10,20}$/.test(keyword)) {
      // 订单号或物流单号格式（大写字母和数字组合）
      searchParams.orderNo = keyword
      searchParams.trackingNo = keyword
    } else {
      // 客户姓名或其他
      searchParams.customerName = keyword
      // 同时也尝试作为订单号和物流单号搜索
      searchParams.orderNo = keyword
      searchParams.trackingNo = keyword
    }
    
    // 模拟数据库中的所有数据
    const allMockData = [
      {
        customerName: '张三',
        phone: '13812345678',
        customerCode: 'ZS202401151102',
        orderNo: 'ORD2024010001',
        orderAmount: 1299.00,
        orderDate: '2024-01-15',
        trackingNo: 'SF1234567890',
        ownerName: '李销售',
        ownerPhone: '13987654321',
        ownerDepartment: '销售一部',
        ownerStatus: 'active'
      },
      {
        customerName: '李四',
        phone: '13923456789',
        customerCode: 'LS202401161203',
        orderNo: 'ORD2024010002',
        orderAmount: 2599.00,
        orderDate: '2024-01-16',
        trackingNo: 'YTO9876543210',
        ownerName: '王经理',
        ownerPhone: '13876543210',
        ownerDepartment: '销售二部',
        ownerStatus: 'active'
      },
      {
        customerName: '王五',
        phone: '13734567890',
        customerCode: 'WW202401171304',
        orderNo: 'ORD2024010003',
        orderAmount: 899.00,
        orderDate: '2024-01-17',
        trackingNo: 'ZTO5678901234',
        ownerName: '赵主管',
        ownerPhone: '13765432109',
        ownerDepartment: '销售三部',
        ownerStatus: 'inactive'
      }
    ]
    
    // 精确匹配搜索
    let filteredResults = []
    
    if (searchParams.phone) {
      // 精确匹配手机号
      filteredResults = allMockData.filter(item => item.phone === searchParams.phone)
    } else if (searchParams.customerCode) {
      // 精确匹配客户编码
      filteredResults = allMockData.filter(item => item.customerCode === searchParams.customerCode)
    } else if (searchParams.orderNo) {
      // 精确匹配订单号
      filteredResults = allMockData.filter(item => item.orderNo === searchParams.orderNo)
    } else if (searchParams.trackingNo) {
      // 精确匹配物流单号
      filteredResults = allMockData.filter(item => item.trackingNo === searchParams.trackingNo)
    } else if (searchParams.customerName) {
      // 精确匹配客户姓名
      filteredResults = allMockData.filter(item => item.customerName === searchParams.customerName)
    }
    
    // 设置精确匹配的结果
    dataStore.$patch({
      searchResults: filteredResults,
      searchLoading: false
    })
    
  } catch (error) {
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
  const types = {
    active: 'success',
    inactive: 'warning',
    offline: 'info'
  }
  return types[status] || ''
}

const getOwnerStatusText = (status: string) => {
  const texts = {
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