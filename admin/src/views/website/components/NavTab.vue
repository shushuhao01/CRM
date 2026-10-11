<template>
  <div class="site-tab">
    <div class="toolbar">
      <el-radio-group v-model="group" @change="load">
        <el-radio-button value="header">顶部导航</el-radio-button>
        <el-radio-button value="footer">底部导航</el-radio-button>
      </el-radio-group>
      <div class="toolbar-right">
        <el-button v-if="canEdit" type="primary" @click="openCreate">新增菜单</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" border stripe style="margin-top: 12px" row-key="id">
      <el-table-column prop="name" label="菜单名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="url" label="跳转地址" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.url || '-' }}</template>
      </el-table-column>
      <el-table-column label="打开方式" width="100">
        <template #default="{ row }">{{ row.target === '_blank' ? '新窗口' : '当前窗口' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isExternal ? 'warning' : 'info'" size="small">{{ row.isExternal ? '外链' : '站内' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="显示" width="90">
        <template #default="{ row }">
          <el-tag :type="row.isVisible ? 'success' : 'info'" size="small">{{ row.isVisible ? '显示' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEdit" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canEdit" link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="菜单名称" required>
          <el-input v-model="form.name" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="跳转地址">
          <el-input v-model="form.url" placeholder="如：/blog 或 https://example.com" />
        </el-form-item>
        <el-form-item label="位置分组">
          <el-radio-group v-model="form.groupName">
            <el-radio value="header">顶部导航</el-radio>
            <el-radio value="footer">底部导航</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="打开方式">
          <el-radio-group v-model="form.target">
            <el-radio value="_self">当前窗口</el-radio>
            <el-radio value="_blank">新窗口</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="是否显示">
          <el-switch v-model="form.isVisible" />
        </el-form-item>
        <el-form-item label="是否为外链">
          <el-switch v-model="form.isExternal" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { siteApi, type SiteNav } from '@/api/site'

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('website:nav:edit'))

const loading = ref(false)
const saving = ref(false)
const group = ref<'header' | 'footer'>('header')
const list = ref<SiteNav[]>([])

const load = async () => {
  loading.value = true
  try {
    const res = await siteApi.getNav({ group: group.value })
    list.value = res.data || []
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const dialogVisible = ref(false)
const editingId = ref('')

const emptyForm = (): Partial<SiteNav> => ({
  name: '',
  url: '',
  icon: '',
  target: '_self',
  groupName: group.value,
  sort: 0,
  isVisible: 1,
  isExternal: 0,
  parentId: ''
})

const form = reactive<Partial<SiteNav>>(emptyForm())

const dialogTitle = computed(() => (editingId.value ? '编辑菜单' : '新增菜单'))

const resetForm = (data?: Partial<SiteNav>) => {
  Object.assign(form, emptyForm(), data || {})
}

const openCreate = () => {
  editingId.value = ''
  resetForm()
  dialogVisible.value = true
}

const openEdit = (row: SiteNav) => {
  editingId.value = row.id
  resetForm({
    ...row,
    isVisible: row.isVisible ? 1 : 0,
    isExternal: row.isExternal ? 1 : 0
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name) {
    ElMessage.warning('菜单名称不能为空')
    return
  }
  saving.value = true
  try {
    const payload = {
      ...form,
      isVisible: form.isVisible ? 1 : 0,
      isExternal: form.isExternal ? 1 : 0
    }
    if (editingId.value) {
      await siteApi.updateNav(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await siteApi.createNav(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: SiteNav) => {
  try {
    await ElMessageBox.confirm(`确定删除菜单「${row.name}」吗？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await siteApi.removeNav(row.id)
  ElMessage.success('删除成功')
  load()
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
</style>
