<template>
  <div class="wecom-contact-way">
    <el-card>
      <template #header>
        <WecomHeader tab-name="contact-way">
          活码管理
          <template #actions>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="handleConfigChange">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </template>
        </WecomHeader>
      </template>

      <el-tabs v-model="activeTab">
        <!-- Tab 1: 活码列表 -->
        <el-tab-pane label="活码列表" name="list">
          <div class="tab-actions">
            <el-button type="primary" @click="openCreateWizard" :disabled="!selectedConfigId">
              <el-icon><Plus /></el-icon>创建活码
            </el-button>
            <el-button @click="handleSync" :loading="syncing" :disabled="!selectedConfigId">同步</el-button>
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
            <el-input v-model="searchKeyword" placeholder="搜索活码名称" style="width: 200px" prefix-icon="Search" clearable @clear="handleSearch" @keyup.enter="handleSearch" />
          </div>

          <el-table :data="contactWayList" v-loading="loading" stripe @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="45" />
            <el-table-column label="活码名称" min-width="150">
              <template #default="{ row }">
                <div class="cw-name-cell">
                  <span class="cw-name">{{ row.name }}</span>
                  <el-tag v-if="row.channelName || row.state" size="small" type="info" class="channel-tag">{{ row.channelName || row.state }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="typeTagType(row.weightMode)">{{ typeText(row.weightMode) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="接待成员" min-width="90">
              <template #default="{ row }">{{ formatUserIds(row.userIds) }}</template>
            </el-table-column>
            <el-table-column label="今日添加" width="90" align="center">
              <template #default="{ row }">
                <span class="today-num">{{ row.todayCount || row.todayAddCount || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="累计添加" width="90" align="center">
              <template #default="{ row }">
                <span class="total-num-main">{{ row.totalAddCount || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="异常数" width="80" align="center">
              <template #default="{ row }">
                <span :class="(row.abnormalCount || 0) > 0 ? 'text-danger' : ''">{{ row.abnormalCount || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="当前接待" width="90" align="center">
              <template #default="{ row }">{{ row.currentReceptionCount || 0 }}</template>
            </el-table-column>
            <el-table-column label="开口消息" width="90" align="center">
              <template #default="{ row }">{{ row.openMessageCount || 0 }}</template>
            </el-table-column>
            <el-table-column label="状态" width="75">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="showQrCode(row)">二维码</el-button>
                <el-button type="success" link size="small" @click="showDetail(row)">详情</el-button>
                <el-dropdown trigger="click">
                  <el-button type="primary" link size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                      <el-dropdown-item @click="openSmartRules(row)">智能上下线</el-dropdown-item>
                      <el-dropdown-item @click="handleToggle(row)">{{ row.isEnabled ? '禁用' : '启用' }}</el-dropdown-item>
                      <el-dropdown-item divided @click="confirmDelete(row)">
                        <span style="color: #EF4444">删除</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-bar">
            <span class="page-info">共 {{ listTotal }} 个活码</span>
            <el-pagination
              v-model:current-page="listPage"
              v-model:page-size="listPageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="listTotal"
              layout="total, sizes, prev, pager, next, jumper"
              small
              background
              @size-change="listPage = 1; fetchList()"
              @current-change="fetchList"
            />
          </div>
        </el-tab-pane>

        <!-- Tab 2: 数据统计 -->
        <el-tab-pane label="数据统计" name="stats">
          <ContactWayStats :config-id="selectedConfigId" />
        </el-tab-pane>

        <!-- Tab 3: 渠道分析 -->
        <el-tab-pane label="渠道分析" name="channel">
          <ContactWayChannel :config-id="selectedConfigId" />
        </el-tab-pane>

        <!-- Tab 4: 标签管理 -->
        <el-tab-pane label="标签管理" name="tags">
          <AcquisitionTagManager
            :tag-groups="tagGroups"
            :loading="tagLoading"
            :is-demo-mode="false"
            :selected-config-id="selectedConfigId"
            @create="handleCreateTag"
            @edit="handleEditTag"
            @delete="handleDeleteTag"
          />
          <div class="tag-sync-bar" v-if="selectedConfigId">
            <el-button type="primary" plain size="small" @click="fetchTags" :loading="tagLoading">
              从企微同步标签
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 创建活码向导 -->
    <ContactWayCreateWizard
      v-model="wizardVisible"
      :edit-data="editingItem"
      :is-demo-mode="false"
      @submit="handleWizardSubmit"
    />

    <!-- 二维码对话框 -->
    <el-dialog v-model="qrDialogVisible" title="活码二维码" width="420px">
      <div class="qr-content">
        <div class="qr-placeholder">
          <img v-if="currentItem?.qrCode" :src="currentItem.qrCode" alt="QR Code" class="qr-image" ref="qrImageRef" crossorigin="anonymous" />
          <div v-else class="qr-mock">
            <el-icon :size="60" style="color: #D1D5DB"><Cellphone /></el-icon>
            <p>活码二维码</p>
          </div>
        </div>
        <p class="qr-name">{{ currentItem?.name }}</p>
        <div class="qr-actions">
          <el-button type="primary" size="small" @click="downloadQrCode('png')" :disabled="!currentItem?.qrCode">
            <el-icon><Download /></el-icon>下载PNG
          </el-button>
          <el-button size="small" @click="downloadQrCode('svg')" :disabled="!currentItem?.qrCode">
            <el-icon><Download /></el-icon>下载SVG
          </el-button>
          <el-button size="small" @click="copyState(currentItem?.state)">复制渠道标识</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 活码详情抽屉 -->
    <ContactWayDetail
      v-if="showDetailView"
      :contact-way="currentItem"
      @close="showDetailView = false"
    />

    <!-- 智能上下线规则配置 -->
    <SmartOnlineRules
      v-model="smartRulesVisible"
      :link-id="smartRulesLinkId"
      :is-demo-mode="false"
      @close="smartRulesVisible = false"
      @saved="smartRulesVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomContactWay' })

import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Download, Cellphone } from '@element-plus/icons-vue'
import WecomHeader from './components/WecomHeader.vue'
import ContactWayDetail from './components/ContactWayDetail.vue'
import ContactWayStats from './components/ContactWayStats.vue'
import ContactWayChannel from './components/ContactWayChannel.vue'
import ContactWayCreateWizard from './components/ContactWayCreateWizard.vue'
import AcquisitionTagManager from './components/AcquisitionTagManager.vue'
import SmartOnlineRules from './components/SmartOnlineRules.vue'
import { getWecomConfigs, getAcquisitionTags, createAcquisitionTagGroup, editAcquisitionTag, deleteAcquisitionTags } from '@/api/wecom'
import {
  getContactWayList, createContactWay, updateContactWay,
  deleteContactWay, syncContactWayList, batchUpdateContactWay, batchDeleteContactWay
} from '@/api/wecomContactWay'

const selectedConfigId = ref<number | null>(null)
const configList = ref<any[]>([])
const activeTab = ref('list')
const loading = ref(false)
const syncing = ref(false)
const searchKeyword = ref('')
const selectedRows = ref<any[]>([])
const contactWayList = ref<any[]>([])
const listTotal = ref(0)
const listPage = ref(1)
const listPageSize = ref(20)

// 向导
const wizardVisible = ref(false)
const editingItem = ref<any>(null)

// 详情
const showDetailView = ref(false)
const currentItem = ref<any>(null)

// QR
const qrDialogVisible = ref(false)
const qrImageRef = ref<HTMLImageElement>()

// 标签
const tagLoading = ref(false)
const tagGroups = ref<any[]>([])

const displayConfigs = computed(() => configList.value)

// 工具函数
const typeText = (mode: string) => {
  const map: Record<string, string> = { single: '单人', round_robin: '多人轮流', weighted: '多人权重' }
  return map[mode] || mode
}
const typeTagType = (mode: string) => mode === 'single' ? '' : mode === 'round_robin' ? 'success' : 'warning'

const formatUserIds = (ids: string) => {
  try { const arr = JSON.parse(ids || '[]'); return arr.length ? `${arr.length}人` : '-' } catch { return '-' }
}

const handleSelectionChange = (rows: any[]) => { selectedRows.value = rows }

// 数据加载
const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configList.value = (Array.isArray(res) ? res : []).filter((c: any) => c.isEnabled)
    if (configList.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configList.value[0].id
      fetchList()
      fetchTags()
    }
  } catch { /* ignore */ }
}

const handleConfigChange = () => { listPage.value = 1; fetchList(); fetchTags() }
const handleSearch = () => { listPage.value = 1; fetchList() }

const fetchList = async () => {
  if (!selectedConfigId.value) return
  loading.value = true
  try {
    const res: any = await getContactWayList({
      configId: selectedConfigId.value,
      page: listPage.value,
      pageSize: listPageSize.value,
      keyword: searchKeyword.value || undefined,
    })
    const data = res?.data || res
    contactWayList.value = Array.isArray(data) ? data : (data?.list || [])
    listTotal.value = data?.total || contactWayList.value.length
  } catch { /* ignore */ }
  finally { loading.value = false }
}

const handleSync = async () => {
  if (!selectedConfigId.value) return
  syncing.value = true
  try {
    await syncContactWayList(selectedConfigId.value)
    ElMessage.success('同步完成')
    fetchList()
  } catch (e: any) { ElMessage.error(e.message || '同步失败') }
  finally { syncing.value = false }
}

// CRUD
const openCreateWizard = () => { editingItem.value = null; wizardVisible.value = true }
const handleEdit = (row: any) => { editingItem.value = row; wizardVisible.value = true }

const handleWizardSubmit = async (data: any) => {
  try {
    if (editingItem.value) {
      await updateContactWay(editingItem.value.id, data)
      ElMessage.success('更新成功')
    } else {
      await createContactWay({ wecomConfigId: selectedConfigId.value, ...data })
      ElMessage.success('创建成功')
    }
    wizardVisible.value = false
    fetchList()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
}

const handleToggle = async (row: any) => {
  try {
    await updateContactWay(row.id, { isEnabled: !row.isEnabled })
    ElMessage.success(row.isEnabled ? '已禁用' : '已启用')
    fetchList()
  } catch (e: any) { ElMessage.error(e.message || '操作失败') }
}

const confirmDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定要删除活码「${row.name}」吗？`, '删除确认', { type: 'warning' })
  try { await deleteContactWay(row.id); ElMessage.success('删除成功'); fetchList() }
  catch (e: any) { ElMessage.error(e.message || '删除失败') }
}

const handleBatchAction = async (command: string) => {
  if (selectedRows.value.length === 0) return
  const ids = selectedRows.value.map((r: any) => r.id)
  if (command === 'delete') {
    await ElMessageBox.confirm(`批量删除 ${selectedRows.value.length} 个活码？`, '批量删除', { type: 'warning' })
    await batchDeleteContactWay(ids)
    ElMessage.success('批量删除成功')
  } else {
    await batchUpdateContactWay(ids, { isEnabled: command === 'enable' })
    ElMessage.success(`批量${command === 'enable' ? '启用' : '禁用'}成功`)
  }
  fetchList()
}

// 详情 & QR
const showQrCode = (row: any) => { currentItem.value = row; qrDialogVisible.value = true }
const showDetail = (row: any) => { currentItem.value = row; showDetailView.value = true }
const copyState = (state: string) => {
  if (!state) return
  navigator.clipboard.writeText(state)
  ElMessage.success('渠道标识已复制')
}

// QR下载
const downloadQrCode = async (format: 'png' | 'svg') => {
  if (!currentItem.value?.qrCode) return
  try {
    const response = await fetch(currentItem.value.qrCode)
    const blob = await response.blob()
    if (format === 'png') {
      // Draw to canvas for PNG
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width || 400
        canvas.height = img.height || 400
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((pngBlob) => {
          if (pngBlob) triggerDownload(pngBlob, `${currentItem.value.name || '活码'}.png`)
        }, 'image/png')
      }
      img.src = URL.createObjectURL(blob)
    } else {
      triggerDownload(blob, `${currentItem.value.name || '活码'}.svg`)
    }
  } catch {
    // Fallback: direct link download
    const a = document.createElement('a')
    a.href = currentItem.value.qrCode
    a.download = `${currentItem.value.name || '活码'}.${format}`
    a.click()
  }
}

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('下载成功')
}

// 标签管理 - 真实API调用
const fetchTags = async () => {
  if (!selectedConfigId.value) return
  tagLoading.value = true
  try {
    const res: any = await getAcquisitionTags(selectedConfigId.value)
    const data = res?.data || res
    tagGroups.value = Array.isArray(data) ? data : (data?.tagGroups || data?.list || [])
  } catch { tagGroups.value = [] }
  finally { tagLoading.value = false }
}

const handleCreateTag = async (data: any) => {
  if (!selectedConfigId.value) return
  try {
    await createAcquisitionTagGroup({ configId: selectedConfigId.value, ...data })
    ElMessage.success('创建标签组成功')
    fetchTags()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '创建失败') }
}

const handleEditTag = async (id: string, data: any) => {
  if (!selectedConfigId.value) return
  try {
    await editAcquisitionTag(id, { configId: selectedConfigId.value, ...data })
    ElMessage.success('编辑标签成功')
    fetchTags()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '编辑失败') }
}

const handleDeleteTag = async (data: any) => {
  if (!selectedConfigId.value) return
  try {
    await deleteAcquisitionTags({ configId: selectedConfigId.value, ...data })
    ElMessage.success('删除成功')
    fetchTags()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '删除失败') }
}

// 智能上下线规则
const smartRulesVisible = ref(false)
const smartRulesLinkId = ref<number | null>(null)
const openSmartRules = (row: any) => {
  smartRulesLinkId.value = row.id
  smartRulesVisible.value = true
}

onMounted(() => fetchConfigs())
</script>

<style scoped lang="scss">
.wecom-contact-way { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }

.cw-name-cell { display: flex; flex-direction: column; gap: 4px; }
.cw-name { font-weight: 600; color: #1F2937; }
.channel-tag { font-size: 11px; width: fit-content; background: #FDF2F8; color: #DB2777; border: none; border-radius: 6px; }

.today-num { font-size: 16px; font-weight: 700; color: #4C6EF5; }
.total-num-main { font-size: 14px; font-weight: 600; color: #1F2937; }
.text-danger { color: #EF4444; font-weight: 600; }

.pagination-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 16px; padding-top: 12px; border-top: 1px solid #F3F4F6;
}
.page-info { font-size: 13px; color: #6B7280; }

.qr-content { text-align: center; padding: 16px; }
.qr-placeholder { margin: 0 auto 16px; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; }
.qr-image { width: 200px; height: 200px; border-radius: 12px; }
.qr-mock { display: flex; flex-direction: column; align-items: center; gap: 8px; background: #F9FAFB; border-radius: 12px; width: 200px; height: 200px; justify-content: center; color: #9CA3AF; }
.qr-name { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 16px; }
.qr-actions { display: flex; gap: 8px; justify-content: center; }

.tag-sync-bar { margin-top: 12px; padding-top: 12px; border-top: 1px solid #F3F4F6; }
</style>
