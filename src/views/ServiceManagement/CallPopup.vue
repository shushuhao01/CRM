<template>
  <div class="call-popup-page">
    <!-- 来电信息头 -->
    <div class="popup-header" :class="callType === 'Inbound' ? 'inbound' : 'outbound'">
      <el-icon class="phone-icon" :size="28"><PhoneFilled /></el-icon>
      <div class="header-info">
        <div class="header-title">
          {{ callType === 'Inbound' ? '来电' : '去电' }}
          <el-tag size="small" :type="callType === 'Inbound' ? 'success' : 'primary'" effect="dark">
            {{ callType === 'Inbound' ? '呼入' : '呼出' }}
          </el-tag>
        </div>
        <div class="header-number">{{ displayNumber || '未知号码' }}</div>
      </div>
    </div>

    <div v-loading="loading" class="popup-body">
      <!-- 匹配到客户 -->
      <template v-if="customer">
        <el-descriptions :column="1" border size="small" title="客户信息">
          <el-descriptions-item label="客户姓名">
            {{ customer.name }}
            <el-tag v-if="customer.level" size="small" style="margin-left: 6px;">{{ customer.level }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="电话">{{ customer.phone }}</el-descriptions-item>
          <el-descriptions-item v-if="customer.company" label="公司">{{ customer.company }}</el-descriptions-item>
          <el-descriptions-item v-if="customer.address" label="地址">{{ customer.address }}</el-descriptions-item>
          <el-descriptions-item v-if="customer.remark" label="备注">{{ customer.remark }}</el-descriptions-item>
        </el-descriptions>

        <div class="popup-actions">
          <el-button type="primary" size="small" @click="openCustomerDetail">查看客户详情</el-button>
          <el-button type="success" size="small" @click="openCallManagement">打开通话管理</el-button>
        </div>
      </template>

      <!-- 未匹配到客户 -->
      <el-empty v-else-if="!loading" description="系统中没有匹配到该号码的客户">
        <el-button type="primary" size="small" @click="createCustomer">新建客户</el-button>
      </el-empty>
    </div>

    <div class="popup-footer">
      <el-text size="small" type="info">
        云客CRM 来电弹屏 · 通话ID: {{ contactId || '-' }}
      </el-text>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 来电弹屏页面（供阿里云云联络中心坐席工作台以 iframe 嵌入）
 *
 * 在阿里云实例控制台「语音业务 -> 设置 -> 来电弹屏」中配置本页地址：
 *   https://你的CRM域名/call-popup
 * 每次呼入/呼出时工作台会带参数刷新本页：
 *   ?callNumber=主叫号码&calledNumber=被叫号码&callType=Inbound|Outbound&contactId=通话ID
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhoneFilled } from '@element-plus/icons-vue'
import { customerApi } from '@/api/customer'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const customer = ref<any>(null)

const callType = computed(() => String(route.query.callType || 'Inbound'))
const contactId = computed(() => String(route.query.contactId || ''))

// 呼入时关注主叫（客户）号码，呼出时关注被叫（客户）号码
const displayNumber = computed(() => {
  const caller = String(route.query.callNumber || '')
  const callee = String(route.query.calledNumber || '')
  return callType.value === 'Inbound' ? caller : callee
})

const lookupCustomer = async () => {
  const phone = displayNumber.value
  customer.value = null
  if (!phone) return

  loading.value = true
  try {
    const res: any = await customerApi.getList({ phone, page: 1, pageSize: 1 })
    const list = res?.list || res?.data?.list || []
    if (list.length > 0) {
      customer.value = list[0]
    }
  } catch (e) {
    console.error('[CallPopup] 查询客户失败:', e)
  } finally {
    loading.value = false
  }
}

const openCustomerDetail = () => {
  if (!customer.value?.id) return
  window.open(router.resolve({ path: `/customer/detail/${customer.value.id}` }).href, '_blank')
}

const openCallManagement = () => {
  window.open(router.resolve({ path: '/service-management/call' }).href, '_blank')
}

const createCustomer = () => {
  window.open(router.resolve({ path: '/customer/add', query: { phone: displayNumber.value } }).href, '_blank')
}

onMounted(lookupCustomer)
// 工作台每次新来电会刷新iframe参数，监听变化重新匹配客户
watch(() => route.query, lookupCustomer)
</script>

<style scoped>
.call-popup-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page, #f5f7fa);
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: #fff;
}

.popup-header.inbound {
  background: linear-gradient(135deg, #67c23a, #4ca82c);
}

.popup-header.outbound {
  background: linear-gradient(135deg, #409eff, #2f7fd4);
}

.phone-icon {
  animation: ring 1.2s ease-in-out infinite;
}

@keyframes ring {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(12deg); }
  40% { transform: rotate(-10deg); }
  60% { transform: rotate(6deg); }
  80% { transform: rotate(-4deg); }
}

.header-title {
  font-size: 14px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-number {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1px;
}

.popup-body {
  flex: 1;
  padding: 16px 20px;
}

.popup-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}

.popup-footer {
  padding: 10px 20px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  text-align: center;
}
</style>
