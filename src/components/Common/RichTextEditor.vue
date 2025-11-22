<template>
  <div class="rich-text-editor">
    <Toolbar
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      :mode="mode"
      class="editor-toolbar"
    />
    <Editor
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      :mode="mode"
      @onCreated="handleCreated"
      @onChange="handleChange"
      class="editor-content"
      :style="{ height: height }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onBeforeUnmount, watch } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

interface Props {
  modelValue: string
  height?: string
  placeholder?: string
  mode?: 'default' | 'simple'
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  placeholder: '请输入内容...',
  mode: 'default'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// 编辑器实例
const editorRef = shallowRef()

// 内容 HTML
const valueHtml = ref(props.modelValue)

// 工具栏配置
const toolbarConfig = {
  excludeKeys: [
    'group-video', // 排除视频
    'insertImage', // 排除图片上传
    'uploadImage'
  ]
}

// 编辑器配置
const editorConfig = {
  placeholder: props.placeholder,
  MENU_CONF: {}
}

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})

// 编辑器创建完成
const handleCreated = (editor: any) => {
  editorRef.value = editor
}

// 内容变化
const handleChange = (editor: unknown) => {
  emit('update:modelValue', valueHtml.value)
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal !== valueHtml.value) {
    valueHtml.value = newVal
  }
})
</script>

<style scoped lang="scss">
.rich-text-editor {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;

  .editor-toolbar {
    border-bottom: 1px solid #e8e8e8;
    background-color: #fafafa;
  }

  .editor-content {
    overflow-y: auto;
    background-color: #fff;

    :deep(.w-e-text-container) {
      background-color: #fff;
      padding: 20px;
    }

    :deep(.w-e-text-placeholder) {
      color: #999;
      font-style: normal;
    }

    /* 🔥 批次282：富文本编辑器内容样式 - 与登录页面协议样式一致 */

    /* 一级标题 */
    :deep(h2) {
      margin: 0 0 24px 0;
      padding-bottom: 16px;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      border-bottom: 3px solid #667eea;
      letter-spacing: 1px;
      text-align: center;
    }

    /* 二级标题 */
    :deep(h3) {
      margin: 32px 0 16px 0;
      padding-left: 16px;
      font-size: 18px;
      font-weight: 600;
      color: #667eea;
      border-left: 4px solid #667eea;
      background: linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, transparent 100%);
      padding: 10px 16px;
      border-radius: 4px;
    }

    /* 段落 */
    :deep(p) {
      margin: 16px 0;
      padding: 0 8px;
      color: #4a5568;
      line-height: 2;
      text-align: justify;
      text-indent: 2em;
    }

    /* 加粗文字 */
    :deep(strong) {
      color: #2d3748;
      font-weight: 600;
    }

    /* 列表 */
    :deep(ul) {
      margin: 16px 0;
      padding-left: 40px;
      list-style: none;
    }

    :deep(ul li) {
      margin: 12px 0;
      padding-left: 24px;
      color: #4a5568;
      position: relative;
      line-height: 1.8;
    }

    :deep(ul li)::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
      font-size: 16px;
    }

    /* 有序列表 */
    :deep(ol) {
      margin: 16px 0;
      padding-left: 40px;
      color: #4a5568;
    }

    :deep(ol li) {
      margin: 12px 0;
      line-height: 1.8;
    }

    /* 重要提示样式 */
    :deep(p[style*="color: rgb(245, 108, 108)"]),
    :deep(p[style*="color:#f56c6c"]) {
      background: linear-gradient(90deg, rgba(245, 108, 108, 0.1) 0%, transparent 100%);
      padding: 12px 16px;
      border-left: 4px solid #f56c6c;
      border-radius: 4px;
      margin: 20px 0;
      text-indent: 0;
    }

    /* 底部信息样式 */
    :deep(p[style*="color: rgb(144, 147, 153)"]),
    :deep(p[style*="color:#909399"]) {
      text-align: center;
      font-size: 12px;
      color: #909399;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px dashed #e0e0e0;
      text-indent: 0;
    }
  }
}
</style>
