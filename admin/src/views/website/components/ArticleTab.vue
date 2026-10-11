<template>
  <div class="site-tab">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="搜索标题" clearable style="width: 220px" @keyup.enter="handleSearch" />
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px">
        <el-option label="草稿" value="draft" />
        <el-option label="已发布" value="published" />
      </el-select>
      <el-input v-model="query.category" placeholder="分类" clearable style="width: 140px" />
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
      <div class="toolbar-right">
        <el-button v-if="canEdit" type="primary" @click="openCreate">新建{{ label }}</el-button>
      </div>
    </div>

    <!-- 列表 -->
    <el-table :data="list" v-loading="loading" border stripe style="margin-top: 12px">
      <el-table-column label="封面" width="90">
        <template #default="{ row }">
          <el-image v-if="row.cover" :src="row.cover" fit="cover" style="width: 64px; height: 40px; border-radius: 4px" />
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" :label="`${label}标题`" min-width="200" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.category || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
            {{ row.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="置顶" width="70">
        <template #default="{ row }">
          <el-tag v-if="row.isTop" type="danger" size="small">置顶</el-tag>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览" width="80" />
      <el-table-column label="发布时间" width="170">
        <template #default="{ row }">{{ formatTime(row.publishedAt || row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <div class="op-actions">
            <el-button link type="primary" @click="openEdit(row)">查看</el-button>
            <el-button v-if="canEdit" link type="primary" @click="openEdit(row, true)">编辑</el-button>
            <el-button v-if="canEdit" link type="danger" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :page-sizes="[10, 20, 50]"
      :total="total"
      layout="total, sizes, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="load"
      @size-change="handleSearch"
    />

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px" top="5vh" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="标题" required>
              <el-input v-model="form.title" :disabled="readonly" placeholder="请输入标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="URL 别名">
              <el-input v-model="form.slug" :disabled="readonly" placeholder="留空则使用ID（英文/数字/中划线）" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="form.category" :disabled="readonly" placeholder="如：产品动态" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="type === 'notice' ? '发布单位' : '作者'">
              <el-input v-model="form.author" :disabled="readonly" :placeholder="type === 'notice' ? '请输入发布单位' : '请输入作者'" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="来源">
          <el-input v-model="form.source" :disabled="readonly" placeholder="内容来源（可选）" />
        </el-form-item>
        <el-form-item label="封面图">
          <el-input v-model="form.cover" :disabled="readonly" placeholder="图片 URL">
            <template #append>
              <el-button :disabled="readonly" @click="triggerCoverUpload">上传</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" :rows="2" :disabled="readonly" placeholder="用于列表展示的摘要" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="正文">
          <RichTextEditor v-model="form.content" height="360px" :placeholder="`请输入${label}正文`" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="标签">
              <el-input v-model="form.tags" :disabled="readonly" placeholder="多个标签用英文逗号分隔" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序值">
              <el-input-number v-model="form.sort" :min="0" :disabled="readonly" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">SEO 配置</el-divider>
        <el-form-item label="SEO 标题">
          <el-input v-model="form.seoTitle" :disabled="readonly" placeholder="留空则使用标题" />
        </el-form-item>
        <el-form-item label="SEO 关键词">
          <el-input v-model="form.seoKeywords" :disabled="readonly" placeholder="多个关键词用英文逗号分隔" />
        </el-form-item>
        <el-form-item label="SEO 描述">
          <el-input v-model="form.seoDescription" type="textarea" :rows="2" :disabled="readonly" placeholder="搜索引擎展示的描述" maxlength="500" show-word-limit />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status" :disabled="readonly">
                <el-radio value="draft">草稿</el-radio>
                <el-radio value="published">发布</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="置顶">
              <el-switch v-model="form.isTop" :disabled="readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="推荐">
              <el-switch v-model="form.isRecommend" :disabled="readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button v-if="canEdit && !readonly" type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <input ref="coverInput" type="file" accept="image/*" style="display: none" @change="handleCoverSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { siteApi, type SiteArticle } from '@/api/site'
import { adminApi } from '@/api/admin'
import RichTextEditor from '@/components/RichTextEditor.vue'

const props = defineProps<{ type: 'article' | 'notice' }>()

const label = computed(() => (props.type === 'notice' ? '公告' : '文章'))

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission(props.type === 'notice' ? 'website:notices:edit' : 'website:articles:edit'))

const loading = ref(false)
const saving = ref(false)
const list = ref<SiteArticle[]>([])
const total = ref(0)

const query = reactive({
  keyword: '',
  status: '',
  category: '',
  page: 1,
  pageSize: 20
})

const load = async () => {
  loading.value = true
  try {
    const res = await siteApi.getArticles({
      type: props.type,
      keyword: query.keyword || undefined,
      status: query.status || undefined,
      category: query.category || undefined,
      page: query.page,
      pageSize: query.pageSize
    })
    const data = res.data
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.page = 1
  load()
}

const handleReset = () => {
  query.keyword = ''
  query.status = ''
  query.category = ''
  handleSearch()
}

// ==================== 编辑表单 ====================

const dialogVisible = ref(false)
const readonly = ref(false)
const editingId = ref('')

const emptyForm = (): Partial<SiteArticle> => ({
  title: '',
  slug: '',
  category: '',
  cover: '',
  summary: '',
  content: '',
  tags: '',
  author: '',
  source: '',
  status: 'draft',
  isTop: 0,
  isRecommend: 0,
  sort: 0,
  seoTitle: '',
  seoKeywords: '',
  seoDescription: ''
})

const form = reactive<Partial<SiteArticle>>(emptyForm())

const dialogTitle = computed(() => {
  const prefix = readonly.value ? `查看${label.value}` : editingId.value ? `编辑${label.value}` : `新建${label.value}`
  return prefix
})

const resetForm = (data?: Partial<SiteArticle>) => {
  Object.assign(form, emptyForm(), data || {})
}

const openCreate = () => {
  editingId.value = ''
  readonly.value = false
  resetForm()
  dialogVisible.value = true
}

const openEdit = async (row: SiteArticle, editable = false) => {
  editingId.value = row.id
  readonly.value = !editable
  try {
    const res = await siteApi.getArticle(row.id)
    resetForm(res.data || row)
  } catch {
    resetForm(row)
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.title) {
    ElMessage.warning('标题不能为空')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, type: props.type }
    if (editingId.value) {
      await siteApi.updateArticle(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await siteApi.createArticle(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: SiteArticle) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await siteApi.removeArticle(row.id)
  ElMessage.success('删除成功')
  load()
}

// ==================== 封面上传 ====================

const coverInput = ref<HTMLInputElement>()
const triggerCoverUpload = () => coverInput.value?.click()

const handleCoverSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      ElMessage.error('只能上传图片文件')
    } else {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await adminApi.uploadFile(formData)
        if (res.success && res.data?.url) {
          form.cover = res.data.url
          ElMessage.success('上传成功')
        } else {
          ElMessage.error('上传失败')
        }
      } catch {
        ElMessage.error('上传失败')
      }
    }
  }
  input.value = ''
}

const formatTime = (val?: string) => {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(load)
</script>

<style scoped lang="scss">
.site-tab {
  padding: 8px 4px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar-right {
  margin-left: auto;
}

.muted {
  color: #c0c4cc;
}

.op-actions {
  white-space: nowrap;
  display: flex;
  align-items: center;

  :deep(.el-button + .el-button) {
    margin-left: 8px;
  }
}
</style>
