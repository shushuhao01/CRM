<template>
  <div class="site-tab">
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
        <el-button v-if="canEdit" type="primary" @click="openCreate">新建文档</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" border stripe style="margin-top: 12px">
      <el-table-column prop="title" label="文档标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.category || '-' }}</template>
      </el-table-column>
      <el-table-column label="父级文档" width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ titleOf(row.parentId) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
            {{ row.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="viewCount" label="浏览" width="80" />
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right" class-name="op-col">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">查看</el-button>
          <el-button v-if="canEdit" link type="primary" @click="openEdit(row, true)">编辑</el-button>
          <el-button v-if="canEdit" link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px" top="5vh" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="文档标题" required>
              <el-input v-model="form.title" :disabled="readonly" placeholder="请输入文档标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="URL 别名">
              <el-input v-model="form.slug" :disabled="readonly" placeholder="留空则使用ID" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="form.category" :disabled="readonly" placeholder="如：快速上手" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="父级文档">
              <el-select v-model="form.parentId" :disabled="readonly" clearable filterable placeholder="不选则为一级文档" style="width: 100%">
                <el-option v-for="item in parentOptions" :key="item.id" :label="item.title" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" :rows="2" :disabled="readonly" placeholder="文档摘要" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="文档内容">
          <RichTextEditor v-model="form.content" height="380px" placeholder="请输入文档内容" />
        </el-form-item>

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
          <el-col :span="12">
            <el-form-item label="排序值">
              <el-input-number v-model="form.sort" :min="0" :disabled="readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status" :disabled="readonly">
                <el-radio value="draft">草稿</el-radio>
                <el-radio value="published">发布</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button v-if="canEdit && !readonly" type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { siteApi, type SiteDoc } from '@/api/site'
import RichTextEditor from '@/components/RichTextEditor.vue'

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('website:docs:edit'))

const loading = ref(false)
const saving = ref(false)
const list = ref<SiteDoc[]>([])
const total = ref(0)

const query = reactive({
  keyword: '',
  status: '',
  category: '',
  page: 1,
  pageSize: 20
})

const titleOf = (id?: string) => {
  if (!id) return '-'
  const found = list.value.find(d => d.id === id)
  return found ? found.title : id
}

const load = async () => {
  loading.value = true
  try {
    const res = await siteApi.getDocs({
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

const parentOptions = computed(() => list.value.filter(d => d.id !== editingId.value))

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

const dialogVisible = ref(false)
const readonly = ref(false)
const editingId = ref('')

const emptyForm = (): Partial<SiteDoc> => ({
  title: '',
  slug: '',
  category: '',
  parentId: '',
  summary: '',
  content: '',
  sort: 0,
  status: 'draft',
  seoTitle: '',
  seoKeywords: '',
  seoDescription: ''
})

const form = reactive<Partial<SiteDoc>>(emptyForm())

const dialogTitle = computed(() => (readonly.value ? '查看文档' : editingId.value ? '编辑文档' : '新建文档'))

const resetForm = (data?: Partial<SiteDoc>) => {
  Object.assign(form, emptyForm(), data || {})
}

const openCreate = () => {
  editingId.value = ''
  readonly.value = false
  resetForm()
  dialogVisible.value = true
}

const openEdit = async (row: SiteDoc, editable = false) => {
  editingId.value = row.id
  readonly.value = !editable
  try {
    const res = await siteApi.getDoc(row.id)
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
    if (editingId.value) {
      await siteApi.updateDoc(editingId.value, { ...form })
      ElMessage.success('更新成功')
    } else {
      await siteApi.createDoc({ ...form })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: SiteDoc) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await siteApi.removeDoc(row.id)
  ElMessage.success('删除成功')
  load()
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

:deep(.op-col .cell) {
  white-space: nowrap;
}

:deep(.op-col .el-button.is-link) {
  padding: 0 6px;
}

:deep(.op-col .el-button + .el-button) {
  margin-left: 4px;
}
</style>
