<template>
  <div class="agreement-section">
    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <template #title>
        在此编辑用户协议和隐私政策，保存后开启「启用状态」中的「用户协议覆盖」即可统一下发到所有 CRM 客户端。
      </template>
    </el-alert>
    <el-table :data="agreementList" border stripe class="agreement-table">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="title" label="协议标题" width="180">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon v-if="row.type === 'user'" color="#409EFF"><Document /></el-icon>
            <el-icon v-else color="#67C23A"><Lock /></el-icon>
            <span style="font-weight:500">{{ row.title }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.type === 'user' ? 'primary' : 'success'" size="small" effect="light">
            {{ row.type === 'user' ? '使用协议' : '隐私协议' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="wordCount" label="字数" width="100" align="center">
        <template #default="{ row }">
          <span style="color:#909399">{{ row.wordCount }} 字</span>
        </template>
      </el-table-column>
      <el-table-column label="内容概述" min-width="240">
        <template #default="{ row }">
          <div style="color:#909399;font-size:13px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">{{ row.summary }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="170" align="center">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;color:#909399;font-size:13px">
            <el-icon><Clock /></el-icon>
            <span>{{ row.updateTime }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="70" align="center">
        <template #default="{ row }">
          <el-switch v-model="row.enabled" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openEditor(row)" round>
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button type="info" size="small" @click="openPreview(row)" round>
            <el-icon><View /></el-icon> 预览
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div style="margin-top:20px;display:flex;justify-content:flex-end">
      <el-button type="primary" @click="$emit('save-agreements')" :loading="saving" round>
        <el-icon><Check /></el-icon> 保存协议并同步
      </el-button>
    </div>

    <!-- 协议富文本编辑弹窗 -->
    <el-dialog
      v-model="editorVisible"
      :title="`编辑「${editingItem?.title || '协议'}」`"
      width="70%" top="4vh" :close-on-click-modal="false" destroy-on-close
      class="agreement-editor-dialog"
    >
      <el-alert type="info" :closable="false" style="margin-bottom:16px">
        <template #title>
          使用富文本编辑器编辑协议内容，支持标题、段落、列表、加粗等格式排版。保存后协议将下发到所有 CRM 客户端。
        </template>
      </el-alert>
      <div class="editor-wrapper">
        <RichTextEditor
          v-model="editorContent"
          height="500px"
          :placeholder="`请输入${editingItem?.title || '协议'}内容，支持富文本格式...`"
        />
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <el-button @click="editorVisible = false" round>取消</el-button>
          <el-button type="primary" @click="saveContent" round>
            <el-icon><Check /></el-icon> 保存协议内容
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 协议预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewItem?.title || '协议预览'"
      width="65%" top="5vh" class="agreement-preview-dialog"
    >
      <div class="agreement-preview-body" v-html="previewItem?.content || '<p>暂无内容</p>'"></div>
      <template #footer>
        <el-button type="primary" @click="previewVisible = false" round>关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Lock, Clock, Edit, View, Check } from '@element-plus/icons-vue'
import RichTextEditor from '@/components/RichTextEditor.vue'

export interface AgreementItem {
  id: number
  type: 'user' | 'privacy'
  title: string
  content: string
  wordCount: number
  summary: string
  updateTime: string
  enabled: boolean
}

defineProps<{
  agreementList: AgreementItem[]
  saving: boolean
}>()

const emit = defineEmits<{
  'save-agreements': []
  'update-agreement': [item: AgreementItem]
}>()

const editorVisible = ref(false)
const previewVisible = ref(false)
const editingItem = ref<AgreementItem | null>(null)
const previewItem = ref<AgreementItem | null>(null)
const editorContent = ref('')

const stripHtml = (html: string): string => {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
const countWords = (html: string): number => stripHtml(html).replace(/\s/g, '').length
const generateSummary = (html: string): string => {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim()
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

const openEditor = (item: AgreementItem) => {
  editingItem.value = item
  editorContent.value = item.content || ''
  editorVisible.value = true
}

const saveContent = () => {
  if (!editingItem.value) return
  if (!editorContent.value.trim() || editorContent.value === '<p><br></p>') {
    ElMessage.warning('协议内容不能为空')
    return
  }
  const item = editingItem.value
  item.content = editorContent.value
  item.wordCount = countWords(editorContent.value)
  item.summary = generateSummary(editorContent.value)
  item.updateTime = new Date().toLocaleString('zh-CN')
  editorVisible.value = false
  ElMessage.success(`「${item.title}」内容已更新`)
  emit('update-agreement', item)
}

const openPreview = (item: AgreementItem) => {
  if (!item.content) { ElMessage.warning('该协议暂未编辑内容'); return }
  previewItem.value = item
  previewVisible.value = true
}
</script>

<style scoped lang="scss">
.agreement-section {
  .agreement-table { border-radius: 8px; overflow: hidden; }
}
.agreement-preview-dialog {
  :deep(.el-dialog) { border-radius: 12px; overflow: hidden; }
  :deep(.el-dialog__header) { padding: 18px 24px; border-bottom: 1px solid #f0f0f0; background: linear-gradient(135deg, #fafbfc 0%, #f0f2ff 100%); }
  :deep(.el-dialog__body) { padding: 0; max-height: 65vh; overflow-y: auto; }
  :deep(.el-dialog__footer) { border-top: 1px solid #f0f0f0; padding: 14px 24px; background: #fafbfc; }
}
.agreement-preview-body { padding: 28px 32px; line-height: 2; font-size: 14px; color: #4a5568; }
.agreement-editor-dialog {
  :deep(.el-dialog) { border-radius: 12px; }
  :deep(.el-dialog__header) { border-bottom: 1px solid #f0f0f0; }
}
</style>

