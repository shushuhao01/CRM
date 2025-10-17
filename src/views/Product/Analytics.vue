<template>
  <div class="product-analytics">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">商品分析</h1>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="handleDateChange"
          style="margin-right: 12px"
        />
        <el-button type="primary" :icon="Download" @click="exportData">
          导出数据
        </el-button>
        <el-button type="success" :icon="Refresh" @click="refreshData" style="margin-left: 12px">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metrics-grid">
      <el-card 
        v-for="metric in coreMetrics" 
        :key="metric.key"
        class="metric-card"
        shadow="hover"
      >
        <div class="metric-content">
          <div class="metric-icon" :style="{ backgroundColor: metric.color }">
            <el-icon :size="24">
              <component :is="metric.icon" />
            </el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-change" :class="metric.trend">
              <el-icon :size="12">
                <ArrowUp v-if="metric.trend === 'up'" />
                <ArrowDown v-if="metric.trend === 'down'" />
                <Minus v-if="metric.trend === 'stable'" />
              </el-icon>
              {{ metric.change }}
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 销售趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>销售趋势</span>
                <el-select v-model="salesTrendPeriod" size="small" style="width: 120px">
                  <el-option label="近7天" value="7days" />
                  <el-option label="近30天" value="30days" />
                  <el-option label="近90天" value="90days" />
                </el-select>
              </div>
            </template>
            <div ref="salesTrendChart" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 商品分类销售占比 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <span>商品分类销售占比</span>
            </template>
            <div ref="categoryPieChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <!-- 库存预警 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <span>库存预警</span>
            </template>
            <div ref="inventoryChart" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 热销商品排行 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <span>热销商品排行</span>
            </template>
            <div ref="topProductsChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 商品详细数据表格 -->
    <el-card class="table-card" shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>商品详细数据</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索商品名称"
              style="width: 200px; margin-right: 12px"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="categoryFilter" placeholder="选择分类" style="width: 150px" clearable>
              <el-option
                v-for="category in categories"
                :key="category.value"
                :label="category.label"
                :value="category.value"
              />
            </el-select>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredProductData"
        v-loading="loading"
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="price" label="单价" width="100" sortable="custom">
          <template #default="{ row }">
            ¥{{ row.price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" sortable="custom">
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock < 10 }">{{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sales" label="销量" width="100" sortable="custom" />
        <el-table-column prop="revenue" label="销售额" width="120" sortable="custom">
          <template #default="{ row }">
            ¥{{ row.revenue.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="120" sortable="custom">
          <template #default="{ row }">
            ¥{{ row.profit.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="profitRate" label="利润率" width="100" sortable="custom">
          <template #default="{ row }">
            {{ (row.profitRate * 100).toFixed(1) }}%
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStockStatusType(row.stock)">
              {{ getStockStatusText(row.stock) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendCharts,
  Box,
  Coin,
  Warning,
  Refresh
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useProductStore } from '@/stores/product'
import { productApi } from '@/api/product'

// 商品store
const productStore = useProductStore()

// 响应式数据
const loading = ref(false)
const dateRange = ref<[Date, Date]>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
])
const salesTrendPeriod = ref('30days')
const searchKeyword = ref('')
const categoryFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 分析数据
const analyticsData = ref({
  salesStatistics: {
    totalRevenue: 0,
    totalSales: 0,
    totalProducts: 0,
    lowStockWarning: 0,
    revenueChange: '+0%',
    salesChange: '+0%',
    productsChange: '+0%',
    warningChange: '+0%'
  },
  salesTrend: {
    timeLabels: [],
    salesData: [],
    revenueData: []
  },
  categorySales: [],
  topProducts: [],
  inventoryWarning: {
    lowStockCount: 0,
    outOfStockCount: 0,
    totalWarning: 0,
    categories: []
  }
})

// 核心指标数据 - 基于真实API数据
const coreMetrics = computed(() => {
  const stats = analyticsData.value.salesStatistics
  
  // 格式化大数字
  const formatNumber = (num: number) => {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + '亿'
    } else if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    } else {
      return num.toLocaleString()
    }
  }
  
  return [
    {
      key: 'totalRevenue',
      label: '总销售额',
      value: `¥${formatNumber(stats.totalRevenue)}`,
      change: stats.revenueChange,
      trend: stats.revenueChange.startsWith('+') ? 'up' : stats.revenueChange.startsWith('-') ? 'down' : 'stable',
      color: '#409EFF',
      icon: Coin
    },
    {
      key: 'totalSales',
      label: '总销量',
      value: formatNumber(stats.totalSales),
      change: stats.salesChange,
      trend: stats.salesChange.startsWith('+') ? 'up' : stats.salesChange.startsWith('-') ? 'down' : 'stable',
      color: '#67C23A',
      icon: TrendCharts
    },
    {
      key: 'totalProducts',
      label: '商品总数',
      value: stats.totalProducts.toString(),
      change: stats.productsChange,
      trend: stats.productsChange.startsWith('+') ? 'up' : stats.productsChange.startsWith('-') ? 'down' : 'stable',
      color: '#E6A23C',
      icon: Box
    },
    {
      key: 'lowStockWarning',
      label: '库存预警',
      value: stats.lowStockWarning.toString(),
      change: stats.warningChange,
      trend: stats.warningChange.startsWith('+') ? 'up' : stats.warningChange.startsWith('-') ? 'down' : 'stable',
      color: '#F56C6C',
      icon: Warning
    }
  ]
})

// 商品分类 - 从商品store获取
const categories = computed(() => {
  return productStore.categories.map(cat => ({
    label: cat.name,
    value: cat.name
  }))
})

// 商品数据 - 从商品store获取并计算分析数据
const productData = computed(() => {
  return productStore.products.map(product => {
    const revenue = product.salesCount * product.price
    const profit = product.salesCount * (product.price - product.costPrice)
    const profitRate = product.price > 0 ? (product.price - product.costPrice) / product.price : 0
    
    return {
      id: product.id,
      name: product.name,
      category: product.categoryName,
      price: product.price,
      stock: product.stock,
      sales: product.salesCount,
      revenue: revenue,
      profit: profit,
      profitRate: profitRate
    }
  })
})

// 图表引用
const salesTrendChart = ref()
const categoryPieChart = ref()
const inventoryChart = ref()
const topProductsChart = ref()

// 计算属性
const filteredProductData = computed(() => {
  let data = productData.value
  
  if (searchKeyword.value) {
    data = data.filter(item => 
      item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }
  
  if (categoryFilter.value) {
    data = data.filter(item => item.category === categoryFilter.value)
  }
  
  total.value = data.length
  
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return data.slice(start, end)
})

// 方法
const handleDateChange = (dates: [Date, Date]) => {
  console.log('日期范围变更:', dates)
  if (dates && dates.length === 2) {
    // 更新日期范围后重新加载数据和图表
    loadAnalyticsData()
    // 重新初始化图表以反映新的日期范围
    nextTick(() => {
      updateChartsWithDateRange()
    })
  }
}

const exportData = () => {
  ElMessage.success('数据导出功能开发中...')
}

const refreshData = async () => {
  ElMessage.info('正在刷新数据...')
  try {
    // 重新加载基础产品数据
    await productStore.fetchProducts()
    // 重新加载分析数据
    await loadAnalyticsData()
    // 重新初始化图表
    nextTick(() => {
      initCharts()
    })
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('数据刷新失败')
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  console.log('排序变更:', prop, order)
  // 实现排序逻辑
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const getStockStatusType = (stock: number) => {
  if (stock < 10) return 'danger'
  if (stock < 50) return 'warning'
  return 'success'
}

const getStockStatusText = (stock: number) => {
  if (stock < 10) return '库存不足'
  if (stock < 50) return '库存偏低'
  return '库存充足'
}

// 加载分析数据
const loadAnalyticsData = async () => {
  loading.value = true
  try {
    const [startDate, endDate] = dateRange.value
    const dateParams = {
      startDate: startDate?.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0]
    }
    
    // 并行加载所有分析数据
    const [
      salesStats,
      salesTrend,
      categorySales,
      topProducts,
      inventoryWarning
    ] = await Promise.all([
      productApi.getSalesStatistics(dateParams),
      productApi.getSalesTrend({
        ...dateParams,
        period: salesTrendPeriod.value
      }),
      productApi.getCategorySales(dateParams),
      productApi.getTopProducts({ limit: 5, ...dateParams }),
      productApi.getInventoryWarning({})
    ])
    
    // 更新分析数据
    analyticsData.value = {
      salesStatistics: salesStats,
      salesTrend: salesTrend,
      categorySales: categorySales,
      topProducts: topProducts,
      inventoryWarning: inventoryWarning
    }
    
    ElMessage.success('数据已更新')
  } catch (error) {
    console.error('加载分析数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadData = async () => {
  // 加载基础产品数据
  if (productStore.products.length === 0) {
    await productStore.fetchProducts()
  }
  
  // 加载分析数据
  await loadAnalyticsData()
}

// 根据日期范围更新图表
const updateChartsWithDateRange = () => {
  initSalesTrendChart()
  initCategoryPieChart()
  initInventoryChart()
  initTopProductsChart()
}

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    initSalesTrendChart()
    initCategoryPieChart()
    initInventoryChart()
    initTopProductsChart()
  })
}

const initSalesTrendChart = () => {
  const chart = echarts.init(salesTrendChart.value)
  
  // 使用真实API数据
  const { timeLabels, revenueData } = analyticsData.value.salesTrend
  
  const option = {
    title: {
      text: `销售趋势 (${salesTrendPeriod.value === '7days' ? '近7天' : salesTrendPeriod.value === '30days' ? '近30天' : '近90天'})`,
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{a} <br/>{b}: ¥{c}'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '销售额',
      axisLabel: {
        formatter: function(value) {
          if (value >= 10000) {
            return (value / 10000).toFixed(1) + '万'
          }
          return value
        }
      }
    },
    series: [{
      name: '销售额',
      data: revenueData,
      type: 'line',
      smooth: true,
      itemStyle: { color: '#409EFF' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(64, 158, 255, 0.3)'
          }, {
            offset: 1, color: 'rgba(64, 158, 255, 0.1)'
          }]
        }
      }
    }]
  }
  chart.setOption(option)
}

const initCategoryPieChart = () => {
  const chart = echarts.init(categoryPieChart.value)
  
  // 使用真实API数据
  const chartData = analyticsData.value.categorySales.map(item => ({
    name: item.name,
    value: item.value
  }))
  
  const option = {
    title: {
      text: '分类销售占比',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
    },
    series: [{
      name: '销售额',
      type: 'pie',
      radius: '60%',
      data: chartData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  chart.setOption(option)
}

const initInventoryChart = () => {
  const chart = echarts.init(inventoryChart.value)
  
  // 使用真实API数据
  const categories = analyticsData.value.inventoryWarning.categories.map(cat => cat.name)
  const inventoryData = analyticsData.value.inventoryWarning.categories.map(cat => cat.totalStock)
  
  const option = {
    title: {
      text: '库存状况',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{a} <br/>{b}: {c} 件'
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '库存数量'
    },
    series: [{
      name: '库存',
      data: inventoryData,
      type: 'bar',
      itemStyle: { 
        color: '#67C23A',
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          color: '#85ce61'
        }
      }
    }]
  }
  chart.setOption(option)
}

const initTopProductsChart = () => {
  const chart = echarts.init(topProductsChart.value)
  
  // 使用真实API数据
  const topProducts = analyticsData.value.topProducts
  const productNames = topProducts.map(p => p.name)
  const salesData = topProducts.map(p => p.sales)
  
  const option = {
    title: {
      text: '热销商品TOP5',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{a} <br/>{b}: {c} 件'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '销量'
    },
    yAxis: {
      type: 'category',
      data: productNames,
      axisLabel: {
        width: 100,
        overflow: 'truncate'
      }
    },
    series: [{
      name: '销量',
      data: salesData,
      type: 'bar',
      itemStyle: { 
        color: '#E6A23C',
        borderRadius: [0, 4, 4, 0]
      },
      emphasis: {
        itemStyle: {
          color: '#eebe77'
        }
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}'
      }
    }]
  }
  chart.setOption(option)
}

// 监听器
watch(salesTrendPeriod, () => {
  // 当销售趋势周期改变时，重新加载销售趋势数据
  loadAnalyticsData().then(() => {
    nextTick(() => {
      initSalesTrendChart()
    })
  })
})

watch(dateRange, (newDateRange) => {
  // 当日期范围改变时，重新加载数据和更新图表
  if (newDateRange && newDateRange.length === 2) {
    loadAnalyticsData().then(() => {
      nextTick(() => {
        updateChartsWithDateRange()
      })
    })
  }
}, { deep: true })

// 生命周期
onMounted(() => {
  // 初始化数据和图表
  loadData().then(() => {
    initCharts()
  })
})
</script>

<style scoped>
.product-analytics {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
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

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 8px;
  transition: transform 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.metric-change.up {
  color: #67C23A;
}

.metric-change.down {
  color: #F56C6C;
}

.metric-change.stable {
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 8px;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.table-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.low-stock {
  color: #F56C6C;
  font-weight: 600;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .product-analytics {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style>