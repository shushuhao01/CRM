<template>
  <div class="group-template">
    <div class="tab-actions">
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>创建群模板</el-button>
      <div style="flex: 1" />
      <span class="result-count">共 {{ templates.length }} 个模板</span>
    </div>

    <!-- 说明提示 -->
    <el-alert type="info" :closable="true" style="margin-bottom: 16px" show-icon>
      <template #title>群模板为CRM本地管理功能，用于规范化建群流程。创建模板后，在添加客户到群时可选择模板快速创建标准化群聊。企业微信官方API不直接支持"群模板"概念，但CRM会在建群时自动应用模板中的配置。</template>
    </el-alert>

    <el-table :data="templates" stripe v-loading="loading">
      <el-table-column prop="templateName" label="模板名称" min-width="150">
        <template #default="{ row }">
          <span style="color: #1F2937">{{ row.templateName }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="groupNamePrefix" label="群名前缀" width="120" />
      <el-table-column prop="maxMembers" label="最大人数" width="100" align="center" />
      <el-table-column label="防骚扰" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.antiSpamEnabled ? 'success' : 'info'" size="small">{{ row.antiSpamEnabled ? '开' : '关' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="欢迎语" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.welcomeEnabled ? 'success' : 'info'" size="small">{{ row.welcomeEnabled ? '开' : '关' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="自动标签" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.autoTags" size="small">{{ parseAutoTag(row.autoTags) }}</el-tag>
          <span v-else style="color: #D1D5DB">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingTemplate ? '编辑群模板' : '创建群模板'" width="640px" destroy-on-close>
      <el-form :model="form" label-width="120px" ref="formRef" :rules="formRules">
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="form.templateName" placeholder="输入模板名称" maxlength="30" show-word-limit />
        </el-form-item>

        <el-divider content-position="left">基本设置</el-divider>
        <el-form-item label="群名前缀">
          <el-input v-model="form.groupNamePrefix" placeholder="如: VIP客户群" />
          <div class="form-tip">建群时自动命名：前缀-1、前缀-2...</div>
        </el-form-item>
        <el-form-item label="群人数上限">
          <el-input-number v-model="form.maxMembers" :min="10" :max="200" />
          <div class="form-tip">客户群上限为200人（非内部群），达上限后自动创建新群</div>
        </el-form-item>
        <el-form-item label="群主">
          <el-select v-model="form.ownerId" placeholder="选择群主" style="width: 100%" clearable>
            <el-option v-for="u in demoUsers" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">入群欢迎语</el-divider>
        <el-form-item label="启用欢迎语"><el-switch v-model="form.welcomeEnabled" /></el-form-item>
        <el-form-item v-if="form.welcomeEnabled" label="欢迎语内容">
          <el-input v-model="form.welcomeText" type="textarea" :rows="3" placeholder="支持变量：{客户昵称} {群名称}" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item v-if="form.welcomeEnabled" label="附件类型">
          <el-select v-model="form.welcomeMediaType" style="width: 150px">
            <el-option label="无附件" value="none" />
            <el-option label="图片" value="image" />
            <el-option label="链接" value="link" />
            <el-option label="小程序" value="miniprogram" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">防骚扰规则</el-divider>
        <el-form-item label="启用防骚扰"><el-switch v-model="form.antiSpamEnabled" /></el-form-item>
        <template v-if="form.antiSpamEnabled">
          <el-form-item label="防广告">
            <el-switch v-model="form.antiAd" />
            <el-input v-if="form.antiAd" v-model="form.antiAdKeywords" placeholder="关键词，逗号分隔" style="margin-left: 12px; width: 260px" />
          </el-form-item>
          <el-form-item label="防刷屏">
            <el-switch v-model="form.antiFlood" />
            <template v-if="form.antiFlood">
              <el-input-number v-model="form.floodMinutes" :min="1" :max="60" size="small" style="margin-left: 12px; width: 80px" />
              <span style="margin: 0 4px">分钟内超</span>
              <el-input-number v-model="form.floodMaxMsg" :min="3" :max="100" size="small" style="width: 80px" />
              <span>条</span>
            </template>
          </el-form-item>
          <el-form-item label="防外链">
            <el-switch v-model="form.antiLink" />
            <el-input v-if="form.antiLink" v-model="form.linkWhitelist" placeholder="白名单域名，逗号分隔" style="margin-left: 12px; width: 260px" />
          </el-form-item>
        </template>

        <el-divider content-position="left">群公告模板</el-divider>
        <el-form-item label="群公告">
          <el-input v-model="form.noticeTemplate" type="textarea" :rows="3" placeholder="群公告内容模板" />
        </el-form-item>

        <el-divider content-position="left">自动标签</el-divider>
        <el-form-item label="入群自动标签">
          <div style="display: flex; align-items: center; gap: 8px; width: 100%">
            <el-select v-model="form.autoTag" placeholder="选择标签" clearable style="width: 200px" :loading="tagsLoading">
              <el-option v-for="t in tagOptions" :key="t.tagId || t" :label="t.tagName || t" :value="t.tagName || t" />
            </el-select>
            <el-button size="small" type="primary" link @click="goToTagManagement">管理标签 →</el-button>
          </div>
          <div class="form-tip">标签来源于企业微信标签管理，如无标签请先到标签管理中创建</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getGroupTemplates, createGroupTemplate, updateGroupTemplate, deleteGroupTemplate, getWecomCorpTags } from '@/api/wecomGroup'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const editingTemplate = ref<any>(null)
const formRef = ref()
const tagsLoading = ref(false)

const demoUsers = [
  { id: 'wang01', name: '王销售' },
  { id: 'chen02', name: '陈经理' },
  { id: 'zhang03', name: '张客服' },
]
const tagOptions = ref<any[]>([])

const templates = ref<any[]>([])

const defaultForm = () => ({
  templateName: '', groupNamePrefix: '', maxMembers: 200, ownerId: '',
  welcomeEnabled: false, welcomeText: '', welcomeMediaType: 'none',
  antiSpamEnabled: false, antiAd: false, antiAdKeywords: '', antiFlood: false,
  floodMinutes: 5, floodMaxMsg: 10, antiLink: false, linkWhitelist: '',
  noticeTemplate: '', autoTag: ''
})

const form = reactive(defaultForm())
const formRules = { templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }] }

const parseAutoTag = (tags: string) => {
  try {
    const arr = JSON.parse(tags)
    return Array.isArray(arr) ? arr.join(', ') : tags
  } catch { return tags }
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    const res: any = await getGroupTemplates()
    templates.value = Array.isArray(res) ? res : (res?.list || [])
  } catch { templates.value = [] }
  finally { loading.value = false }
}

const fetchTags = async () => {
  tagsLoading.value = true
  try {
    const res: any = await getWecomCorpTags()
    const tags: any[] = []
    const tagGroups = Array.isArray(res) ? res : (res?.tagGroup || [])
    for (const group of tagGroups) {
      if (group.tag) tags.push(...group.tag)
    }
    tagOptions.value = tags.length > 0 ? tags : ['VIP客户', '意向客户', '潜在客户', '网站来源', '展会来源']
  } catch {
    tagOptions.value = ['VIP客户', '意向客户', '潜在客户', '网站来源', '展会来源']
  }
  finally { tagsLoading.value = false }
}

const goToTagManagement = () => {
  router.push('/wecom/customer?tab=tags').catch(() => {
    ElMessage.info('请前往 企微管理 > 客户管理 > 标签管理 创建标签')
  })
}

const openCreate = () => {
  editingTemplate.value = null
  Object.assign(form, defaultForm())
  showDialog.value = true
  fetchTags()
}

const handleEdit = (row: any) => {
  editingTemplate.value = row
  Object.assign(form, {
    templateName: row.templateName || '',
    groupNamePrefix: row.groupNamePrefix || '',
    maxMembers: row.maxMembers || 200,
    welcomeEnabled: row.welcomeEnabled || false,
    welcomeText: row.welcomeText || '',
    welcomeMediaType: row.welcomeMediaType || 'none',
    antiSpamEnabled: row.antiSpamEnabled || false,
    noticeTemplate: row.noticeTemplate || '',
    autoTag: row.autoTags || row.autoTag || '',
  })
  showDialog.value = true
  fetchTags()
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定要删除模板「${row.templateName}」？`, '删除确认', { type: 'warning' })
  try {
    await deleteGroupTemplate(row.id)
    ElMessage.success('删除成功')
    fetchTemplates()
  } catch { ElMessage.error('删除失败') }
}

const handleSave = async () => {
  try { await formRef.value?.validate() } catch { return }
  saving.value = true
  try {
    const data = {
      templateName: form.templateName,
      groupNamePrefix: form.groupNamePrefix,
      maxMembers: form.maxMembers,
      ownerUserId: form.ownerId,
      welcomeEnabled: form.welcomeEnabled,
      welcomeText: form.welcomeText,
      welcomeMediaType: form.welcomeMediaType,
      antiSpamEnabled: form.antiSpamEnabled,
      antiSpamRules: form.antiSpamEnabled ? JSON.stringify({
        antiAd: form.antiAd, antiAdKeywords: form.antiAdKeywords,
        antiFlood: form.antiFlood, floodMinutes: form.floodMinutes, floodMaxMsg: form.floodMaxMsg,
        antiLink: form.antiLink, linkWhitelist: form.linkWhitelist
      }) : null,
      noticeTemplate: form.noticeTemplate,
      autoTags: form.autoTag ? JSON.stringify([form.autoTag]) : null
    }
    if (editingTemplate.value) {
      await updateGroupTemplate(editingTemplate.value.id, data)
      ElMessage.success('编辑成功')
    } else {
      await createGroupTemplate(data)
      ElMessage.success('创建成功')
    }
    showDialog.value = false
    fetchTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally { saving.value = false }
}

onMounted(() => { fetchTemplates() })
</script>

<style scoped>
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.result-count { font-size: 13px; color: #9CA3AF; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
</style>
