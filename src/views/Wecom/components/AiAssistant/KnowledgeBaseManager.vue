<template>
  <div class="knowledge-base-manager">
    <div class="section-header">
      <h3 class="section-title">知识库管理</h3>
      <el-button type="primary" class="ai-btn" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>创建知识库
      </el-button>
    </div>

    <!-- 知识库列表 -->
    <div v-if="!detailKb" v-loading="loading">
      <el-table :data="knowledgeBases" stripe>
        <el-table-column prop="name" label="知识库名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="openDetail(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="documentCount" label="文档数" width="80" align="center" />
        <el-table-column prop="entryCount" label="条目数" width="80" align="center" />
        <el-table-column label="大小" width="90">
          <template #default="{ row }">{{ formatSize(row.totalSize) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="索引状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="indexStatusType(row.indexStatus)" size="small">{{ indexStatusText(row.indexStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">管理</el-button>
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 知识库详情（内嵌子组件） -->
    <KnowledgeBaseDetail v-if="detailKb" :kb="detailKb" @back="detailKb = null; fetchData()" @refresh="fetchData" />

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingKb ? '编辑知识库' : '创建知识库'" width="520px" destroy-on-close>
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：产品知识库" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="知识库描述" />
        </el-form-item>
        <el-divider content-position="left">数据来源</el-divider>
        <el-form-item label="手动管理">
          <el-text size="small" type="info">支持手动上传文档和录入条目（创建后管理）</el-text>
        </el-form-item>
        <el-form-item label="CRM同步">
          <el-switch v-model="form.syncCrmEnabled" />
          <span style="margin-left: 8px; font-size: 12px; color: #909399">自动同步CRM产品/FAQ数据</span>
        </el-form-item>
        <el-form-item v-if="form.syncCrmEnabled" label="同步来源">
          <el-checkbox-group v-model="form.syncCrmSources">
            <el-checkbox label="products">产品列表</el-checkbox>
            <el-checkbox label="faq">常见问题</el-checkbox>
            <el-checkbox label="orders">订单模板</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item v-if="form.syncCrmEnabled" label="同步频率">
          <el-radio-group v-model="form.syncFrequency">
            <el-radio label="daily">每日自动</el-radio>
            <el-radio label="manual">手动触发</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'KnowledgeBaseManager' })

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getKnowledgeBases, createKnowledgeBase, updateKnowledgeBase, deleteKnowledgeBase } from '@/api/wecomAi'
import KnowledgeBaseDetail from './KnowledgeBaseDetail.vue'

const loading = ref(false)
const knowledgeBases = ref<any[]>([])
const detailKb = ref<any>(null)
const dialogVisible = ref(false)
const editingKb = ref<any>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()

const defaultForm = () => ({
  name: '', description: '', syncCrmEnabled: false,
  syncCrmSources: [] as string[], syncFrequency: 'daily'
})
const form = ref(defaultForm())

const rules: FormRules = {
  name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }],
}

const formatSize = (bytes: any) => {
  const num = Number(bytes)
  if (!num || isNaN(num)) return '0B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = num
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(1) + units[i]
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'

const indexStatusType = (s: string) => {
  const m: Record<string, string> = { indexed: 'success', indexing: 'warning', failed: 'danger', pending: 'info' }
  return (m[s] || 'info') as any
}
const indexStatusText = (s: string) => {
  const m: Record<string, string> = { indexed: '已索引', indexing: '索引中', failed: '索引失败', pending: '待索引' }
  return m[s] || '未知'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getKnowledgeBases()
    knowledgeBases.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { knowledgeBases.value = [] }
  loading.value = false
}

const openCreateDialog = () => {
  editingKb.value = null
  form.value = defaultForm()
  dialogVisible.value = true
}

const openEditDialog = (kb: any) => {
  editingKb.value = kb
  form.value = {
    name: kb.name, description: kb.description || '',
    syncCrmEnabled: !!kb.syncCrmEnabled,
    syncCrmSources: kb.syncCrmSources ? (Array.isArray(kb.syncCrmSources) ? kb.syncCrmSources : JSON.parse(kb.syncCrmSources || '[]')) : [],
    syncFrequency: kb.syncFrequency || 'daily',
  }
  dialogVisible.value = true
}

const openDetail = (kb: any) => { detailKb.value = kb }

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingKb.value) {
      const payload = { ...form.value, syncCrmSources: JSON.stringify(form.value.syncCrmSources || []) }
      await updateKnowledgeBase(editingKb.value.id, payload)
      ElMessage.success('知识库已更新')
    } else {
      const payload = { ...form.value, syncCrmSources: JSON.stringify(form.value.syncCrmSources || []) }
      await createKnowledgeBase(payload)
      ElMessage.success('知识库已创建')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  saving.value = false
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除知识库"${row.name}"？所有条目将一并删除。`, '删除确认', { type: 'warning' })
  try {
    await deleteKnowledgeBase(row.id)
    ElMessage.success('已删除')
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #1F2937; margin: 0; }
.ai-btn { background: linear-gradient(135deg, #7C3AED, #6D28D9) !important; border: none !important; color: #fff !important; }
.ai-btn:hover { opacity: 0.9; }
</style>

