<template>
  <div class="feature-auth">
    <el-alert v-if="!configId" type="warning" :closable="false" style="margin-bottom: 16px">
      请先在基础配置中添加企微配置。
    </el-alert>

    <template v-else>
      <!-- 授权模式说明 -->
      <el-alert :type="authInfo?.authType === 'third_party' ? 'success' : 'info'" :closable="false" style="margin-bottom: 16px">
        <template #title>
          <strong>{{ authInfo?.authMode || '功能授权' }}</strong>
        </template>
        <template v-if="authInfo?.authType === 'third_party'">
          功能授权控制各企微功能模块的开通状态和用量限制。SaaS模式下由平台统一管理授权，第三方应用授权后自动获取对应功能权限。
        </template>
        <template v-else>
          功能授权控制各企微功能模块的开通状态和用量限制。自建应用模式需手动配置各功能Secret。
        </template>
      </el-alert>

      <!-- ========== 使用量统计卡片区域 ========== -->
      <div class="usage-cards-section">
        <h3 class="section-title">使用量概览</h3>
        <div class="usage-cards-grid">
          <div v-for="card in usageCards" :key="card.key" class="usage-card" :class="{ 'usage-card--inactive': card.status !== 'active' }">
            <div class="usage-card__header">
              <span class="usage-card__icon" :style="{ background: card.color + '15', color: card.color }">{{ card.icon }}</span>
              <div class="usage-card__title-area">
                <span class="usage-card__title">{{ card.title }}</span>
                <el-tag :type="card.status === 'active' ? 'success' : 'info'" size="small" effect="light">
                  {{ card.status === 'active' ? '已开通' : '未开通' }}
                </el-tag>
              </div>
            </div>
            <div class="usage-card__body">
              <div class="usage-card__numbers">
                <div class="usage-card__stat">
                  <span class="usage-card__stat-label">购买/开通</span>
                  <span class="usage-card__stat-value" :style="{ color: card.color }">{{ card.purchased }}</span>
                </div>
                <div class="usage-card__stat">
                  <span class="usage-card__stat-label">实际使用</span>
                  <span class="usage-card__stat-value">{{ card.authorized }}<span class="usage-card__stat-max">/{{ card.authorizedMax }}</span></span>
                </div>
              </div>
              <el-progress
                v-if="card.authorizedMax > 0 && card.status === 'active'"
                :percentage="Math.min(100, Math.round((card.authorized / card.authorizedMax) * 100))"
                :stroke-width="8"
                :color="getProgressColor(card.authorized, card.authorizedMax)"
                :show-text="false"
                style="margin-top: 10px"
              />
              <div class="usage-card__detail">{{ card.detail }}</div>
              <div class="usage-card__expire" v-if="card.expireDate">
                <span :style="{ color: isExpiringSoon(card.expireDate) ? '#EF4444' : '#9CA3AF' }">
                  {{ card.expireDate === '永久' ? '永久有效' : `到期: ${card.expireDate}` }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 功能授权列表 ========== -->
      <div class="features-section">
        <h3 class="section-title">功能模块授权</h3>
        <el-table :data="features" stripe border v-loading="loading">
          <el-table-column label="功能模块" min-width="200">
            <template #default="{ row }">
              <div class="feature-name-cell">
                <span class="feature-icon">{{ row.icon }}</span>
                <div>
                  <span style="font-weight: 600">{{ row.name }}</span>
                  <div class="feature-desc">{{ row.desc }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '已开通' : '未开通' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="到期时间" width="120">
            <template #default="{ row }">
              <span :style="{ color: isExpiringSoon(row.expireDate) ? '#EF4444' : '#6B7280', fontWeight: isExpiringSoon(row.expireDate) ? '600' : 'normal' }">
                {{ row.expireDate || '永久' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="用量" width="200">
            <template #default="{ row }">
              <template v-if="row.usage">
                <div style="display: flex; align-items: center; gap: 8px; width: 180px">
                  <el-progress :percentage="row.usage.percent" :stroke-width="10" :text-inside="false"
                    :color="row.usage.percent >= 90 ? '#EF4444' : row.usage.percent >= 70 ? '#F59E0B' : '#10B981'"
                    style="flex: 1" :show-text="false" />
                  <span style="font-size: 12px; color: #6B7280; white-space: nowrap">{{ row.usage.used }}/{{ row.usage.max }}</span>
                </div>
              </template>
              <span v-else style="color: #C0C4CC">不限</span>
            </template>
          </el-table-column>
          <el-table-column label="授权来源" width="160" v-if="authInfo?.authType === 'third_party'">
            <template #default="{ row }">
              <span style="font-size: 12px; color: #6B7280">{{ row.authSource || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 'active'">
                <el-button type="warning" link size="small" @click="handleRenew(row)">续费</el-button>
                <el-button v-if="row.usage" type="primary" link size="small" @click="handleUsageDetail(row)">
                  用量详情
                </el-button>
                <el-button v-if="row.key === 'chat_archive'" type="info" link size="small" @click="handleSeatManage(row)">
                  席位管理
                </el-button>
              </template>
              <el-button v-else type="success" link size="small" @click="handleActivate(row)">开通</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 用量详情弹窗 -->
    <el-dialog v-model="usageDialogVisible" :title="`${usageRow?.name} 用量详情`" width="500px">
      <template v-if="usageRow">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="功能模块">{{ usageRow.name }}</el-descriptions-item>
          <el-descriptions-item label="已使用">{{ usageRow.usage?.used || 0 }}</el-descriptions-item>
          <el-descriptions-item label="总配额">{{ usageRow.usage?.max || 0 }}</el-descriptions-item>
          <el-descriptions-item label="使用率">
            <el-progress :percentage="usageRow.usage?.percent || 0" :stroke-width="14" :text-inside="true"
              :color="(usageRow.usage?.percent || 0) >= 90 ? '#EF4444' : '#10B981'" style="width: 200px" />
          </el-descriptions-item>
          <el-descriptions-item label="到期时间">{{ usageRow.expireDate || '永久' }}</el-descriptions-item>
          <el-descriptions-item v-if="usageRow.authSource" label="授权来源">{{ usageRow.authSource }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px; text-align: right">
          <el-button type="warning" @click="handleRenew(usageRow); usageDialogVisible = false">续费/扩容</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ configId?: number }>()

const loading = ref(false)
const usageDialogVisible = ref(false)
const usageRow = ref<any>(null)

const features = ref<any[]>([])
const usageCards = ref<any[]>([])
const authInfo = ref<any>(null)

const fetchFeatures = async () => {
  loading.value = true
  try {
    const res = await fetch(`/api/v1/wecom/configs/${props.configId}/features`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}` }
    })
    const json = await res.json()
    if (json?.data) {
      features.value = json.data
    } else {
      features.value = getDefaultFeatures()
    }
    if (json?.usageCards) {
      usageCards.value = json.usageCards
    } else {
      usageCards.value = getDefaultUsageCards()
    }
    if (json?.authInfo) {
      authInfo.value = json.authInfo
    }
  } catch {
    features.value = getDefaultFeatures()
    usageCards.value = getDefaultUsageCards()
  }
  finally { loading.value = false }
}

const getDefaultFeatures = () => [
  { key: 'basic', name: '基础功能', desc: '通讯录/客户/群/活码/侧边栏', icon: '📦', status: 'active', expireDate: '永久', usage: null },
  { key: 'acquisition', name: '获客助手', desc: '获客链接/渠道统计/客户画像', icon: '🎯', status: 'active', expireDate: '2027-03-15', usage: { used: 0, max: 1000, percent: 0 } },
  { key: 'chat_archive', name: '会话存档', desc: '聊天记录/敏感词/质检', icon: '📝', status: 'inactive', expireDate: null, usage: null },
  { key: 'ai_assistant', name: 'AI助手', desc: 'AI质检/智能回复/客户分析', icon: '🤖', status: 'active', expireDate: '永久', usage: { used: 0, max: 10000, percent: 0 } },
  { key: 'payment', name: '对外收款', desc: '收款记录/收款统计/退款记录', icon: '💰', status: 'active', expireDate: '永久', usage: null },
  { key: 'kf', name: '微信客服', desc: '微信客服消息/会话管理', icon: '💬', status: 'inactive', expireDate: null, usage: null },
]

const getDefaultUsageCards = () => [
  { key: 'wecom_package', title: '企微套餐', icon: '📊', color: '#4C6EF5', purchased: '未知', authorized: 0, authorizedMax: 1, status: 'inactive', expireDate: null, detail: '获取数据失败' },
  { key: 'chat_archive_usage', title: '会话存档', icon: '📝', color: '#10B981', purchased: '未知', authorized: 0, authorizedMax: 70, status: 'inactive', expireDate: null, detail: '获取数据失败' },
  { key: 'acquisition_usage', title: '获客助手', icon: '🎯', color: '#F59E0B', purchased: '未知', authorized: 0, authorizedMax: 1000, status: 'inactive', expireDate: null, detail: '获取数据失败' },
  { key: 'ai_assistant_usage', title: 'AI助手', icon: '🤖', color: '#8B5CF6', purchased: '未知', authorized: 0, authorizedMax: 10000, status: 'inactive', expireDate: null, detail: '获取数据失败' },
]

const isExpiringSoon = (date: string | null) => {
  if (!date || date === '永久') return false
  return new Date(date).getTime() - Date.now() < 30 * 86400000
}

const getProgressColor = (used: number, max: number) => {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct >= 90) return '#EF4444'
  if (pct >= 70) return '#F59E0B'
  return '#10B981'
}

const handleRenew = (row: any) => {
  ElMessage.info(`续费「${row.name || row.title}」— 请联系管理员或在管理后台操作`)
}

const handleActivate = (row: any) => {
  ElMessage.info(`开通「${row.name}」— 请联系管理员或在管理后台操作`)
}

const handleUsageDetail = (row: any) => {
  usageRow.value = row
  usageDialogVisible.value = true
}

const handleSeatManage = (_row: any) => {
  ElMessage.info('席位管理 — 请前往企微管理 → 会话存档 → 席位管理')
}

watch(() => props.configId, (v) => { if (v) fetchFeatures() })
onMounted(() => { if (props.configId) fetchFeatures() })
</script>

<style scoped>
.section-title {
  font-size: 15px; font-weight: 600; color: #1F2937;
  margin: 0 0 16px; padding-bottom: 10px; border-bottom: 1px solid #F3F4F6;
}

/* 使用量卡片区域 */
.usage-cards-section { margin-bottom: 28px; }
.usage-cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 1200px) { .usage-cards-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .usage-cards-grid { grid-template-columns: 1fr; } }

.usage-card {
  padding: 18px 20px; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px;
  transition: all 0.25s;
}
.usage-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-color: #C7D2FE; }
.usage-card--inactive { opacity: 0.65; }

.usage-card__header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.usage-card__icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.usage-card__title-area { display: flex; align-items: center; gap: 8px; }
.usage-card__title { font-weight: 700; font-size: 15px; color: #1F2937; }

.usage-card__body { }
.usage-card__numbers { display: flex; justify-content: space-between; gap: 12px; }
.usage-card__stat { display: flex; flex-direction: column; }
.usage-card__stat-label { font-size: 12px; color: #9CA3AF; margin-bottom: 2px; }
.usage-card__stat-value { font-size: 18px; font-weight: 700; color: #1F2937; }
.usage-card__stat-max { font-size: 13px; font-weight: 400; color: #9CA3AF; }

.usage-card__detail { font-size: 12px; color: #6B7280; margin-top: 8px; line-height: 1.5; }
.usage-card__expire { font-size: 12px; margin-top: 6px; }

/* 功能列表区域 */
.features-section { }

.feature-name-cell { display: flex; align-items: center; gap: 10px; }
.feature-icon { font-size: 24px; }
.feature-desc { font-size: 12px; color: #9CA3AF; }
</style>
