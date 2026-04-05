<template>
  <div class="page-container">
    <!-- 角色列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <el-button v-permission="'settings:roles:create'" type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增角色
          </el-button>
        </div>
      </template>

      <el-table :data="roleList" v-loading="loading" stripe>
        <el-table-column prop="name" label="角色名称" width="150">
          <template #default="{ row }">
            <span>{{ row.name }}</span>
            <el-tag v-if="row.isSystem" type="warning" size="small" style="margin-left: 6px;">内置</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="角色标识" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="权限数" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">
              {{ row.permissions?.includes('*') ? '全部' : (row.permissions?.length || 0) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userCount" label="关联用户" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.userCount || 0 }} 人</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'settings:roles:edit'" link type="primary" @click="handleEdit(row)">
              {{ row.isSystem && row.code === 'super_admin' ? '查看' : '编辑' }}
            </el-button>
            <el-button
              v-if="!row.isSystem"
              v-permission="'settings:roles:delete'"
              link type="danger"
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑角色对话框 -->
    <el-dialog
      v-model="showDialog"
      :title="isReadonly ? '查看角色' : (editingId ? '编辑角色' : '新增角色')"
      width="700px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" :disabled="isReadonly" placeholder="如：运营管理员" maxlength="30" />
        </el-form-item>
        <el-form-item label="角色标识" prop="code">
          <el-input
            v-model="form.code"
            :disabled="!!editingId"
            placeholder="如：operation_admin（英文、数字、下划线）"
            maxlength="30"
          />
          <div class="form-tip" v-if="!editingId">角色标识一旦创建不可修改，请谨慎填写</div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" :disabled="isReadonly" type="textarea" :rows="2" placeholder="角色描述（可选）" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.statusActive" :disabled="isReadonly" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="权限配置" prop="permissions" class="permission-form-item">
          <div class="permission-tree-wrapper">
            <div class="permission-toolbar">
              <el-button size="small" :disabled="isReadonly" @click="handleCheckAll">全选</el-button>
              <el-button size="small" :disabled="isReadonly" @click="handleUncheckAll">取消全选</el-button>
              <span class="checked-count">已选 {{ selectedCount }} 项权限</span>
            </div>
            <el-tree
              ref="treeRef"
              :data="permissionTreeData"
              :props="treeProps"
              show-checkbox
              node-key="code"
              :default-expand-all="true"
              :check-strictly="false"
              class="permission-tree"
              @check="onTreeCheck"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">{{ isReadonly ? '关闭' : '取消' }}</el-button>
        <el-button v-if="!isReadonly" type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { adminApi } from '@/api/admin'

interface TreeNode {
  code: string
  name: string
  children?: TreeNode[]
}

const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const editingId = ref<string | null>(null)
const isReadonly = ref(false)
const formRef = ref<FormInstance>()
const treeRef = ref<any>(null)

const roleList = ref<any[]>([])
const permissionTreeData = ref<TreeNode[]>([])

const form = reactive({
  name: '',
  code: '',
  description: '',
  permissions: [] as string[],
  statusActive: true
})

const treeProps = {
  label: 'name',
  children: 'children'
}

const formRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色标识', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '只能包含英文字母、数字和下划线，且以字母开头', trigger: 'blur' }
  ]
}

const selectedCount = computed(() => {
  if (!treeRef.value) return 0
  return treeRef.value.getCheckedKeys(true)?.length || 0
})

// ============ 数据加载 ============
const fetchRoles = async () => {
  loading.value = true
  try {
    const res = await adminApi.getRoles()
    if (res.success) {
      roleList.value = res.data || []
    }
  } catch (e) {
    console.error('获取角色列表失败:', e)
    ElMessage.error('获取角色列表失败')
  } finally {
    loading.value = false
  }
}

const fetchPermissionTree = async () => {
  try {
    const res = await adminApi.getPermissionTree()
    if (res.success) {
      permissionTreeData.value = res.data || []
    }
  } catch (e) {
    console.error('获取权限树失败:', e)
  }
}

// ============ 操作 ============
const handleAdd = () => {
  editingId.value = null
  isReadonly.value = false
  Object.assign(form, { name: '', code: '', description: '', permissions: [], statusActive: true })
  showDialog.value = true
  nextTick(() => {
    treeRef.value?.setCheckedKeys([], false)
  })
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  isReadonly.value = row.isSystem && row.code === 'super_admin'
  Object.assign(form, {
    name: row.name,
    code: row.code,
    description: row.description || '',
    permissions: row.permissions || [],
    statusActive: row.status === 'active'
  })
  showDialog.value = true
  nextTick(() => {
    if (row.permissions?.includes('*')) {
      // 全部权限 → 勾选所有
      handleCheckAll()
    } else {
      // 设置勾选的叶子节点（check-strictly=false 模式下只需设置叶子节点）
      const leafCodes = getLeafCodes(row.permissions || [])
      treeRef.value?.setCheckedKeys(leafCodes, false)
    }
  })
}

/** 获取叶子节点权限码（排除父节点码以避免tree全选问题） */
const getLeafCodes = (permissions: string[]): string[] => {
  const allParentCodes = new Set<string>()
  const collectParents = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        allParentCodes.add(node.code)
        collectParents(node.children)
      }
    }
  }
  collectParents(permissionTreeData.value)
  return permissions.filter(p => !allParentCodes.has(p))
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定删除角色「${row.name}」？删除后不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
    await adminApi.deleteRole(row.id)
    ElMessage.success('删除成功')
    fetchRoles()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

const handleCheckAll = () => {
  const allKeys = getAllTreeKeys(permissionTreeData.value)
  treeRef.value?.setCheckedKeys(allKeys, false)
}

const handleUncheckAll = () => {
  treeRef.value?.setCheckedKeys([], false)
}

const getAllTreeKeys = (nodes: TreeNode[]): string[] => {
  const keys: string[] = []
  const collect = (list: TreeNode[]) => {
    for (const node of list) {
      keys.push(node.code)
      if (node.children) collect(node.children)
    }
  }
  collect(nodes)
  return keys
}

const onTreeCheck = () => {
  // 实时更新 form.permissions（用于提交）
  if (treeRef.value) {
    const checked = treeRef.value.getCheckedKeys(false) as string[]
    const halfChecked = treeRef.value.getHalfCheckedKeys() as string[]
    form.permissions = [...checked, ...halfChecked]
  }
}

const handleSubmit = async () => {
  await formRef.value?.validate()

  // 收集选中的权限（包括半选的父节点）
  const checked = treeRef.value?.getCheckedKeys(false) as string[] || []
  const halfChecked = treeRef.value?.getHalfCheckedKeys() as string[] || []
  const allPermissions = [...checked, ...halfChecked]

  if (allPermissions.length === 0) {
    ElMessage.warning('请至少选择一项权限')
    return
  }

  submitting.value = true
  try {
    const data = {
      name: form.name,
      code: form.code,
      description: form.description,
      permissions: allPermissions,
      status: form.statusActive ? 'active' : 'disabled'
    }

    if (editingId.value) {
      await adminApi.updateRole(editingId.value, data)
      ElMessage.success('角色更新成功')
    } else {
      await adminApi.createRole(data)
      ElMessage.success('角色创建成功')
    }
    showDialog.value = false
    fetchRoles()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  editingId.value = null
  isReadonly.value = false
}

onMounted(() => {
  fetchRoles()
  fetchPermissionTree()
})
</script>

<style scoped lang="scss">
.page-container {
  padding: 0;
}

.table-card {
  border-radius: 8px;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.permission-form-item {
  :deep(.el-form-item__content) {
    display: block;
  }
}

.permission-tree-wrapper {
  width: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.permission-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;

  .checked-count {
    margin-left: auto;
    font-size: 13px;
    color: #909399;
  }
}

.permission-tree {
  padding: 12px 8px;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;

  :deep(.el-tree-node__content) {
    height: 32px;
  }

  :deep(.el-tree-node__label) {
    font-size: 14px;
  }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
</style>

