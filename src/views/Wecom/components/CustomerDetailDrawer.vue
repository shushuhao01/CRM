<template>
  <el-drawer
    v-model="visible"
    title="企微客户详情"
    size="520px"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <div v-loading="loading" class="customer-detail-drawer">
      <template v-if="detail">
        <!-- 客户基本信息 -->
        <div class="customer-header">
          <el-avatar :src="detail.customer.avatar" :size="56">{{ (detail.customer.remark || detail.customer.name)?.charAt(0) }}</el-avatar>
          <div class="header-info">
            <div class="remark-name">{{ detail.customer.remark || detail.customer.name }}</div>
            <div class="nick-name">{{ detail.customer.nickname || detail.customer.name || '-' }}</div>
            <div class="meta">
              <el-tag size="small" :type="detail.customer.status === 'normal' ? 'success' : 'danger'">
                {{ detail.customer.status === 'normal' ? '正常' : '已删除' }}
              </el-tag>
              <el-tag v-if="detail.customer.isDealt" size="small" type="warning">已成交</el-tag>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <el-button v-if="detail.crmCustomer" type="primary" size="small" @click="$emit('goCrm', detail.crmCustomer.id)">
            📋 去客户详情(CRM)
          </el-button>
          <el-button v-if="detail.crmCustomer" type="success" size="small" @click="$emit('goOrder', detail.crmCustomer.id)">
            🛒 去下单
          </el-button>
        </div>

        <!-- 企微信息 -->
        <el-card shadow="never" class="section-card">
          <template #header><span class="section-title">👤 企微信息</span></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="UserID">
              <span class="usid-text">{{ detail.customer.externalUserId }}</span>
              <el-button link type="primary" size="small" @click="copyText(detail.customer.externalUserId)">📋</el-button>
            </el-descriptions-item>
            <el-descriptions-item label="备注名">
              <span style="font-weight: 600; color: #303133">{{ detail.customer.remark || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="昵称">
              <span style="color: #909399">{{ detail.customer.nickname || detail.customer.name || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="所属企业">{{ detail.customer.corpName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ detail.customer.gender === 1 ? '男' : detail.customer.gender === 2 ? '女' : '未知' }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ detail.customer.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="跟进人">{{ detail.customer.followUserName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="添加方式">{{ getAddWayText(detail.customer.addWay) }}</el-descriptions-item>
            <el-descriptions-item label="添加时间">{{ detail.customer.addTime ? formatDate(detail.customer.addTime) : '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.customer.state" label="渠道来源">
              <el-tag size="small" type="info">{{ detail.customer.state }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.customer.description" label="描述">{{ detail.customer.description }}</el-descriptions-item>
            <el-descriptions-item label="标签">
              <template v-if="parsedTags.length">
                <el-tag v-for="(tag, idx) in parsedTags" :key="idx" size="small" style="margin: 0 4px 4px 0">{{ tag }}</el-tag>
              </template>
              <span v-else>-</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 消息统计 -->
        <el-card shadow="never" class="section-card">
          <template #header><span class="section-title">📊 消息统计</span></template>
          <el-row :gutter="12">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-num">{{ detail.messageStats.sentCount }}</div>
                <div class="stat-label">发送消息</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-num">{{ detail.messageStats.recvCount }}</div>
                <div class="stat-label">接收消息</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-num">{{ detail.messageStats.activeDays7d }}</div>
                <div class="stat-label">近7天活跃</div>
              </div>
            </el-col>
          </el-row>
          <div v-if="detail.messageStats.lastMsgTime" class="last-msg">
            最后消息: {{ formatMsgTime(detail.messageStats.lastMsgTime) }}
          </div>
        </el-card>

        <!-- CRM客户信息 -->
        <el-card v-if="detail.crmCustomer" shadow="never" class="section-card">
          <template #header><span class="section-title">🏢 关联CRM客户</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="客户编码">{{ detail.crmCustomer.code || '-' }}</el-descriptions-item>
            <el-descriptions-item label="客户名">
              <span style="font-weight: 600; color: #303133">{{ detail.crmCustomer.name }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="备注名">
              <span style="font-weight: 600; color: #303133">{{ detail.customer.remark || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="昵称">
              <span style="color: #909399; font-size: 13px">{{ detail.customer.nickname || detail.customer.name || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="等级">{{ detail.crmCustomer.level }}</el-descriptions-item>
            <el-descriptions-item label="来源">{{ detail.crmCustomer.source || '-' }}</el-descriptions-item>
            <el-descriptions-item label="销售">{{ detail.crmCustomer.salesPersonName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="订单数">{{ detail.crmCustomer.orderCount }}</el-descriptions-item>
            <el-descriptions-item label="消费金额">¥{{ (detail.crmCustomer.totalAmount || 0).toLocaleString() }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.crmCustomer.wecomExternalUserid" label="企微UserID">
              <span class="usid-text">{{ detail.crmCustomer.wecomExternalUserid }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        <el-card v-else shadow="never" class="section-card">
          <template #header><span class="section-title">🏢 CRM关联</span></template>
          <el-empty description="尚未关联CRM客户" :image-size="60" />
        </el-card>

        <!-- 跟进记录 -->
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="section-header-row">
              <span class="section-title">📝 跟进记录</span>
              <el-button v-if="detail.crmCustomer" type="primary" size="small" @click="showFollowForm = !showFollowForm">
                {{ showFollowForm ? '收起' : '添加' }}
              </el-button>
            </div>
          </template>
          <!-- 添加表单 -->
          <div v-if="showFollowForm" class="follow-form">
            <el-input v-model="followContent" type="textarea" :rows="3" placeholder="请输入跟进内容..." maxlength="500" show-word-limit />
            <div class="follow-actions">
              <el-button size="small" @click="showFollowForm = false; followContent = ''">取消</el-button>
              <el-button type="primary" size="small" :loading="submittingFollow" @click="submitFollow">保存</el-button>
            </div>
          </div>
          <!-- 记录列表 -->
          <div v-if="detail.followRecords.length > 0" class="follow-list">
            <div v-for="record in detail.followRecords" :key="record.id" class="follow-item">
              <div class="follow-content">{{ record.content }}</div>
              <div class="follow-meta">
                <el-tag size="small" type="info">{{ record.type }}</el-tag>
                <span>{{ formatDate(record.createdAt) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无跟进记录" :image-size="40" />
        </el-card>
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getWecomCustomerDetail, addWecomCustomerFollowRecord } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const props = defineProps<{
  modelValue: boolean
  customerId: number | null
  demoData?: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'goCrm', id: string): void
  (e: 'goOrder', id: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const loading = ref(false)
const detail = ref<any>(null)
const showFollowForm = ref(false)
const followContent = ref('')
const submittingFollow = ref(false)

const parsedTags = computed(() => {
  if (!detail.value?.customer?.tagNames) return []
  try {
    return JSON.parse(detail.value.customer.tagNames)
  } catch {
    return []
  }
})

watch(() => props.customerId, async (newId) => {
  if (newId && props.modelValue) {
    if (props.demoData) {
      detail.value = props.demoData
    } else {
      await fetchDetail(newId)
    }
  }
})

watch(() => props.modelValue, async (show) => {
  if (show && props.customerId) {
    if (props.demoData) {
      detail.value = props.demoData
    } else {
      await fetchDetail(props.customerId)
    }
  }
})

const fetchDetail = async (id: number) => {
  loading.value = true
  try {
    const res: any = await getWecomCustomerDetail(id)
    detail.value = res || null
  } catch (e) {
    console.error('[CustomerDetailDrawer] Fetch error:', e)
    detail.value = null
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string | number) => {
  if (!date) return '-'
  return formatDateTime(typeof date === 'number' ? new Date(date).toISOString() : date)
}

const formatMsgTime = (ts: number) => {
  if (!ts) return '-'
  return formatDateTime(new Date(ts > 1e12 ? ts : ts * 1000).toISOString())
}

const getAddWayText = (way: number) => {
  const map: Record<number, string> = {
    0: '未知', 1: '扫码', 2: '搜索手机号', 3: '名片分享', 4: '群聊', 5: '手机通讯录',
    6: '微信联系人', 7: '来自微信', 8: '安装第三方应用', 9: '搜索邮箱', 10: '视频号添加',
    201: '内部共享', 202: '管理员分配'
  }
  return map[way] || '其他'
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请手动复制')
  }
}

const submitFollow = async () => {
  if (!followContent.value.trim()) {
    ElMessage.warning('请输入跟进内容')
    return
  }
  // 示例模式下本地模拟添加
  if (props.demoData) {
    detail.value.followRecords.unshift({
      id: Date.now(),
      content: followContent.value.trim(),
      type: '企微',
      createdAt: new Date().toISOString()
    })
    ElMessage.success('跟进记录添加成功（示例模式）')
    followContent.value = ''
    showFollowForm.value = false
    return
  }
  submittingFollow.value = true
  try {
    await addWecomCustomerFollowRecord(props.customerId!, { content: followContent.value.trim() })
    ElMessage.success('跟进记录添加成功')
    followContent.value = ''
    showFollowForm.value = false
    if (props.customerId) await fetchDetail(props.customerId)
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  } finally {
    submittingFollow.value = false
  }
}

const handleClose = () => {
  detail.value = null
  showFollowForm.value = false
  followContent.value = ''
}
</script>

<style scoped lang="scss">
.customer-detail-drawer {
  padding: 0 4px;
}
.customer-header {
  display: flex; gap: 16px; align-items: center; padding: 0 0 16px;
  border-bottom: 1px solid #F3F4F6; margin-bottom: 16px;
  .header-info {
    .remark-name { font-size: 18px; font-weight: 700; color: #1F2937; }
    .nick-name { font-size: 13px; color: #9CA3AF; margin-top: 2px; }
    .meta { margin-top: 6px; display: flex; gap: 6px; }
  }
}
.quick-actions {
  display: flex; gap: 8px; margin-bottom: 16px; padding: 12px; background: #F9FAFB; border-radius: 12px;
}
.section-card {
  margin-bottom: 12px;
  :deep(.el-card__header) { padding: 10px 16px; }
  :deep(.el-card__body) { padding: 12px 16px; }
}
.section-title { font-size: 14px; font-weight: 600; color: #1F2937; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; }
.stat-item {
  text-align: center; padding: 8px 0;
  .stat-num { font-size: 22px; font-weight: bold; color: #4C6EF5; }
  .stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
}
.last-msg { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 8px; }
.usid-text { font-family: 'SF Mono', 'Menlo', 'Consolas', monospace; font-size: 12px; word-break: break-all; }
.follow-form {
  margin-bottom: 12px;
  .follow-actions { margin-top: 8px; text-align: right; }
}
.follow-list {
  .follow-item {
    padding: 8px 0; border-bottom: 1px solid #F3F4F6;
    &:last-child { border-bottom: none; }
    .follow-content { font-size: 13px; color: #1F2937; margin-bottom: 4px; }
    .follow-meta { font-size: 12px; color: #9CA3AF; display: flex; gap: 8px; align-items: center; }
  }
}
</style>
