<template>
  <div class="group-broadcast">
    <div class="tab-actions">
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>创建群发</el-button>
      <div style="flex: 1" />
      <span class="result-count">共 {{ broadcasts.length }} 条任务</span>
    </div>

    <el-alert type="info" :closable="true" style="margin-bottom: 16px" show-icon>
      <template #title>群发消息通过群主身份发送（企业微信API限制），支持多群同时发送。消息将以群主名义在群内发出，请确保群主账号已绑定企微。</template>
    </el-alert>

    <el-table :data="broadcasts" stripe v-loading="loading">
      <el-table-column label="任务名称" min-width="140">
        <template #default="{ row }">
          <span style="color: #1F2937">{{ row.taskName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发送目标" width="100">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.targetDesc || '全部群' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="内容类型" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.contentType || '文本' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发送状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目标/成功/失败" width="130">
        <template #default="{ row }">
          <span>{{ row.targetCount || 0 }}/</span>
          <span style="color: #10B981">{{ row.successCount || 0 }}</span>/
          <span style="color: #EF4444">{{ row.failCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'pending'" type="warning" link size="small" @click="handleCancel(row)">取消</el-button>
          <el-button v-if="row.status === 'draft'" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建群发弹窗 -->
    <el-dialog v-model="showDialog" :title="'创建群发'" width="680px" destroy-on-close>
      <el-form :model="form" label-width="100px" ref="formRef" :rules="formRules">
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="form.taskName" placeholder="输入任务名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="发送目标">
          <el-radio-group v-model="form.target">
            <el-radio label="all">全部群</el-radio>
            <el-radio label="specified">指定群</el-radio>
            <el-radio label="template">按群模板</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- 指定群选择器 -->
        <el-form-item v-if="form.target === 'specified'" label="选择群">
          <el-select v-model="form.specifiedGroups" multiple placeholder="选择群聊（支持多选）" style="width: 100%" :loading="groupsLoading" filterable>
            <el-option v-for="g in groupList" :key="g.id || g.chatId" :label="g.name || '未命名群'" :value="g.chatId || g.id">
              <span>{{ g.name || '未命名群' }}</span>
              <span style="color: #9CA3AF; font-size: 12px; margin-left: 8px">{{ g.memberCount || 0 }}人</span>
            </el-option>
          </el-select>
          <div class="form-tip">已选 {{ form.specifiedGroups.length }} 个群</div>
        </el-form-item>
        <!-- 群模板选择器 -->
        <el-form-item v-if="form.target === 'template'" label="选择模板">
          <el-select v-model="form.specifiedTemplates" multiple placeholder="选择群模板" style="width: 100%" :loading="templatesLoading" filterable>
            <el-option v-for="t in templateList" :key="t.id" :label="t.templateName" :value="t.id" />
          </el-select>
          <div class="form-tip">选择模板后，将向该模板下的所有群发送消息</div>
        </el-form-item>
        <el-form-item label="发送身份">
          <el-tag type="info">群主</el-tag>
          <span style="font-size: 12px; color: #9CA3AF; margin-left: 8px">企业微信API限制，群发消息以群主身份发送</span>
        </el-form-item>
        <el-form-item label="消息内容" prop="text">
          <el-input v-model="form.text" type="textarea" :rows="4" placeholder="输入群发内容" maxlength="2000" show-word-limit />
        </el-form-item>
        <el-form-item label="附件">
          <div class="attachment-bar">
            <el-upload
              :auto-upload="false"
              accept="image/*"
              :show-file-list="false"
              :on-change="(f: any) => addFileAttachment('image', f)"
            >
              <el-button size="small" plain>
                <el-icon style="margin-right: 4px"><Picture /></el-icon>图片
              </el-button>
            </el-upload>
            <el-upload
              :auto-upload="false"
              accept="video/*"
              :show-file-list="false"
              :on-change="(f: any) => addFileAttachment('video', f)"
            >
              <el-button size="small" plain>
                <el-icon style="margin-right: 4px"><VideoCamera /></el-icon>视频
              </el-button>
            </el-upload>
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              :on-change="(f: any) => addFileAttachment('file', f)"
            >
              <el-button size="small" plain>
                <el-icon style="margin-right: 4px"><Document /></el-icon>文件
              </el-button>
            </el-upload>
            <el-button size="small" plain @click="addLinkAttachment">
              <el-icon style="margin-right: 4px"><Link /></el-icon>链接
            </el-button>
          </div>
          <div v-if="form.attachments.length" class="attachment-list">
            <div v-for="(att, i) in form.attachments" :key="i" class="att-item">
              <el-tag size="small" :type="att.type === 'image' ? '' : att.type === 'link' ? 'success' : att.type === 'video' ? 'warning' : 'info'" closable @close="removeAttachment(i)">
                {{ att.type === 'image' ? '🖼️' : att.type === 'link' ? '🔗' : att.type === 'video' ? '🎬' : '📄' }}
                {{ att.fileName || att.linkTitle || (att.type + ' ' + (i + 1)) }}
              </el-tag>
            </div>
          </div>
          <!-- 链接编辑弹窗 -->
          <el-dialog v-model="showLinkDialog" title="添加链接附件" width="400px" append-to-body>
            <el-form label-width="80px">
              <el-form-item label="链接标题"><el-input v-model="linkForm.title" placeholder="链接标题" /></el-form-item>
              <el-form-item label="链接URL"><el-input v-model="linkForm.url" placeholder="https://..." /></el-form-item>
              <el-form-item label="链接描述"><el-input v-model="linkForm.desc" placeholder="可选" /></el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="showLinkDialog = false">取消</el-button>
              <el-button type="primary" @click="confirmLinkAttachment">确定</el-button>
            </template>
          </el-dialog>
          <div class="form-tip">最多添加9个附件。图片/视频/文件将上传到企业微信获取media_id后随消息发送。</div>
        </el-form-item>
        <el-form-item label="发送方式">
          <el-radio-group v-model="form.sendMode">
            <el-radio label="now">立即发送</el-radio>
            <el-radio label="scheduled">定时发送</el-radio>
          </el-radio-group>
          <el-date-picker
            v-if="form.sendMode === 'scheduled'"
            v-model="form.scheduledTime"
            type="datetime"
            placeholder="选择发送时间"
            style="margin-left: 12px"
            :disabled-date="(d: Date) => d.getTime() < Date.now() - 86400000"
          />
        </el-form-item>
      </el-form>

      <!-- 预览 -->
      <div class="preview-section">
        <div class="preview-title">📱 消息预览（以群主身份发送）</div>
        <div class="preview-bubble">
          <div class="bubble-text">{{ form.text || '(请输入内容)' }}</div>
          <div v-for="(att, i) in form.attachments" :key="i" class="bubble-att-item">
            <!-- 图片预览 -->
            <template v-if="att.type === 'image' && att.file">
              <div class="att-preview-img">
                <img :src="getFilePreviewUrl(att.file)" alt="图片预览" />
              </div>
            </template>
            <!-- 视频预览 -->
            <template v-else-if="att.type === 'video' && att.file">
              <div class="att-preview-video">
                <video :src="getFilePreviewUrl(att.file)" controls style="max-width: 200px; max-height: 120px; border-radius: 8px" />
              </div>
            </template>
            <!-- 链接预览 -->
            <template v-else-if="att.type === 'link'">
              <div class="att-preview-link">
                <div class="link-card">
                  <div class="link-title">🔗 {{ att.linkTitle || '链接' }}</div>
                  <div class="link-desc" v-if="att.linkDesc">{{ att.linkDesc }}</div>
                  <div class="link-url">{{ att.linkUrl }}</div>
                </div>
              </div>
            </template>
            <!-- 文件预览 -->
            <template v-else-if="att.type === 'file'">
              <div class="att-preview-file">📄 {{ att.fileName || '文件' }}</div>
            </template>
            <template v-else>
              <div class="att-preview-file">{{ att.type === 'image' ? '🖼️ [图片]' : att.type === 'video' ? '🎬 [视频]' : '📄 [文件]' }}</div>
            </template>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSend" :loading="sending">{{ form.sendMode === 'now' ? '立即发送' : '定时发送' }}</el-button>
      </template>
    </el-dialog>

    <!-- 群发详情抽屉 -->
    <el-drawer v-model="detailVisible" title="群发详情" size="560px">
      <template v-if="currentBroadcast">
        <div class="detail-stats">
          <div class="ds-item"><span class="ds-val">{{ currentBroadcast.createdAt }}</span><span class="ds-label">发送时间</span></div>
          <div class="ds-item"><span class="ds-val">{{ currentBroadcast.targetCount || 0 }}</span><span class="ds-label">目标群数</span></div>
          <div class="ds-item"><span class="ds-val text-success">{{ currentBroadcast.successCount || 0 }}</span><span class="ds-label">发送成功</span></div>
          <div class="ds-item"><span class="ds-val text-danger">{{ currentBroadcast.failCount || 0 }}</span><span class="ds-label">失败数</span></div>
        </div>
        <el-divider />
        <el-table :data="detailResults" size="small" stripe>
          <el-table-column prop="groupName" label="群名称" min-width="120" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status === 'success' ? '成功' : '失败' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sender" label="发送人(群主)" width="100" />
          <el-table-column prop="sendTime" label="发送时间" width="140" />
          <el-table-column prop="failReason" label="失败原因" min-width="100">
            <template #default="{ row }">
              <span style="color: #EF4444">{{ row.failReason || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Picture, VideoCamera, Document, Link } from '@element-plus/icons-vue'
import { getGroupBroadcasts, createGroupBroadcast, cancelGroupBroadcast, deleteGroupBroadcast, getGroupBroadcastDetail, getWecomCustomerGroups, getGroupTemplates } from '@/api/wecomGroup'

const loading = ref(false)
const sending = ref(false)
const showDialog = ref(false)
const detailVisible = ref(false)
const currentBroadcast = ref<any>(null)
const formRef = ref()
const groupsLoading = ref(false)
const templatesLoading = ref(false)
const groupList = ref<any[]>([])
const templateList = ref<any[]>([])

const broadcasts = ref<any[]>([])
const detailResults = ref<any[]>([])

const statusType = (s: string) => {
  const map: Record<string, string> = { sent: 'success', pending: 'warning', failed: 'danger', cancelled: 'info', draft: '' }
  return map[s] || ''
}
const statusText = (s: string) => {
  const map: Record<string, string> = { sent: '已发送', pending: '待发送', failed: '失败', cancelled: '已取消', draft: '草稿' }
  return map[s] || s
}

const defaultForm = () => ({
  taskName: '', target: 'all' as string, text: '',
  attachments: [] as { type: string; file?: File; fileName?: string; linkTitle?: string; linkUrl?: string; linkDesc?: string }[],
  sendMode: 'now' as string, scheduledTime: '',
  specifiedGroups: [] as string[],
  specifiedTemplates: [] as number[]
})

const form = reactive(defaultForm())
const showLinkDialog = ref(false)
const linkForm = reactive({ title: '', url: '', desc: '' })
const formRules = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  text: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const fetchList = async () => {
  loading.value = true
  try {
    const res: any = await getGroupBroadcasts()
    broadcasts.value = Array.isArray(res) ? res : (res?.list || [])
  } catch { broadcasts.value = [] }
  finally { loading.value = false }
}

const fetchSelectors = async () => {
  groupsLoading.value = true
  templatesLoading.value = true
  try {
    const [gRes, tRes]: any[] = await Promise.all([
      getWecomCustomerGroups({ pageSize: 500 }),
      getGroupTemplates()
    ])
    groupList.value = gRes?.list || (Array.isArray(gRes) ? gRes : [])
    templateList.value = Array.isArray(tRes) ? tRes : (tRes?.list || [])
  } catch { /* ignore */ }
  finally { groupsLoading.value = false; templatesLoading.value = false }
}

const openCreate = () => {
  Object.assign(form, defaultForm())
  showDialog.value = true
  fetchSelectors()
}

const addFileAttachment = (type: string, file: any) => {
  if (form.attachments.length >= 9) { ElMessage.warning('最多9个附件'); return }
  form.attachments.push({ type, file: file.raw, fileName: file.name })
}

const addLinkAttachment = () => {
  if (form.attachments.length >= 9) { ElMessage.warning('最多9个附件'); return }
  linkForm.title = ''; linkForm.url = ''; linkForm.desc = ''
  showLinkDialog.value = true
}

const confirmLinkAttachment = () => {
  if (!linkForm.url) { ElMessage.warning('请输入链接URL'); return }
  form.attachments.push({ type: 'link', linkTitle: linkForm.title, linkUrl: linkForm.url, linkDesc: linkForm.desc })
  showLinkDialog.value = false
}

const removeAttachment = (index: number) => {
  form.attachments.splice(index, 1)
}

/** 生成本地文件预览URL */
const getFilePreviewUrl = (file: File) => {
  return URL.createObjectURL(file)
}

const showDetail = async (row: any) => {
  currentBroadcast.value = row
  detailVisible.value = true
  try {
    const res: any = await getGroupBroadcastDetail(row.id)
    detailResults.value = res?.results || res?.detailResults || []
  } catch { detailResults.value = [] }
}

const handleCancel = async (row: any) => {
  await ElMessageBox.confirm('确定取消此群发任务？', '取消确认', { type: 'warning' })
  try {
    await cancelGroupBroadcast(row.id)
    row.status = 'cancelled'
    ElMessage.success('已取消')
  } catch { ElMessage.error('取消失败') }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定删除此草稿？', '删除确认', { type: 'warning' })
  try {
    await deleteGroupBroadcast(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch { ElMessage.error('删除失败') }
}

const handleSend = async () => {
  try { await formRef.value?.validate() } catch { return }
  sending.value = true
  try {
    const formData = new FormData()
    formData.append('taskName', form.taskName)
    formData.append('target', form.target)
    formData.append('text', form.text)
    formData.append('sendMode', form.sendMode)
    if (form.scheduledTime) formData.append('scheduledTime', form.scheduledTime)
    if (form.target === 'specified') formData.append('specifiedGroups', JSON.stringify(form.specifiedGroups))
    if (form.target === 'template') formData.append('specifiedTemplates', JSON.stringify(form.specifiedTemplates))

    // 附件元数据（不含file对象）
    const attachmentsMeta = form.attachments.map((att, i) => ({
      type: att.type,
      fileName: att.fileName,
      linkTitle: att.linkTitle,
      linkUrl: att.linkUrl,
      linkDesc: att.linkDesc,
      fileIndex: att.file ? i : undefined
    }))
    formData.append('attachments', JSON.stringify(attachmentsMeta))

    // 附件文件
    form.attachments.forEach((att, i) => {
      if (att.file) {
        formData.append(`attachmentFile_${i}`, att.file)
      }
    })

    await createGroupBroadcast(formData)
    ElMessage.success(form.sendMode === 'now' ? '群发已发送到企业微信' : '定时群发已创建')
    showDialog.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '发送失败')
  } finally { sending.value = false }
}

onMounted(() => { fetchList() })
</script>

<style scoped>
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.result-count { font-size: 13px; color: #9CA3AF; }
.attachment-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.attachment-bar .el-upload { display: inline-flex; }
.attachment-list { display: flex; gap: 6px; flex-wrap: wrap; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.preview-section { margin-top: 16px; padding: 16px; background: #F9FAFB; border-radius: 12px; }
.preview-title { font-size: 13px; font-weight: 600; color: #4B5563; margin-bottom: 8px; }
.preview-bubble { background: #E8F5E9; border-radius: 0 12px 12px 12px; padding: 12px 16px; max-width: 360px; }
.bubble-text { font-size: 14px; color: #1F2937; line-height: 1.6; white-space: pre-wrap; }
.bubble-att-item { margin-top: 8px; }
.att-preview-img img { max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover; cursor: pointer; }
.att-preview-video { margin-top: 4px; }
.att-preview-file { font-size: 13px; color: #4B5563; padding: 6px 10px; background: #fff; border-radius: 6px; border: 1px solid #E5E7EB; display: inline-block; }
.att-preview-link .link-card { padding: 8px 10px; background: #fff; border-radius: 6px; border: 1px solid #E5E7EB; max-width: 240px; }
.link-title { font-size: 13px; font-weight: 600; color: #1F2937; }
.link-desc { font-size: 12px; color: #6B7280; margin-top: 2px; }
.link-url { font-size: 11px; color: #9CA3AF; margin-top: 4px; word-break: break-all; }
.detail-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.ds-item { text-align: center; padding: 12px; }
.ds-val { font-size: 18px; font-weight: 700; color: #1F2937; display: block; }
.ds-label { font-size: 12px; color: #9CA3AF; }
.text-success { color: #10B981; }
.text-danger { color: #EF4444; }
</style>
