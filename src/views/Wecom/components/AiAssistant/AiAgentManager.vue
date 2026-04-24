<template>
  <div class="ai-agent-manager">
    <div class="section-header">
      <h3 class="section-title">智能体配置</h3>
      <el-button type="primary" class="ai-btn" @click="openDialog()">
        <el-icon><Plus /></el-icon>创建智能体
      </el-button>
    </div>

    <el-table :data="agents" v-loading="loading" stripe>
      <el-table-column prop="agentName" label="智能体名称" min-width="130" />
      <el-table-column label="用途" min-width="180">
        <template #default="{ row }">
          <div style="display: flex; flex-wrap: wrap; gap: 4px">
            <el-tag v-for="u in parseUsages(row.usages)" :key="u" size="small" effect="plain" type="info">{{ usageLabels[u] || u }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="关联模型" width="130">
        <template #default="{ row }">{{ getModelName(row.modelId) }}</template>
      </el-table-column>
      <el-table-column label="知识库" width="100">
        <template #default="{ row }">
          {{ parseKbIds(row.knowledgeBaseIds).length > 0 ? parseKbIds(row.knowledgeBaseIds).length + '个' : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingAgent ? '编辑智能体' : '创建智能体'" width="680px" destroy-on-close>
      <el-form :model="form" label-width="110px" :rules="rules" ref="formRef">
        <el-form-item label="智能体名称" prop="agentName">
          <el-input v-model="form.agentName" placeholder="如：质检分析师" />
        </el-form-item>
        <el-form-item label="用途" prop="usages">
          <el-checkbox-group v-model="form.usages">
            <el-checkbox v-for="u in usageOptions" :key="u.value" :label="u.value">{{ u.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="关联模型" prop="modelId">
          <el-select v-model="form.modelId" placeholder="选择AI模型" style="width: 100%">
            <el-option v-for="m in models" :key="m.id" :label="`${m.modelName} (${m.modelId})`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联知识库">
          <el-select v-model="form.knowledgeBaseIds" multiple placeholder="选择知识库(可多选)" style="width: 100%">
            <el-option v-for="kb in knowledgeBases" :key="kb.id" :label="kb.name" :value="kb.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="系统提示词" prop="systemPrompt">
          <div style="width: 100%">
            <div style="margin-bottom: 6px">
              <el-select v-model="selectedTemplate" placeholder="加载预设模板" size="small" style="width: 200px" @change="loadTemplate">
                <el-option v-for="t in promptTemplates" :key="t.name" :label="t.name" :value="t.name" />
              </el-select>
            </div>
            <el-input v-model="form.systemPrompt" type="textarea" :rows="6" placeholder="输入系统提示词..." />
          </div>
        </el-form-item>
        <el-divider content-position="left">高级设置</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="单次最大消息">
              <el-input-number v-model="form.maxMsgPerAnalysis" :min="1" :max="200" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上下文窗口">
              <el-input-number v-model="form.contextWindow" :min="1000" :max="128000" :step="1000" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="输出格式">
              <el-select v-model="form.outputFormat" style="width: 100%">
                <el-option label="JSON" value="json" />
                <el-option label="纯文本" value="text" />
                <el-option label="Markdown" value="markdown" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="失败重试">
              <el-input-number v-model="form.retryCount" :min="0" :max="10" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="超时(秒)">
              <el-input-number v-model="form.timeoutSeconds" :min="5" :max="300" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="启用">
          <el-switch v-model="form.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存智能体</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AiAgentManager' })

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAiAgents, createAiAgent, updateAiAgent, deleteAiAgent, getAiModels, getKnowledgeBases } from '@/api/wecomAi'

const emit = defineEmits<{ (e: 'refresh'): void }>()

const loading = ref(false)
const agents = ref<any[]>([])
const models = ref<any[]>([])
const knowledgeBases = ref<any[]>([])
const dialogVisible = ref(false)
const editingAgent = ref<any>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const selectedTemplate = ref('')

const usageLabels: Record<string, string> = {
  quality_inspect: '会话质检', customer_reply: '客服回复', follow_suggest: '跟进建议',
  auto_tag: '自动标签', intent_judge: '意向判断', welcome_gen: '欢迎语生成', general_qa: '通用问答'
}

const usageOptions = [
  { value: 'quality_inspect', label: '会话质检' },
  { value: 'customer_reply', label: '客服回复' },
  { value: 'follow_suggest', label: '跟进建议' },
  { value: 'auto_tag', label: '自动标签' },
  { value: 'intent_judge', label: '意向判断' },
  { value: 'welcome_gen', label: '欢迎语生成' },
  { value: 'general_qa', label: '通用问答' },
]

const promptTemplates = [
  { name: '质检分析师模板', content: '你是一名专业的企业微信客服质检分析师。\n分析维度：1.服务态度 2.专业知识 3.响应速度 4.问题解决\n输出格式：JSON {score, dimensions, highlights, improvements, suggestion}' },
  { name: '客服助手模板', content: '你是一名专业的客服助手，基于知识库内容回答客户问题。\n规则：1.只使用知识库内容回答 2.不确定时引导转人工 3.语气友好专业' },
  { name: '销售顾问模板', content: '你是一名销售顾问，分析客户会话记录，给出跟进建议。\n输出：1.客户意向判断 2.推荐下一步动作 3.话术建议' },
  { name: '标签分析师模板', content: '分析客户会话内容，判断客户特征并输出标签建议。\n输出格式：JSON {tags: [{name, confidence, reason}]}' },
]

const defaultForm = () => ({
  agentName: '', usages: [] as string[], modelId: null as number | null,
  knowledgeBaseIds: [] as number[], systemPrompt: '',
  maxMsgPerAnalysis: 50, contextWindow: 8000, outputFormat: 'json',
  retryCount: 3, timeoutSeconds: 30, isEnabled: true,
})

const form = ref(defaultForm())

const rules: FormRules = {
  agentName: [{ required: true, message: '请输入智能体名称', trigger: 'blur' }],
  usages: [{ type: 'array', required: true, message: '请选择至少一个用途', trigger: 'change' }],
  modelId: [{ required: true, message: '请选择关联模型', trigger: 'change' }],
  systemPrompt: [{ required: true, message: '请输入系统提示词', trigger: 'blur' }],
}

const parseUsages = (val: any): string[] => {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val || '[]') } catch { return [] }
}

const parseKbIds = (val: any): number[] => {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val || '[]') } catch { return [] }
}

const getModelName = (modelId: number) => {
  const m = models.value.find(x => x.id === modelId)
  return m ? `${m.modelName}` : '-'
}

const loadTemplate = (name: string) => {
  const t = promptTemplates.find(x => x.name === name)
  if (t) form.value.systemPrompt = t.content
}

const fetchData = async () => {
  loading.value = true
  try {
    const [agentsRes, modelsRes, kbRes] = await Promise.all([getAiAgents(), getAiModels(), getKnowledgeBases()])
    agents.value = Array.isArray(agentsRes) ? agentsRes : ((agentsRes as any)?.data || [])
    models.value = Array.isArray(modelsRes) ? modelsRes : ((modelsRes as any)?.data || [])
    knowledgeBases.value = Array.isArray(kbRes) ? kbRes : ((kbRes as any)?.data || [])
  } catch { /* ignore */ }
  loading.value = false
}

const openDialog = (agent?: any) => {
  if (agent) {
    editingAgent.value = agent
    form.value = {
      ...agent,
      usages: parseUsages(agent.usages),
      knowledgeBaseIds: parseKbIds(agent.knowledgeBaseIds),
    }
  } else {
    editingAgent.value = null
    form.value = defaultForm()
  }
  selectedTemplate.value = ''
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = { ...form.value }
    if (editingAgent.value) {
      await updateAiAgent(editingAgent.value.id, payload)
      ElMessage.success('智能体已更新')
    } else {
      await createAiAgent(payload)
      ElMessage.success('智能体已创建')
    }
    dialogVisible.value = false
    fetchData()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  saving.value = false
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除智能体"${row.agentName}"？`, '删除确认', { type: 'warning' })
  try {
    await deleteAiAgent(row.id)
    ElMessage.success('已删除')
    fetchData()
    emit('refresh')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(fetchData)

defineExpose({ fetchData, agents })
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #1F2937; margin: 0; }
.ai-btn { background: linear-gradient(135deg, #7C3AED, #6D28D9) !important; border: none !important; color: #fff !important; }
.ai-btn:hover { opacity: 0.9; }
</style>

