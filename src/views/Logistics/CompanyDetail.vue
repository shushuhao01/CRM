<template>
  <div class="company-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>{{ companyInfo.name }}</h2>
          <div class="header-meta">
            <span class="company-code">{{ companyInfo.code }}</span>
            <el-tag :type="getStatusColor(companyInfo.status)" size="large">
              {{ getStatusText(companyInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="handleEdit" type="primary" :icon="Edit">
          编辑
        </el-button>
        <el-button @click="handleToggleStatus" :type="companyInfo.status === 'active' ? 'danger' : 'success'">
          {{ companyInfo.status === 'active' ? '禁用' : '启用' }}
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧信息 -->
      <el-col :span="16">
        <!-- 基本信息 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="label">公司名称：</span>
              <span class="value">{{ companyInfo.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">公司代码：</span>
              <span class="value">{{ companyInfo.code }}</span>
            </div>
            <div class="info-item">
              <span class="label">联系电话：</span>
              <span class="value">{{ displaySensitiveInfoNew(companyInfo.phone, 'phone') }}</span>
            </div>
            <div class="info-item">
              <span class="label">客服热线：</span>
              <span class="value">{{ displaySensitiveInfoNew(companyInfo.servicePhone, 'phone') }}</span>
            </div>
            <div class="info-item">
              <span class="label">官方网站：</span>
              <el-link :href="companyInfo.website" target="_blank" type="primary">
                {{ companyInfo.website }}
              </el-link>
            </div>
            <div class="info-item">
              <span class="label">成立时间：</span>
              <span class="value">{{ companyInfo.foundedDate }}</span>
            </div>
            <div class="info-item">
              <span class="label">总部地址：</span>
              <span class="value">{{ companyInfo.headquarters }}</span>
            </div>
            <div class="info-item">
              <span class="label">服务范围：</span>
              <span class="value">{{ companyInfo.serviceArea }}</span>
            </div>
          </div>
        </el-card>

        <!-- 服务信息 -->
        <el-card class="service-card">
          <template #header>
            <div class="card-header">
              <span>服务信息</span>
            </div>
          </template>
          
          <div class="service-grid">
            <div class="service-item" v-for="service in companyInfo.services" :key="service.type">
              <div class="service-header">
                <span class="service-name">{{ service.name }}</span>
                <el-tag :type="service.available ? 'success' : 'info'" size="small">
                  {{ service.available ? '可用' : '不可用' }}
                </el-tag>
              </div>
              <div class="service-description">{{ service.description }}</div>
              <div class="service-price">参考价格：{{ service.price }}</div>
              <div class="service-time">时效：{{ service.timeLimit }}</div>
            </div>
          </div>
        </el-card>

        <!-- 覆盖区域 -->
        <el-card class="coverage-card">
          <template #header>
            <div class="card-header">
              <span>覆盖区域</span>
            </div>
          </template>
          
          <div class="coverage-info">
            <div class="coverage-stats">
              <el-statistic title="覆盖城市" :value="companyInfo.coverage.cities" suffix="个" />
              <el-statistic title="服务网点" :value="companyInfo.coverage.outlets" suffix="个" />
              <el-statistic title="配送员" :value="companyInfo.coverage.couriers" suffix="人" />
            </div>
            
            <div class="coverage-regions">
              <h4>主要覆盖区域</h4>
              <div class="region-tags">
                <el-tag
                  v-for="region in companyInfo.coverage.regions"
                  :key="region"
                  class="region-tag"
                >
                  {{ region }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧统计 -->
      <el-col :span="8">
        <!-- 业务统计 -->
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <span>业务统计</span>
              <el-select v-model="statsTimeRange" size="small" style="width: 100px">
                <el-option label="本月" value="month" />
                <el-option label="本季" value="quarter" />
                <el-option label="本年" value="year" />
              </el-select>
            </div>
          </template>
          
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ businessStats.totalOrders }}</div>
              <div class="stat-label">总订单数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ businessStats.deliveredOrders }}</div>
              <div class="stat-label">已送达</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ businessStats.onTimeRate }}%</div>
              <div class="stat-label">准时率</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ businessStats.avgDeliveryTime }}h</div>
              <div class="stat-label">平均时效</div>
            </div>
          </div>
        </el-card>

        <!-- 评价信息 -->
        <el-card class="rating-card">
          <template #header>
            <div class="card-header">
              <span>服务评价</span>
            </div>
          </template>
          
          <div class="rating-info">
            <div class="overall-rating">
              <el-rate
                v-model="companyInfo.rating.overall"
                disabled
                show-score
                text-color="#ff9900"
                score-template="{value} 分"
              />
            </div>
            
            <div class="rating-details">
              <div class="rating-item">
                <span class="rating-label">服务态度</span>
                <el-rate v-model="companyInfo.rating.service" disabled size="small" />
                <span class="rating-score">{{ companyInfo.rating.service }}</span>
              </div>
              <div class="rating-item">
                <span class="rating-label">配送速度</span>
                <el-rate v-model="companyInfo.rating.speed" disabled size="small" />
                <span class="rating-score">{{ companyInfo.rating.speed }}</span>
              </div>
              <div class="rating-item">
                <span class="rating-label">包装质量</span>
                <el-rate v-model="companyInfo.rating.packaging" disabled size="small" />
                <span class="rating-score">{{ companyInfo.rating.packaging }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 联系方式 -->
        <el-card class="contact-card">
          <template #header>
            <div class="card-header">
              <span>联系方式</span>
            </div>
          </template>
          
          <div class="contact-info">
            <div class="contact-item">
              <el-icon><Phone /></el-icon>
              <div class="contact-content">
                <div class="contact-label">客服电话</div>
                <div class="contact-value">{{ companyInfo.servicePhone }}</div>
              </div>
            </div>
            <div class="contact-item">
              <el-icon><Message /></el-icon>
              <div class="contact-content">
                <div class="contact-label">投诉电话</div>
                <div class="contact-value">{{ companyInfo.complaintPhone }}</div>
              </div>
            </div>
            <div class="contact-item">
              <el-icon><Link /></el-icon>
              <div class="contact-content">
                <div class="contact-label">官方网站</div>
                <el-link :href="companyInfo.website" target="_blank" type="primary">
                  访问官网
                </el-link>
              </div>
            </div>
            <div class="contact-item">
              <el-icon><ChatDotRound /></el-icon>
              <div class="contact-content">
                <div class="contact-label">在线客服</div>
                <div class="contact-value">24小时在线</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft,
  Edit,
  Phone,
  Message,
  Link,
  ChatDotRound
} from '@element-plus/icons-vue'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'

// 路由
const router = useRouter()
const route = useRoute()

// 响应式数据
const loading = ref(false)
const statsTimeRange = ref('month')

// 超时ID跟踪
const timeoutIds = new Set<number>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 公司信息
const companyInfo = reactive({
  id: '',
  name: '',
  code: '',
  phone: '',
  servicePhone: '',
  complaintPhone: '',
  website: '',
  foundedDate: '',
  headquarters: '',
  serviceArea: '',
  status: 'active',
  services: [],
  coverage: {
    cities: 0,
    outlets: 0,
    couriers: 0,
    regions: []
  },
  rating: {
    overall: 0,
    service: 0,
    speed: 0,
    packaging: 0
  }
})

// 业务统计
const businessStats = reactive({
  totalOrders: 0,
  deliveredOrders: 0,
  onTimeRate: 0,
  avgDeliveryTime: 0
})

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  return status === 'active' ? 'success' : 'danger'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  return status === 'active' ? '正常' : '禁用'
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.back()
}

/**
 * 编辑公司
 */
const handleEdit = () => {
  ElMessage.info('编辑功能开发中...')
}

/**
 * 切换状态
 */
const handleToggleStatus = async () => {
  if (isUnmounted.value) return
  
  const action = companyInfo.status === 'active' ? '禁用' : '启用'
  
  try {
    await ElMessageBox.confirm(
      `确认${action}该物流公司吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (isUnmounted.value) return
    
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 1000)
      timeoutIds.add(timeoutId)
    })
    
    if (isUnmounted.value) return
    
    companyInfo.status = companyInfo.status === 'active' ? 'inactive' : 'active'
    ElMessage.success(`${action}成功`)
    
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 加载公司数据
 */
const loadCompanyData = async () => {
  if (isUnmounted.value) return
  
  loading.value = true
  
  try {
    const companyId = route.params.id
    
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 800)
      timeoutIds.add(timeoutId)
    })
    
    if (isUnmounted.value) return
    
    // 模拟数据
    Object.assign(companyInfo, {
      id: companyId || '1',
      name: '顺丰速运',
      code: 'SF',
      phone: '0755-88888888',
      servicePhone: '95338',
      complaintPhone: '400-889-5338',
      website: 'https://www.sf-express.com',
      foundedDate: '1993年3月26日',
      headquarters: '深圳市福田区益田路6009号新世界商务中心',
      serviceArea: '全国及海外',
      status: 'active',
      services: [
        {
          type: 'standard',
          name: '标准快递',
          description: '经济实惠的标准配送服务',
          price: '首重12元/kg',
          timeLimit: '2-3个工作日',
          available: true
        },
        {
          type: 'express',
          name: '顺丰特快',
          description: '更快的配送服务',
          price: '首重18元/kg',
          timeLimit: '次日达',
          available: true
        },
        {
          type: 'same_day',
          name: '即日达',
          description: '当日送达服务',
          price: '首重25元/kg',
          timeLimit: '当日达',
          available: true
        },
        {
          type: 'cold_chain',
          name: '冷链配送',
          description: '生鲜冷链专业配送',
          price: '首重30元/kg',
          timeLimit: '次日达',
          available: false
        }
      ],
      coverage: {
        cities: 2000,
        outlets: 15000,
        couriers: 50000,
        regions: ['华北地区', '华东地区', '华南地区', '华中地区', '西南地区', '西北地区', '东北地区', '港澳台地区']
      },
      rating: {
        overall: 4.6,
        service: 4.5,
        speed: 4.8,
        packaging: 4.4
      }
    })
    
    // 模拟业务统计数据
    Object.assign(businessStats, {
      totalOrders: 15680,
      deliveredOrders: 15234,
      onTimeRate: 97.2,
      avgDeliveryTime: 18.5
    })
    
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('加载公司信息失败')
    }
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadCompanyData()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  isUnmounted.value = true
  // 清理所有未完成的 setTimeout
  timeoutIds.forEach(id => clearTimeout(id))
  timeoutIds.clear()
})
</script>

<style scoped>
.company-detail {
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

.company-code {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #409EFF;
  background: #ECF5FF;
  padding: 4px 8px;
  border-radius: 4px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.info-card,
.service-card,
.coverage-card,
.stats-card,
.rating-card,
.contact-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.service-item {
  padding: 16px;
  border: 1px solid #EBEEF5;
  border-radius: 8px;
  background: #FAFAFA;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.service-name {
  font-weight: bold;
  color: #303133;
}

.service-description {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.service-price,
.service-time {
  color: #909399;
  font-size: 13px;
  margin-bottom: 4px;
}

.coverage-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.coverage-regions h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.region-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.region-tag {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #F5F7FA;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.overall-rating {
  text-align: center;
  margin-bottom: 20px;
}

.rating-details {
  space-y: 12px;
}

.rating-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rating-label {
  color: #606266;
  min-width: 60px;
}

.rating-score {
  color: #909399;
  font-size: 14px;
  min-width: 20px;
  text-align: right;
}

.contact-info {
  space-y: 16px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #F5F7FA;
}

.contact-item:last-child {
  border-bottom: none;
}

.contact-content {
  flex: 1;
}

.contact-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 4px;
}

.contact-value {
  color: #303133;
  font-weight: 500;
}
</style>