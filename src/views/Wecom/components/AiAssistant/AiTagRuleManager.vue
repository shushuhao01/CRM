<template>
  <div class="ai-tag-rule-manager">
    <div class="section-header">
      <h3 class="section-title">客户标签AI</h3>
      <el-button type="primary" class="ai-btn" @click="openDialog()">
        <el-icon><Plus /></el-icon>创建自动标签规则
      </el-button>
    </div>

    <el-alert type="info" :closable="false" style="margin-bottom: 16px">
      基于会话内容/客户行为，AI自动为客户打标签。支持关键词触发、AI语义触发、行为触发三种模式。
    </el-alert>

    <el-table :data="rules" v-loading="loading" stripe>
      <el-table-column prop="ruleName" label="规则名称" min-width="140" />
      <el-table-column label="触发条件" min-width="200">
        <template #default="{ row }">
          <div style="display: flex; align-items: center; gap: 6px">
            <el-tag :type="triggerTypeTag(row.triggerType)" size="small" effect="plain">{{ triggerTypeLabels[row.triggerType] }}</el-tag>
            <span v-if="row.triggerType === 'keyword'" style="font-size: 12px; color: #909399">
              {{ parseKeywords(row.keywords).slice(0, 3).join('/') }}{{ parseKeywords(row.keywords).length > 3 ? '...' : '' }}
            </span>
            <span v-else-if="row.triggerType === 'ai_semantic'" style="font-size: 12px; color: #909399">
              {{ row.aiPrompt?.substring(0, 20) || '-' }}
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="目标标签" width="120">
        <template #default="{ row }">
          <el-tag size="small" effect="dark" type="warning">{{ row.targetTagName || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="命中数" width="80" align="center">
        <template #default="{ row }">{{ row.hitCount || 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
          <el-button type="info" link size="small" @click="viewHits(row)">查看命中</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingRule ? '编辑自动标签规则' : '创建自动标签规则'" width="600px" destroy-on-close>
      <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="form.ruleName" placeholder="如：购买意向识别" />
        </el-form-item>
        <el-form-item label="触发方式" prop="triggerType">
          <el-radio-group v-model="form.triggerType">
            <el-radio label="keyword">关键词触发</el-radio>
            <el-radio label="ai_semantic">
              <span style="display: inline-flex; align-items: center; gap: 4px">
                AI语义触发<span class="ai-label">AI</span>
              </span>
            </el-radio>
            <el-radio label="behavior">行为触发</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 关键词触发 -->
        <el-form-item v-if="form.triggerType === 'keyword'" label="关键词">
          <div style="width: 100%">
            <div class="word-tags">
              <el-tag v-for="(w, i) in form.keywords" :key="i" closable @close="form.keywords.splice(i, 1)" style="margin: 2px">{{ w }}</el-tag>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px">
              <el-input v-model="newKeyword" placeholder="输入关键词" size="small" @keyup.enter="addKeyword" style="flex: 1" />
              <el-button size="small" @click="addKeyword">添加</el-button>
            </div>
          </div>
        </el-form-item>

        <!-- AI语义触发 -->
        <template v-if="form.triggerType === 'ai_semantic'">
          <el-form-item label="AI智能体">
            <el-select v-model="form.agentId" placeholder="选择智能体" style="width: 100%">
              <el-option v-for="a in agents" :key="a.id" :label="a.agentName" :value="a.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="判断提示">
            <el-input v-model="form.aiPrompt" type="textarea" :rows="3" placeholder="如：分析客户是否有购买意向" />
          </el-form-item>
        </template>

        <!-- 行为触发 -->
        <el-form-item v-if="form.triggerType === 'behavior'" label="客户行为">
          <el-checkbox-group v-model="form.behaviors">
            <el-checkbox label="view_product">查看产品链接</el-checkbox>
            <el-checkbox label="frequent_consult">多次咨询</el-checkbox>
            <el-checkbox label="join_group">加入群聊</el-checkbox>
            <el-checkbox label="click_payment">点击付款</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="目标标签" prop="targetTagName">
          <el-input v-model="form.targetTagName" placeholder="标签名称，如：意向客户" />
        </el-form-item>

        <el-form-item label="触发频率">
          <el-radio-group v-model="form.triggerFrequency">
            <el-radio label="first_only">仅首次触发（已有标签不重复）</el-radio>
            <el-radio label="every_time">每次触发都记录</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="通知">
          <el-checkbox v-model="form.notifyFollower">触发时通知跟进人</el-checkbox>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存规则</el-button>
      </template>
    </el-dialog>

    <!-- 命中记录弹窗 -->
    <el-dialog v-model="hitsVisible" :title="`命中记录 - ${hitsRuleName}`" width="640px">
      <el-table :data="hits" v-loading="hitsLoading" stripe size="small">
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="matchDetail" label="匹配详情" min-width="200" />
        <el-table-column label="结果" width="90">
          <template #default="{ row }">
            <el-tag :type="row.tagged ? 'success' : 'info'" size="small">{{ row.tagged ? '已打标' : '跳过' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AiTagRuleManager' })

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAiTagRules, createAiTagRule, updateAiTagRule, deleteAiTagRule, getAiTagRuleHits, getAiAgents } from '@/api/wecomAi'

const loading = ref(false)
const rules = ref<any[]>([])
const agents = ref<any[]>([])
const dialogVisible = ref(false)
const editingRule = ref<any>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const newKeyword = ref('')

const triggerTypeLabels: Record<string, string> = { keyword: '关键词', ai_semantic: 'AI语义', behavior: '行为' }
const triggerTypeTag = (t: string) => ({ keyword: 'primary', ai_semantic: 'warning', behavior: 'success' }[t] || 'info') as any

const parseKeywords = (val: any): string[] => {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val || '[]') } catch { return [] }
}

const defaultForm = () => ({
  ruleName: '', triggerType: 'keyword' as string, keywords: [] as string[],
  agentId: null as number | null, aiPrompt: '', behaviors: [] as string[],
  targetTagId: '', targetTagName: '', triggerFrequency: 'first_only',
  notifyFollower: false, isEnabled: true,
})
const form = ref(defaultForm())

const formRules: FormRules = {
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  triggerType: [{ required: true, message: '请选择触发方式', trigger: 'change' }],
  targetTagName: [{ required: true, message: '请输入目标标签名称', trigger: 'blur' }],
}

// Hits dialog
const hitsVisible = ref(false)
const hitsRuleName = ref('')
const hits = ref<any[]>([])
const hitsLoading = ref(false)

const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-'

const addKeyword = () => {
  const w = newKeyword.value.trim()
  if (!w) return
  if (!form.value.keywords.includes(w)) form.value.keywords.push(w)
  newKeyword.value = ''
}

const fetchData = async () => {
  loading.value = true
  try {
    const [rulesRes, agentsRes] = await Promise.all([getAiTagRules(), getAiAgents()])
    rules.value = Array.isArray(rulesRes) ? rulesRes : (rulesRes?.list || rulesRes?.data || [])
    agents.value = Array.isArray(agentsRes) ? agentsRes : ((agentsRes as any)?.data || [])
  } catch { rules.value = [] }
  loading.value = false
}

const openDialog = (rule?: any) => {
  if (rule) {
    editingRule.value = rule
    form.value = {
      ruleName: rule.ruleName, triggerType: rule.triggerType || 'keyword',
      keywords: parseKeywords(rule.keywords), agentId: rule.agentId,
      aiPrompt: rule.aiPrompt || '', behaviors: rule.behaviors ? (Array.isArray(rule.behaviors) ? rule.behaviors : JSON.parse(rule.behaviors || '[]')) : [],
      targetTagId: rule.targetTagId || '', targetTagName: rule.targetTagName || '',
      triggerFrequency: rule.triggerFrequency || 'first_only',
      notifyFollower: !!rule.notifyFollower, isEnabled: !!rule.isEnabled,
    }
  } else {
    editingRule.value = null
    form.value = defaultForm()
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingRule.value) {
      await updateAiTagRule(editingRule.value.id, form.value)
      ElMessage.success('规则已更新')
    } else {
      await createAiTagRule(form.value)
      ElMessage.success('规则已创建')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
  saving.value = false
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除规则"${row.ruleName}"？`, '删除确认', { type: 'warning' })
  try {
    await deleteAiTagRule(row.id)
    ElMessage.success('已删除')
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const viewHits = async (row: any) => {
  hitsRuleName.value = row.ruleName
  hitsVisible.value = true
  hitsLoading.value = true
  try {
    const res: any = await getAiTagRuleHits(row.id)
    hits.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { hits.value = [] }
  hitsLoading.value = false
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

