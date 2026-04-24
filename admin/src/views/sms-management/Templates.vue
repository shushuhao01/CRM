<template>
  <div class="sms-templates">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>模板管理</h2>
        <p class="header-desc">管理预设模板和查看所有租户模板，预设模板将自动下发给所有租户</p>
      </div>
      <el-button v-permission="'sms-management:templates:create'" type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon> 创建预设模板
      </el-button>
    </div>

    <!-- 主内容 -->
    <el-card class="main-card">
      <!-- 筛选栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="filterPreset" placeholder="模板类型" clearable style="width: 140px" @change="loadList">
            <el-option label="全部" value="" />
            <el-option label="预设模板" :value="1" />
            <el-option label="租户模板" :value="0" />
          </el-select>
          <el-select v-model="filterCategory" placeholder="模板分类" clearable style="width: 130px" @change="loadList">
            <el-option label="全部" value="" />
            <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
          <el-input v-model="keyword" placeholder="搜索模板名称、内容" clearable style="width: 220px" @keyup.enter="loadList">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button @click="loadList" :loading="loading">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table :data="list" v-loading="loading" stripe style="width: 100%" table-layout="auto">
        <el-table-column label="编号" width="100">
          <template #default="{ row }">
            <span class="tpl-short-id">{{ formatShortId(row.id) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="font-weight: 500;">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isPreset ? 'warning' : 'info'" size="small" effect="light">
              {{ row.isPreset ? '预设' : '租户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="短信内容" min-width="220">
          <template #default="{ row }">
            <el-tooltip
              :content="row.content"
              placement="top"
              :show-after="300"
              :popper-style="{ maxWidth: '400px', whiteSpace: 'pre-wrap' }"
            >
              <div class="tpl-content-cell">{{ row.content }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="vendorTemplateCode" label="服务商CODE" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.vendorTemplateCode" class="code-text">{{ row.vendorTemplateCode }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="105" align="center">
          <template #default="{ row }">
            <span style="font-size: 12px; color: #606266;">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-permission="'sms-management:templates:edit'" size="small" link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'sms-management:templates:delete'" size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="showFormDialog" :title="isEdit ? '编辑模板' : '创建预设模板'" width="650px" :close-on-click-modal="false" destroy-on-close>
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="110px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="模板分类" prop="category">
          <el-select v-model="form.category" placeholder="选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="支持变量 {变量名}，如: 您好{customerName}，您的订单{orderNo}已确认。" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="变量列表">
          <div class="detected-vars">
            <el-tag v-for="v in detectedVars" :key="v" size="small" class="var-tag">{{ v }}</el-tag>
            <span v-if="!detectedVars.length" class="text-muted">输入内容后自动检测变量</span>
          </div>
        </el-form-item>
        <el-form-item label="服务商CODE">
          <el-input v-model="form.vendorTemplateCode" placeholder="如 SMS_123456789（填写后直接激活）" />
          <div class="form-tip">填写后模板将直接激活可用，不填则进入服务商审核流程</div>
        </el-form-item>
        <el-form-item label="使用说明">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="描述此模板的用途" maxlength="300" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFormDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '创建模板' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { smsManagementApi, type SmsTemplateItem } from '@/api/smsManagement'

const loading = ref(false)
const submitting = ref(false)
const list = ref<SmsTemplateItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterPreset = ref<number | string>('')
const filterCategory = ref('')
const keyword = ref('')

const showFormDialog = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref()

const categories = [
  { value: 'order', label: '订单通知' },
  { value: 'logistics', label: '物流通知' },
  { value: 'marketing', label: '营销推广' },
  { value: 'service', label: '客服通知' },
  { value: 'system', label: '系统通知' },
  { value: 'reminder', label: '提醒通知' }
]

const form = reactive({
  name: '',
  category: '',
  content: '',
  description: '',
  vendorTemplateCode: ''
})

const formRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [
    { required: true, message: '请输入模板内容', trigger: 'blur' },
    { min: 10, message: '模板内容至少10个字符', trigger: 'blur' }
  ]
}

const detectedVars = computed(() => {
  if (!form.content) return []
  const matches = form.content.match(/\{(\w+)\}/g)
  return matches ? [...new Set(matches.map((m: string) => m.slice(1, -1)))] : []
})

const categoryMap: Record<string, string> = {
  order: '订单通知', logistics: '物流通知', marketing: '营销推广',
  service: '客服通知', system: '系统通知', reminder: '提醒通知'
}
const getCategoryLabel = (v: string) => categoryMap[v] || v || '未分类'

const statusMap: Record<string, { label: string; type: string }> = {
  pending_admin: { label: '待审核', type: 'warning' },
  pending_vendor: { label: '待服务商', type: '' },
  active: { label: '已激活', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
  withdrawn: { label: '已撤销', type: 'info' }
}
const getStatusLabel = (s: string) => statusMap[s]?.label || s
const getStatusType = (s: string) => (statusMap[s]?.type || 'info') as any

/** 格式化短编码：取 UUID 前 8 位并加前缀 */
const formatShortId = (id: string | number) => {
  if (!id) return '—'
  const s = String(id)
  // 如果是纯数字直接显示
  if (/^\d+$/.test(s)) return `T-${s}`
  // UUID 格式取前8位
  return `T-${s.replace(/-/g, '').substring(0, 8).toUpperCase()}`
}

/** 格式化日期：简短格式 MM-DD HH:mm */
const formatDate = (t: string) => {
  if (!t) return '—'
  try {
    const d = new Date(t)
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return t }
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await smsManagementApi.getTemplates({
      keyword: keyword.value,
      category: filterCategory.value,
      isPreset: filterPreset.value,
      page: currentPage.value,
      pageSize: pageSize.value
    })
    if (res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    console.error('加载模板列表失败', e)
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  editingId.value = null
  Object.assign(form, { name: '', category: '', content: '', description: '', vendorTemplateCode: '' })
  showFormDialog.value = true
}

const handleEdit = (row: SmsTemplateItem) => {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    category: row.category,
    content: row.content,
    description: row.description || '',
    vendorTemplateCode: row.vendorTemplateCode || ''
  })
  showFormDialog.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value && editingId.value) {
      await smsManagementApi.updateTemplate(editingId.value, {
        name: form.name,
        category: form.category,
        content: form.content,
        variables: detectedVars.value,
        description: form.description,
        vendorTemplateCode: form.vendorTemplateCode || undefined
      })
      ElMessage.success('模板已更新')
    } else {
      await smsManagementApi.createTemplate({
        name: form.name,
        category: form.category,
        content: form.content,
        variables: detectedVars.value,
        description: form.description,
        vendorTemplateCode: form.vendorTemplateCode || undefined
      })
      ElMessage.success('预设模板创建成功')
    }
    showFormDialog.value = false
    loadList()
  } catch (e) {
    console.error('提交失败', e)
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row: SmsTemplateItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除模板「${row.name}」吗？`, '确认删除', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
    await smsManagementApi.deleteTemplate(row.id)
    ElMessage.success('已删除')
    loadList()
  } catch (e) { /* cancelled */ }
}

onMounted(() => { loadList() })
</script>

<style scoped lang="scss">
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
  h2 { margin: 0 0 4px 0; font-size: 20px; color: #303133; }
  .header-desc { margin: 0; font-size: 13px; color: #909399; }
}
.main-card { border-radius: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar-left { display: flex; gap: 10px; align-items: center; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
.detected-vars { display: flex; flex-wrap: wrap; gap: 6px; }
.var-tag { font-family: 'Courier New', monospace; }
.code-text { font-family: 'Courier New', monospace; color: #409eff; font-size: 12px; }
.text-muted { color: #c0c4cc; }
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; }

/* 短编码样式 */
.tpl-short-id {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f2f5;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* 内容单元格：2行溢出省略 */
.tpl-content-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  max-height: 40px;
  cursor: default;
}
</style>

