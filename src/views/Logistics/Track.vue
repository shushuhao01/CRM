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
          <el-button @click="showSenderPhoneDialog" :icon="Setting">
            设置
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
          <!-- 第一行：物流公司、收货人、联系电话 -->
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
          <div class="info-item empty-placeholder"></div>
          <!-- 第二行：发货时间、预计送达、收货地址 -->
          <div class="info-item">
            <span class="label">发货时间：</span>
            <span class="value">{{ trackingResult.shipTime }}</span>
          </div>
          <div class="info-item">
            <span class="label">预计送达：</span>
            <span class="value">{{ trackingResult.estimatedTime }}</span>
          </div>
          <div class="info-item info-address" style="grid-column: span 2;">
            <span class="label">收货地址：</span>
            <span class="value">{{ trackingResult.receiverAddress }}</span>
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
              <!-- 🔥 只显示有意义的状态文本，隐藏数字状态码 -->
              <div class="timeline-status" v-if="getReadableStatus(item.status)">{{ getReadableStatus(item.status) }}</div>
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

    <!-- 寄件人手机号设置弹窗 -->
    <el-dialog
      v-model="senderPhoneDialogVisible"
      title="寄件人手机号设置"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form :model="senderPhoneForm" label-width="120px">
        <el-form-item label="寄件人手机号">
          <el-input
            v-model="senderPhoneForm.phone"
            placeholder="请输入完整手机号或后4位"
            clearable
            maxlength="11"
          >
            <template #prepend>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <!-- 🔥 管理员可选择全员生效（只有管理员和超管可见） -->
        <el-form-item v-if="isAdmin" label="应用范围">
          <el-radio-group v-model="senderPhoneForm.applyToAll">
            <el-radio :label="false">仅自己使用</el-radio>
            <el-radio :label="true">全员生效</el-radio>
          </el-radio-group>
          <div class="apply-scope-tip">
            <el-text type="info" size="small">
              {{ senderPhoneForm.applyToAll ? '💡 设置后所有员工都将使用此手机号' : '💡 仅自己使用，不影响其他员工' }}
            </el-text>
          </div>
        </el-form-item>
        <el-form-item>
          <div class="sender-phone-tips">
            <p>💡 设置后，查询顺丰等需要验证的物流时将自动使用此手机号</p>
            <p>💡 支持输入完整11位手机号或后4位数字</p>
            <p>💡 如果查询失败，仍会弹出手动输入框</p>
            <p v-if="configSource" class="config-source">
              📌 当前配置来源：{{ configSource }}
            </p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="clearSenderPhone" type="danger" plain>清除设置</el-button>
          <el-button @click="senderPhoneDialogVisible = false">取消</el-button>
          <el-button @click="saveSenderPhone" type="primary" :loading="savingSenderPhone">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import { useUserStore } from '@/stores/user'
import { displaySensitiveInfo as displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import PhoneVerifyDialog from '@/components/Logistics/PhoneVerifyDialog.vue'
import {
  Search,
  Refresh,
  Download,
  Location,
  User,
  Box,
  Check,
  Warning,
  Setting,
  Phone
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

// 寄件人手机号设置相关
const senderPhoneDialogVisible = ref(false)
const savingSenderPhone = ref(false)
const senderPhoneForm = reactive({
  phone: '',
  applyToAll: false  // 🔥 是否全员生效
})
const presetSenderPhone = ref('') // 预设的寄件人手机号
const configSource = ref('') // 🔥 配置来源（用户级/系统级）

// 🔥 判断当前用户是否是管理员
const isAdmin = computed(() => {
  const userStore = useUserStore()
  const role = userStore.currentUser?.role
  return role === 'super_admin' || role === 'admin'
})

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
    const { logisticsApi } = await import('@/api/logistics')
    const response = await logisticsApi.getActiveCompanies()

    const dataList = (response && response.success && Array.isArray(response.data))
      ? response.data
      : (response && Array.isArray(response) ? response as any[] : null)

    if (dataList) {
      logisticsCompanies.value = dataList.map((item: { code: string; name: string }) => ({
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
 * 🔥 加载预设的寄件人手机号
 */
const loadPresetSenderPhone = async () => {
  // 🔥 优先从寄件人地址管理获取默认寄件人手机号
  try {
    const { senderAddressApi } = await import('@/api/senderAddress')
    const senderRes = await senderAddressApi.getDefault('sender')
    if (senderRes?.data?.phone) {
      presetSenderPhone.value = senderRes.data.phone
      senderPhoneForm.phone = senderRes.data.phone
      configSource.value = '寄件人管理（默认寄件人）'
      console.log('[物流跟踪] ✅ 从寄件人管理加载默认手机号:', '****' + presetSenderPhone.value.slice(-4))
      return
    }
  } catch (error) {
    console.log('[物流跟踪] 从寄件人管理加载失败，尝试系统配置:', error)
  }
  // 回退到系统配置
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.get('/system/config/logistics_sender_phone')
    console.log('[物流跟踪] 加载配置响应:', response)
    if (response?.configValue) {
      presetSenderPhone.value = response.configValue
      senderPhoneForm.phone = response.configValue
      // 🔥 显示配置来源
      if (response.isUserLevel) {
        configSource.value = '个人设置'
      } else if (response.isSystemLevel) {
        configSource.value = '系统设置（管理员配置）'
      } else if (response.isLegacy) {
        configSource.value = '历史配置'
      }
      console.log('[物流跟踪] ✅ 加载预设寄件人手机号成功:', '****' + presetSenderPhone.value.slice(-4), '来源:', configSource.value)
    } else {
      configSource.value = ''
      console.log('[物流跟踪] ⚠️ 未找到预设寄件人手机号配置')
    }
  } catch (error) {
    console.log('[物流跟踪] ❌ 加载预设寄件人手机号失败:', error)
  }
}

/**
 * 🔥 显示寄件人手机号设置弹窗
 */
const showSenderPhoneDialog = () => {
  senderPhoneForm.phone = presetSenderPhone.value
  senderPhoneForm.applyToAll = false  // 🔥 默认不全员生效
  senderPhoneDialogVisible.value = true
}

/**
 * 🔥 保存寄件人手机号设置
 */
const saveSenderPhone = async () => {
  const phone = senderPhoneForm.phone.trim()

  // 验证手机号格式（允许4位或11位）
  if (phone && !/^(\d{4}|\d{11})$/.test(phone)) {
    ElMessage.warning('请输入完整11位手机号或后4位数字')
    return
  }

  savingSenderPhone.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    await apiService.post('/system/config/logistics_sender_phone', {
      configValue: phone,
      description: '物流查询预设寄件人手机号',
      applyToAll: isAdmin.value && senderPhoneForm.applyToAll  // 🔥 管理员可选择全员生效
    })

    presetSenderPhone.value = phone
    senderPhoneDialogVisible.value = false

    // 🔥 根据保存类型显示不同提示
    if (phone) {
      if (isAdmin.value && senderPhoneForm.applyToAll) {
        ElMessage.success('寄件人手机号设置成功，已全员生效')
        configSource.value = '系统设置（管理员配置）'
      } else {
        ElMessage.success('寄件人手机号设置成功')
        configSource.value = '个人设置'
      }
    } else {
      ElMessage.success('已清除寄件人手机号设置')
      configSource.value = ''
    }
  } catch (error) {
    console.error('[物流跟踪] 保存寄件人手机号失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    savingSenderPhone.value = false
  }
}

/**
 * 🔥 清除寄件人手机号设置
 */
const clearSenderPhone = async () => {
  senderPhoneForm.phone = ''
  await saveSenderPhone()
}

/**
 * 🔥 手机号根据权限显示（使用数据库敏感信息权限控制）
 */
const maskPhoneNumber = (phone: string): string => {
  if (!phone) return phone
  return displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE)
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
 * 🔥 获取可读的状态文本（过滤掉数字状态码）
 * 快递100等API返回的状态码是数字，需要转换或隐藏
 */
const getReadableStatus = (status: string): string => {
  // 如果是纯数字，返回空字符串（不显示）
  if (/^\d+$/.test(status)) {
    return ''
  }

  // 如果是已知的状态文本，直接返回
  const textMap: Record<string, string> = {
    'pending': '待发货',
    'shipped': '已发货',
    'picked_up': '已揽收',
    'in_transit': '运输中',
    'delivering': '派送中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    '已签收': '已签收',
    '派送中': '派送中',
    '运输中': '运输中',
    '已发货': '已发货',
    '已揽收': '已揽收',
    '异常': '异常'
  }

  return textMap[status] || ''
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
 * 🔥 判断物流公司是否需要手机号验证
 * 目前顺丰需要手机号后4位验证
 */
const isPhoneVerifyRequired = (companyCode: string): boolean => {
  const phoneRequiredCompanies = ['SF'] // 顺丰需要手机号验证
  return phoneRequiredCompanies.includes(companyCode.toUpperCase())
}

/**
 * 🔥 根据单号前缀自动识别物流公司
 */
const detectCompanyByTrackingNo = (trackingNo: string): string => {
  const no = trackingNo.trim().toUpperCase()
  // 顺丰单号规则：SF开头，或者纯数字12位/15位
  if (no.startsWith('SF')) return 'SF'
  // 纯数字12位或15位也可能是顺丰
  if (/^\d{12}$/.test(no) || /^\d{15}$/.test(no)) return 'SF'
  // 中通单号：75/76/77开头
  if (/^7[567]\d+$/.test(no)) return 'ZTO'
  // 圆通单号：YT开头或者纯数字13位
  if (no.startsWith('YT') || /^\d{13}$/.test(no)) return 'YTO'
  // 申通单号：77开头或者STO开头
  if (no.startsWith('STO') || /^77\d+$/.test(no)) return 'STO'
  // 韵达单号：YD开头或者纯数字13位
  if (no.startsWith('YD')) return 'YD'
  // 极兔单号：JT开头
  if (no.startsWith('JT')) return 'JTSD'
  // 京东单号：JD开头
  if (no.startsWith('JD')) return 'JD'
  // EMS单号：E开头
  if (no.startsWith('E')) return 'EMS'
  return ''
}

/**
 * 查询物流轨迹 - 优化版
 * 🔥 修复：先尝试从订单API获取手机号，再判断是否需要弹窗
 */
const handleSearch = async (phone?: string) => {
  const trackingNum = searchForm.trackingNo.trim()

  if (!trackingNum) {
    ElMessage.warning('请输入物流单号')
    return
  }

  if (isUnmounted.value) return

  // 🔥 确定物流公司代码
  let companyCode = searchForm.company || ''
  if (!companyCode) {
    // 尝试自动识别
    companyCode = detectCompanyByTrackingNo(trackingNum)
    if (companyCode) {
      searchForm.company = companyCode
      console.log('[物流跟踪] 自动识别物流公司:', companyCode)
    }
  }

  loading.value = true

  try {
    // 🔥 安全的手机号显示函数
    const safePhoneDisplay = (p: any): string => {
      if (!p || typeof p !== 'string') return '(空)'
      return p.length > 4 ? '****' + p.slice(-4) : p
    }

    // 🔥 修复：确定要使用的手机号，确保是字符串
    let phoneToUse: string = typeof phone === 'string' ? phone : ''
    console.log('[物流跟踪] 查询开始 - 传入手机号:', safePhoneDisplay(phoneToUse), ', 预设手机号:', safePhoneDisplay(presetSenderPhone.value))

    // 🔥 如果没有传入手机号，优先使用预设的寄件人手机号
    if (!phoneToUse && presetSenderPhone.value) {
      phoneToUse = String(presetSenderPhone.value)
      console.log('[物流跟踪] ✅ 使用预设寄件人手机号:', safePhoneDisplay(phoneToUse))
    }

    // 🔥 如果还没有手机号，尝试从订单API获取
    if (!phoneToUse) {
      try {
        const { orderApi } = await import('@/api/order')
        const orderRes = await orderApi.getOrderByTrackingNo(trackingNum)
        if (orderRes?.success && orderRes.data) {
          const orderData = orderRes.data as any
          const foundPhone = orderData.shippingPhone || orderData.receiverPhone || orderData.phone || orderData.customerPhone || ''
          phoneToUse = typeof foundPhone === 'string' ? foundPhone : String(foundPhone || '')
          console.log('[物流跟踪] 从订单API获取手机号:', safePhoneDisplay(phoneToUse))
        }
      } catch (orderErr) {
        console.log('[物流跟踪] 从订单API获取手机号失败:', orderErr)
      }
    }

    // 🔥 只有在需要手机号验证且没有获取到手机号时才弹窗
    if (companyCode && isPhoneVerifyRequired(companyCode) && !phoneToUse) {
      console.log('[物流跟踪] ⚠️ 物流公司需要手机号验证，且未能获取手机号，弹出输入框')
      loading.value = false
      pendingTrackingNo.value = trackingNum
      pendingCompanyCode.value = companyCode
      phoneVerifyDialogVisible.value = true
      return
    }

    console.log('[物流跟踪] 🚀 开始查询，使用手机号:', safePhoneDisplay(phoneToUse), ', 寄件人手机号:', safePhoneDisplay(presetSenderPhone.value))

    const { logisticsApi } = await import('@/api/logistics')
    const response = await logisticsApi.queryTrace(trackingNum, companyCode || undefined, phoneToUse, presetSenderPhone.value || undefined)

    console.log('[物流跟踪] API响应:', response)

    // 🔥 修复：检查响应消息是否包含需要手机号验证的提示
    const responseMessage = response?.message || response?.data?.statusText || ''
    const needPhoneVerify = responseMessage.includes('手机号') ||
                           responseMessage.includes('可能原因') ||
                           responseMessage.includes('无权限') ||
                           responseMessage.includes('验证失败')

    if (!response?.success || !response.data) {
      console.log('[物流跟踪] API返回失败:', response?.message)

      // 🔥 如果是需要手机号验证的错误，弹出手机号输入框
      if (needPhoneVerify && companyCode && isPhoneVerifyRequired(companyCode)) {
        console.log('[物流跟踪] 检测到需要手机号验证，弹出输入框')
        loading.value = false
        pendingTrackingNo.value = trackingNum
        pendingCompanyCode.value = companyCode
        phoneVerifyDialogVisible.value = true
        return
      }

      ElMessage.info(response?.message || '暂无物流信息')
      return
    }

    const data = response.data
    console.log('[物流跟踪] 响应数据:', data)

    // 需要手机号验证（后端返回的情况，作为兜底）
    if (data.status === 'need_phone_verify' || data.statusText?.includes('手机号') || data.statusText?.includes('可能原因') || data.statusText?.includes('无权限')) {
      console.log('[物流跟踪] 需要手机号验证，弹出对话框')
      pendingTrackingNo.value = trackingNum
      pendingCompanyCode.value = companyCode || ''
      phoneVerifyDialogVisible.value = true
      return
    }

    // 查询失败
    if (!data.success) {
      console.log('[物流跟踪] 查询失败:', data.statusText)

      // 🔥 再次检查是否需要手机号验证
      if ((data.statusText?.includes('手机号') || data.statusText?.includes('可能原因') || data.statusText?.includes('无权限')) &&
          companyCode && isPhoneVerifyRequired(companyCode)) {
        console.log('[物流跟踪] 检测到需要手机号验证，弹出输入框')
        loading.value = false
        pendingTrackingNo.value = trackingNum
        pendingCompanyCode.value = companyCode
        phoneVerifyDialogVisible.value = true
        return
      }

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
    // 🔥 优先使用预设的寄件人手机号
    let phoneToUse = presetSenderPhone.value || ''

    // 🔥 如果没有预设手机号，尝试从订单API获取
    if (!phoneToUse) {
      try {
        const { orderApi } = await import('@/api/order')
        const orderResponse = await orderApi.getOrderByTrackingNo(trackingResult.trackingNo)
        if (orderResponse?.success && orderResponse.data) {
          const orderData = orderResponse.data as any
          const foundPhone = orderData.receiverPhone || orderData.phone || orderData.customerPhone || ''
          phoneToUse = typeof foundPhone === 'string' ? foundPhone : String(foundPhone || '')
        }
      } catch {
        // 忽略
      }
    }

    // 🔥 安全的手机号显示
    const phoneDisplay = phoneToUse ? (phoneToUse.length > 4 ? '****' + phoneToUse.slice(-4) : phoneToUse) : '未提供'
    console.log('[物流跟踪] 刷新轨迹，使用手机号:', phoneDisplay)

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

  // 🔥 加载预设的寄件人手机号
  await loadPresetSenderPhone()

  const loadTime = Date.now() - startTime
  console.log(`[物流跟踪] ✅ 页面初始化完成，耗时: ${loadTime}ms`)

  // 检查路由参数并自动搜索
  checkRouteParamsAndSearch()
})

// 🔥 检查路由参数并执行搜索
const checkRouteParamsAndSearch = () => {
  const trackingNo = route.query.trackingNo as string
  const company = route.query.company as string
  const phone = route.query.phone as string  // 🔥 新增：从路由获取手机号

  console.log('[物流跟踪] 检查路由参数 - trackingNo:', trackingNo, ', company:', company, ', phone:', phone ? phone.slice(-4) + '****' : '(空)')

  if (trackingNo) {
    // 只有当单号变化时才更新和搜索
    if (searchForm.trackingNo !== trackingNo) {
      searchForm.trackingNo = trackingNo
      if (company) {
        searchForm.company = company
      }
      // 🔥 修复：如果路由传递了手机号，直接使用该手机号进行搜索
      console.log('[物流跟踪] 路由参数变化，自动执行搜索')
      handleSearch(phone || undefined)
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
  grid-template-columns: repeat(4, 1fr);
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

/* 空占位符 */
.empty-placeholder {
  visibility: hidden;
}

/* 收货地址字段占2列 */
.info-address .value {
  white-space: normal;
  word-break: break-all;
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

.sender-phone-tips {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.sender-phone-tips p {
  margin: 0;
}

.sender-phone-tips .config-source {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #dcdfe6;
  color: #909399;
}

.apply-scope-tip {
  margin-top: 8px;
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
