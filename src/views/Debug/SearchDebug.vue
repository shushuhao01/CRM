<template>
  <div class="search-debug-container">
    <div class="page-header">
      <h1>🔍 客户查询搜索调试工具</h1>
      <p>在系统内部调试客户查询功能</p>
    </div>

    <!-- 数据检查 -->
    <el-card class="debug-card">
      <template #header>
        <div class="card-header">
          <span>1. 数据检查</span>
          <el-button type="primary" @click="checkData">检查数据</el-button>
        </div>
      </template>
      <div v-if="dataCheckResult" class="result-content">
        <div v-html="dataCheckResult"></div>
      </div>
    </el-card>

    <!-- 搜索测试 -->
    <el-card class="debug-card">
      <template #header>
        <div class="card-header">
          <span>2. 搜索测试</span>
        </div>
      </template>
      <el-input
        v-model="testKeyword"
        placeholder="输入搜索关键词（订单号、客户姓名等）"
        style="margin-bottom: 15px"
      >
        <template #append>
          <el-button type="primary" @click="testSearch">测试搜索</el-button>
        </template>
      </el-input>
      <div v-if="searchTestResult" class="result-content">
        <div v-html="searchTestResult"></div>
      </div>
    </el-card>

    <!-- 数据关联检查 -->
    <el-card class="debug-card">
      <template #header>
        <div class="card-header">
          <span>3. 数据关联检查</span>
          <el-button type="warning" @click="checkRelation">检查关联</el-button>
        </div>
      </template>
      <div v-if="relationCheckResult" class="result-content">
        <div v-html="relationCheckResult"></div>
      </div>
    </el-card>

    <!-- 完整诊断 -->
    <el-card class="debug-card">
      <template #header>
        <div class="card-header">
          <span>4. 完整诊断</span>
          <el-button type="success" @click="runFullDiagnosis">运行诊断</el-button>
        </div>
      </template>
      <div v-if="diagnosisResult" class="result-content">
        <div v-html="diagnosisResult"></div>
      </div>
    </el-card>

    <!-- 实际搜索测试 -->
    <el-card class="debug-card">
      <template #header>
        <div class="card-header">
          <span>5. 实际搜索测试（使用dataStore）</span>
        </div>
      </template>
      <el-input
        v-model="actualSearchKeyword"
        placeholder="输入搜索关键词"
        style="margin-bottom: 15px"
      >
        <template #append>
          <el-button type="primary" @click="testActualSearch">实际搜索</el-button>
        </template>
      </el-input>
      <div v-if="actualSearchResult" class="result-content">
        <div v-html="actualSearchResult"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/stores/data'

const dataStore = useDataStore()

const dataCheckResult = ref('')
const searchTestResult = ref('')
const relationCheckResult = ref('')
const diagnosisResult = ref('')
const actualSearchResult = ref('')

const testKeyword = ref('')
const actualSearchKeyword = ref('')

// 检查数据
const checkData = () => {
  console.log('[调试工具] 开始检查数据')

  try {
    const customerStore = localStorage.getItem('customer-store')
    const orderStoreRaw = localStorage.getItem('crm_store_order')
    const userDatabase = localStorage.getItem('userDatabase')

    let html = '<h3>数据检查结果</h3>'

    // 检查客户数据
    if (!customerStore) {
      html += '<p style="color: #f56c6c;">❌ 缺少客户数据 (customer-store)</p>'
    } else {
      const customers = JSON.parse(customerStore).customers || []
      html += `<p style="color: #67c23a;">✅ 客户数据: ${customers.length} 个客户</p>`
      if (customers.length > 0) {
        html += `<p>示例客户: ${customers[0].name} (${customers[0].phone})</p>`
      }
    }

    // 检查订单数据
    if (!orderStoreRaw) {
      html += '<p style="color: #f56c6c;">❌ 缺少订单数据 (crm_store_order)</p>'
    } else {
      try {
        const parsed = JSON.parse(orderStoreRaw)
        let orders = []
        if (parsed.data && parsed.data.orders) {
          orders = parsed.data.orders
          html += '<p>订单数据格式: 新格式 { data: { orders: [...] } }</p>'
        } else if (parsed.orders) {
          orders = parsed.orders
          html += '<p>订单数据格式: 旧格式 { orders: [...] }</p>'
        } else if (Array.isArray(parsed)) {
          orders = parsed
          html += '<p>订单数据格式: 数组格式 [...]</p>'
        }
        html += `<p style="color: #67c23a;">✅ 订单数据: ${orders.length} 个订单</p>`
        if (orders.length > 0) {
          html += `<p>示例订单: ${orders[0].orderNumber}</p>`
          html += `<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">${JSON.stringify(orders[0], null, 2)}</pre>`
        }
      } catch (e: any) {
        html += `<p style="color: #f56c6c;">❌ 订单数据解析失败: ${e.message}</p>`
      }
    }

    // 检查用户数据
    if (!userDatabase) {
      html += '<p style="color: #f56c6c;">❌ 缺少用户数据 (userDatabase)</p>'
    } else {
      const users = JSON.parse(userDatabase) || []
      html += `<p style="color: #67c23a;">✅ 用户数据: ${users.length} 个用户</p>`
    }

    dataCheckResult.value = html
    console.log('[调试工具] 数据检查完成')
  } catch (error: any) {
    console.error('[调试工具] 数据检查失败:', error)
    dataCheckResult.value = `<p style="color: #f56c6c;">❌ 检查失败: ${error.message}</p>`
  }
}

// 测试搜索
const testSearch = () => {
  if (!testKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  console.log('[调试工具] 开始测试搜索:', testKeyword.value)

  try {
    const customerStore = localStorage.getItem('customer-store')
    const orderStoreRaw = localStorage.getItem('crm_store_order')
    const userDatabase = localStorage.getItem('userDatabase')

    if (!customerStore || !orderStoreRaw || !userDatabase) {
      searchTestResult.value = '<p style="color: #f56c6c;">❌ 缺少必要数据</p>'
      return
    }

    const customers = JSON.parse(customerStore).customers || []
    const parsed = JSON.parse(orderStoreRaw)
    let orders: any[] = []

    if (parsed.data && parsed.data.orders) {
      orders = parsed.data.orders
    } else if (parsed.orders) {
      orders = parsed.orders
    } else if (Array.isArray(parsed)) {
      orders = parsed
    }

    const users = JSON.parse(userDatabase) || []
    const keyword = testKeyword.value.trim()

    console.log('[调试工具] 数据加载完成:', {
      customers: customers.length,
      orders: orders.length,
      users: users.length
    })

    // 搜索逻辑
    const searchResults: any[] = []
    let processedCount = 0
    let skippedCount = 0

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i]
      processedCount++

      const customer = customers.find((c: any) => c.id === order.customerId)
      if (!customer) {
        skippedCount++
        continue
      }

      const owner = users.find((u: any) => u.id === order.salesPersonId)

      let matched = false
      let matchType = ''

      if (customer.name && customer.name.includes(keyword)) {
        matched = true
        matchType = '客户姓名'
      }

      if (customer.phone && customer.phone === keyword) {
        matched = true
        matchType = '客户电话'
      }

      if (customer.code && customer.code === keyword) {
        matched = true
        matchType = '客户编码'
      }

      if (order.orderNumber && (order.orderNumber === keyword || order.orderNumber.includes(keyword))) {
        matched = true
        matchType = '订单号'
      }

      if (order.trackingNumber && (order.trackingNumber === keyword || order.trackingNumber.includes(keyword))) {
        matched = true
        matchType = '物流单号'
      }

      if (matched) {
        searchResults.push({
          customerName: customer.name || '未知',
          phone: customer.phone || '',
          orderNo: order.orderNumber || '',
          orderAmount: order.totalAmount || 0,
          orderDate: order.createTime ? order.createTime.split(' ')[0] : '',
          trackingNo: order.trackingNumber || '',
          ownerName: owner ? (owner.realName || owner.name || '未知') : '未知',
          ownerDepartment: owner ? (owner.department || '未知部门') : '未知部门',
          matchType: matchType
        })
      }
    }

    console.log('[调试工具] 搜索完成:', {
      processedCount,
      skippedCount,
      resultsCount: searchResults.length
    })

    let html = `<h3>搜索测试结果</h3>`
    html += `<p>搜索关键词: <strong>${keyword}</strong></p>`
    html += `<p>处理订单数: ${processedCount}</p>`
    html += `<p>跳过订单数: ${skippedCount}</p>`
    html += `<p>搜索结果数: ${searchResults.length}</p>`

    if (searchResults.length > 0) {
      html += '<p style="color: #67c23a;">✅ 搜索成功！</p>'
      html += '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">'
      html += '<tr style="background: #f5f5f5;"><th style="padding: 10px; border: 1px solid #ddd;">客户</th><th style="padding: 10px; border: 1px solid #ddd;">订单号</th><th style="padding: 10px; border: 1px solid #ddd;">金额</th><th style="padding: 10px; border: 1px solid #ddd;">归属人</th><th style="padding: 10px; border: 1px solid #ddd;">匹配类型</th></tr>'

      searchResults.slice(0, 10).forEach(result => {
        html += `<tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${result.customerName}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${result.orderNo}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">¥${result.orderAmount.toLocaleString()}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${result.ownerName}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${result.matchType}</td>
        </tr>`
      })

      html += '</table>'

      if (searchResults.length > 10) {
        html += `<p style="margin-top: 10px;">只显示前10条结果，共${searchResults.length}条</p>`
      }
    } else {
      html += '<p style="color: #f56c6c;">❌ 未找到匹配结果</p>'
    }

    searchTestResult.value = html
  } catch (error: any) {
    console.error('[调试工具] 搜索测试失败:', error)
    searchTestResult.value = `<p style="color: #f56c6c;">❌ 测试失败: ${error.message}</p>`
  }
}

// 检查数据关联
const checkRelation = () => {
  console.log('[调试工具] 开始检查数据关联')

  try {
    const customerStore = localStorage.getItem('customer-store')
    const orderStoreRaw = localStorage.getItem('crm_store_order')

    if (!customerStore || !orderStoreRaw) {
      relationCheckResult.value = '<p style="color: #f56c6c;">❌ 缺少必要数据</p>'
      return
    }

    const customers = JSON.parse(customerStore).customers || []
    const parsed = JSON.parse(orderStoreRaw)
    let orders: any[] = []

    if (parsed.data && parsed.data.orders) {
      orders = parsed.data.orders
    } else if (parsed.orders) {
      orders = parsed.orders
    }

    let ordersWithCustomer = 0
    let ordersWithoutCustomer = 0
    const problemOrders: any[] = []

    orders.forEach(order => {
      const customer = customers.find((c: any) => c.id === order.customerId)
      if (customer) {
        ordersWithCustomer++
      } else {
        ordersWithoutCustomer++
        problemOrders.push({
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName
        })
      }
    })

    let html = '<h3>数据关联检查结果</h3>'
    html += `<p>有客户的订单: ${ordersWithCustomer}</p>`
    html += `<p>无客户的订单: ${ordersWithoutCustomer}</p>`

    if (ordersWithoutCustomer > 0) {
      html += '<p style="color: #e6a23c;">⚠️ 发现问题订单！</p>'
      html += '<p>问题订单列表（前10个）:</p>'
      html += '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">'
      html += JSON.stringify(problemOrders.slice(0, 10), null, 2)
      html += '</pre>'
    } else {
      html += '<p style="color: #67c23a;">✅ 所有订单都有对应的客户</p>'
    }

    relationCheckResult.value = html
    console.log('[调试工具] 数据关联检查完成')
  } catch (error: any) {
    console.error('[调试工具] 数据关联检查失败:', error)
    relationCheckResult.value = `<p style="color: #f56c6c;">❌ 检查失败: ${error.message}</p>`
  }
}

// 运行完整诊断
const runFullDiagnosis = () => {
  console.log('[调试工具] 开始完整诊断')

  checkData()
  checkRelation()

  if (testKeyword.value) {
    testSearch()
  }

  diagnosisResult.value = '<p style="color: #67c23a;">✅ 完整诊断已完成，请查看上方各项检查结果</p>'

  ElMessage.success('完整诊断已完成')
}

// 测试实际搜索（使用dataStore）
const testActualSearch = async () => {
  if (!actualSearchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  console.log('[调试工具] 开始实际搜索测试:', actualSearchKeyword.value)

  try {
    actualSearchResult.value = '<p>正在搜索...</p>'

    // 调用dataStore的搜索方法
    await dataStore.searchCustomer({
      phone: actualSearchKeyword.value,
      orderNo: actualSearchKeyword.value,
      trackingNo: actualSearchKeyword.value,
      customerName: actualSearchKeyword.value
    })

    const results = dataStore.searchResults

    let html = '<h3>实际搜索结果（使用dataStore）</h3>'
    html += `<p>搜索关键词: <strong>${actualSearchKeyword.value}</strong></p>`
    html += `<p>搜索结果数: ${results.length}</p>`

    if (results.length > 0) {
      html += '<p style="color: #67c23a;">✅ 搜索成功！</p>'
      html += '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">'
      html += JSON.stringify(results.slice(0, 5), null, 2)
      html += '</pre>'
    } else {
      html += '<p style="color: #f56c6c;">❌ 未找到匹配结果</p>'
    }

    actualSearchResult.value = html
    console.log('[调试工具] 实际搜索完成:', results.length)
  } catch (error: any) {
    console.error('[调试工具] 实际搜索失败:', error)
    actualSearchResult.value = `<p style="color: #f56c6c;">❌ 搜索失败: ${error.message}</p>`
  }
}
</script>

<style scoped>
.search-debug-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #1f2937;
}

.page-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.debug-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-content {
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
  min-height: 100px;
}

.result-content :deep(h3) {
  margin-top: 0;
  color: #1f2937;
}

.result-content :deep(p) {
  margin: 8px 0;
}

.result-content :deep(pre) {
  max-height: 400px;
  overflow-y: auto;
}

.result-content :deep(table) {
  font-size: 13px;
}
</style>
