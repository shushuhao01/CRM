<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>套餐模板管理</span>
          <el-button v-permission="'wecom-management:vas-config:edit'" type="primary" :icon="Plus" @click="openCreateDialog">新增模板</el-button>
        </div>
      </template>

      <el-table :data="templates" v-loading="loading" stripe>
        <el-table-column prop="name" label="套餐名称" width="140" />
        <el-table-column label="人数" width="80" align="center">
          <template #default="{ row }">{{ row.userCount }}人</template>
        </el-table-column>
        <el-table-column label="时长" width="100" align="center">
          <template #default="{ row }">{{ row.duration }}{{ row.durationUnit === 'month' ? '个月' : '年' }}</template>
        </el-table-column>
        <el-table-column label="售价" width="120" align="center">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #f56c6c">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column label="原价" width="100" align="center">
          <template #default="{ row }">
            <span style="text-decoration: line-through; color: #c0c4cc">¥{{ row.originalPrice }}</span>
          </template>
        </el-table-column>
        <el-table-column label="折扣" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.originalPrice > row.price" type="danger" size="small">
              {{ Math.round(row.price / row.originalPrice * 100) / 10 }}折
            </el-tag>
            <span v-else style="color: #c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="功能特性" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="feat in (row.features || [])" :key="feat" size="small" effect="plain" style="margin: 2px">{{ feat }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="sortOrder" width="70" align="center" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'wecom-management:vas-config:edit'" link type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button v-permission="'wecom-management:vas-config:edit'" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑套餐模板' : '新增套餐模板'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="form.name" placeholder="如：基础版、标准版" />
        </el-form-item>
        <el-form-item label="开通人数" prop="userCount">
          <el-input-number v-model="form.userCount" :min="1" :max="99999" />
          <span style="margin-left: 10px; color: #909399">人</span>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="有效时长" prop="duration">
              <el-input-number v-model="form.duration" :min="1" :max="99" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时长单位">
              <el-select v-model="form.durationUnit" style="width: 100%">
                <el-option label="年" value="year" />
                <el-option label="月" value="month" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="售价" prop="price">
              <el-input-number v-model="form.price" :min="0" :precision="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原价">
              <el-input-number v-model="form.originalPrice" :min="0" :precision="0" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="套餐简短描述" />
        </el-form-item>
        <el-form-item label="功能特性">
          <div style="display: flex; flex-wrap: wrap; gap: 6px; width: 100%">
            <el-tag
              v-for="(feat, idx) in form.features"
              :key="idx"
              closable
              @close="form.features.splice(idx, 1)"
              size="default"
            >{{ feat }}</el-tag>
            <el-input
              v-if="featureInputVisible"
              ref="featureInputRef"
              v-model="featureInputValue"
              size="small"
              style="width: 120px"
              @keyup.enter="addFeature"
              @blur="addFeature"
            />
            <el-button v-else size="small" @click="showFeatureInput">+ 添加</el-button>
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.isEnabled" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/api/request'
import type { FormInstance, FormRules } from 'element-plus'

const loading = ref(false)
const saving = ref(false)
const templates = ref<any[]>([])

const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<any>(null)
const formRef = ref<FormInstance>()

const featureInputVisible = ref(false)
const featureInputValue = ref('')
const featureInputRef = ref<any>(null)

const form = reactive({
  name: '',
  userCount: 10,
  duration: 1,
  durationUnit: 'year',
  price: 1000,
  originalPrice: 1200,
  description: '',
  features: [] as string[],
  isEnabled: true,
  sortOrder: 0
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  userCount: [{ required: true, message: '请输入人数', trigger: 'blur' }],
  price: [{ required: true, message: '请输入售价', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入时长', trigger: 'blur' }]
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/package-templates')
    if (res.data) {
      templates.value = Array.isArray(res.data) ? res.data : []
    }
  } catch (e) {
    console.error('Fetch templates error:', e)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.name = ''
  form.userCount = 10
  form.duration = 1
  form.durationUnit = 'year'
  form.price = 1000
  form.originalPrice = 1200
  form.description = ''
  form.features = []
  form.isEnabled = true
  form.sortOrder = 0
}

const openCreateDialog = () => {
  isEdit.value = false
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (row: any) => {
  isEdit.value = true
  editingId.value = row.id
  form.name = row.name
  form.userCount = row.userCount
  form.duration = row.duration || 1
  form.durationUnit = row.durationUnit || 'year'
  form.price = row.price
  form.originalPrice = row.originalPrice || row.price
  form.description = row.description || ''
  form.features = Array.isArray(row.features) ? [...row.features] : []
  form.isEnabled = row.isEnabled !== false
  form.sortOrder = row.sortOrder || 0
  dialogVisible.value = true
}

const showFeatureInput = () => {
  featureInputVisible.value = true
  nextTick(() => featureInputRef.value?.focus())
}

const addFeature = () => {
  const v = featureInputValue.value.trim()
  if (v && !form.features.includes(v)) {
    form.features.push(v)
  }
  featureInputVisible.value = false
  featureInputValue.value = ''
}

const handleSave = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const payload = { ...form }
    if (isEdit.value) {
      await request.put(`/wecom-management/package-templates/${editingId.value}`, payload)
      ElMessage.success('套餐模板已更新')
    } else {
      await request.post('/wecom-management/package-templates', payload)
      ElMessage.success('套餐模板已创建')
    }
    dialogVisible.value = false
    fetchTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除套餐模板「${row.name}」？`, '删除确认', { type: 'warning' })
    .then(async () => {
      try {
        await request.delete(`/wecom-management/package-templates/${row.id}`)
        ElMessage.success('已删除')
        fetchTemplates()
      } catch (e: any) {
        ElMessage.error(e?.message || '删除失败')
      }
    })
    .catch(() => {})
}

onMounted(() => fetchTemplates())
</script>

<style scoped>
.page-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>

