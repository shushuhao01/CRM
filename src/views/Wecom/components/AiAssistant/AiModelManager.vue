<template>
  <div class="ai-model-manager">
    <div class="section-header">
      <h3 class="section-title">AI模型管理</h3>
      <el-button type="primary" class="ai-btn" @click="openDialog()">
        <el-icon><Plus /></el-icon>添加模型
      </el-button>
    </div>

    <el-table :data="models" v-loading="loading" stripe>
      <el-table-column prop="modelName" label="模型名称" min-width="130">
        <template #default="{ row }">
          <div style="display: flex; align-items: center; gap: 6px">
            <span>{{ row.modelName }}</span>
            <el-tag v-if="row.isDefault" type="warning" size="small" effect="plain">默认</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="provider" label="提供商" width="110">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ providerLabels[row.provider] || row.provider }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="modelId" label="模型ID" width="140">
        <template #default="{ row }">
          <code style="font-size: 12px; color: #606266">{{ row.modelId }}</code>
        </template>
      </el-table-column>
      <el-table-column label="参数" width="180">
        <template #default="{ row }">
          <span style="font-size: 12px; color: #909399">
            T:{{ row.temperature }} / MaxT:{{ row.maxTokens }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.lastTestStatus === 'success' ? 'success' : row.lastTestStatus === 'fail' ? 'danger' : 'info'" size="small">
            {{ row.lastTestStatus === 'success' ? '已连接' : row.lastTestStatus === 'fail' ? '异常' : '未测试' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleTest(row)" :loading="testingId === row.id">测试</el-button>
          <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
          <el-button v-if="!row.isDefault" type="success" link size="small" @click="handleSetDefault(row)">设为默认</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingModel ? '编辑AI模型' : '添加AI模型'" width="600px" destroy-on-close>
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="模型名称" prop="modelName">
          <el-input v-model="form.modelName" placeholder="如：通用大模型" />
        </el-form-item>
        <el-form-item label="提供商" prop="provider">
          <div class="provider-grid">
            <div
              v-for="p in providers" :key="p.value"
              class="provider-item"
              :class="{ active: form.provider === p.value }"
              @click="form.provider = p.value; onProviderChange(p.value)"
            >
              <span class="provider-icon">{{ p.icon }}</span>
              <span class="provider-name">{{ p.label }}</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="API地址" prop="apiUrl">
          <el-input v-model="form.apiUrl" placeholder="https://api.openai.com/v1" />
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input v-model="form.apiKey" placeholder="sk-..." show-password />
        </el-form-item>
        <el-form-item label="模型ID" prop="modelId">
          <el-input v-model="form.modelId" placeholder="如：gpt-4o" />
        </el-form-item>
        <el-divider content-position="left">参数设置</el-divider>
        <el-form-item label="温度系数">
          <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" show-input :show-input-controls="false" style="width: 100%" />
          <div class="param-hint">值越高回复越有创造性，越低越精确稳定</div>
        </el-form-item>
        <el-form-item label="最大令牌数">
          <el-input-number v-model="form.maxTokens" :min="256" :max="128000" :step="256" style="width: 220px" />
          <div class="param-hint">单次请求最大生成的Token数量</div>
        </el-form-item>
        <el-form-item label="采样阈值">
          <el-slider v-model="form.topP" :min="0" :max="1" :step="0.05" show-input :show-input-controls="false" style="width: 100%" />
          <div class="param-hint">核采样概率阈值，建议保持默认值1</div>
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
defineOptions({ name: 'AiModelManager' })

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAiModels, createAiModel, updateAiModel, deleteAiModel, testAiModel, setDefaultAiModel } from '@/api/wecomAi'

const emit = defineEmits<{ (e: 'refresh'): void }>()

const loading = ref(false)
const models = ref<any[]>([])
const dialogVisible = ref(false)
const editingModel = ref<any>(null)
const saving = ref(false)
const testingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const providerLabels: Record<string, string> = {
  openai: 'OpenAI', zhipu: '智谱AI', baidu: '百度文心',
  aliyun: '阿里通义', xunfei: '讯飞星火', ollama: 'Ollama(本地)', custom: '自定义API'
}

const providers = [
  { value: 'openai', label: 'OpenAI', icon: '🌐' },
  { value: 'zhipu', label: '智谱AI', icon: '🧠' },
  { value: 'baidu', label: '百度文心', icon: '🔵' },
  { value: 'aliyun', label: '阿里通义', icon: '☁️' },
  { value: 'xunfei', label: '讯飞星火', icon: '🔥' },
  { value: 'ollama', label: 'Ollama', icon: '🏠' },
  { value: 'custom', label: '自定义', icon: '⚙️' },
]

const providerDefaults: Record<string, { apiUrl: string; modelId: string }> = {
  openai: { apiUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o' },
  zhipu: { apiUrl: 'https://open.bigmodel.cn/api/paas/v4', modelId: 'glm-4' },
  baidu: { apiUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1', modelId: 'ernie-bot-4' },
  aliyun: { apiUrl: 'https://dashscope.aliyuncs.com/api/v1', modelId: 'qwen-max' },
  xunfei: { apiUrl: 'https://spark-api-open.xf-yun.com/v1', modelId: 'generalv3.5' },
  ollama: { apiUrl: 'http://localhost:11434/v1', modelId: 'qwen2' },
  custom: { apiUrl: '', modelId: '' },
}

const defaultForm = () => ({
  modelName: '', provider: 'openai' as string, apiUrl: 'https://api.openai.com/v1',
  apiKey: '', modelId: 'gpt-4o', temperature: 0.7, maxTokens: 4096, topP: 1.0
})

const form = ref(defaultForm())

const rules: FormRules = {
  modelName: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择提供商', trigger: 'change' }],
  apiUrl: [{ required: true, message: '请输入API地址', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入API Key', trigger: 'blur' }],
  modelId: [{ required: true, message: '请输入模型ID', trigger: 'blur' }],
}

const onProviderChange = (val: string) => {
  const defaults = providerDefaults[val]
  if (defaults) {
    form.value.apiUrl = defaults.apiUrl
    form.value.modelId = defaults.modelId
  }
}

const fetchModels = async () => {
  loading.value = true
  try {
    const res: any = await getAiModels()
    models.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { models.value = [] }
  loading.value = false
}

const openDialog = (model?: any) => {
  if (model) {
    editingModel.value = model
    form.value = { ...model, apiKey: '' }
  } else {
    editingModel.value = null
    form.value = defaultForm()
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingModel.value) {
      const data = { ...form.value }
      if (!data.apiKey) delete (data as any).apiKey // don't overwrite if empty
      await updateAiModel(editingModel.value.id, data)
      ElMessage.success('模型已更新')
    } else {
      await createAiModel(form.value)
      ElMessage.success('模型已添加')
    }
    dialogVisible.value = false
    fetchModels()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  saving.value = false
}

const handleTest = async (row: any) => {
  testingId.value = row.id
  try {
    const res: any = await testAiModel(row.id)
    ElMessage.success(`连接成功，延迟: ${res?.latency || '-'}ms`)
    fetchModels()
  } catch (e: any) {
    ElMessage.error(`连接失败: ${e?.message || '未知错误'}`)
  }
  testingId.value = null
}

const handleSetDefault = async (row: any) => {
  try {
    await setDefaultAiModel(row.id)
    ElMessage.success('已设为默认模型')
    fetchModels()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '设置失败')
  }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除模型"${row.modelName}"？`, '删除确认', { type: 'warning' })
  try {
    await deleteAiModel(row.id)
    ElMessage.success('已删除')
    fetchModels()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(fetchModels)

defineExpose({ fetchModels, models })
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #1F2937; margin: 0; }
.ai-btn { background: linear-gradient(135deg, #7C3AED, #6D28D9) !important; border: none !important; color: #fff !important; }
.ai-btn:hover { opacity: 0.9; }
.provider-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}
.provider-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.provider-item:hover { border-color: #C4B5FD; background: #F5F3FF; }
.provider-item.active {
  border-color: #7C3AED;
  background: linear-gradient(135deg, #F5F3FF, #EDE9FE);
  box-shadow: 0 0 0 1px #7C3AED;
}
.provider-icon { font-size: 20px; }
.provider-name { font-size: 12px; color: #374151; font-weight: 500; }
.provider-item.active .provider-name { color: #7C3AED; font-weight: 600; }
.param-hint { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
</style>

