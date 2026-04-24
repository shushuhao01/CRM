<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>企微配额管理</span>
          <div style="display: flex; gap: 8px; align-items: center">
            <el-input v-model="searchKeyword" placeholder="搜索租户" clearable style="width: 200px" @keyup.enter="fetchData" />
            <el-button v-permission="'wecom-management:quota:edit'" type="primary" @click="showBatchDialog = true">批量设置</el-button>
          </div>
        </div>
      </template>

      <!-- 配额统计 -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" style="color: #409eff">{{ quotaSummary.totalTenants }}</div>
            <div class="stat-label">总租户数</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" style="color: #67c23a">{{ quotaSummary.totalAllocated }}</div>
            <div class="stat-label">已分配配额</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" style="color: #e6a23c">{{ quotaSummary.totalUsed }}</div>
            <div class="stat-label">已使用</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" :style="{ color: quotaSummary.overLimitCount > 0 ? '#f56c6c' : '#909399' }">{{ quotaSummary.overLimitCount }}</div>
            <div class="stat-label">超限租户</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 超限告警 -->
      <el-alert v-if="overLimitTenants.length" type="error" :closable="false" style="margin-bottom: 16px" show-icon>
        <template #title>
          {{ overLimitTenants.length }} 个租户配额超限：{{ overLimitTenants.map(t => t.tenantName).join('、') }}
        </template>
      </el-alert>

      <el-table :data="pagedList" v-loading="loading" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column label="租户" min-width="160">
          <template #default="{ row }">
            <div>
              <div style="font-weight: 500">{{ row.tenantName || '未命名' }}</div>
              <div style="font-size: 12px; color: #909399">{{ row.tenantCode || row.tenantId }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="packageName" label="套餐" width="100" />
        <el-table-column label="企微配额" width="120" align="center">
          <template #default="{ row }">
            <el-tooltip :content="`使用率: ${row.maxCount > 0 ? Math.round(row.usedCount / row.maxCount * 100) : 0}%`">
              <div>
                <span :style="{ color: row.usedCount >= row.maxCount ? '#f56c6c' : '#303133', fontWeight: 600 }">
                  {{ row.usedCount || 0 }}/{{ row.maxCount || 0 }}
                </span>
                <el-progress
                  :percentage="row.maxCount > 0 ? Math.min(Math.round(row.usedCount / row.maxCount * 100), 100) : 0"
                  :stroke-width="4"
                  :color="row.usedCount >= row.maxCount ? '#f56c6c' : (row.usedCount / row.maxCount > 0.8 ? '#e6a23c' : '#67c23a')"
                  :show-text="false"
                  style="margin-top: 4px"
                />
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="功能开关" min-width="250">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px">
              <el-tag v-for="f in getEnabledFeatures(row)" :key="f" size="small" effect="plain" type="success">{{ f }}</el-tag>
              <el-tag v-if="!getEnabledFeatures(row).length" size="small" effect="plain" type="info">无</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="告警" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.usedCount >= row.maxCount" type="danger" size="small" effect="dark">超限</el-tag>
            <el-tag v-else-if="row.maxCount > 0 && row.usedCount / row.maxCount >= 0.8" type="warning" size="small">即满</el-tag>
            <el-tag v-else type="success" size="small" effect="plain">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'wecom-management:quota:edit'" type="primary" link size="small" @click="openSettings(row)">设置</el-button>
            <el-button type="info" link size="small" @click="viewHistory(row)">历史</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filteredList.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="page = 1"
          @current-change="() => {}"
        />
      </div>
    </el-card>

    <!-- 配额设置弹窗 -->
    <el-dialog v-model="showDialog" :title="`企微配额设置: ${settingsTarget?.tenantName || ''}`" width="640px" destroy-on-close>
      <el-form v-if="settingsForm" label-width="auto" label-position="right">
        <el-divider content-position="left">功能配额</el-divider>
        <el-form-item label="企微绑定配额">
          <div style="display: flex; align-items: center; gap: 8px">
            <el-input-number v-model="settingsForm.maxCount" :min="0" :max="100" style="width: 140px" />
            <span style="font-size: 12px; color: #909399">当前已用: {{ settingsTarget?.usedCount || 0 }}个</span>
          </div>
        </el-form-item>
        <el-form-item label="获客链接配额">
          <div style="display: flex; align-items: center; gap: 8px">
            <el-input-number v-model="settingsForm.acquisitionLinkQuota" :min="-1" :max="9999" :step="10" style="width: 140px" controls-position="right" />
            <span style="font-size: 12px; color: #909399">-1 = 无限制</span>
          </div>
          <div style="font-size:12px;color:#86909c;margin-top:4px">获客助手链接数上限，达到上限租户无法创建新链接</div>
        </el-form-item>

        <el-divider content-position="left">功能开关</el-divider>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="企微客户管理"><el-switch v-model="settingsForm.features.customer" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="客户群管理"><el-switch v-model="settingsForm.features.group" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="获客助手"><el-switch v-model="settingsForm.features.acquisition" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="活码管理"><el-switch v-model="settingsForm.features.contactWay" /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="会话存档">
              <el-switch v-model="settingsForm.features.chatArchive" />
              <el-tag size="small" type="warning" style="margin-left: 4px">需购买</el-tag>
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="微信客服"><el-switch v-model="settingsForm.features.kf" /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="AI助手">
              <el-switch v-model="settingsForm.features.ai" />
              <el-tag size="small" type="warning" style="margin-left: 4px">需购买额度</el-tag>
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="侧边栏应用"><el-switch v-model="settingsForm.features.sidebar" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="对外收款"><el-switch v-model="settingsForm.features.payment" /></el-form-item></el-col>
        </el-row>

        <el-divider content-position="left">配额告警</el-divider>
        <el-form-item label="告警阈值(%)">
          <div style="display: flex; align-items: center; gap: 12px; width: 100%">
            <el-slider v-model="settingsForm.alertThreshold" :min="50" :max="100" :step="5" show-stops style="flex: 1" />
            <span style="font-size: 12px; color: #909399; white-space: nowrap">使用率达到 {{ settingsForm.alertThreshold || 80 }}% 时告警</span>
          </div>
        </el-form-item>

        <el-divider content-position="left">授权方式</el-divider>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="允许服务商授权"><el-switch v-model="settingsForm.allowThirdParty" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="允许自建应用"><el-switch v-model="settingsForm.allowSelfBuild" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button v-permission="'wecom-management:quota:edit'" type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量设置弹窗 -->
    <el-dialog v-model="showBatchDialog" title="批量设置配额" width="420px" destroy-on-close>
      <el-alert v-if="!selectedTenants.length" type="warning" :closable="false" description="请先在列表中勾选要设置的租户" show-icon />
      <el-form v-else label-width="120px">
        <el-form-item label="已选租户">
          <div style="display: flex; flex-wrap: wrap; gap: 4px">
            <el-tag v-for="t in selectedTenants" :key="t.tenantId" size="small">{{ t.tenantName }}</el-tag>
          </div>
        </el-form-item>
        <el-form-item label="统一配额上限">
          <el-input-number v-model="batchMaxCount" :min="1" :max="100" style="width: 140px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button v-permission="'wecom-management:quota:edit'" type="primary" @click="handleBatchSave" :loading="saving" :disabled="!selectedTenants.length">确定</el-button>
      </template>
    </el-dialog>

    <!-- 历史记录抽屉 -->
    <el-drawer v-model="showHistoryDrawer" :title="`配额变更历史: ${historyTarget?.tenantName || ''}`" size="450px">
      <el-timeline v-if="quotaHistory.length">
        <el-timeline-item v-for="h in quotaHistory" :key="h.id" :timestamp="h.time" placement="top" :type="h.type === 'increase' ? 'success' : (h.type === 'decrease' ? 'danger' : 'primary')">
          <el-card shadow="never" style="padding: 8px">
            <div style="font-size: 13px; font-weight: 500">{{ h.action }}</div>
            <div style="font-size: 12px; color: #909399; margin-top: 4px">{{ h.detail }}</div>
            <div style="font-size: 11px; color: #C0C4CC; margin-top: 2px">操作人: {{ h.operator }}</div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无变更记录" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getConfigQuotas, saveConfigQuota } from '@/api/wecomManagement'

const loading = ref(false)
const quotaList = ref<any[]>([])
const searchKeyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const showDialog = ref(false)
const settingsTarget = ref<any>(null)
const saving = ref(false)
const selectedTenants = ref<any[]>([])
const showBatchDialog = ref(false)
const batchMaxCount = ref(3)
const showHistoryDrawer = ref(false)
const historyTarget = ref<any>(null)
const quotaHistory = ref<any[]>([])

const featureLabels: Record<string, string> = {
  customer: '客户管理', group: '客户群', acquisition: '获客助手',
  contactWay: '活码管理', chatArchive: '会话存档', kf: '微信客服',
  ai: 'AI助手', sidebar: '侧边栏', payment: '对外收款'
}

const defaultFeatures = () => ({
  customer: true, group: true, acquisition: true, contactWay: true,
  chatArchive: false, kf: false, ai: false, sidebar: true, payment: true
})

const settingsForm = ref<any>(null)

const filteredList = computed(() => {
  if (!searchKeyword.value) return quotaList.value
  const kw = searchKeyword.value.toLowerCase()
  return quotaList.value.filter(r =>
    (r.tenantName || '').toLowerCase().includes(kw) ||
    (r.tenantId || '').toLowerCase().includes(kw) ||
    (r.tenantCode || '').toLowerCase().includes(kw)
  )
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const quotaSummary = computed(() => {
  const list = quotaList.value
  return {
    totalTenants: list.length,
    totalAllocated: list.reduce((s, r) => s + (r.maxCount || 0), 0),
    totalUsed: list.reduce((s, r) => s + (r.usedCount || 0), 0),
    overLimitCount: list.filter(r => r.maxCount > 0 && r.usedCount >= r.maxCount).length,
  }
})

const overLimitTenants = computed(() => quotaList.value.filter(r => r.maxCount > 0 && r.usedCount >= r.maxCount))

const getEnabledFeatures = (row: any): string[] => {
  if (!row.features) return Object.values(featureLabels)
  const features = typeof row.features === 'string' ? JSON.parse(row.features) : row.features
  return Object.entries(features).filter(([, v]) => v).map(([k]) => featureLabels[k] || k)
}

const handleSelectionChange = (rows: any[]) => { selectedTenants.value = rows }

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getConfigQuotas({ keyword: searchKeyword.value || undefined })
    quotaList.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { quotaList.value = [] }
  loading.value = false
}

const openSettings = (row: any) => {
  settingsTarget.value = row
  const features = row.features ? (typeof row.features === 'string' ? JSON.parse(row.features) : { ...row.features }) : defaultFeatures()
  settingsForm.value = {
    maxCount: row.maxCount || 1,
    features,
    alertThreshold: row.alertThreshold || 80,
    allowThirdParty: row.allowThirdParty !== false,
    allowSelfBuild: row.allowSelfBuild !== false,
    acquisitionLinkQuota: row.acquisitionLinkQuota ?? -1,
  }
  showDialog.value = true
}

const handleSave = async () => {
  if (!settingsTarget.value) return
  saving.value = true
  try {
    await saveConfigQuota(settingsTarget.value.tenantId, settingsForm.value)
    ElMessage.success('配额设置已保存')
    showDialog.value = false
    fetchData()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  saving.value = false
}

const handleBatchSave = async () => {
  saving.value = true
  try {
    for (const t of selectedTenants.value) {
      await saveConfigQuota(t.tenantId, { maxCount: batchMaxCount.value })
    }
    ElMessage.success(`已为 ${selectedTenants.value.length} 个租户设置配额`)
    showBatchDialog.value = false
    fetchData()
  } catch (e: any) { ElMessage.error(e?.message || '批量设置失败') }
  saving.value = false
}

const viewHistory = (row: any) => {
  historyTarget.value = row
  quotaHistory.value = []
  showHistoryDrawer.value = true
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; }
.stat-card { text-align: center; }
.stat-num { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
</style>

