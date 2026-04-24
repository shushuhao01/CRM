<template>
  <div class="script-manager">
    <!-- 分类视图 -->
    <div v-if="!selectedCategory">
      <div class="section-header">
        <h3 class="section-title">话术库管理</h3>
        <el-button type="primary" class="ai-btn" @click="openCategoryDialog()">
          <el-icon><Plus /></el-icon>创建分类
        </el-button>
      </div>

      <el-table :data="categories" v-loading="loading" stripe>
        <el-table-column prop="name" label="分类名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="enterCategory(row)">📁 {{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="话术数" width="100" align="center">
          <template #default="{ row }">{{ row.scriptCount || 0 }}</template>
        </el-table-column>
        <el-table-column label="总使用次数" width="120" align="center">
          <template #default="{ row }">{{ row.totalUseCount || 0 }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="enterCategory(row)">话术列表</el-button>
            <el-button type="primary" link size="small" @click="openCategoryDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteCategory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 话术列表视图 -->
    <div v-else>
      <div class="section-header">
        <div style="display: flex; align-items: center; gap: 8px">
          <el-button text @click="selectedCategory = null"><el-icon><ArrowLeft /></el-icon></el-button>
          <h3 class="section-title">{{ selectedCategory.name }} > 话术列表</h3>
          <el-tag size="small" effect="plain">{{ scripts.length }}条</el-tag>
        </div>
        <div style="display: flex; gap: 8px">
          <el-input v-model="scriptSearch" placeholder="搜索话术..." clearable size="small" style="width: 200px" @clear="fetchScripts" @keyup.enter="fetchScripts" />
          <el-button type="primary" class="ai-btn" size="small" @click="openScriptDialog()">
            <el-icon><Plus /></el-icon>添加话术
          </el-button>
        </div>
      </div>

      <el-table :data="scripts" v-loading="scriptsLoading" stripe>
        <el-table-column prop="title" label="标题" min-width="130" />
        <el-table-column label="内容摘要" min-width="250">
          <template #default="{ row }">
            <el-text line-clamp="2" size="small">{{ row.content }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="快捷指令" width="110">
          <template #default="{ row }">
            <code v-if="row.shortcut" style="font-size: 12px; color: #7C3AED">{{ row.shortcut }}</code>
            <span v-else style="color: #C0C4CC">-</span>
          </template>
        </el-table-column>
        <el-table-column label="使用次数" width="90" align="center">
          <template #default="{ row }">{{ row.useCount || 0 }}</template>
        </el-table-column>
        <el-table-column label="AI改写" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.aiRewriteEnabled" type="success" size="small" effect="plain">开启</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handlePreview(row)">预览</el-button>
            <el-button type="success" link size="small" @click="handleAiRewrite(row)" :loading="rewritingId === row.id">AI改写</el-button>
            <el-button type="primary" link size="small" @click="openScriptDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteScript(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分类弹窗 -->
    <el-dialog v-model="categoryDialogVisible" :title="editingCategory ? '编辑分类' : '创建分类'" width="400px" destroy-on-close>
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="categoryForm.name" placeholder="如：产品介绍" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" :max="999" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveCategory" :loading="savingCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 话术弹窗 -->
    <el-dialog v-model="scriptDialogVisible" :title="editingScript ? '编辑话术' : '添加话术'" width="600px" destroy-on-close>
      <el-form :model="scriptForm" label-width="90px" :rules="scriptRules" ref="scriptFormRef">
        <el-form-item label="所属分类">
          <el-select v-model="scriptForm.categoryId" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="话术标题" prop="title">
          <el-input v-model="scriptForm.title" placeholder="话术标题" />
        </el-form-item>
        <el-form-item label="快捷指令">
          <el-input v-model="scriptForm.shortcut" placeholder="如 #产品A（在聊天中输入触发）" />
        </el-form-item>
        <el-form-item label="话术内容" prop="content">
          <el-input v-model="scriptForm.content" type="textarea" :rows="8" placeholder="输入话术内容..." />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="scriptForm.tags" multiple filterable allow-create default-first-option placeholder="添加标签" style="width: 100%">
          </el-select>
        </el-form-item>
        <el-form-item label="AI智能改写">
          <el-switch v-model="scriptForm.aiRewriteEnabled" />
          <span style="margin-left: 8px; font-size: 12px; color: #909399">根据客户画像自动调整话术</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scriptDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveScript" :loading="savingScript">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="话术预览" width="480px">
      <div v-if="previewScript" style="padding: 12px">
        <h4 style="margin: 0 0 8px">{{ previewScript.title }}</h4>
        <div style="background: #f5f7fa; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: #303133">{{ previewScript.content }}</div>
        <div v-if="previewScript.shortcut" style="margin-top: 8px; font-size: 12px; color: #909399">
          快捷指令: <code style="color: #7C3AED">{{ previewScript.shortcut }}</code>
        </div>
      </div>
    </el-dialog>

    <!-- AI改写结果弹窗 -->
    <el-dialog v-model="rewriteVisible" title="AI智能改写结果" width="560px">
      <div v-if="rewriteResult">
        <el-alert type="info" :closable="false" style="margin-bottom: 12px">
          AI已根据当前话术生成改写版本，您可以选择替换原有内容或另存为新话术。
        </el-alert>
        <h4 style="margin: 0 0 4px">原始内容：</h4>
        <div style="background: #f5f7fa; border-radius: 6px; padding: 12px; font-size: 13px; margin-bottom: 12px; white-space: pre-wrap">{{ rewriteResult.original }}</div>
        <h4 style="margin: 0 0 4px; color: #7C3AED">AI改写：</h4>
        <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 6px; padding: 12px; font-size: 13px; white-space: pre-wrap">{{ rewriteResult.rewritten }}</div>
      </div>
      <template #footer>
        <el-button @click="rewriteVisible = false">关闭</el-button>
        <el-button type="warning" @click="handleSaveRewrite('new')">另存为新话术</el-button>
        <el-button type="primary" @click="handleSaveRewrite('replace')">替换原内容</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ScriptManager' })

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, ArrowLeft } from '@element-plus/icons-vue'
import {
  getScriptCategories, createScriptCategory, updateScriptCategory, deleteScriptCategory,
  getScripts, createScript, updateScript, deleteScript, aiRewriteScript
} from '@/api/wecomAi'

const loading = ref(false)
const categories = ref<any[]>([])
const selectedCategory = ref<any>(null)
const scriptsLoading = ref(false)
const scripts = ref<any[]>([])
const scriptSearch = ref('')

// Category dialog
const categoryDialogVisible = ref(false)
const editingCategory = ref<any>(null)
const savingCategory = ref(false)
const categoryForm = ref({ name: '', sortOrder: 0 })

// Script dialog
const scriptDialogVisible = ref(false)
const editingScript = ref<any>(null)
const savingScript = ref(false)
const scriptFormRef = ref<FormInstance>()
const scriptForm = ref({ categoryId: null as number | null, title: '', content: '', shortcut: '', tags: [] as string[], aiRewriteEnabled: false })

const scriptRules: FormRules = {
  title: [{ required: true, message: '请输入话术标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入话术内容', trigger: 'blur' }],
}

// Preview
const previewVisible = ref(false)
const previewScript = ref<any>(null)

// AI Rewrite
const rewritingId = ref<number | null>(null)
const rewriteVisible = ref(false)
const rewriteResult = ref<any>(null)
const rewriteSourceScript = ref<any>(null)

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'

const fetchCategories = async () => {
  loading.value = true
  try {
    const res: any = await getScriptCategories()
    categories.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { categories.value = [] }
  loading.value = false
}

const fetchScripts = async () => {
  if (!selectedCategory.value) return
  scriptsLoading.value = true
  try {
    const res: any = await getScripts({ categoryId: selectedCategory.value.id, keyword: scriptSearch.value || undefined })
    scripts.value = Array.isArray(res) ? res : (res?.list || res?.data || [])
  } catch { scripts.value = [] }
  scriptsLoading.value = false
}

const enterCategory = (cat: any) => {
  selectedCategory.value = cat
  fetchScripts()
}

// Category CRUD
const openCategoryDialog = (cat?: any) => {
  editingCategory.value = cat || null
  categoryForm.value = cat ? { name: cat.name, sortOrder: cat.sortOrder || 0 } : { name: '', sortOrder: 0 }
  categoryDialogVisible.value = true
}

const handleSaveCategory = async () => {
  if (!categoryForm.value.name) { ElMessage.warning('请输入分类名称'); return }
  savingCategory.value = true
  try {
    if (editingCategory.value) {
      await updateScriptCategory(editingCategory.value.id, categoryForm.value)
      ElMessage.success('分类已更新')
    } else {
      await createScriptCategory(categoryForm.value)
      ElMessage.success('分类已创建')
    }
    categoryDialogVisible.value = false
    fetchCategories()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  savingCategory.value = false
}

const handleDeleteCategory = async (row: any) => {
  await ElMessageBox.confirm(`确定删除分类"${row.name}"？其下话术也将一并删除。`, '删除确认', { type: 'warning' })
  try {
    await deleteScriptCategory(row.id)
    ElMessage.success('已删除')
    fetchCategories()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// Script CRUD
const openScriptDialog = (s?: any) => {
  editingScript.value = s || null
  if (s) {
    scriptForm.value = {
      categoryId: s.categoryId, title: s.title, content: s.content,
      shortcut: s.shortcut || '', tags: s.tags ? (Array.isArray(s.tags) ? s.tags : JSON.parse(s.tags || '[]')) : [],
      aiRewriteEnabled: !!s.aiRewriteEnabled,
    }
  } else {
    scriptForm.value = { categoryId: selectedCategory.value?.id, title: '', content: '', shortcut: '', tags: [], aiRewriteEnabled: false }
  }
  scriptDialogVisible.value = true
}

const handleSaveScript = async () => {
  if (!scriptFormRef.value) return
  await scriptFormRef.value.validate()
  savingScript.value = true
  try {
    const payload = { ...scriptForm.value, tags: JSON.stringify(scriptForm.value.tags || []) }
    if (editingScript.value) {
      await updateScript(editingScript.value.id, payload)
      ElMessage.success('话术已更新')
    } else {
      await createScript(payload)
      ElMessage.success('话术已添加')
    }
    scriptDialogVisible.value = false
    fetchScripts()
    fetchCategories()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  savingScript.value = false
}

const handleDeleteScript = async (row: any) => {
  await ElMessageBox.confirm(`确定删除话术"${row.title}"？`, '删除确认', { type: 'warning' })
  try {
    await deleteScript(row.id)
    ElMessage.success('已删除')
    fetchScripts()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const handlePreview = (row: any) => {
  previewScript.value = row
  previewVisible.value = true
}

const handleAiRewrite = async (row: any) => {
  rewritingId.value = row.id
  try {
    const res: any = await aiRewriteScript(row.id)
    rewriteResult.value = { original: row.content, rewritten: res?.rewritten || res?.content || '暂无改写结果' }
    rewriteSourceScript.value = row
    rewriteVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || 'AI改写失败')
  }
  rewritingId.value = null
}

const handleSaveRewrite = async (mode: 'replace' | 'new') => {
  if (!rewriteResult.value) return
  try {
    if (mode === 'replace' && rewriteSourceScript.value) {
      await updateScript(rewriteSourceScript.value.id, { content: rewriteResult.value.rewritten })
      ElMessage.success('已替换原内容')
    } else {
      await createScript({
        categoryId: rewriteSourceScript.value?.categoryId || selectedCategory.value?.id,
        title: `${rewriteSourceScript.value?.title}(AI改写)`,
        content: rewriteResult.value.rewritten,
        shortcut: '', tags: '[]', aiRewriteEnabled: false,
      })
      ElMessage.success('已另存为新话术')
    }
    rewriteVisible.value = false
    fetchScripts()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

onMounted(fetchCategories)
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #1F2937; margin: 0; }
.ai-btn { background: linear-gradient(135deg, #7C3AED, #6D28D9) !important; border: none !important; color: #fff !important; }
.ai-btn:hover { opacity: 0.9; }
</style>

