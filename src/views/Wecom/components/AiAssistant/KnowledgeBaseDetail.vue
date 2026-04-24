<template>
  <div class="kb-detail">
    <div class="detail-header">
      <div class="detail-title">
        <el-button text @click="$emit('back')"><el-icon><ArrowLeft /></el-icon></el-button>
        <h3>{{ kb.name }}</h3>
        <el-tag :type="indexStatusType(kb.indexStatus)" size="small">{{ indexStatusText(kb.indexStatus) }}</el-tag>
      </div>
      <div class="detail-actions">
        <el-button size="small" @click="handleReindex" :loading="reindexing">
          <el-icon><Refresh /></el-icon>重建索引
        </el-button>
        <el-button v-if="kb.syncCrmEnabled" size="small" type="success" @click="handleSyncCrm" :loading="syncing">
          <el-icon><Connection /></el-icon>同步CRM
        </el-button>
      </div>
    </div>

    <!-- 基本信息 -->
    <el-descriptions :column="4" border size="small" style="margin-bottom: 16px">
      <el-descriptions-item label="描述">{{ kb.description || '-' }}</el-descriptions-item>
      <el-descriptions-item label="文档数">{{ kb.documentCount || 0 }}</el-descriptions-item>
      <el-descriptions-item label="条目数">{{ kb.entryCount || 0 }}</el-descriptions-item>
      <el-descriptions-item label="最后更新">{{ formatDate(kb.updatedAt) }}</el-descriptions-item>
    </el-descriptions>

    <!-- 文档管理 -->
    <div class="sub-section">
      <div class="sub-header">
        <h4>文档管理</h4>
        <el-upload
          :action="''"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileSelect"
          accept=".pdf,.docx,.txt,.md,.xlsx"
        >
          <el-button size="small" type="primary">
            <el-icon><Upload /></el-icon>上传文档
          </el-button>
        </el-upload>
      </div>
      <div class="doc-tags" v-if="documents.length">
        <el-tag v-for="doc in documents" :key="doc.name" closable @close="removeDocument(doc)" style="margin: 2px 4px">
          📄 {{ doc.name }}
        </el-tag>
      </div>
      <el-text v-else type="info" size="small">暂无文档，支持 PDF/DOCX/TXT/MD/XLSX，单文件10MB</el-text>
    </div>

    <!-- 条目管理 -->
    <div class="sub-section">
      <div class="sub-header">
        <h4>条目管理 ({{ entries.length }}条)</h4>
        <div style="display: flex; gap: 8px">
          <el-input v-model="searchKeyword" placeholder="搜索条目..." clearable size="small" style="width: 200px" @clear="fetchEntries" @keyup.enter="fetchEntries" />
          <el-button size="small" type="primary" @click="openEntryDialog()">
            <el-icon><Plus /></el-icon>添加条目
          </el-button>
        </div>
      </div>
      <el-table :data="entries" v-loading="entriesLoading" stripe size="small">
        <el-table-column prop="title" label="标题" min-width="150" />
        <el-table-column label="内容摘要" min-width="250">
          <template #default="{ row }">
            <el-text line-clamp="2" size="small">{{ row.content }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="90">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="row.sourceType === 'manual' ? 'primary' : row.sourceType === 'document' ? 'warning' : 'success'">
              {{ sourceLabels[row.sourceType] || row.sourceType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="150">
          <template #default="{ row }">
            <el-tag v-for="t in parseTags(row.tags)" :key="t" size="small" style="margin: 1px 2px" effect="plain">{{ t }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEntryDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteEntry(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 12px">
        <el-pagination
          v-model:current-page="entryPage"
          :page-size="entryPageSize"
          :total="entryTotal"
          layout="total, prev, pager, next"
          small
          @current-change="fetchEntries"
        />
      </div>
    </div>

    <!-- 条目弹窗 -->
    <el-dialog v-model="entryDialogVisible" :title="editingEntry ? '编辑知识条目' : '添加知识条目'" width="560px" destroy-on-close>
      <el-form :model="entryForm" label-width="80px" :rules="entryRules" ref="entryFormRef">
        <el-form-item label="标题" prop="title">
          <el-input v-model="entryForm.title" placeholder="条目标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="entryForm.content" type="textarea" :rows="8" placeholder="知识条目内容..." />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="entryForm.tags" multiple filterable allow-create default-first-option placeholder="添加标签" style="width: 100%">
            <el-option v-for="t in existingTags" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="entryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEntry" :loading="savingEntry">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'KnowledgeBaseDetail' })

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, ArrowLeft, Refresh, Upload, Connection } from '@element-plus/icons-vue'
import {
  getKnowledgeEntries, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry,
  reindexKnowledgeBase, uploadKnowledgeDocument, syncKnowledgeCrm
} from '@/api/wecomAi'

const props = defineProps<{ kb: any }>()
const emit = defineEmits<{ (e: 'back'): void; (e: 'refresh'): void }>()

const entriesLoading = ref(false)
const entries = ref<any[]>([])
const searchKeyword = ref('')
const entryPage = ref(1)
const entryPageSize = 20
const entryTotal = ref(0)
const documents = ref<any[]>([])
const reindexing = ref(false)
const syncing = ref(false)

const entryDialogVisible = ref(false)
const editingEntry = ref<any>(null)
const savingEntry = ref(false)
const entryFormRef = ref<FormInstance>()
const existingTags = ref<string[]>([])

const sourceLabels: Record<string, string> = { manual: '手动录入', document: '文档提取', crm_sync: 'CRM同步' }

const defaultEntryForm = () => ({ title: '', content: '', tags: [] as string[] })
const entryForm = ref(defaultEntryForm())

const entryRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'
const indexStatusType = (s: string) => ({ indexed: 'success', indexing: 'warning', failed: 'danger', pending: 'info' }[s] || 'info') as any
const indexStatusText = (s: string) => ({ indexed: '已索引', indexing: '索引中', failed: '索引失败', pending: '待索引' }[s] || '未知')

const parseTags = (val: any): string[] => {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val || '[]') } catch { return [] }
}

const fetchEntries = async () => {
  entriesLoading.value = true
  try {
    const res: any = await getKnowledgeEntries(props.kb.id, { page: entryPage.value, pageSize: entryPageSize, keyword: searchKeyword.value || undefined })
    if (Array.isArray(res)) {
      entries.value = res
      entryTotal.value = res.length
    } else {
      entries.value = res?.list || res?.data || res?.entries || []
      entryTotal.value = res?.total || entries.value.length
    }
    // collect existing tags for suggestions
    const tagSet = new Set<string>()
    entries.value.forEach((e: any) => parseTags(e.tags).forEach(t => tagSet.add(t)))
    existingTags.value = [...tagSet]
  } catch { entries.value = [] }
  entriesLoading.value = false
}

const openEntryDialog = (entry?: any) => {
  if (entry) {
    editingEntry.value = entry
    entryForm.value = { title: entry.title, content: entry.content, tags: parseTags(entry.tags) }
  } else {
    editingEntry.value = null
    entryForm.value = defaultEntryForm()
  }
  entryDialogVisible.value = true
}

const handleSaveEntry = async () => {
  if (!entryFormRef.value) return
  await entryFormRef.value.validate()
  savingEntry.value = true
  try {
    if (editingEntry.value) {
      await updateKnowledgeEntry(editingEntry.value.id, entryForm.value)
      ElMessage.success('条目已更新')
    } else {
      await createKnowledgeEntry(props.kb.id, { ...entryForm.value, sourceType: 'manual' })
      ElMessage.success('条目已添加')
    }
    entryDialogVisible.value = false
    fetchEntries()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  savingEntry.value = false
}

const handleDeleteEntry = async (row: any) => {
  await ElMessageBox.confirm(`确定删除条目"${row.title}"？`, '删除确认', { type: 'warning' })
  try {
    await deleteKnowledgeEntry(row.id)
    ElMessage.success('已删除')
    fetchEntries()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const handleFileSelect = async (file: any) => {
  const rawFile = file.raw || file
  if (rawFile.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件不能超过10MB')
    return
  }
  const formData = new FormData()
  formData.append('file', rawFile)
  try {
    await uploadKnowledgeDocument(props.kb.id, formData)
    ElMessage.success(`文档"${rawFile.name}"已上传`)
    documents.value.push({ name: rawFile.name })
    fetchEntries()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
  }
}

const removeDocument = (_doc: any) => {
  ElMessage.info('文档删除功能开发中')
}

const handleReindex = async () => {
  reindexing.value = true
  try {
    await reindexKnowledgeBase(props.kb.id)
    ElMessage.success('索引重建已启动')
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
  reindexing.value = false
}

const handleSyncCrm = async () => {
  syncing.value = true
  try {
    await syncKnowledgeCrm(props.kb.id)
    ElMessage.success('CRM数据同步已启动')
    fetchEntries()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  }
  syncing.value = false
}

onMounted(fetchEntries)
</script>

<style scoped>
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.detail-title { display: flex; align-items: center; gap: 8px; }
.detail-title h3 { margin: 0; font-size: 16px; font-weight: 600; }
.detail-actions { display: flex; gap: 8px; }
.sub-section { margin-bottom: 20px; }
.sub-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.sub-header h4 { margin: 0; font-size: 14px; font-weight: 600; color: #374151; }
.doc-tags { display: flex; flex-wrap: wrap; gap: 4px; }
</style>

