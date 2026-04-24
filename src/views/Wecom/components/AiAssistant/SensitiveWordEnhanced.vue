<template>
  <div class="sensitive-word-enhanced">
    <div class="section-header">
      <h3 class="section-title">敏感词库管理</h3>
      <el-button type="primary" class="ai-btn" @click="openDialog()">
        <el-icon><Plus /></el-icon>添加词组
      </el-button>
    </div>

    <el-alert type="info" :closable="false" style="margin-bottom: 16px">
      <template #title>敏感词库支持四种检测模式：精确匹配、包含匹配、正则匹配和<strong style="color:#7C3AED">语义匹配(AI)</strong>。语义匹配使用AI智能体理解语义判断是否违规，适用于变形词和隐晦表达。</template>
    </el-alert>

    <el-table :data="wordGroups" v-loading="loading" stripe>
      <el-table-column prop="groupName" label="词组名称" min-width="130" />
      <el-table-column label="敏感词数" width="90" align="center">
        <template #default="{ row }">{{ parseWords(row.words).length }}</template>
      </el-table-column>
      <el-table-column label="检测模式" width="130">
        <template #default="{ row }">
          <el-tag :type="row.detectMode === 'ai_semantic' ? 'warning' : 'primary'" size="small" effect="plain">
            {{ detectModeLabels[row.detectMode] || row.detectMode }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="触发次数" width="90" align="center">
        <template #default="{ row }">{{ row.hitCount || 0 }}</template>
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

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingGroup ? '编辑敏感词组' : '添加敏感词组'" width="580px" destroy-on-close>
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="词组名称" prop="groupName">
          <el-input v-model="form.groupName" placeholder="如：违规承诺" />
        </el-form-item>
        <el-form-item label="检测模式" prop="detectMode">
          <el-radio-group v-model="form.detectMode">
            <el-radio label="exact">精确匹配</el-radio>
            <el-radio label="contain">包含匹配</el-radio>
            <el-radio label="regex">正则匹配</el-radio>
            <el-radio label="ai_semantic">
              <span style="display: inline-flex; align-items: center; gap: 4px">
                语义匹配<span class="ai-label">AI</span>
              </span>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.detectMode === 'ai_semantic'" label="AI智能体">
          <el-select v-model="form.agentId" placeholder="选择用于语义分析的智能体" style="width: 100%">
            <el-option v-for="a in agents" :key="a.id" :label="a.agentName" :value="a.id" />
          </el-select>
          <div style="font-size: 12px; color: #909399; margin-top: 4px">语义匹配会产生AI调用开销，建议仅对关键词组启用</div>
        </el-form-item>
        <el-form-item label="敏感词列表" prop="words">
          <div style="width: 100%">
            <div class="word-tags">
              <el-tag v-for="(w, i) in form.words" :key="i" closable @close="form.words.splice(i, 1)" style="margin: 2px 4px">{{ w }}</el-tag>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px">
              <el-input v-model="newWord" placeholder="输入敏感词" size="small" @keyup.enter="addWord" style="flex: 1" />
              <el-button size="small" @click="addWord">添加</el-button>
            </div>
          </div>
        </el-form-item>
        <el-divider content-position="left">触发动作</el-divider>
        <el-form-item label="触发动作">
          <el-checkbox-group v-model="form.actions">
            <el-checkbox label="mark">标记消息为敏感</el-checkbox>
            <el-checkbox label="notify">通知管理员</el-checkbox>
            <el-checkbox label="retract">自动撤回(需权限)</el-checkbox>
            <el-checkbox label="inspect_deduct">记入AI质检扣分</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-divider content-position="left">豁免设置</el-divider>
        <el-form-item label="豁免规则">
          <el-checkbox v-model="form.exemptAdmin">管理员发送不检测</el-checkbox>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.isEnabled" />
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
defineOptions({ name: 'SensitiveWordEnhanced' })

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAiAgents } from '@/api/wecomAi'

// NOTE: 敏感词组使用独立的API（与会话存档共享同一张表但增强了字段）
// 实际接口路径如后端已实现则调用，否则模拟
const API_BASE = '/wecom/sensitive-word-groups'

import request from '@/utils/request'
const getSensitiveWordGroups = () => request.get(API_BASE)
const createSensitiveWordGroup = (data: any) => request.post(API_BASE, data)
const updateSensitiveWordGroup = (id: number, data: any) => request.put(`${API_BASE}/${id}`, data)
const deleteSensitiveWordGroup = (id: number) => request.delete(`${API_BASE}/${id}`)

const loading = ref(false)
const wordGroups = ref<any[]>([])
const agents = ref<any[]>([])
const dialogVisible = ref(false)
const editingGroup = ref<any>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const newWord = ref('')

const detectModeLabels: Record<string, string> = {
  exact: '精确匹配', contain: '包含匹配', regex: '正则匹配', ai_semantic: '语义匹配(AI)'
}

const defaultForm = () => ({
  groupName: '', detectMode: 'exact' as string, agentId: null as number | null,
  words: [] as string[], actions: ['mark', 'notify'] as string[],
  exemptAdmin: false, isEnabled: true,
})
const form = ref(defaultForm())

const rules: FormRules = {
  groupName: [{ required: true, message: '请输入词组名称', trigger: 'blur' }],
  detectMode: [{ required: true, message: '请选择检测模式', trigger: 'change' }],
}

const parseWords = (val: any): string[] => {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val || '[]') } catch { return [] }
}

const addWord = () => {
  const w = newWord.value.trim()
  if (!w) return
  if (!form.value.words.includes(w)) form.value.words.push(w)
  newWord.value = ''
}

const fetchData = async () => {
  loading.value = true
  try {
    const [groupsRes, agentsRes] = await Promise.all([getSensitiveWordGroups(), getAiAgents()])
    wordGroups.value = Array.isArray(groupsRes) ? groupsRes : ((groupsRes as any)?.data || [])
    agents.value = Array.isArray(agentsRes) ? agentsRes : ((agentsRes as any)?.data || [])
  } catch { wordGroups.value = [] }
  loading.value = false
}

const openDialog = (group?: any) => {
  if (group) {
    editingGroup.value = group
    form.value = {
      groupName: group.groupName, detectMode: group.detectMode || 'exact',
      agentId: group.agentId, words: parseWords(group.words),
      actions: group.actions ? (Array.isArray(group.actions) ? group.actions : JSON.parse(group.actions || '[]')) : ['mark', 'notify'],
      exemptAdmin: !!group.exemptAdmin, isEnabled: !!group.isEnabled,
    }
  } else {
    editingGroup.value = null
    form.value = defaultForm()
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingGroup.value) {
      await updateSensitiveWordGroup(editingGroup.value.id, form.value)
      ElMessage.success('词组已更新')
    } else {
      await createSensitiveWordGroup(form.value)
      ElMessage.success('词组已添加')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  saving.value = false
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除词组"${row.groupName}"？`, '删除确认', { type: 'warning' })
  try {
    await deleteSensitiveWordGroup(row.id)
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
.ai-label {
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #7C3AED, #6D28D9); color: #fff;
  font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 6px;
}
.word-tags { display: flex; flex-wrap: wrap; gap: 2px; min-height: 32px; background: #f5f7fa; border-radius: 6px; padding: 6px; }
</style>

