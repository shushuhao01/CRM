<template>
  <div class="feature-auth">
    <el-alert v-if="!configId" type="warning" :closable="false" style="margin-bottom: 16px">
      请先在基础配置中添加企微配置。
    </el-alert>

    <template v-else>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        功能授权控制各企微功能模块的开通状态和用量限制。SaaS模式下由平台统一管理授权；私有化部署通过授权码激活。
      </el-alert>

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

const fetchFeatures = async () => {
  loading.value = true
  try {
    const res = await fetch(`/api/v1/wecom/configs/${props.configId}/features`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const json = await res.json()
    if (json?.data) {
      features.value = json.data
    } else {
      // 默认功能列表（从后端获取失败时的回退）
      features.value = getDefaultFeatures()
    }
  } catch {
    features.value = getDefaultFeatures()
  }
  finally { loading.value = false }
}

const getDefaultFeatures = () => [
  { key: 'basic', name: '基础功能', desc: '通讯录/客户/群/活码/侧边栏', icon: '📦', status: 'active', expireDate: '永久', usage: null },
  { key: 'acquisition', name: '获客助手', desc: '获客链接/渠道统计/客户画像', icon: '🎯', status: 'active', expireDate: '2027-03-15', usage: { used: 0, max: 5000, percent: 0 } },
  { key: 'chat_archive', name: '会话存档', desc: '聊天记录/敏感词/质检', icon: '📝', status: 'active', expireDate: '2027-03-15', usage: { used: 0, max: 20, percent: 0 } },
  { key: 'ai_assistant', name: 'AI助手', desc: 'AI质检/智能回复/客户分析', icon: '🤖', status: 'active', expireDate: '2027-03-15', usage: { used: 0, max: 10000, percent: 0 } },
  { key: 'payment', name: '对外收款', desc: '收款记录/收款统计/退款记录', icon: '💰', status: 'active', expireDate: '永久', usage: null },
  { key: 'kf', name: '微信客服', desc: '微信客服消息/会话管理', icon: '💬', status: 'inactive', expireDate: null, usage: null },
]

const isExpiringSoon = (date: string | null) => {
  if (!date || date === '永久') return false
  return new Date(date).getTime() - Date.now() < 30 * 86400000
}

const handleRenew = (row: any) => {
  ElMessage.info(`续费「${row.name}」— 请联系管理员或在管理后台操作`)
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
.feature-name-cell { display: flex; align-items: center; gap: 10px; }
.feature-icon { font-size: 24px; }
.feature-desc { font-size: 12px; color: #9CA3AF; }
</style>
