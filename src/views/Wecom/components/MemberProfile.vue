<template>
  <div class="member-profile" v-loading="loading">
    <!-- 头部：头像 + 基本信息 -->
    <div class="profile-header">
      <el-avatar :size="64" :src="profile.wecomAvatar">
        {{ (profile.wecomUserName || '?')[0] }}
      </el-avatar>
      <div class="header-info">
        <div class="header-name">
          <span class="name-text">{{ profile.wecomUserName || '-' }}</span>
          <el-tag :type="profile.isEnabled ? 'success' : 'danger'" size="small">
            {{ profile.isEnabled ? '在职' : '离职' }}
          </el-tag>
        </div>
        <div class="header-meta">
          <span class="meta-item">企微ID: <code>{{ profile.wecomUserId }}</code></span>
        </div>
        <div class="header-meta">
          <span class="meta-item" v-if="profile.departments?.length">
            部门: {{ profile.departments.join(' / ') }}
          </span>
        </div>
      </div>
    </div>

    <!-- CRM 绑定卡片 -->
    <div class="profile-section crm-bind-section">
      <div class="section-title">
        <el-icon><Link /></el-icon> CRM 绑定状态
      </div>
      <div class="crm-bind-content" v-if="profile.crmUserId && profile.crmUserName">
        <div class="bind-status bound">
          <el-icon color="#10B981"><CircleCheckFilled /></el-icon>
          <span>已绑定CRM用户: <strong>{{ profile.crmUserName }}</strong></span>
        </div>
        <div style="display: flex; gap: 8px">
          <el-button type="primary" size="small" @click="showBindDialog = true">换绑</el-button>
          <el-button type="danger" size="small" plain @click="handleUnbind">解除绑定</el-button>
        </div>
      </div>
      <div class="crm-bind-content" v-else>
        <div class="bind-status unbound">
          <el-icon color="#F59E0B"><WarningFilled /></el-icon>
          <span>未绑定CRM用户</span>
        </div>
        <el-button type="primary" size="small" @click="showBindDialog = true">绑定CRM用户</el-button>
      </div>
    </div>

    <!-- 数据概览卡片 -->
    <div class="profile-section">
      <div class="section-title">
        <el-icon><DataAnalysis /></el-icon> 数据概览
      </div>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value text-primary">{{ profile.externalContacts?.total || 0 }}</div>
          <div class="stat-label">外部联系人总数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-success">{{ profile.externalContacts?.valid || 0 }}</div>
          <div class="stat-label">有效外部联系人</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-danger">{{ profile.externalContacts?.deleted || 0 }}</div>
          <div class="stat-label">被删除联系人</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-purple">{{ profile.customerGroups?.ownedCount || 0 }}</div>
          <div class="stat-label">拥有客户群</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-info">{{ profile.customerGroups?.totalMembers || 0 }}</div>
          <div class="stat-label">群总成员数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-orange">{{ profile.messageStats?.chatRecordCount || 0 }}</div>
          <div class="stat-label">聊天记录数</div>
        </div>
      </div>
    </div>

    <!-- 消息统计 + 对外收款横向一行两个 -->
    <div class="section-row-grid">
      <!-- 消息统计 -->
      <div class="profile-section">
        <div class="section-title">
          <el-icon><ChatDotRound /></el-icon> 消息统计
        </div>
        <div class="detail-rows">
          <div class="detail-row">
            <span class="row-label">发送给客户消息</span>
            <span class="row-value">{{ profile.messageStats?.sentToCustomers || 0 }} 条</span>
          </div>
          <div class="detail-row">
            <span class="row-label">接收客户消息</span>
            <span class="row-value">{{ profile.messageStats?.recvFromCustomers || 0 }} 条</span>
          </div>
          <div class="detail-row">
            <span class="row-label">会话存档消息</span>
            <span class="row-value">{{ profile.messageStats?.chatRecordCount || 0 }} 条</span>
          </div>
        </div>
      </div>

      <!-- 收款与退款 -->
      <div class="profile-section">
        <div class="section-title">
          <el-icon><Money /></el-icon> 对外收款
        </div>
        <div class="detail-rows">
          <div class="detail-row">
            <span class="row-label">收款笔数</span>
            <span class="row-value">{{ profile.payments?.count || 0 }} 笔</span>
          </div>
          <div class="detail-row">
            <span class="row-label">收款总额</span>
            <span class="row-value text-success">¥ {{ formatAmount(profile.payments?.totalAmount) }}</span>
          </div>
          <div class="detail-row">
            <span class="row-label">退款笔数</span>
            <span class="row-value">{{ profile.refunds?.count || 0 }} 笔</span>
          </div>
          <div class="detail-row">
            <span class="row-label">退款总额</span>
            <span class="row-value text-danger">¥ {{ formatAmount(profile.refunds?.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 绑定弹窗 -->
    <el-dialog v-model="showBindDialog" :title="profile.crmUserName ? '换绑CRM用户' : '绑定CRM用户'" width="480px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="企微成员">
          <div style="display: flex; align-items: center; gap: 8px">
            <el-avatar :size="32" :src="profile.wecomAvatar">{{ (profile.wecomUserName || '?')[0] }}</el-avatar>
            <div style="line-height: 1.4">
              <div style="font-weight: 600">{{ profile.wecomUserName || profile.wecomUserId }}</div>
              <div v-if="profile.wecomUserName" style="color: #9CA3AF; font-size: 12px">{{ profile.wecomUserId }}</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="当前绑定" v-if="profile.crmUserName">
          <el-tag type="success">{{ profile.crmUserName }}</el-tag>
          <span style="color: #9CA3AF; font-size: 12px; margin-left: 8px">将被替换</span>
        </el-form-item>
        <el-form-item label="CRM用户">
          <el-select
            v-model="bindForm.crmUserId"
            filterable
            remote
            reserve-keyword
            placeholder="点击下拉选择或搜索CRM用户"
            :remote-method="searchCrmUsers"
            :loading="searchingCrm"
            style="width: 100%"
            @change="handleCrmSelect"
            @focus="loadInitialCrmUsers"
          >
            <el-option v-for="u in crmOptions" :key="u.id" :label="`${u.name} (${u.username || u.code || ''})`" :value="u.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBindDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!bindForm.crmUserId" :loading="binding" @click="handleBind">{{ profile.crmUserName ? '确认换绑' : '确认绑定' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Link, CircleCheckFilled, WarningFilled, DataAnalysis, ChatDotRound, Money } from '@element-plus/icons-vue'
import { getWecomMemberProfile, bindMemberCrm } from '@/api/wecomAddressBook'
import request from '@/utils/request'

const props = defineProps<{
  wecomUserId: string
  configId: number
}>()

const emit = defineEmits(['refresh'])

const loading = ref(false)
const profile = ref<any>({})

const showBindDialog = ref(false)
const bindForm = ref({ crmUserId: '', crmUserName: '' })
const searchingCrm = ref(false)
const crmOptions = ref<any[]>([])
const binding = ref(false)

const formatAmount = (cents: number | undefined) => {
  if (!cents) return '0.00'
  return (cents / 100).toFixed(2)
}

const fetchProfile = async () => {
  if (!props.wecomUserId || !props.configId) return
  loading.value = true
  try {
    const res: any = await getWecomMemberProfile(props.wecomUserId, props.configId)
    profile.value = res || {}
  } catch (e: any) {
    console.error('获取成员画像失败:', e)
    profile.value = {}
  } finally {
    loading.value = false
  }
}

watch(() => [props.wecomUserId, props.configId], () => fetchProfile(), { immediate: true })

const searchCrmUsers = async (keyword: string) => {
  searchingCrm.value = true
  try {
    const params: any = { pageSize: 20 }
    if (keyword && keyword.length >= 1) params.keyword = keyword
    const res: any = await request.get('/users', { params })
    crmOptions.value = (res?.list || res || []).slice(0, 20)
  } catch { crmOptions.value = [] }
  searchingCrm.value = false
}

const loadInitialCrmUsers = () => {
  if (crmOptions.value.length === 0) searchCrmUsers('')
}

const handleCrmSelect = (val: string) => {
  const opt = crmOptions.value.find(o => o.id === val)
  if (opt) bindForm.value.crmUserName = opt.name
}

const handleBind = async () => {
  if (!profile.value.bindingId && !profile.value.wecomUserId) return
  if (!bindForm.value.crmUserId) return
  binding.value = true
  try {
    await bindMemberCrm(profile.value.bindingId, {
      crmUserId: bindForm.value.crmUserId,
      crmUserName: bindForm.value.crmUserName
    })
    ElMessage.success('绑定成功')
    showBindDialog.value = false
    bindForm.value = { crmUserId: '', crmUserName: '' }
    fetchProfile()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '绑定失败')
  } finally {
    binding.value = false
  }
}

const handleUnbind = async () => {
  try {
    await ElMessageBox.confirm(`确定解除「${profile.value.wecomUserName}」的CRM绑定？`, '提示', { type: 'warning' })
    await bindMemberCrm(profile.value.bindingId, { crmUserId: '', crmUserName: '' })
    ElMessage.success('已解除绑定')
    fetchProfile()
    emit('refresh')
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.member-profile { padding: 0 4px; }

.profile-header {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 20px; background: linear-gradient(135deg, #F0F5FF 0%, #F5F0FF 100%);
  border-radius: 12px; margin-bottom: 16px;
}
.header-info { flex: 1; }
.header-name { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.name-text { font-size: 20px; font-weight: 700; color: #1F2937; }
.header-meta { font-size: 13px; color: #6B7280; margin-top: 4px; }
.header-meta code { background: rgba(0,0,0,.06); padding: 1px 6px; border-radius: 4px; font-size: 12px; }

.section-row-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;
}
.profile-section {
  background: #fff; border: 1px solid #F3F4F6; border-radius: 12px;
  padding: 16px 20px; margin-bottom: 12px;
}
.section-row-grid .profile-section { margin-bottom: 0; }
.section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600; color: #1F2937;
  margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #F3F4F6;
}

.crm-bind-content { display: flex; align-items: center; justify-content: space-between; }
.bind-status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #374151; }
.bind-status strong { color: #10B981; }

.stat-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}
.stat-item {
  text-align: center; padding: 14px 8px;
  background: #F9FAFB; border-radius: 8px;
}
.stat-value { font-size: 24px; font-weight: 700; color: #1F2937; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.text-primary { color: #4C6EF5; }
.text-success { color: #10B981; }
.text-danger { color: #EF4444; }
.text-purple { color: #7C3AED; }
.text-info { color: #3B82F6; }
.text-orange { color: #F59E0B; }

.detail-rows { display: flex; flex-direction: column; gap: 0; }
.detail-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid #F9FAFB;
}
.detail-row:last-child { border-bottom: none; }
.row-label { font-size: 14px; color: #6B7280; }
.row-value { font-size: 14px; font-weight: 600; color: #1F2937; }
</style>
