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
import { ref, computed, onMounted, nextTick, watch } from 'vue'
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
import { useProductStore, type Product, type ProductCategory } from '@/stores/product'
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

// 商品分析数据类型
interface ProductAnalyticsItem {
  id: string | number
  name: string
  category: string
  price: number
  stock: number
  sales: number
  revenue: number
  profit: number
  profitRate: number
}

// 分析数据类型定义
interface AnalyticsData {
  salesStatistics: {
    totalRevenue: number
    totalSales: number
    totalProducts: number
    lowStockWarning: number
    revenueChange: string
    salesChange: string
    productsChange: string
    warningChange: string
  }
  salesTrend: {
    timeLabels: string[]
    salesData: number[]
    revenueData: number[]
  }
  categorySales: Array<{ name: string; value: number; percentage?: number }>
  topProducts: Array<{ id: string; name: string; sales: number; revenue: number; image?: string; categoryName: string }>
  inventoryWarning: {
    lowStockCount: number
    outOfStockCount: number
    totalWarning: number
    categories: Array<{ name: string; lowStock: number; outOfStock: number; totalStock: number }>
  }
}

// 分析数据
const analyticsData = ref<AnalyticsData>({
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

// 核心指标数据 - 基于ProductStore的实时数据
const coreMetrics = computed(() => {
  // 从ProductStore获取实时商品数据
  const products = productStore.products || []

  // 计算实时统计数据
  const totalProducts = products.length
  const totalSales = products.reduce((sum: number, p: Product) => sum + (p.salesCount || 0), 0)
  const totalRevenue = products.reduce((sum: number, p: Product) => sum + ((p.salesCount || 0) * p.price), 0)
  const lowStockCount = products.filter((p: Product) => p.stock <= p.minStock && p.stock > 0).length

  const stats = {
    totalRevenue,
    revenueChange: '+0%',
    totalSales,
    salesChange: '+0%',
    totalProducts,
    productsChange: '+0%',
    lowStockCount,
    stockChange: '+0%'
  }

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
      value: `¥${formatNumber(stats.totalRevenue || 0)}`,
      change: stats.revenueChange || '+0%',
      trend: (stats.revenueChange || '+0%').startsWith('+') ? 'up' : (stats.revenueChange || '+0%').startsWith('-') ? 'down' : 'stable',
      color: '#409EFF',
      icon: Coin
    },
    {
      key: 'totalSales',
      label: '总销量',
      value: formatNumber(stats.totalSales || 0),
      change: stats.salesChange || '+0%',
      trend: (stats.salesChange || '+0%').startsWith('+') ? 'up' : (stats.salesChange || '+0%').startsWith('-') ? 'down' : 'stable',
      color: '#67C23A',
      icon: TrendCharts
    },
    {
      key: 'totalProducts',
      label: '商品总数',
      value: (stats.totalProducts || 0).toString(),
      change: stats.productsChange || '+0%',
      trend: (stats.productsChange || '+0%').startsWith('+') ? 'up' : (stats.productsChange || '+0%').startsWith('-') ? 'down' : 'stable',
      color: '#E6A23C',
      icon: Box
    },
    {
      key: 'lowStockWarning',
      label: '库存预警',
      value: (stats.lowStockCount || 0).toString(),
      change: stats.stockChange || '+0%',
      trend: (stats.stockChange || '+0%').startsWith('+') ? 'up' : (stats.stockChange || '+0%').startsWith('-') ? 'down' : 'stable',
      color: '#F56C6C',
      icon: Warning
    }
  ]
})

// 商品分类 - 从商品store获取
const categories = computed(() => {
  return (productStore.categories || []).map((cat: ProductCategory) => ({
    label: cat.name,
    value: cat.name
  }))
})

// 商品数据 - 从商品store获取并计算分析数据
const productData = computed((): ProductAnalyticsItem[] => {
  return productStore.products.map((product: Product) => {
    const salesCount = product.salesCount || 0
    const price = product.price || 0
    const costPrice = product.costPrice || 0
    const revenue = salesCount * price
    const profit = salesCount * (price - costPrice)
    const profitRate = price > 0 && costPrice > 0 ? (price - costPrice) / price : 0

    return {
      id: product.id,
      name: product.name,
      category: product.categoryName || '未分类',
      price: price,
      stock: product.stock,
      sales: salesCount,
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

// 过滤后的数据（不分页）
const filteredData = computed((): ProductAnalyticsItem[] => {
  let data = productData.value

  // 确保data不为null或undefined
  if (!data || !Array.isArray(data)) {
    return []
  }

  if (searchKeyword.value) {
    data = data.filter((item: ProductAnalyticsItem) =>
      item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }

  if (categoryFilter.value) {
    data = data.filter((item: ProductAnalyticsItem) => item.category === categoryFilter.value)
  }

  return data
})

// 分页后的数据
const filteredProductData = computed((): ProductAnalyticsItem[] => {
  const data = filteredData.value
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return data.slice(start, end)
})

// 监听过滤数据变化更新总数
watch(filteredData, (newData) => {
  total.value = newData.length
}, { immediate: true })

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

const exportData = async () => {
  try {
    ElMessage.info('正在导出数据...')

    // 准备导出数据
    const exportProducts = filteredProductData.value.map((item: ProductAnalyticsItem) => ({
      '商品名称': item.name,
      '分类': item.category,
      '单价': item.price.toFixed(2),
      '库存': item.stock,
      '销量': item.sales,
      '销售额': item.revenue.toFixed(2),
      '利润': item.profit.toFixed(2),
      '利润率': (item.profitRate * 100).toFixed(1) + '%',
      '状态': getStockStatusText(item.stock)
    }))

    // 使用xlsx库导出
    import('xlsx').then(XLSX => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportProducts)

      // 设置列宽
      ws['!cols'] = [
        { wch: 25 }, // 商品名称
        { wch: 15 }, // 分类
        { wch: 12 }, // 单价
        { wch: 10 }, // 库存
        { wch: 10 }, // 销量
        { wch: 15 }, // 销售额
        { wch: 15 }, // 利润
        { wch: 12 }, // 利润率
        { wch: 12 }  // 状态
      ]

      XLSX.utils.book_append_sheet(wb, ws, '商品分析数据')

      // 生成文件名（包含日期范围）
      const [startDate, endDate] = dateRange.value
      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]
      const fileName = `商品分析数据_${startStr}_${endStr}.xlsx`

      XLSX.writeFile(wb, fileName)

      ElMessage.success('数据导出成功')
    }).catch(() => {
      ElMessage.error('导出失败，请重试')
    })
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出失败')
  }
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
        period: salesTrendPeriod.value as '7days' | '30days' | '90days'
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
  // 确保商品数据已加载
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

  // 优先使用API数据，如果没有则基于商品数据生成模拟趋势
  let timeLabels: string[] = []
  let revenueData: number[] = []

  const salesTrend = analyticsData.value?.salesTrend
  if (salesTrend && Array.isArray(salesTrend.timeLabels) && salesTrend.timeLabels.length > 0) {
    timeLabels = salesTrend.timeLabels
    revenueData = Array.isArray(salesTrend.revenueData) ? salesTrend.revenueData : []
  } else {
    // 基于商品数据生成模拟趋势
    const products = productStore.products || []
    const totalRevenue = products.reduce((sum: number, p: Product) => sum + ((p.salesCount || 0) * p.price), 0)
    const avgDailyRevenue = totalRevenue / 30

    if (salesTrendPeriod.value === '7days') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        timeLabels.push(`${date.getMonth() + 1}/${date.getDate()}`)
        revenueData.push(Math.round(avgDailyRevenue * (0.8 + Math.random() * 0.4)))
      }
    } else if (salesTrendPeriod.value === '30days') {
      for (let i = 3; i >= 0; i--) {
        timeLabels.push(`第${4-i}周`)
        revenueData.push(Math.round(avgDailyRevenue * 7 * (0.8 + Math.random() * 0.4)))
      }
    } else {
      for (let i = 2; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        timeLabels.push(`${date.getMonth() + 1}月`)
        revenueData.push(Math.round(avgDailyRevenue * 30 * (0.8 + Math.random() * 0.4)))
      }
    }
  }

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
        formatter: function(value: number) {
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

  // 优先使用API数据，如果没有则基于商品数据生成
  let chartData: Array<{ name: string; value: number }> = []

  const categorySales = analyticsData.value?.categorySales
  if (Array.isArray(categorySales) && categorySales.length > 0) {
    chartData = categorySales.map(item => ({
      name: item.name,
      value: item.value
    }))
  } else {
    // 基于商品数据生成分类销售统计
    const products = productStore.products || []
    const categoryStats = new Map<string, number>()

    products.forEach((product: Product) => {
      const categoryName = product.categoryName || '未分类'
      const revenue = (product.salesCount || 0) * product.price
      categoryStats.set(categoryName, (categoryStats.get(categoryName) || 0) + revenue)
    })

    chartData = Array.from(categoryStats.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }

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

  // 优先使用API数据，如果没有则基于商品数据生成
  let categories: string[] = []
  let inventoryData: number[] = []

  const inventoryWarning = analyticsData.value?.inventoryWarning
  if (inventoryWarning && Array.isArray(inventoryWarning.categories) && inventoryWarning.categories.length > 0) {
    categories = inventoryWarning.categories.map(cat => cat.name)
    inventoryData = inventoryWarning.categories.map(cat => cat.totalStock)
  } else {
    // 基于商品数据生成库存统计
    const products = productStore.products || []
    const categoryStock = new Map<string, number>()

    products.forEach((product: Product) => {
      const categoryName = product.categoryName || '未分类'
      categoryStock.set(categoryName, (categoryStock.get(categoryName) || 0) + product.stock)
    })

    const sortedCategories = Array.from(categoryStock.entries())
      .sort((a, b) => b[1] - a[1])

    categories = sortedCategories.map(([name]) => name)
    inventoryData = sortedCategories.map(([, stock]) => stock)
  }

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

  // 基于商品数据生成热销排行（使用真实商品数据）
  const products = productStore.products || []

  // 按销量排序，取前5名
  const sortedProducts = [...products]
    .filter(p => p.name) // 确保有名称
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 5)
    .reverse() // 反转以便在横向柱状图中从下到上显示（销量最高的在最上面）

  const productNames = sortedProducts.map(p => p.name || '未命名商品')
  const salesData = sortedProducts.map(p => p.salesCount || 0)

  // 截断长名称用于显示，保留完整名称用于tooltip
  const truncateName = (name: string, maxLen: number = 10) => {
    return name.length > maxLen ? name.substring(0, maxLen) + '...' : name
  }
  const displayNames = productNames.map(name => truncateName(name))

  const option = {
    title: {
      text: '热销商品TOP5',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const dataIndex = params[0]?.dataIndex
        const fullName = productNames[dataIndex] || ''
        const value = params[0]?.value || 0
        return `<div style="font-weight:bold;margin-bottom:4px;">商品名称</div>
                <div style="margin-bottom:4px;">${fullName}</div>
                <div>销量：<span style="font-weight:bold;color:#E6A23C;">${value}</span> 件</div>`
      }
    },
    grid: {
      left: '3%',
      right: '15%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '销量',
      nameTextStyle: {
        fontSize: 12
      }
    },
    yAxis: {
      type: 'category',
      data: displayNames,
      axisLabel: {
        width: 80,
        overflow: 'truncate',
        ellipsis: '...',
        fontSize: 11
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
        formatter: '{c}',
        fontSize: 11
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
