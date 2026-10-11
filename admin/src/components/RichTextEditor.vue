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
      :style="{ height }"
    />
    <MediaPicker v-model="pickerVisible" @select="handlePickMedia" />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onBeforeUnmount, watch } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { Boot } from '@wangeditor/editor'
import type { IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { ElMessage } from 'element-plus'
import { siteApi } from '@/api/site'
import MediaPicker from './MediaPicker.vue'

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

const editorRef = shallowRef()
const valueHtml = ref(props.modelValue)

// ==================== 素材库（自定义工具栏菜单） ====================
// 桥接：编辑器实例 → 打开素材库对话框
const openMediaPickerMap = new WeakMap<object, () => void>()

let mediaMenuRegistered = false
/** 注册「素材库」自定义菜单（全局仅需注册一次） */
function ensureMediaMenu() {
  if (mediaMenuRegistered) return
  mediaMenuRegistered = true
  Boot.registerMenu({
    key: 'siteMedia',
    factory: () => ({
      title: '素材库',
      tag: 'button',
      iconSvg:
        '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"><path fill="currentColor" d="M912 192H112a48 48 0 0 0-48 48v544a48 48 0 0 0 48 48h800a48 48 0 0 0 48-48V240a48 48 0 0 0-48-48z m-16 576H128V256h768v512z"/><path fill="currentColor" d="M368 512a64 64 0 1 0 0-128 64 64 0 0 0 0 128z"/><path fill="currentColor" d="M800 400 624 576l-96-96-224 224h432l64-64V400z"/></svg>',
      getValue: () => '',
      isActive: () => false,
      isDisabled: () => false,
      exec: (editor: any) => {
        const open = openMediaPickerMap.get(editor)
        if (open) open()
      }
    })
  })
}
ensureMediaMenu()

const pickerVisible = ref(false)

/** 本地上传图片：走官网媒体库接口 */
async function customUploadImage(
  file: File,
  insertFn: (url: string, alt: string, href: string) => void
) {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await siteApi.uploadSiteImage(fd)
    const url = res.data?.path
    if (url) {
      insertFn(url, file.name, '')
    } else {
      ElMessage.error('图片上传失败')
    }
  } catch {
    // 拦截器已提示
  }
}

// 工具栏配置（启用本地图片上传 + 素材库选择）
const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['group-video', 'group-image'],
  insertKeys: { index: 22, keys: ['uploadImage', 'siteMedia'] }
}

// 编辑器配置
const editorConfig = {
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      customUpload: customUploadImage
    }
  }
}

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})

const handleCreated = (editor: any) => {
  editorRef.value = editor
  openMediaPickerMap.set(editor, () => {
    pickerVisible.value = true
  })
}

const handleChange = () => {
  emit('update:modelValue', valueHtml.value)
}

/** 从素材库选中图片后插入编辑器 */
function handlePickMedia(url: string) {
  const editor = editorRef.value
  if (!editor || !url) return
  editor.dangerouslyInsertHtml(`<img src="${url}" alt="" />`)
  editor.focus()
}

watch(() => props.modelValue, (newVal) => {
  if (newVal !== valueHtml.value) {
    valueHtml.value = newVal
  }
})
</script>

<style scoped lang="scss">
.rich-text-editor {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
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

    /* 加粗 */
    :deep(strong) {
      color: #2d3748;
      font-weight: 600;
    }

    /* 无序列表 */
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

    /* 重要提示 */
    :deep(p[style*="color: rgb(245, 108, 108)"]),
    :deep(p[style*="color:#f56c6c"]) {
      background: linear-gradient(90deg, rgba(245, 108, 108, 0.1) 0%, transparent 100%);
      padding: 12px 16px;
      border-left: 4px solid #f56c6c;
      border-radius: 4px;
      margin: 20px 0;
      text-indent: 0;
    }

    /* 底部信息 */
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

