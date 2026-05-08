<template>
  <div class="dept-summary" v-loading="loading">
    <!-- 头部 -->
    <div class="summary-header">
      <div class="header-icon">
        <el-icon :size="32" color="#4C6EF5"><OfficeBuilding /></el-icon>
      </div>
      <div class="header-info">
        <div class="header-name">{{ data.deptName || '-' }}</div>
        <div class="header-meta">
          <span>企微部门ID: <code>{{ data.wecomDeptId }}</code></span>
          <el-divider direction="vertical" />
          <span>CRM映射: <strong>{{ data.crmDeptName || '未映射' }}</strong></span>
        </div>
      </div>
    </div>

    <!-- 核心指标 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value text-primary">{{ data.memberCount || 0 }}</div>
        <div class="stat-label">部门成员</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-success">{{ data.externalContacts?.valid || 0 }}</div>
        <div class="stat-label">有效外部联系人</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-purple">{{ data.customerGroups?.count || 0 }}</div>
        <div class="stat-label">客户群</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-orange">{{ formatAmount(data.payments?.totalAmount) }}</div>
        <div class="stat-label">收款总额(元)</div>
      </div>
    </div>

    <!-- 卡片两个一行布局 -->
    <div class="section-grid">
      <!-- 外部联系人详情 -->
      <div class="summary-section">
        <div class="section-title">
          <el-icon><User /></el-icon> 外部联系人
        </div>
        <div class="detail-rows">
          <div class="detail-row">
            <span class="row-label">外部联系人总数</span>
            <span class="row-value">{{ data.externalContacts?.total || 0 }}</span>
          </div>
          <div class="detail-row">
            <span class="row-label">有效（正常）</span>
            <span class="row-value text-success">{{ data.externalContacts?.valid || 0 }}</span>
          </div>
          <div class="detail-row">
            <span class="row-label">已删除</span>
            <span class="row-value text-danger">{{ data.externalContacts?.deleted || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 客户群详情 -->
      <div class="summary-section">
        <div class="section-title">
          <el-icon><ChatDotRound /></el-icon> 客户群
        </div>
        <div class="detail-rows">
          <div class="detail-row">
            <span class="row-label">群数量</span>
            <span class="row-value">{{ data.customerGroups?.count || 0 }}</span>
          </div>
          <div class="detail-row">
            <span class="row-label">群总成员数</span>
            <span class="row-value">{{ data.customerGroups?.totalMembers || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 收款与退款 -->
      <div class="summary-section">
        <div class="section-title">
          <el-icon><Money /></el-icon> 对外收款
        </div>
        <div class="detail-rows">
          <div class="detail-row">
            <span class="row-label">收款笔数</span>
            <span class="row-value">{{ data.payments?.count || 0 }} 笔</span>
          </div>
          <div class="detail-row">
            <span class="row-label">收款总额</span>
            <span class="row-value text-success">¥ {{ formatAmount(data.payments?.totalAmount) }}</span>
          </div>
          <div class="detail-row">
            <span class="row-label">退款笔数</span>
            <span class="row-value">{{ data.refunds?.count || 0 }} 笔</span>
          </div>
          <div class="detail-row">
            <span class="row-label">退款总额</span>
            <span class="row-value text-danger">¥ {{ formatAmount(data.refunds?.totalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 消息记录 -->
      <div class="summary-section">
        <div class="section-title">
          <el-icon><Message /></el-icon> 消息记录
        </div>
        <div class="detail-rows">
          <div class="detail-row">
            <span class="row-label">部门聊天记录总数</span>
            <span class="row-value">{{ data.chatMessages || 0 }} 条</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 成员列表概要 -->
    <div class="summary-section" v-if="data.members?.length" style="grid-column: 1 / -1">
      <div class="section-title">
        <el-icon><Avatar /></el-icon> 成员列表 ({{ data.members.length }})
      </div>
      <div class="member-list">
        <div
          v-for="m in paginatedMembers"
          :key="m.wecomUserId"
          class="member-item"
          @click="$emit('select-member', m.wecomUserId)"
        >
          <el-avatar :size="32" :src="m.wecomAvatar">{{ (m.wecomUserName || '?')[0] }}</el-avatar>
          <div class="member-info">
            <div class="member-name">{{ m.wecomUserName || m.wecomUserId }}</div>
            <div class="member-meta">
              外部联系人: {{ m.externalContactCount || 0 }}
              <el-tag v-if="m.crmUserName" type="success" size="small" style="margin-left: 6px">{{ m.crmUserName }}</el-tag>
            </div>
          </div>
          <el-icon class="member-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
      <div class="member-pagination" v-if="data.members.length > memberPageSize">
        <el-pagination
          v-model:current-page="memberPage"
          v-model:page-size="memberPageSize"
          :page-sizes="[10, 20, 50]"
          :total="data.members.length"
          layout="total, sizes, prev, pager, next"
          small
          background
          @size-change="memberPage = 1"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { OfficeBuilding, User, ChatDotRound, Money, Message, Avatar, ArrowRight } from '@element-plus/icons-vue'
import { getWecomDeptSummary } from '@/api/wecomAddressBook'

const props = defineProps<{
  deptId: number
  configId: number
}>()

defineEmits(['select-member'])

const loading = ref(false)
const data = ref<any>({})
const memberPage = ref(1)
const memberPageSize = ref(10)

const paginatedMembers = computed(() => {
  const members = data.value.members || []
  const start = (memberPage.value - 1) * memberPageSize.value
  return members.slice(start, start + memberPageSize.value)
})

const formatAmount = (cents: number | undefined) => {
  if (!cents) return '0.00'
  return (cents / 100).toFixed(2)
}

const fetchSummary = async () => {
  if (!props.deptId || !props.configId) return
  loading.value = true
  try {
    const res: any = await getWecomDeptSummary(props.deptId, props.configId)
    data.value = res || {}
  } catch (e: any) {
    console.error('获取部门汇总失败:', e)
    data.value = {}
  } finally {
    loading.value = false
  }
}

watch(() => [props.deptId, props.configId], () => {
  memberPage.value = 1
  fetchSummary()
}, { immediate: true })
</script>

<style scoped>
.dept-summary { padding: 0 4px; }

.summary-header {
  display: flex; gap: 16px; align-items: center;
  padding: 20px; background: linear-gradient(135deg, #EEF2FF 0%, #E0F2FE 100%);
  border-radius: 12px; margin-bottom: 16px;
}
.header-icon {
  width: 56px; height: 56px; border-radius: 12px; background: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(76, 110, 245, 0.15);
}
.header-name { font-size: 20px; font-weight: 700; color: #1F2937; margin-bottom: 4px; }
.header-meta { font-size: 13px; color: #6B7280; }
.header-meta code { background: rgba(0,0,0,.06); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
.header-meta strong { color: #4B5563; }

.stat-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
}
.stat-card {
  background: #fff; border: 1px solid #F3F4F6; border-radius: 10px;
  padding: 16px; text-align: center;
  transition: all 0.25s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.stat-value { font-size: 22px; font-weight: 700; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.text-primary { color: #4C6EF5; }
.text-success { color: #10B981; }
.text-danger { color: #EF4444; }
.text-purple { color: #7C3AED; }
.text-orange { color: #F59E0B; }

.section-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;
}
.summary-section {
  background: #fff; border: 1px solid #F3F4F6; border-radius: 12px;
  padding: 16px 20px;
}
.section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600; color: #1F2937;
  margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #F3F4F6;
}

.detail-rows { display: flex; flex-direction: column; }
.detail-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid #F9FAFB;
}
.detail-row:last-child { border-bottom: none; }
.row-label { font-size: 14px; color: #6B7280; }
.row-value { font-size: 14px; font-weight: 600; color: #1F2937; }

.member-list { display: flex; flex-direction: column; gap: 0; }
.member-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 8px; border-radius: 8px; cursor: pointer;
  transition: background 0.15s;
}
.member-item:hover { background: #F3F4F6; }
.member-info { flex: 1; }
.member-name { font-size: 14px; font-weight: 500; color: #1F2937; }
.member-meta { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
.member-arrow { color: #D1D5DB; }
.member-pagination { display: flex; justify-content: flex-end; margin-top: 12px; padding-top: 12px; border-top: 1px solid #F3F4F6; }
</style>
