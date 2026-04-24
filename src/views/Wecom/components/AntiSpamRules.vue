<template>
  <div class="anti-spam-rules">
    <div class="tab-actions">
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>创建规则</el-button>
      <div style="flex: 1" />
      <el-tag :type="hasChatArchive ? 'success' : 'info'" size="small" style="margin-right: 8px">
        {{ hasChatArchive ? '✅ 会话存档已开通' : '⚠️ 未开通会话存档' }}
      </el-tag>
      <el-switch v-model="hasChatArchive" active-text="会话存档" inactive-text="" size="small" style="margin-right: 12px" />
      <span class="result-count">共 {{ rules.length }} 条规则</span>
    </div>

    <el-alert :type="hasChatArchive ? 'success' : 'warning'" :closable="true" style="margin-bottom: 16px" show-icon>
      <template #title>
        <template v-if="hasChatArchive">
          已开通会话存档：支持<strong>关键词/链接/频率自动检测</strong>，触发后可自动撤回消息、踢出成员（企微API: groupchat/member/del）、通知群主等。
        </template>
        <template v-else>
          未开通会话存档：关键词/频率自动检测不可用。当前可用功能：<strong>手动踢出违规成员</strong>（企微API: groupchat/member/del，仅限外部客户）。规则保存在CRM作为管理参考，群主可在群详情中一键执行踢出操作。
        </template>
      </template>
    </el-alert>

    <el-table :data="rules" stripe v-loading="loading">
      <el-table-column label="规则名称" min-width="140">
        <template #default="{ row }">
          <span style="color: #1F2937">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="160">
        <template #default="{ row }">
          <div class="type-tags">
            <el-tag v-for="t in parseTypes(row.detectTypes)" :key="t" size="small" type="info" style="margin: 2px">{{ t }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="适用范围" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.scope === 'all' ? '全部群' : row.scope === 'template' ? '按模板' : '指定群' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="处罚" width="120">
        <template #default="{ row }">
          <div class="type-tags">
            <el-tag v-for="p in parsePunish(row.punishments)" :key="p" size="small" type="warning" style="margin: 2px">{{ p }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="执行模式" width="90">
        <template #default="{ row }">
          <el-tag :type="row.autoExecute ? 'success' : ''" size="small">{{ row.autoExecute ? '自动' : '手动' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button :type="row.isEnabled ? 'warning' : 'success'" link size="small" @click="toggleEnabled(row)">
            {{ row.isEnabled ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editing ? '编辑规则' : '创建规则'" width="680px" destroy-on-close>
      <el-form :model="form" label-width="110px" ref="formRef" :rules="formRules">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="输入规则名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="适用范围">
          <el-radio-group v-model="form.scope">
            <el-radio label="all">全部群</el-radio>
            <el-radio label="specified">指定群</el-radio>
            <el-radio label="template">按群模板</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- 指定群选择器 -->
        <el-form-item v-if="form.scope === 'specified'" label="选择群">
          <el-select v-model="form.specifiedGroups" multiple placeholder="选择群聊" style="width: 100%" filterable>
            <el-option v-for="g in groupList" :key="g.id || g.chatId" :label="g.name || '未命名群'" :value="g.chatId || g.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.scope === 'template'" label="选择模板">
          <el-select v-model="form.specifiedTemplates" multiple placeholder="选择群模板" style="width: 100%" filterable>
            <el-option v-for="t in templateList" :key="t.id" :label="t.templateName" :value="t.id" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">
          检测类型
          <el-tag v-if="!hasChatArchive" type="warning" size="small" style="margin-left: 8px">需开通会话存档</el-tag>
        </el-divider>

        <template v-if="!hasChatArchive">
          <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
            <template #title>未开通会话存档，以下检测规则仅作为管理参考记录，不能自动检测。可在群详情中手动踢出违规成员。</template>
          </el-alert>
        </template>

        <el-form-item label="关键词/敏感词">
          <el-switch v-model="form.keywordEnabled" />
          <div v-if="form.keywordEnabled" class="rule-sub">
            <el-input v-model="form.keywords" type="textarea" :rows="2" placeholder="输入关键词/敏感词，逗号分隔，如：加微信,免费领,扫码,优惠券" />
            <el-select v-model="form.keywordMode" size="small" style="width: 140px; margin-top: 8px">
              <el-option label="包含任意" value="any" />
              <el-option label="包含全部" value="all" />
              <el-option label="正则匹配" value="regex" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="链接检测">
          <el-switch v-model="form.linkEnabled" />
          <div v-if="form.linkEnabled" class="rule-sub">
            <el-radio-group v-model="form.linkMode">
              <el-radio label="block_all">禁止所有外链</el-radio>
              <el-radio label="whitelist">仅允许白名单</el-radio>
            </el-radio-group>
            <el-input v-if="form.linkMode === 'whitelist'" v-model="form.linkWhitelist" placeholder="白名单域名，逗号分隔" style="margin-top: 8px" />
          </div>
        </el-form-item>
        <el-form-item label="频率检测">
          <el-switch v-model="form.frequencyEnabled" />
          <div v-if="form.frequencyEnabled" class="rule-sub inline">
            <el-input-number v-model="form.freqMinutes" :min="1" :max="60" size="small" style="width: 80px" />
            <span>分钟内发送超过</span>
            <el-input-number v-model="form.freqMaxMsg" :min="3" :max="100" size="small" style="width: 80px" />
            <span>条</span>
          </div>
        </el-form-item>

        <el-divider content-position="left">触发后操作</el-divider>
        <el-form-item label="操作">
          <el-checkbox-group v-model="form.punishments">
            <div class="punishment-options">
              <el-checkbox label="notify">
                <span>通知群主/管理员</span>
                <el-tag size="small" type="success" style="margin-left: 4px">始终可用</el-tag>
              </el-checkbox>
              <el-checkbox label="kick">
                <span>踢出群聊（仅限外部客户）</span>
                <el-tag size="small" type="success" style="margin-left: 4px">API支持</el-tag>
              </el-checkbox>
              <el-checkbox label="revoke" :disabled="!hasChatArchive">
                <span>自动撤回消息</span>
                <el-tag v-if="!hasChatArchive" size="small" type="info" style="margin-left: 4px">需会话存档</el-tag>
              </el-checkbox>
              <el-checkbox label="record">
                <span>记录到质检系统</span>
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </el-form-item>

        <el-divider content-position="left">豁免设置</el-divider>
        <el-form-item label="豁免">
          <el-checkbox v-model="form.exemptEmployee">企微员工不受限制</el-checkbox>
          <el-checkbox v-model="form.exemptAdmin">群主/管理员不受限制</el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存规则</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAntiSpamRules, createAntiSpamRule, updateAntiSpamRule, deleteAntiSpamRule, getWecomCustomerGroups, getGroupTemplates } from '@/api/wecomGroup'

const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const editing = ref<any>(null)
const formRef = ref()
const groupList = ref<any[]>([])
const templateList = ref<any[]>([])
const hasChatArchive = ref(false)

const rules = ref<any[]>([])

const parseTypes = (types: string) => {
  try {
    const arr: string[] = JSON.parse(types || '[]')
    const map: Record<string, string> = { keyword: '关键词', link: '链接', frequency: '频率', image: '图片' }
    return arr.map(t => map[t] || t)
  } catch { return [] }
}

const parsePunish = (p: string) => {
  try {
    const arr: string[] = JSON.parse(p || '[]')
    const map: Record<string, string> = { revoke: '撤回', kick: '踢出', notify: '通知', record: '质检' }
    return arr.map(t => map[t] || t)
  } catch { return [] }
}

const defaultForm = () => ({
  name: '', scope: 'all' as string,
  specifiedGroups: [] as string[],
  specifiedTemplates: [] as number[],
  keywordEnabled: false, keywords: '', keywordMode: 'any',
  linkEnabled: false, linkMode: 'block_all', linkWhitelist: '',
  frequencyEnabled: false, freqMinutes: 5, freqMaxMsg: 10,
  punishments: ['notify'] as string[],
  exemptEmployee: true, exemptAdmin: false
})

const form = reactive(defaultForm())
const formRules = { name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }] }

const fetchRules = async () => {
  loading.value = true
  try {
    const res: any = await getAntiSpamRules()
    rules.value = Array.isArray(res) ? res : (res?.list || [])
  } catch { rules.value = [] }
  finally { loading.value = false }
}

const fetchSelectors = async () => {
  try {
    const [gRes, tRes]: any[] = await Promise.all([
      getWecomCustomerGroups({ pageSize: 500 }),
      getGroupTemplates()
    ])
    groupList.value = gRes?.list || (Array.isArray(gRes) ? gRes : [])
    templateList.value = Array.isArray(tRes) ? tRes : (tRes?.list || [])
  } catch { /* ignore */ }
}

const openCreate = () => {
  editing.value = null
  Object.assign(form, defaultForm())
  showDialog.value = true
  fetchSelectors()
}

const handleEdit = (row: any) => {
  editing.value = row
  const types = parseTypes(row.detectTypes).map((t: string) => {
    const rmap: Record<string, string> = { '关键词': 'keyword', '链接': 'link', '频率': 'frequency', '图片': 'image' }
    return rmap[t] || t
  })
  Object.assign(form, {
    ...defaultForm(),
    name: row.name,
    scope: row.scope || 'all',
    keywordEnabled: types.includes('keyword'),
    linkEnabled: types.includes('link'),
    frequencyEnabled: types.includes('frequency'),
    punishments: JSON.parse(row.punishments || '["notify"]'),
    specifiedGroups: row.specifiedGroups ? (typeof row.specifiedGroups === 'string' ? JSON.parse(row.specifiedGroups) : row.specifiedGroups) : [],
    specifiedTemplates: row.specifiedTemplates ? (typeof row.specifiedTemplates === 'string' ? JSON.parse(row.specifiedTemplates) : row.specifiedTemplates) : [],
  })
  showDialog.value = true
  fetchSelectors()
}

const toggleEnabled = async (row: any) => {
  try {
    await updateAntiSpamRule(row.id, { isEnabled: !row.isEnabled })
    row.isEnabled = !row.isEnabled
    ElMessage.success(row.isEnabled ? '已启用' : '已禁用')
  } catch { ElMessage.error('操作失败') }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除规则「${row.name}」？`, '删除确认', { type: 'warning' })
  try {
    await deleteAntiSpamRule(row.id)
    ElMessage.success('删除成功')
    fetchRules()
  } catch { ElMessage.error('删除失败') }
}

const handleSave = async () => {
  try { await formRef.value?.validate() } catch { return }
  const detectTypes: string[] = []
  if (form.keywordEnabled) detectTypes.push('keyword')
  if (form.linkEnabled) detectTypes.push('link')
  if (form.frequencyEnabled) detectTypes.push('frequency')

  saving.value = true
  try {
    const data = {
      name: form.name,
      scope: form.scope,
      detectTypes: JSON.stringify(detectTypes),
      punishments: JSON.stringify(form.punishments),
      keywords: form.keywords,
      keywordMode: form.keywordMode,
      linkMode: form.linkMode,
      linkWhitelist: form.linkWhitelist,
      freqMinutes: form.freqMinutes,
      freqMaxMsg: form.freqMaxMsg,
      exemptEmployee: form.exemptEmployee,
      exemptAdmin: form.exemptAdmin,
      specifiedGroups: form.scope === 'specified' ? JSON.stringify(form.specifiedGroups) : null,
      specifiedTemplates: form.scope === 'template' ? JSON.stringify(form.specifiedTemplates) : null,
      isEnabled: true
    }
    if (editing.value) {
      await updateAntiSpamRule(editing.value.id, data)
      ElMessage.success('规则已更新')
    } else {
      await createAntiSpamRule(data)
      ElMessage.success('规则已创建')
    }
    showDialog.value = false
    fetchRules()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally { saving.value = false }
}

onMounted(() => { fetchRules() })
</script>

<style scoped>
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.result-count { font-size: 13px; color: #9CA3AF; }
.type-tags { display: flex; flex-wrap: wrap; gap: 2px; }
.rule-sub { margin-top: 8px; margin-left: 0; }
.rule-sub.inline { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4B5563; }
.punishment-options { display: flex; flex-wrap: wrap; gap: 12px; }
</style>
