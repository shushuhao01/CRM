<template>
  <el-dialog
    v-model="visible"
    :title="`编辑${currentAgreement?.title || '协议'}`"
    width="65%"
    :close-on-click-modal="false"
    @close="handleClose"
    class="agreement-editor-dialog"
  >
    <div class="agreement-editor">
      <RichTextEditor
        v-model="editorContent"
        height="500px"
        :placeholder="`请输入${currentAgreement?.title}内容，支持富文本格式`"
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import RichTextEditor from '@/components/Common/RichTextEditor.vue'
import { ElMessage } from 'element-plus'

interface Agreement {
  id: number
  type: string
  title: string
  content: string
  wordCount: number
  summary: string
  updateTime: string
  enabled: boolean
}

const props = defineProps<{
  modelValue: boolean
  agreement: Agreement | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', content: string): void
}>()

const visible = ref(props.modelValue)
const currentAgreement = ref(props.agreement)
const editorContent = ref('')
const saving = ref(false)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(() => props.agreement, async (val) => {
  currentAgreement.value = val
  if (val && val.content) {
    // 直接使用HTML内容，wangEditor会自动渲染
    editorContent.value = val.content

    // 等待DOM更新
    await nextTick()
  } else {
    editorContent.value = ''
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleClose = () => {
  visible.value = false
}

const handleSave = () => {
  if (!editorContent.value.trim()) {
    ElMessage.warning('协议内容不能为空')
    return
  }

  // 直接保存HTML内容，保持格式
  emit('save', editorContent.value)
  handleClose()
}
</script>

<style scoped lang="scss">
.agreement-editor-dialog {
  :deep(.el-dialog__body) {
    padding: 20px 30px;
  }
}

.agreement-editor {
  padding: 10px 0;

  // 富文本编辑器内容样式优化
  :deep(.ql-editor) {
    font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
    font-size: 14px;
    line-height: 1.8;
    color: #333;

    h1 {
      font-size: 20px;
      font-weight: bold;
      color: #409eff;
      text-align: center;
      margin: 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #409eff;
    }

    h2 {
      font-size: 16px;
      font-weight: bold;
      color: #409eff;
      margin: 20px 0 10px;
      padding-left: 10px;
      border-left: 3px solid #409eff;
    }

    p {
      margin: 10px 0;
      text-indent: 2em;
    }

    strong {
      color: #409eff;
      font-weight: bold;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
