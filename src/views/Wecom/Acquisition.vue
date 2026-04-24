<template>
  <div class="wecom-acquisition">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="acquisition">
          获客助手
          <template #actions>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="handleConfigChange">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </template>
        </WecomHeader>
      </template>

      <!-- 使用量监控条 -->
      <div v-if="displayUsage" class="usage-bar">
        <div class="usage-info">
          <span>📊 获客使用量：已添加 {{ displayUsage.totalAdds }} / {{ displayUsage.quotaLimit }} 人</span>
          <el-tag :type="displayUsage.warningLevel === 'danger' ? 'danger' : displayUsage.warningLevel === 'warning' ? 'warning' : 'success'" size="small">
            {{ displayUsage.usagePercent }}%
          </el-tag>
        </div>
        <el-progress :percentage="displayUsage.usagePercent" :color="usageColor" :stroke-width="10" :show-text="false" />
        <div class="usage-detail">
          <span>链接总数：{{ displayUsage.totalLinks }}（活跃：{{ displayUsage.activeLinks }}）</span>
          <span>总点击：{{ displayUsage.totalClicks }}</span>
        </div>
      </div>

      <!-- V4.0 新5Tab结构 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- Tab 1: 链接管理 -->
        <el-tab-pane label="链接管理" name="links">
          <div class="tab-actions">
            <el-button type="primary" @click="openCreateWizard" :disabled="!selectedConfigId">
              <el-icon><Plus /></el-icon>创建链接
            </el-button>
            <el-button @click="handleSyncStats" :loading="syncingStats" :disabled="!selectedConfigId">
              <el-icon><Refresh /></el-icon>同步数据
            </el-button>
            <el-dropdown trigger="click" style="margin-left: 8px" @command="handleBatchAction">
              <el-button :disabled="selectedRows.length === 0">
                批量操作 ({{ selectedRows.length }})<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="enable">批量启用</el-dropdown-item>
                  <el-dropdown-item command="disable">批量禁用</el-dropdown-item>
                  <el-dropdown-item divided command="delete"><span style="color: #EF4444">批量删除</span></el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <div style="flex: 1" />
            <el-select v-model="linkTagFilter" placeholder="按标签筛选" style="width: 150px; margin-right: 8px" clearable>
              <el-option label="全部标签" value="" />
              <el-option v-for="tg in displayTagGroups" :key="tg.id" :label="tg.groupName" :value="tg.groupName" />
            </el-select>
            <el-input v-model="linkSearchKeyword" placeholder="搜索链接名称" style="width: 200px" clearable prefix-icon="Search" />
          </div>

          <!-- 增强版链接表格 -->
          <el-table
            :data="pagedLinks"
            v-loading="loading"
            stripe
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="linkName" label="链接名称" min-width="140">
              <template #default="{ row }">
                <div class="link-name-cell">
                  <span class="link-name">{{ row.linkName }}</span>
                  <el-tag v-if="row.state" size="small" type="info" class="channel-tag">{{ row.state }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="接待成员" min-width="100">
              <template #default="{ row }">
                {{ parseUserNames(row.userIds) }}
              </template>
            </el-table-column>
            <el-table-column label="今日/累计" width="130">
              <template #default="{ row }">
                <div class="dual-number">
                  <span class="today-num">{{ row.todayAdd || 0 }}</span>
                  <span class="divider">/</span>
                  <span class="total-num">{{ row.addCount || 0 }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="转化率" width="100">
              <template #default="{ row }">
                <span :class="conversionRateClass(row.conversionRate || calcConversionRate(row))">
                  {{ (row.conversionRate || calcConversionRate(row)).toFixed(1) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="7日趋势" width="110" align="center">
              <template #default="{ row }">
                <SparkLine
                  :data="row.sparkline || generateDemoSparkline()"
                  :color="(row.conversionRate || calcConversionRate(row)) > 30 ? '#10B981' : '#4C6EF5'"
                  :width="80"
                  :height="28"
                />
              </template>
            </el-table-column>
            <el-table-column label="⚙ 智能上下线" width="130" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openSmartRules(row)">
                  <template v-if="row._smartRuleStatus">
                    <el-tag type="success" size="small" effect="light">
                      {{ row._smartRuleStatus }}
                    </el-tag>
                  </template>
                  <template v-else>
                    <el-tag type="info" size="small" effect="plain">未配置</el-tag>
                  </template>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="showQrCode(row)">二维码</el-button>
                <el-button type="success" link size="small" @click="showLinkDetail(row)">详情</el-button>
                <el-dropdown trigger="click">
                  <el-button type="primary" link size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="showWeightDialog(row)">权重配置</el-dropdown-item>
                      <el-dropdown-item @click="openSmartRules(row)">智能上下线</el-dropdown-item>
                      <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                      <el-dropdown-item @click="handleToggleLink(row)">{{ row.isEnabled ? '禁用' : '启用' }}</el-dropdown-item>
                      <el-dropdown-item divided @click="confirmDelete(row)">
                        <span style="color: #EF4444">删除</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <!-- 翻页控件 -->
          <div class="pagination-bar">
            <span class="page-info">共 {{ filteredLinks.length }} 条记录</span>
            <el-pagination
              v-model:current-page="linkPage"
              v-model:page-size="linkPageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="filteredLinks.length"
              layout="sizes, prev, pager, next, jumper"
              small
              background
            />
          </div>
        </el-tab-pane>

        <!-- Tab 2: 数据总览 -->
        <el-tab-pane label="数据总览" name="overview">
          <AcquisitionOverview :config-id="selectedConfigId" :is-demo-mode="isDemoMode" />
        </el-tab-pane>

        <!-- Tab 3: 留存分析 -->
        <el-tab-pane label="留存分析" name="retention">
          <AcquisitionRetention :config-id="selectedConfigId" :is-demo-mode="isDemoMode" />
        </el-tab-pane>

        <!-- Tab 4: 成员排行 -->
        <el-tab-pane label="成员排行" name="ranking">
          <AcquisitionMemberRanking :config-id="selectedConfigId" :is-demo-mode="isDemoMode" />
        </el-tab-pane>

        <!-- Tab 5: 标签管理（增强版） -->
        <el-tab-pane label="标签管理" name="tags">
          <AcquisitionTagManager
            :tag-groups="displayTagGroups"
            :loading="tagLoading"
            :is-demo-mode="isDemoMode"
            :selected-config-id="selectedConfigId"
            @create="handleCreateTag"
            @edit="handleEditTag"
            @delete="handleDeleteTag"
            @refresh="fetchTagGroups"
          />
        </el-tab-pane>

        <!-- Tab 6: 套餐与配额 -->
        <el-tab-pane label="套餐与配额" name="purchase">
          <PackagePurchaseTab type="acquisition" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 5步创建/编辑向导 -->
    <LinkCreateWizard
      v-model="wizardVisible"
      :edit-data="editingLink"
      :wecom-user-options="displayWecomUserOptions"
      :get-member-name="getMemberName"
      :submitting="submitting"
      @submit="handleWizardSubmit"
    />

    <!-- 二维码对话框 -->
    <el-dialog v-model="qrDialogVisible" title="获客二维码" width="420px">
      <div class="qr-content">
        <canvas ref="qrCanvasRef" class="qr-canvas"></canvas>
        <p class="qr-link-name">{{ currentLink?.linkName }}</p>
        <p class="link-text">{{ currentLink?.linkUrl }}</p>
        <div class="qr-actions">
          <el-button type="primary" @click="downloadQrCode">
            <el-icon><Download /></el-icon>下载二维码
          </el-button>
          <el-button @click="copyLink(currentLink?.linkUrl)">复制链接</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 权重配置对话框（快速入口） -->
    <el-dialog v-model="weightDialogVisible" title="权重配置" width="600px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        权重范围 1-10，值越大分配到的客户越多
      </el-alert>
      <el-table :data="dialogWeightMembers" stripe>
        <el-table-column label="成员" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="28">{{ getMemberName(row.userId).charAt(0) }}</el-avatar>
              <span style="font-weight: 600">{{ getMemberName(row.userId) }}</span>
              <span style="color: #909399; font-size: 12px">({{ row.userId }})</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="权重" width="200">
          <template #default="{ row }">
            <el-input-number v-model="row.weight" :min="1" :max="10" :step="1" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="今日分配" width="100" align="center">
          <template #default>
            <span style="color: #9CA3AF">-</span>
          </template>
        </el-table-column>
        <el-table-column label="比例" width="100">
          <template #default="{ row }">
            {{ dialogWeightPercent(row.weight) }}%
          </template>
        </el-table-column>
      </el-table>
      <!-- 分配预览 -->
      <div v-if="dialogWeightMembers.length > 0" class="weight-preview-section">
        <div class="preview-title">📊 分配预览</div>
        <div class="preview-bars">
          <div v-for="m in dialogWeightMembers" :key="m.userId" class="preview-item">
            <span class="preview-name">{{ getMemberName(m.userId) }}</span>
            <el-progress
              :percentage="Number(dialogWeightPercent(m.weight))"
              :stroke-width="12"
              :text-inside="true"
              :color="m.weight >= 7 ? '#10B981' : m.weight >= 4 ? '#4C6EF5' : '#9CA3AF'"
              style="flex: 1"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="weightDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDialogWeight" :loading="savingWeight">保存</el-button>
      </template>
    </el-dialog>

    <!-- 智能上下线规则配置 -->
    <SmartOnlineRules
      v-model="smartRulesVisible"
      :link-id="smartRulesLinkId"
      :is-demo-mode="isDemoMode"
      @close="smartRulesVisible = false"
      @saved="onSmartRulesSaved"
    />

    <!-- 链接详情（全屏或大型抽屉） -->
    <LinkDetail
      v-if="linkDetailVisible"
      :link="detailLink"
      :visible="linkDetailVisible"
      @close="linkDetailVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomAcquisition' })

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, ArrowDown, Refresh } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import SparkLine from './components/SparkLine.vue'
import LinkCreateWizard from './components/LinkCreateWizard.vue'
import LinkDetail from './components/LinkDetail.vue'
import AcquisitionTagManager from './components/AcquisitionTagManager.vue'
import PackagePurchaseTab from './components/PackagePurchaseTab.vue'
import AcquisitionOverview from './components/AcquisitionOverview.vue'
import AcquisitionRetention from './components/AcquisitionRetention.vue'
import AcquisitionMemberRanking from './components/AcquisitionMemberRanking.vue'
import SmartOnlineRules from './components/SmartOnlineRules.vue'
import { useAcquisition } from './composables/useAcquisition'
import { getAcquisitionSmartRules } from '@/api/wecom'
import type { AcquisitionWeightItem } from './types'

const {
  isDemoMode, loading, submitting, syncingStats, savingWeight,
  selectedConfigId, activeTab,
  displayConfigs, displayLinks, displayUsage, displayWecomUserOptions,
  displayTagGroups, tagLoading, usageColor,
  getMemberName, parseUserNames,
  fetchConfigs, handleConfigChange,
  fetchWecomUsers, handleSyncStats,
  handleCreateLink, handleUpdateLink, handleDeleteLink, handleToggleLink,
  fetchWeightConfig, saveWeight,
  fetchTagGroups, createTagGroup, editTagGroup, deleteTagGroupById
} = useAcquisition()

// ==================== 链接搜索与选择 ====================
const linkSearchKeyword = ref('')
const selectedRows = ref<any[]>([])
const linkPage = ref(1)
const linkPageSize = ref(10)
const linkTagFilter = ref('')

const filteredLinks = computed(() => {
  let list = displayLinks.value
  if (linkSearchKeyword.value) {
    const kw = linkSearchKeyword.value.toLowerCase()
    list = list.filter((l: any) => l.linkName?.toLowerCase().includes(kw))
  }
  if (linkTagFilter.value) {
    list = list.filter((l: any) => l.state === linkTagFilter.value || l.tagNames?.includes(linkTagFilter.value))
  }
  return list
})

const pagedLinks = computed(() => {
  const start = (linkPage.value - 1) * linkPageSize.value
  return filteredLinks.value.slice(start, start + linkPageSize.value)
})

const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

const handleBatchAction = async (command: string) => {
  if (selectedRows.value.length === 0) return
  if (isDemoMode.value) {
    ElMessage.info('示例模式：授权企微后可执行真实操作')
    return
  }
  if (command === 'delete') {
    await ElMessageBox.confirm(`确定要批量删除 ${selectedRows.value.length} 个链接吗？`, '批量删除', { type: 'warning' })
    for (const row of selectedRows.value) {
      await handleDeleteLink(row)
    }
  } else {
    for (const row of selectedRows.value) {
      await handleToggleLink(row)
    }
    ElMessage.success(`批量${command === 'enable' ? '启用' : '禁用'}成功`)
  }
}

// ==================== 转化率 ====================
const calcConversionRate = (row: any) => {
  const clicks = row.clickCount || 0
  const adds = row.addCount || 0
  return clicks > 0 ? (adds / clicks) * 100 : 0
}

const conversionRateClass = (rate: number) => {
  if (rate >= 30) return 'rate-good'
  if (rate >= 15) return 'rate-medium'
  return 'rate-low'
}

const generateDemoSparkline = () => {
  return [0, 0, 0, 0, 0, 0, 0]
}

// ==================== 创建/编辑向导 ====================
const wizardVisible = ref(false)
const editingLink = ref<any>(null)

const openCreateWizard = () => {
  editingLink.value = null
  wizardVisible.value = true
  if (!isDemoMode.value) fetchWecomUsers()
}

const handleEdit = (row: any) => {
  editingLink.value = row
  wizardVisible.value = true
  if (!isDemoMode.value) fetchWecomUsers()
}

const handleWizardSubmit = async (data: any) => {
  let success: boolean
  if (editingLink.value) {
    success = await handleUpdateLink(editingLink.value.id, data)
  } else {
    success = await handleCreateLink(data)
  }
  if (success) {
    wizardVisible.value = false
    editingLink.value = null
  }
}

// ==================== QR Code ====================
const qrDialogVisible = ref(false)
const currentLink = ref<any>(null)
const qrCanvasRef = ref<HTMLCanvasElement | null>(null)

const generateQrCode = async (url: string) => {
  await nextTick()
  if (!qrCanvasRef.value || !url) return
  try {
    await QRCode.toCanvas(qrCanvasRef.value, url, {
      width: 240, margin: 2,
      color: { dark: '#303133', light: '#ffffff' }
    })
  } catch (e) {
    console.error('[Acquisition] QR code error:', e)
  }
}

watch(qrDialogVisible, async (show) => {
  if (show && currentLink.value?.linkUrl) {
    await generateQrCode(currentLink.value.linkUrl)
  }
})

const showQrCode = (row: any) => {
  currentLink.value = row
  qrDialogVisible.value = true
}

const downloadQrCode = () => {
  if (!qrCanvasRef.value) return
  const link = document.createElement('a')
  link.download = `${currentLink.value?.linkName || 'qrcode'}.png`
  link.href = qrCanvasRef.value.toDataURL('image/png')
  link.click()
  ElMessage.success('二维码已下载')
}

const copyLink = (url: string) => {
  if (!url) return
  navigator.clipboard.writeText(url)
  ElMessage.success('链接已复制')
}

// ==================== 权重配置 ====================
const weightDialogVisible = ref(false)
const dialogWeightMembers = ref<AcquisitionWeightItem[]>([])
const weightLinkId = ref<number | null>(null)

// ==================== 智能上下线规则 ====================
const smartRulesVisible = ref(false)
const smartRulesLinkId = ref<number | null>(null)

const openSmartRules = (row: any) => {
  smartRulesLinkId.value = row.id
  smartRulesVisible.value = true
}

// Load smart rule status for visible links
const loadSmartRuleStatuses = async () => {
  for (const link of displayLinks.value) {
    if ((link as any)._smartRuleStatus !== undefined) continue
    try {
      const res: any = await getAcquisitionSmartRules(link.id)
      const data = res?.data || res
      if (data && (data.dailyLimitEnabled || data.workTimeEnabled || data.slowReplyEnabled || data.lossRateEnabled)) {
        const parts: string[] = []
        if (data.workTimeEnabled) parts.push('工作时间')
        if (data.dailyLimitEnabled) parts.push('每日上限')
        if (data.slowReplyEnabled) parts.push('慢回复')
        if (data.lossRateEnabled) parts.push('流失率')
        ;(link as any)._smartRuleStatus = parts.join('+')
      } else {
        ;(link as any)._smartRuleStatus = ''
      }
    } catch {
      ;(link as any)._smartRuleStatus = ''
    }
  }
}

watch(displayLinks, () => {
  if (displayLinks.value.length > 0) loadSmartRuleStatuses()
}, { immediate: true })

const onSmartRulesSaved = () => {
  smartRulesVisible.value = false
  // Reset cached statuses and reload
  for (const link of displayLinks.value) {
    ;(link as any)._smartRuleStatus = undefined
  }
  loadSmartRuleStatuses()
}

const dialogTotalWeight = computed(() => dialogWeightMembers.value.reduce((s, m) => s + m.weight, 0))
const dialogWeightPercent = (weight: number) => {
  return dialogTotalWeight.value > 0 ? ((weight / dialogTotalWeight.value) * 100).toFixed(1) : '0.0'
}

const showWeightDialog = async (row: any) => {
  weightLinkId.value = row.id
  dialogWeightMembers.value = await fetchWeightConfig(row.id)
  weightDialogVisible.value = true
}

const saveDialogWeight = async () => {
  if (!weightLinkId.value) return
  const success = await saveWeight(weightLinkId.value, dialogWeightMembers.value)
  if (success) weightDialogVisible.value = false
}

// ==================== 链接详情 ====================
const linkDetailVisible = ref(false)
const detailLink = ref<any>(null)

const showLinkDetail = (row: any) => {
  detailLink.value = row
  linkDetailVisible.value = true
}

// ==================== 删除确认 ====================
const confirmDelete = async (row: any) => {
  if (isDemoMode.value) {
    ElMessage.info('示例模式：授权企微后可执行真实操作')
    return
  }
  await ElMessageBox.confirm(`确定要删除获客链接「${row.linkName}」吗？`, '删除确认', { type: 'warning' })
  handleDeleteLink(row)
}

// ==================== Tab切换 ====================
const handleTabChange = (tab: string) => {
  if (tab === 'tags') fetchTagGroups()
}

// ==================== 标签事件 ====================
const handleCreateTag = async (data: { groupName: string; tags: Array<{ name: string }> }) => {
  await createTagGroup(data)
}
const handleEditTag = async (data: { id: string; groupName: string }) => {
  await editTagGroup(data.id, data.groupName)
}
const handleDeleteTag = async (id: string) => {
  await deleteTagGroupById(id)
}

// ==================== 初始化 ====================
onMounted(() => fetchConfigs())
</script>

<style scoped lang="scss">
.wecom-acquisition { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }

/* 使用量进度条 V4 */
.usage-bar {
  background: linear-gradient(135deg, #EEF2FF 0%, #F5F7FA 100%);
  border: 1px solid #E0E7FF; border-radius: 12px; padding: 14px 18px; margin-bottom: 16px;
  .usage-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #4B5563; }
  .usage-detail { display: flex; gap: 20px; font-size: 12px; color: #9CA3AF; margin-top: 6px; }
}

/* 链接名称+渠道标识 */
.link-name-cell { display: flex; flex-direction: column; gap: 4px; }
.link-name { font-weight: 600; color: #1F2937; }
.channel-tag { font-size: 11px; width: fit-content; background: #FDF2F8; color: #DB2777; border: none; border-radius: 6px; }

/* 今日/累计双数字 */
.dual-number { display: flex; align-items: baseline; gap: 2px; }
.today-num { font-size: 18px; font-weight: 700; color: #4C6EF5; }
.divider { color: #D1D5DB; margin: 0 2px; }
.total-num { font-size: 13px; color: #9CA3AF; }

/* 转化率颜色 */
.rate-good { color: #10B981; font-weight: 700; }
.rate-medium { color: #F59E0B; font-weight: 600; }
.rate-low { color: #EF4444; font-weight: 600; }

/* QR Code */
.qr-content { text-align: center; padding: 16px; }
.qr-canvas { display: block; margin: 0 auto 16px; border: 1px solid #E5E7EB; border-radius: 12px; padding: 8px; }
.qr-link-name { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 4px; }
.link-text { font-size: 12px; color: #9CA3AF; word-break: break-all; margin-bottom: 16px; }
.qr-actions { display: flex; gap: 10px; justify-content: center; }

/* 权重预览 */
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0; }
.page-info { font-size: 13px; color: #9CA3AF; }
.weight-preview-section {
  margin-top: 16px; padding: 16px; background: #F9FAFB; border-radius: 12px;
  .preview-title { font-weight: 600; font-size: 14px; margin-bottom: 12px; color: #1F2937; }
  .preview-bars { display: flex; flex-direction: column; gap: 10px; }
  .preview-item { display: flex; align-items: center; gap: 12px; }
  .preview-name { width: 80px; font-size: 13px; text-align: right; flex-shrink: 0; color: #4B5563; }
}
</style>
