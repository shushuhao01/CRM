<template>
  <div class="group-welcome">
    <div class="tab-actions">
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>创建欢迎语</el-button>
      <div style="flex: 1" />
      <span class="result-count">共 {{ welcomeTemplates.length }} 条欢迎语</span>
    </div>

    <el-alert type="info" :closable="true" style="margin-bottom: 16px" show-icon>
      <template #title>入群欢迎语通过企业微信API（externalcontact/group_welcome_template）同步生效。创建后将自动同步到企业微信，新成员入群时由企业微信自动发送。</template>
    </el-alert>

    <el-table :data="welcomeTemplates" stripe v-loading="loading">
      <el-table-column label="欢迎语名称" min-width="150">
        <template #default="{ row }">
          <span style="color: #1F2937">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="适用群" min-width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.scope === 'all' ? '' : 'info'">{{ row.scope === 'all' ? '全部群' : row.scope === 'template' ? '按群模板' : '指定群' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="消息类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ mediaTypeText(row.mediaType) }}</el-tag>
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
          <el-button type="info" link size="small" @click="handlePreview(row)">预览</el-button>
          <el-button :type="row.isEnabled ? 'warning' : 'success'" link size="small" @click="toggleEnabled(row)">
            {{ row.isEnabled ? '停用' : '启用' }}
          </el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editing ? '编辑欢迎语' : '创建欢迎语'" width="640px" destroy-on-close>
      <el-form :model="form" label-width="100px" ref="formRef" :rules="formRules">
        <el-form-item label="欢迎语名称" prop="name">
          <el-input v-model="form.name" placeholder="输入名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="适用范围">
          <el-radio-group v-model="form.scope">
            <el-radio label="all">所有群</el-radio>
            <el-radio label="specified">指定群</el-radio>
            <el-radio label="template">按群模板</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- 指定群选择器 -->
        <el-form-item v-if="form.scope === 'specified'" label="选择群">
          <el-select v-model="form.specifiedGroups" multiple placeholder="选择群聊" style="width: 100%" :loading="groupsLoading" filterable>
            <el-option v-for="g in groupList" :key="g.id || g.chatId" :label="g.name || '未命名群'" :value="g.chatId || g.id" />
          </el-select>
        </el-form-item>
        <!-- 群模板选择器 -->
        <el-form-item v-if="form.scope === 'template'" label="选择模板">
          <el-select v-model="form.specifiedTemplates" multiple placeholder="选择群模板" style="width: 100%" :loading="templatesLoading" filterable>
            <el-option v-for="t in templateList" :key="t.id" :label="t.templateName" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="文本内容" prop="text">
          <el-input v-model="form.text" type="textarea" :rows="4" placeholder="输入欢迎语内容" maxlength="500" show-word-limit />
          <div class="var-tips">
            支持变量：
            <el-tag size="small" @click="insertVar('{客户昵称}')" style="cursor:pointer">{客户昵称}</el-tag>
            <el-tag size="small" @click="insertVar('{群名称}')" style="cursor:pointer">{群名称}</el-tag>
            <el-tag size="small" @click="insertVar('{群主名称}')" style="cursor:pointer">{群主名称}</el-tag>
            <el-tag size="small" @click="insertVar('{当前时间}')" style="cursor:pointer">{当前时间}</el-tag>
          </div>
        </el-form-item>
        <el-form-item label="附件">
          <el-radio-group v-model="form.mediaType">
            <el-radio label="none">无附件</el-radio>
            <el-radio label="image">图片</el-radio>
            <el-radio label="link">链接</el-radio>
            <el-radio label="miniprogram">小程序</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.mediaType === 'image'">
          <el-form-item label="上传图片">
            <el-upload
              :auto-upload="false"
              :limit="1"
              accept="image/*"
              :on-change="handleImageChange"
              :file-list="imageFileList"
              list-type="picture-card"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <div class="form-tip">支持 JPG/PNG，大小不超过2MB。图片将上传到企业微信获取media_id后同步到欢迎语模板。</div>
          </el-form-item>
        </template>
        <template v-if="form.mediaType === 'link'">
          <el-form-item label="链接标题"><el-input v-model="form.linkTitle" placeholder="链接标题" /></el-form-item>
          <el-form-item label="链接URL"><el-input v-model="form.linkUrl" placeholder="https://..." /></el-form-item>
          <el-form-item label="链接描述"><el-input v-model="form.linkDesc" placeholder="链接描述（可选）" /></el-form-item>
          <el-form-item label="链接封面">
            <el-upload
              :auto-upload="false"
              :limit="1"
              accept="image/*"
              :on-change="handleLinkPicChange"
              :file-list="linkPicFileList"
              list-type="picture-card"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <div class="form-tip">链接封面图，可选</div>
          </el-form-item>
        </template>
        <template v-if="form.mediaType === 'miniprogram'">
          <el-form-item label="小程序AppId"><el-input v-model="form.miniprogramAppid" placeholder="小程序AppId" /></el-form-item>
          <el-form-item label="小程序页面"><el-input v-model="form.miniprogramPage" placeholder="pages/index/index" /></el-form-item>
          <el-form-item label="小程序标题"><el-input v-model="form.miniprogramTitle" placeholder="小程序卡片标题" /></el-form-item>
          <el-form-item label="小程序封面">
            <el-upload
              :auto-upload="false"
              :limit="1"
              accept="image/*"
              :on-change="handleMiniPicChange"
              :file-list="miniPicFileList"
              list-type="picture-card"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>
        </template>
        <el-alert v-if="form.mediaType !== 'none'" type="info" :closable="false" style="margin-bottom: 12px" show-icon>
          <template #title>附件（图片/链接封面/小程序封面）保存时会自动上传到企业微信获取media_id，并同步配置到入群欢迎语模板。</template>
        </el-alert>
      </el-form>

      <!-- 预览区 -->
      <div class="preview-section">
        <div class="preview-title">预览</div>
        <div class="preview-bubble">
          <div class="bubble-text">{{ previewText }}</div>
          <div v-if="form.mediaType === 'link'" class="bubble-link">🔗 {{ form.linkTitle || '链接' }}</div>
          <div v-if="form.mediaType === 'image'" class="bubble-image">🖼️ [图片附件]</div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存并同步到企微</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="欢迎语预览" width="400px">
      <div class="preview-bubble large">
        <div class="bubble-text">{{ previewRow?.text || '' }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getGroupWelcomes, createGroupWelcome, updateGroupWelcome, deleteGroupWelcome, getWecomCustomerGroups, getGroupTemplates } from '@/api/wecomGroup'

const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const previewVisible = ref(false)
const previewRow = ref<any>(null)
const editing = ref<any>(null)
const formRef = ref()
const groupsLoading = ref(false)
const templatesLoading = ref(false)
const groupList = ref<any[]>([])
const templateList = ref<any[]>([])

const welcomeTemplates = ref<any[]>([])

const defaultForm = () => ({
  name: '', scope: 'all' as string, text: '', mediaType: 'none' as string,
  linkTitle: '', linkUrl: '', linkDesc: '',
  miniprogramAppid: '', miniprogramPage: '', miniprogramTitle: '',
  specifiedGroups: [] as string[],
  specifiedTemplates: [] as number[]
})

const form = reactive(defaultForm())
const imageFileList = ref<any[]>([])
const linkPicFileList = ref<any[]>([])
const miniPicFileList = ref<any[]>([])
const imageFile = ref<File | null>(null)
const linkPicFile = ref<File | null>(null)
const miniPicFile = ref<File | null>(null)

const handleImageChange = (file: any) => { imageFile.value = file.raw; imageFileList.value = [file] }
const handleLinkPicChange = (file: any) => { linkPicFile.value = file.raw; linkPicFileList.value = [file] }
const handleMiniPicChange = (file: any) => { miniPicFile.value = file.raw; miniPicFileList.value = [file] }

const formRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  text: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const mediaTypeText = (t: string) => {
  const map: Record<string, string> = { none: '纯文本', image: '图片', link: '链接', miniprogram: '小程序' }
  return map[t] || '文本'
}

const previewText = computed(() => {
  return (form.text || '')
    .replace(/{客户昵称}/g, '张先生')
    .replace(/{群名称}/g, 'VIP客户群-1')
    .replace(/{群主名称}/g, '王销售')
    .replace(/{当前时间}/g, new Date().toLocaleString())
})

const insertVar = (v: string) => { form.text += v }

const fetchList = async () => {
  loading.value = true
  try {
    const res: any = await getGroupWelcomes()
    welcomeTemplates.value = Array.isArray(res) ? res : (res?.list || [])
  } catch { welcomeTemplates.value = [] }
  finally { loading.value = false }
}

const fetchGroups = async () => {
  groupsLoading.value = true
  try {
    const res: any = await getWecomCustomerGroups({ pageSize: 500 })
    groupList.value = res?.list || (Array.isArray(res) ? res : [])
  } catch { groupList.value = [] }
  finally { groupsLoading.value = false }
}

const fetchTemplates = async () => {
  templatesLoading.value = true
  try {
    const res: any = await getGroupTemplates()
    templateList.value = Array.isArray(res) ? res : (res?.list || [])
  } catch { templateList.value = [] }
  finally { templatesLoading.value = false }
}

const openCreate = () => {
  editing.value = null
  Object.assign(form, defaultForm())
  imageFileList.value = []; linkPicFileList.value = []; miniPicFileList.value = []
  imageFile.value = null; linkPicFile.value = null; miniPicFile.value = null
  showDialog.value = true
  fetchGroups()
  fetchTemplates()
}

const handleEdit = (row: any) => {
  editing.value = row
  Object.assign(form, {
    name: row.name, scope: row.scope, text: row.text,
    mediaType: row.mediaType || 'none',
    linkTitle: row.linkTitle || '', linkUrl: row.linkUrl || '',
    specifiedGroups: row.specifiedGroups ? (typeof row.specifiedGroups === 'string' ? JSON.parse(row.specifiedGroups) : row.specifiedGroups) : [],
    specifiedTemplates: row.specifiedTemplates ? (typeof row.specifiedTemplates === 'string' ? JSON.parse(row.specifiedTemplates) : row.specifiedTemplates) : []
  })
  showDialog.value = true
  fetchGroups()
  fetchTemplates()
}

const handlePreview = (row: any) => { previewRow.value = row; previewVisible.value = true }

const toggleEnabled = async (row: any) => {
  try {
    await updateGroupWelcome(row.id, { isEnabled: !row.isEnabled })
    row.isEnabled = !row.isEnabled
    ElMessage.success(row.isEnabled ? '已启用' : '已停用')
  } catch { ElMessage.error('操作失败') }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除欢迎语「${row.name}」？`, '删除确认', { type: 'warning' })
  try {
    await deleteGroupWelcome(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { ElMessage.error('删除失败') }
}

const handleSave = async () => {
  try { await formRef.value?.validate() } catch { return }
  saving.value = true
  try {
    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('scope', form.scope)
    formData.append('text', form.text)
    formData.append('mediaType', form.mediaType)
    formData.append('linkTitle', form.linkTitle || '')
    formData.append('linkUrl', form.linkUrl || '')
    formData.append('linkDesc', form.linkDesc || '')
    formData.append('miniprogramAppid', form.miniprogramAppid || '')
    formData.append('miniprogramPage', form.miniprogramPage || '')
    formData.append('miniprogramTitle', form.miniprogramTitle || '')
    formData.append('specifiedGroups', form.scope === 'specified' ? JSON.stringify(form.specifiedGroups) : '')
    formData.append('specifiedTemplates', form.scope === 'template' ? JSON.stringify(form.specifiedTemplates) : '')
    formData.append('isEnabled', 'true')

    // 附件图片
    if (form.mediaType === 'image' && imageFile.value) {
      formData.append('mediaFile', imageFile.value)
    }
    if (form.mediaType === 'link' && linkPicFile.value) {
      formData.append('mediaFile', linkPicFile.value)
    }
    if (form.mediaType === 'miniprogram' && miniPicFile.value) {
      formData.append('mediaFile', miniPicFile.value)
    }

    if (editing.value) {
      await updateGroupWelcome(editing.value.id, formData)
      ElMessage.success('编辑成功，已同步企业微信')
    } else {
      await createGroupWelcome(formData)
      ElMessage.success('创建成功，已同步企业微信')
    }
    showDialog.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally { saving.value = false }
}

onMounted(() => { fetchList() })
</script>

<style scoped>
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.result-count { font-size: 13px; color: #9CA3AF; }
.var-tips { margin-top: 8px; display: flex; gap: 6px; align-items: center; font-size: 12px; color: #9CA3AF; flex-wrap: wrap; }
.preview-section { margin-top: 16px; padding: 16px; background: #F9FAFB; border-radius: 12px; }
.preview-title { font-size: 13px; font-weight: 600; color: #4B5563; margin-bottom: 8px; }
.preview-bubble { background: #E8F5E9; border-radius: 0 12px 12px 12px; padding: 12px 16px; max-width: 320px; }
.preview-bubble.large { max-width: 100%; }
.bubble-text { font-size: 14px; color: #1F2937; line-height: 1.6; white-space: pre-wrap; }
.bubble-link { margin-top: 8px; font-size: 12px; color: #4C6EF5; }
.bubble-image { margin-top: 8px; font-size: 12px; color: #6B7280; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
</style>
