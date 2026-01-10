<template>
  <div class="wecom-sidebar">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>侧边栏应用</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>添加应用
          </el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" style="margin-bottom: 15px">
        侧边栏应用可在企业微信聊天窗口右侧展示，方便员工快速查看客户信息、订单等数据
      </el-alert>

      <el-table :data="appList" v-loading="loading" stripe>
        <el-table-column prop="name" label="应用名称" min-width="150" />
        <el-table-column prop="url" label="应用地址" min-width="250" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑应用' : '添加应用'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="应用名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入应用名称" />
        </el-form-item>
        <el-form-item label="应用地址" prop="url">
          <el-input v-model="form.url" placeholder="请输入应用URL" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomSidebar' })
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const appList = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const formRef = ref()

const form = ref({ name: '', url: '', isEnabled: true })
const rules = {
  name: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  url: [{ required: true, message: '请输入应用地址', trigger: 'blur' }]
}

const fetchList = async () => {
  loading.value = true
  try {
    // 侧边栏应用配置存储在本地或系统配置中
    const saved = localStorage.getItem('wecom_sidebar_apps')
    appList.value = saved ? JSON.parse(saved) : []
  } catch (e) { console.error(e) } finally { loading.value = false }
}

const saveList = () => { localStorage.setItem('wecom_sidebar_apps', JSON.stringify(appList.value)) }

const handleAdd = () => { isEdit.value = false; currentId.value = null; form.value = { name: '', url: '', isEnabled: true }; dialogVisible.value = true }

const handleEdit = (row: any) => { isEdit.value = true; currentId.value = row.id; form.value = { ...row }; dialogVisible.value = true }

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value && currentId.value !== null) {
      const idx = appList.value.findIndex(a => a.id === currentId.value)
      if (idx >= 0) appList.value[idx] = { ...form.value, id: currentId.value }
    } else {
      appList.value.push({ ...form.value, id: Date.now() })
    }
    saveList()
    ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
    dialogVisible.value = false
  } finally { submitting.value = false }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定要删除该应用吗？', '提示', { type: 'warning' })
  appList.value = appList.value.filter(a => a.id !== row.id)
  saveList()
  ElMessage.success('删除成功')
}

onMounted(() => fetchList())
</script>

<style scoped lang="scss">
.wecom-sidebar { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
