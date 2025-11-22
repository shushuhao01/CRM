<template>
  <div class="product-analysis">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>商品销售分析</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="monthrange"
          range-separator="至"
          start-placeholder="开始月份"
          end-placeholder="结束月份"
          format="YYYY-MM"
          value-format="YYYY-MM"
          @change="handleDateChange"
        />
        <el-select v-model="selectedCategory" placeholder="选择分类" style="width: 150px;">
          <el-option
            v-for="category in categoryList"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </el-select>
        <el-button @click="shareProductPerformance" :icon="Share">分享业绩</el-button>
        <el-button @click="exportData" :icon="Download">导出数据</el-button>
      </div>
    </div>

    <!-- 销售概览 -->
    <div class="sales-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon total-sales">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ salesData.totalSales }}</div>
                <div class="card-label">总销售额</div>
                <div class="card-trend">
                  <span :class="['trend', salesData.salesTrend > 0 ? 'up' : 'down']">
                    <el-icon><ArrowUp v-if="salesData.salesTrend > 0" /><ArrowDown v-else /></el-icon>
                    {{ Math.abs(salesData.salesTrend) }}%
                  </span>
                  <span class="trend-text">较上期</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon total-quantity">
                <el-icon><Box /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ salesData.totalQuantity }}</div>
                <div class="card-label">销售数量</div>
                <div class="card-trend">
                  <span :class="['trend', salesData.quantityTrend > 0 ? 'up' : 'down']">
                    <el-icon><ArrowUp v-if="salesData.quantityTrend > 0" /><ArrowDown v-else /></el-icon>
                    {{ Math.abs(salesData.quantityTrend) }}%
                  </span>
                  <span class="trend-text">较上期</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon product-count">
                <el-icon><Goods /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ salesData.productCount }}</div>
                <div class="card-label">在售商品</div>
                <div class="card-trend">
                  <span class="trend-text">热销商品 {{ salesData.hotProductCount }} 个</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon avg-price">
                <el-icon><Money /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ salesData.avgPrice }}</div>
                <div class="card-label">平均单价</div>
                <div class="card-trend">
                  <span :class="['trend', salesData.priceTrend > 0 ? 'up' : 'down']">
                    <el-icon><ArrowUp v-if="salesData.priceTrend > 0" /><ArrowDown v-else /></el-icon>
                    {{ Math.abs(salesData.priceTrend) }}%
                  </span>
                  <span class="trend-text">较上期</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 销售趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>销售趋势</span>
                <el-radio-group v-model="salesChartType" size="small">
                  <el-radio-button label="amount">销售额</el-radio-button>
                  <el-radio-button label="quantity">销售量</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="salesTrendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 分类销售占比 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>分类销售占比</span>
            </template>
            <div ref="categoryPieChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 商品销售排行 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>商品销售排行</span>
                <el-select v-model="rankingType" size="small" style="width: 100px;">
                  <el-option label="销售额" value="amount" />
                  <el-option label="销售量" value="quantity" />
                </el-select>
              </div>
            </template>
            <div ref="productRankingChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 价格分布 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>价格分布</span>
            </template>
            <div ref="priceDistributionChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 商品详细数据 -->
    <el-card class="product-data-card">
      <template #header>
        <div class="card-header">
          <span>商品详细数据</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索商品"
              style="width: 200px;"
              :prefix-icon="Search"
              @input="handleSearch"
            />
            <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px;">
              <el-option label="全部" value="" />
              <el-option label="热销" value="hot" />
              <el-option label="正常" value="normal" />
              <el-option label="滞销" value="slow" />
              <el-option label="缺货" value="out_of_stock" />
            </el-select>
            <el-select v-model="sortField" placeholder="排序方式" style="width: 120px;">
              <el-option label="销售额" value="salesAmount" />
              <el-option label="销售量" value="salesQuantity" />
              <el-option label="利润" value="profit" />
              <el-option label="库存" value="stock" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="productList" style="width: 100%" v-loading="tableLoading">
        <el-table-column type="index" label="排名" width="60" />
        <el-table-column prop="image" label="商品图片" width="80">
          <template #default="{ row }">
            <el-image
              :src="row.image"
              :preview-src-list="[row.image]"
              style="width: 50px; height: 50px;"
              fit="cover"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="200" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="price" label="单价" width="100" sortable>
          <template #default="{ row }">
            <span>¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="salesQuantity" label="销售量" width="100" sortable />
        <el-table-column prop="salesAmount" label="销售额" width="120" sortable>
          <template #default="{ row }">
            <span class="amount">¥{{ row.salesAmount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="100" sortable>
          <template #default="{ row }">
            <span class="profit">¥{{ row.profit.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" sortable>
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock < 10 }">{{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastSaleTime" label="最后销售" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button @click="viewProductDetail(row)" type="primary" link size="small">
              查看详情
            </el-button>
            <el-button @click="viewSalesAnalysis(row)" type="success" link size="small">
              销售分析
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePerformanceStore } from '@/stores/performance'
import { 
  Download, 
  Share,
  TrendCharts, 
  Box, 
  Goods, 
  Money,
  ArrowUp,
  ArrowDown,
  Search,
  Picture
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { createSafeNavigator } from '@/utils/navigation'

// 接口定义
interface Product {
  id: number
  name: string
  category: string
  price: number
  salesAmount: number
  salesQuantity: number
  profit: number
  profitRate: number
  status: string
  image?: string
}

// 路由
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 业绩store
const performanceStore = usePerformanceStore()

// 响应式数据
const dateRange = ref([])
const selectedCategory = ref('')
const salesChartType = ref('amount')
const rankingType = ref('amount')
const searchKeyword = ref('')
const statusFilter = ref('')
const sortField = ref('salesAmount')
const tableLoading = ref(false)

// 图表引用
const salesTrendChartRef = ref()
const categoryPieChartRef = ref()
const productRankingChartRef = ref()
const priceDistributionChartRef = ref()

// 图表实例
let salesTrendChart: echarts.ECharts | null = null
let categoryPieChart: echarts.ECharts | null = null
let productRankingChart: echarts.ECharts | null = null
let priceDistributionChart: echarts.ECharts | null = null

// 分类列表
const categoryList = ref([
  { id: 'all', name: '全部分类' },
  { id: 'electronics', name: '电子产品' },
  { id: 'clothing', name: '服装鞋帽' },
  { id: 'home', name: '家居用品' },
  { id: 'books', name: '图书文具' }
])

// 销售数据 - 从store获取
const salesData = computed(() => {
  const productPerf = performanceStore.productPerformance
  return {
    totalSales: `¥${productPerf.totalSales.toLocaleString()}`,
    salesTrend: productPerf.salesTrend,
    totalQuantity: productPerf.totalQuantity.toLocaleString(),
    quantityTrend: productPerf.quantityTrend,
    productCount: productPerf.productCount,
    hotProductCount: productPerf.hotProductCount,
    avgPrice: `¥${productPerf.avgPrice.toFixed(1)}`,
    priceTrend: productPerf.priceTrend
  }
})

// 商品列表 - 从store获取
const productList = computed(() => {
  return performanceStore.getProductRanking()
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 方法定义
/**
 * 日期范围变化处理
 */
const handleDateChange = (value: [string, string] | null) => {
  console.log('日期范围变化:', value)
  performanceStore.updateDateRange(value)
  loadSalesData()
  loadProductData()
}

/**
 * 导出数据
 */
const exportData = () => {
  ElMessage.success('数据导出功能开发中...')
}

/**
 * 分享产品业绩
 */
const shareProductPerformance = () => {
  // 获取当前选择的分类名称
  const currentCategory = categoryList.value.find(cat => cat.id === selectedCategory.value)
  const categoryName = currentCategory ? currentCategory.name : '全部分类'
  
  // 生成分享内容
  const currentSalesData = salesData.value
  const shareContent = `
🛍️ ${categoryName}销售分析报告 🛍️

📊 总销售额：${currentSalesData.totalSales}
📦 销售数量：${currentSalesData.totalQuantity}
🏷️ 商品种类：${currentSalesData.productCount}
💰 平均单价：${currentSalesData.avgPrice}

📈 销售增长：${currentSalesData.salesTrend > 0 ? '+' : ''}${currentSalesData.salesTrend}%
📦 数量增长：${currentSalesData.quantityTrend > 0 ? '+' : ''}${currentSalesData.quantityTrend}%
💰 单价增长：${currentSalesData.priceTrend > 0 ? '+' : ''}${currentSalesData.priceTrend}%

时间范围：${dateRange.value?.[0] || '当前月份'} 至 ${dateRange.value?.[1] || '当前月份'}

#产品销售 #商品分析 #CRM系统
  `.trim()

  // 检查是否支持Web Share API
  if (navigator.share) {
    navigator.share({
      title: `${categoryName}销售分析报告`,
      text: shareContent,
      url: window.location.href
    }).then(() => {
      ElMessage.success('分享成功')
    }).catch((error) => {
      console.log('分享失败:', error)
      fallbackProductShare(shareContent)
    })
  } else {
    fallbackProductShare(shareContent)
  }
}

/**
 * 备用分享方法（复制到剪贴板）
 */
const fallbackProductShare = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('产品业绩内容已复制到剪贴板，可以粘贴分享')
  } catch (error) {
    // 如果剪贴板API也不支持，显示分享内容
    ElMessage({
      message: '请手动复制以下内容进行分享',
      type: 'info',
      duration: 0,
      showClose: true
    })
    console.log('分享内容:', content)
  }
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  loadProductData()
}

/**
 * 获取状态类型
 */
const getStatusType = (status: string) => {
  const typeMap = {
    hot: 'danger',
    normal: 'success',
    slow: 'warning',
    out_of_stock: 'info'
  }
  return typeMap[status] || ''
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap = {
    hot: '热销',
    normal: '正常',
    slow: '滞销',
    out_of_stock: '缺货'
  }
  return textMap[status] || status
}

/**
 * 查看商品详情
 */
const viewProductDetail = (product: Product) => {
  safeNavigator.push(`/product/detail/${product.id}`)
}

/**
 * 查看销售分析
 */
const viewSalesAnalysis = (product: Product) => {
  ElMessage.success(`查看 ${product.name} 销售分析功能开发中...`)
}

/**
 * 分页处理
 */
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadProductData()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadProductData()
}

/**
 * 初始化销售趋势图
 */
const initSalesTrendChart = () => {
  if (!salesTrendChartRef.value) return
  
  salesTrendChart = echarts.init(salesTrendChartRef.value)
  
  const isAmount = salesChartType.value === 'amount'
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['电子产品', '服装鞋帽', '家居用品', '图书文具']
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: {
      type: 'value',
      name: isAmount ? '销售额(万元)' : '销售量(件)'
    },
    series: [
      {
        name: '电子产品',
        type: 'line',
        data: isAmount ? [45.2, 52.8, 58.6, 62.3, 68.9, 75.2] : [156, 182, 203, 218, 245, 268],
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '服装鞋帽',
        type: 'line',
        data: isAmount ? [32.8, 38.5, 42.1, 46.7, 51.3, 56.8] : [245, 289, 315, 348, 382, 425],
        smooth: true,
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '家居用品',
        type: 'line',
        data: isAmount ? [28.6, 31.2, 34.8, 38.5, 42.1, 46.3] : [189, 208, 232, 256, 281, 308],
        smooth: true,
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '图书文具',
        type: 'line',
        data: isAmount ? [18.5, 21.3, 24.1, 26.8, 29.5, 32.2] : [312, 356, 398, 442, 485, 528],
        smooth: true,
        itemStyle: { color: '#F56C6C' }
      }
    ]
  }
  
  salesTrendChart.setOption(option)
}

/**
 * 初始化分类销售占比图
 */
const initCategoryPieChart = () => {
  if (!categoryPieChartRef.value) return
  
  categoryPieChart = echarts.init(categoryPieChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '销售额',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 752000, name: '电子产品' },
          { value: 568000, name: '服装鞋帽' },
          { value: 463000, name: '家居用品' },
          { value: 322000, name: '图书文具' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  categoryPieChart.setOption(option)
}

/**
 * 初始化商品销售排行图
 */
const initProductRankingChart = () => {
  if (!productRankingChartRef.value) return
  
  productRankingChart = echarts.init(productRankingChartRef.value)
  
  const isAmount = rankingType.value === 'amount'
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: ['商品E', '商品D', '商品C', '商品B', '商品A']
    },
    series: [
      {
        name: isAmount ? '销售额' : '销售量',
        type: 'bar',
        data: isAmount ? [85600, 92300, 108500, 125800, 142600] : [156, 189, 225, 268, 312],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }
  
  productRankingChart.setOption(option)
}

/**
 * 初始化价格分布图
 */
const initPriceDistributionChart = () => {
  if (!priceDistributionChartRef.value) return
  
  priceDistributionChart = echarts.init(priceDistributionChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['0-100', '100-300', '300-500', '500-1000', '1000+']
    },
    yAxis: {
      type: 'value',
      name: '商品数量'
    },
    series: [
      {
        name: '商品数量',
        type: 'bar',
        data: [25, 45, 32, 18, 8],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }
  
  priceDistributionChart.setOption(option)
}

/**
 * 加载销售数据
 */
const loadSalesData = async () => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 这里可以根据selectedCategory和dateRange更新数据
    console.log('销售数据加载完成')
  } catch (error) {
    ElMessage.error('加载销售数据失败')
  }
}

/**
 * 加载商品数据
 */
const loadProductData = async () => {
  tableLoading.value = true
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 清空模拟商品数据，支持动态创建
    productList.value = []
    
    pagination.total = 0
  } catch (error) {
    ElMessage.error('加载商品数据失败')
  } finally {
    tableLoading.value = false
  }
}

/**
 * 初始化所有图表
 */
const initAllCharts = () => {
  nextTick(() => {
    initSalesTrendChart()
    initCategoryPieChart()
    initProductRankingChart()
    initPriceDistributionChart()
  })
}

/**
 * 窗口大小变化时重新调整图表
 */
const handleResize = () => {
  salesTrendChart?.resize()
  categoryPieChart?.resize()
  productRankingChart?.resize()
  priceDistributionChart?.resize()
}

// 监听分类选择变化
watch(selectedCategory, () => {
  loadSalesData()
  loadProductData()
})

// 监听状态筛选变化
watch(statusFilter, () => {
  loadProductData()
})

// 监听排序字段变化
watch(sortField, () => {
  loadProductData()
})

// 监听图表类型变化
watch(salesChartType, () => {
  initSalesTrendChart()
})

watch(rankingType, () => {
  initProductRankingChart()
})

// 生命周期钩子
onMounted(() => {
  // 设置默认值
  const currentDate = new Date()
  const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0')
  dateRange.value = [currentMonth, currentMonth]
  selectedCategory.value = 'all'
  
  // 加载数据
  loadSalesData()
  loadProductData()
  
  // 初始化图表
  initAllCharts()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  salesTrendChart?.dispose()
  categoryPieChart?.dispose()
  productRankingChart?.dispose()
  priceDistributionChart?.dispose()
})
</script>

<style scoped>
.product-analysis {
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
  align-items: center;
}

.sales-overview {
  margin-bottom: 20px;
}

.overview-card {
  height: 120px;
}

.card-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.card-icon.total-sales {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.total-quantity {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-icon.product-count {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.avg-price {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
}

.trend.up {
  color: #67c23a;
}

.trend.down {
  color: #f56c6c;
}

.trend-text {
  font-size: 12px;
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
  width: 100%;
}

.product-data-card .card-header {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.product-data-card .card-header span {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.amount {
  color: #f56c6c;
  font-weight: 500;
}

.profit {
  color: #67c23a;
  font-weight: 500;
}

.low-stock {
  color: #f56c6c;
  font-weight: 500;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 20px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .sales-overview .el-col {
    margin-bottom: 16px;
  }
  
  .charts-section .el-col {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .card-content {
    flex-direction: column;
    text-align: center;
  }

  .card-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .chart-card {
    height: 300px;
  }

  .chart-container {
    height: 220px;
  }

  .product-data-card .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style>