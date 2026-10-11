<template>
  <el-dialog
    :model-value="modelValue"
    title="从素材库选择图片"
    width="760px"
    append-to-body
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="mp-toolbar">
      <el-input
        v-model="keyword"
        placeholder="按文件名搜索"
        clearable
        :prefix-icon="Search"
        style="width: 220px"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-button :icon="Search" @click="reload">搜索</el-button>
      <div class="mp-toolbar-right">
        <el-upload :show-file-list="false" :http-request="doUpload" accept="image/*">
          <el-button :icon="Upload" :loading="uploading">上传新图片</el-button>
        </el-upload>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
      </div>
    </div>

    <div v-loading="loading" class="mp-grid">
      <el-empty v-if="!list.length && !loading" description="暂无图片，可点击右上角上传" />
      <div
        v-for="m in list"
        :key="m.id"
        class="mp-item"
        :class="{ active: selected?.id === m.id }"
        @click="selected = m"
        @dblclick="confirm"
      >
        <el-image :src="m.path" fit="cover" class="mp-img" />
        <div class="mp-name" :title="m.filename">{{ m.filename }}</div>
      </div>
    </div>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="load"
      />
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!selected" @click="confirm">使用该图片</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, type UploadRequestOptions } from 'element-plus'
import { Refresh, Search, Upload } from '@element-plus/icons-vue'
import { siteApi, type SiteMedia } from '@/api/site'

const props = withDefaults(defineProps<{ modelValue: boolean }>(), { modelValue: false })
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'select', url: string, media: SiteMedia): void
}>()

const list = ref<SiteMedia[]>([])
const page = ref(1)
const pageSize = ref(24)
const total = ref(0)
const keyword = ref('')
const loading = ref(false)
const uploading = ref(false)
const selected = ref<SiteMedia | null>(null)

async function load() {
  loading.value = true
  try {
    const res = await siteApi.getMediaList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined
    })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

async function doUpload(opt: UploadRequestOptions) {
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', opt.file as File)
    const res = await siteApi.uploadSiteImage(fd)
    ElMessage.success('上传成功')
    keyword.value = ''
    page.value = 1
    await load()
    const created = res.data
    selected.value = (created && list.value.find((m) => m.id === created.id)) || null
  } catch {
    // 拦截器已提示
  } finally {
    uploading.value = false
  }
}

function confirm() {
  if (!selected.value) return
  emit('select', selected.value.path, selected.value)
  emit('update:modelValue', false)
}

// 每次打开时重置选中并拉取最新数据
watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      selected.value = null
      page.value = 1
      keyword.value = ''
      load()
    }
  }
)
</script>

<style scoped lang="scss">
.mp-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  .mp-toolbar-right {
    margin-left: auto;
    display: flex;
    gap: 10px;
  }
}

.mp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  min-height: 160px;
  max-height: 52vh;
  overflow-y: auto;
}

.mp-item {
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &.active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
  }

  .mp-img {
    width: 100%;
    height: 110px;
    display: block;
  }

  .mp-name {
    padding: 4px 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
