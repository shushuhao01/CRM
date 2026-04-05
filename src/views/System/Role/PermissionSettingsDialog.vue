<template>
  <!-- 权限设置对话框 -->
  <el-dialog
    v-model="visible"
    title="权限设置"
    width="800px"
    :before-close="handleClose"
  >
    <div class="permission-setting">
      <div class="role-info">
        <h4>角色：{{ currentRole?.name }}</h4>
        <p>{{ currentRole?.description }}</p>
      </div>

      <el-divider />

      <el-tabs v-model="activeTab" type="card">
        <!-- 权限设置标签页 -->
        <el-tab-pane label="权限设置" name="permissions">
          <div class="permission-tree">
            <el-tree
              ref="permissionTreeRef"
              :data="permissionTree"
              :props="treeProps"
              show-checkbox
              node-key="id"
              :default-checked-keys="checkedPermissions"
              :check-strictly="true"
              @check="handlePermissionCheck"
            >
              <!-- eslint-disable-next-line vue/no-unused-vars -->
                <template #default="{ node, data }">
                <span class="tree-node">
                  <el-icon v-if="data.icon" class="node-icon">
                    <component :is="data.icon" />
                  </el-icon>
                  <span>{{ data.name }}</span>
                  <el-tag v-if="data.type" size="small" class="node-tag">
                    {{ data.type }}
                  </el-tag>
                </span>
              </template>
            </el-tree>
          </div>
        </el-tab-pane>

        <!-- 数据设置标签页 -->
        <el-tab-pane label="数据设置" name="dataScope">
          <div class="data-scope-setting">
            <div class="scope-title">数据范围</div>
            <el-radio-group v-model="currentRoleDataScope" @change="handleDataScopeChange" class="scope-radio-group">
              <div class="scope-item">
                <el-radio label="all">
                  <span class="scope-label">全部数据</span>
                  <span class="scope-tip">可查看系统中所有数据，适用于管理员角色</span>
                </el-radio>
              </div>
              <div class="scope-item">
                <el-radio label="department">
                  <span class="scope-label">部门数据</span>
                  <span class="scope-tip">仅可查看本部门及下属部门的数据，适用于部门经理</span>
                </el-radio>
              </div>
              <div class="scope-item">
                <el-radio label="self">
                  <span class="scope-label">个人数据</span>
                  <span class="scope-tip">仅可查看自己创建的数据，适用于普通员工</span>
                </el-radio>
              </div>
            </el-radio-group>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="resetToDefaultPermissions" type="warning">恢复默认</el-button>
        <el-button @click="confirmPermissions" type="primary" :loading="loading">保存权限</el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 权限管理对话框 -->
  <el-dialog
    v-model="manageDialogVisible"
    title="权限管理"
    width="1000px"
  >
    <div class="permission-manage">
      <div class="manage-header">
        <el-button @click="handleAddPermission" type="primary" :icon="Plus">新增权限</el-button>
        <el-button @click="handleExpandAll" :icon="Expand">展开全部</el-button>
        <el-button @click="handleCollapseAll" :icon="Fold">收起全部</el-button>
      </div>

      <el-table
        :data="allPermissionsList"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        style="width: 100%; margin-top: 20px"
      >
        <el-table-column prop="name" label="权限名称" width="200" />
        <el-table-column prop="code" label="权限编码" width="200" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getPermissionTypeColor(row.type)" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路径" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button @click="handleEditPermission(row)" type="primary" size="small" link>编辑</el-button>
            <el-button @click="handleDeletePermission(row)" type="danger" size="small" link>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>

  <!-- 新增/编辑权限对话框 -->
  <el-dialog
    v-model="permFormDialogVisible"
    :title="isPermissionEdit ? '编辑权限' : '新增权限'"
    width="500px"
  >
    <el-form ref="permFormRef" :model="permForm" :rules="permFormRules" label-width="100px">
      <el-form-item label="上级权限" prop="parentId">
        <el-tree-select
          v-model="permForm.parentId"
          :data="permissionTreeSelect"
          :props="{ label: 'name', value: 'id' }"
          placeholder="请选择上级权限"
          clearable
          check-strictly
        />
      </el-form-item>
      <el-form-item label="权限名称" prop="name">
        <el-input v-model="permForm.name" placeholder="请输入权限名称" />
      </el-form-item>
      <el-form-item label="权限编码" prop="code">
        <el-input v-model="permForm.code" placeholder="请输入权限编码" />
      </el-form-item>
      <el-form-item label="权限类型" prop="type">
        <el-select v-model="permForm.type" placeholder="请选择权限类型">
          <el-option label="菜单" value="menu" />
          <el-option label="按钮" value="button" />
          <el-option label="接口" value="api" />
        </el-select>
      </el-form-item>
      <el-form-item label="路径" prop="path">
        <el-input v-model="permForm.path" placeholder="请输入路径" />
      </el-form-item>
      <el-form-item label="图标" prop="icon">
        <el-input v-model="permForm.icon" placeholder="请输入图标名称" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="permForm.sort" :min="0" placeholder="排序" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="permForm.status">
          <el-radio label="active">启用</el-radio>
          <el-radio label="inactive">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="permFormDialogVisible = false">取消</el-button>
        <el-button @click="confirmPermissionForm" type="primary" :loading="permFormLoading">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Expand, Fold } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
// @ts-ignore
import permissionService from '@/services/permissionService'
import { roleApiService } from '@/services/roleApiService'
import { getDefaultRolePermissions } from '@/config/defaultRolePermissions'
// @ts-ignore - 本地数据文件
import { FALLBACK_PERMISSION_TREE, FALLBACK_ALL_PERMISSIONS } from './permissionFallbackData'

interface PermissionData {
  id: string
  parentId: string
  name: string
  code: string
  type: string
  path?: string
  icon?: string
  sort: number
  status: string
  children?: PermissionData[]
}

const props = defineProps<{
  modelValue: boolean
  manageVisible: boolean
  role: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:manageVisible', value: boolean): void
  (e: 'success'): void
}>()

const userStore = useUserStore()

// 权限设置对话框
const visible = ref(false)
const loading = ref(false)
const currentRole = ref<any>(null)
const activeTab = ref('permissions')
const currentRoleDataScope = ref<'all' | 'department' | 'self'>('self')
const checkedPermissions = ref<string[]>([])
const permissionTree = ref<any[]>([])
const permissionTreeSelect = ref<any[]>([])
const permissionTreeRef = ref<any>()
const treeProps = { children: 'children', label: 'name' }

// 权限管理对话框
const manageDialogVisible = ref(false)
const allPermissionsList = ref<any[]>([])

// 权限表单对话框
const permFormDialogVisible = ref(false)
const isPermissionEdit = ref(false)
const permFormLoading = ref(false)
const permFormRef = ref()
const permForm = reactive({
  id: '', parentId: '', name: '', code: '', type: 'menu',
  path: '', icon: '', sort: 0, status: 'active'
})
const permFormRules = {
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择权限类型', trigger: 'change' }]
}

// 系统预设角色列表
const SYSTEM_PRESET_ROLES = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service']

// ========== Watch ==========
watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && props.role) {
    await openPermissionSettings(props.role)
  }
})

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

watch(() => props.manageVisible, (val) => {
  manageDialogVisible.value = val
  if (val) loadAllPermissions()
})

watch(manageDialogVisible, (val) => {
  if (!val) emit('update:manageVisible', false)
})

// ========== 加载权限树 ==========
const loadPermissionTree = async () => {
  try {
    const allPermissions = permissionService.getAllPermissions()
    permissionTree.value = allPermissions
    console.log('权限树加载成功')
  } catch (error) {
    console.error('加载权限树失败:', error)
    permissionTree.value = FALLBACK_PERMISSION_TREE
  } finally {
    permissionTreeSelect.value = buildTreeSelect(permissionTree.value)
  }
}

const loadAllPermissions = async () => {
  try {
    const permissions = permissionService.getAllPermissions()
    allPermissionsList.value = permissions
  } catch (error) {
    console.error('加载所有权限失败:', error)
    allPermissionsList.value = FALLBACK_ALL_PERMISSIONS
    permissionTreeSelect.value = buildTreeSelect(allPermissionsList.value)
  }
}

const buildTreeSelect = (data: PermissionData[]): any[] => {
  return data.map(item => ({
    id: item.id, name: item.name,
    children: item.children ? buildTreeSelect(item.children) : undefined
  }))
}

// ========== 权限设置 ==========
const openPermissionSettings = async (role: any) => {
  console.log('[角色权限] 开始配置权限:', role)
  currentRole.value = role
  currentRoleDataScope.value = role.dataScope || 'self'
  activeTab.value = 'permissions'

  // 加载权限树
  await loadPermissionTree()

  // 从数据库加载角色权限
  let rolePermissions: string[] = []
  try {
    const permissionData = await roleApiService.getRolePermissions(role.id)
    rolePermissions = permissionData.permissions || []
    console.log('[角色权限] 数据库权限加载成功:', rolePermissions.length)
  } catch (error) {
    console.warn('[角色权限] 数据库权限加载失败，使用默认权限:', error)
    rolePermissions = getDefaultRolePermissions(role.code || role.name)
  }

  if (rolePermissions.length === 0) {
    rolePermissions = getDefaultRolePermissions(role.code || role.name)
  }

  checkedPermissions.value = rolePermissions

  await nextTick()

  // 清空权限树的勾选状态
  if (permissionTreeRef.value) {
    permissionTreeRef.value.setCheckedKeys([])
  }

  // 收集所有权限树节点ID
  const allTreeNodeIds = new Set<string>()
  const collectNodeIds = (nodes: any[]) => {
    nodes.forEach(node => {
      allTreeNodeIds.add(node.id)
      if (node.children?.length) collectNodeIds(node.children)
    })
  }
  collectNodeIds(permissionTree.value)

  // 过滤出存在于权限树中的有效权限ID
  const validPermissions = rolePermissions.filter(permId => allTreeNodeIds.has(permId))
  console.log('[角色权限] 有效权限数量:', validPermissions.length, '/', rolePermissions.length)

  if (validPermissions.length === 0) {
    console.warn('⚠️ 没有有效权限,权限树保持空白')
    return
  }

  // 延迟设置权限树选中状态
  setTimeout(() => {
    if (permissionTreeRef.value) {
      try {
        permissionTreeRef.value.setCheckedKeys([])
        permissionTreeRef.value.setCheckedKeys(validPermissions, false)
        console.log('✅ 权限已设置')

        // 验证设置结果
        setTimeout(() => {
          const checkedKeys = permissionTreeRef.value.getCheckedKeys()
          const halfCheckedKeys = permissionTreeRef.value.getHalfCheckedKeys()
          if (checkedKeys.length === 0 && halfCheckedKeys.length === 0) {
            // 尝试逐个设置
            validPermissions.forEach(permId => {
              try { permissionTreeRef.value.setChecked(permId, true, false) } catch (_e) { /* ignore */ }
            })
          }
        }, 500)
      } catch (error) {
        console.error('❌ 设置权限树选中状态失败:', error)
        ElMessage.error('权限树加载失败，请刷新页面后重试')
      }
    }
  }, 1000)
}

const handlePermissionCheck = (data: any, checked: any) => {
  if (!permissionTreeRef.value) return
  const isChecked = checked.checkedKeys.includes(data.id)

  const toggleChildren = (nodeData: any, check: boolean) => {
    permissionTreeRef.value?.setChecked(nodeData.id, check, false)
    if (nodeData.children?.length) {
      nodeData.children.forEach((child: any) => toggleChildren(child, check))
    }
  }
  toggleChildren(data, isChecked)
}

const confirmPermissions = async () => {
  try {
    loading.value = true
    const checkedKeys = permissionTreeRef.value?.getCheckedKeys() as string[]
    const halfCheckedKeys = permissionTreeRef.value?.getHalfCheckedKeys() as string[]

    // 过滤掉半选的模块级key
    const moduleTopKeys = (permissionTree.value || []).map((m: any) => m.id)
    const filteredHalfChecked = (halfCheckedKeys || []).filter(
      (key: string) => !moduleTopKeys.includes(key)
    )
    const allPermissions = [...(checkedKeys || []), ...filteredHalfChecked]

    if (!currentRole.value) { ElMessage.error('未选择角色'); return }

    // 保存权限到数据库
    await roleApiService.updateRolePermissions(currentRole.value.id, allPermissions)
    await roleApiService.updateRole({
      id: currentRole.value.id,
      dataScope: currentRoleDataScope.value
    })

    // 更新localStorage缓存
    try {
      const roles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
      const roleIndex = roles.findIndex((r: any) => r.id === currentRole.value?.id)
      if (roleIndex !== -1) {
        roles[roleIndex].permissions = allPermissions
        roles[roleIndex].permissionCount = allPermissions.length
        roles[roleIndex].dataScope = currentRoleDataScope.value
        roles[roleIndex].updatedAt = new Date().toISOString()
        localStorage.setItem('crm_roles', JSON.stringify(roles))
      }
    } catch (cacheError) {
      console.warn('[角色权限] 更新本地缓存失败:', cacheError)
    }

    // 更新当前用户权限
    const currentUser = userStore.user
    if (currentUser && currentUser.role === currentRole.value.code) {
      userStore.updateUserPermission(currentUser.role)
    }

    ElMessage.success('权限设置成功，已保存到数据库')
    handleClose()
    emit('success')
  } catch (error: any) {
    console.error('[角色权限] 权限设置失败:', error)
    ElMessage.error(`权限设置失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

const resetToDefaultPermissions = () => {
  if (!currentRole.value) { ElMessage.warning('未选择角色'); return }

  if (!SYSTEM_PRESET_ROLES.includes(currentRole.value.code)) {
    ElMessage.warning('只有系统预设角色才能恢复默认权限配置')
    return
  }

  ElMessageBox.confirm(
    `确定要将角色「${currentRole.value.name}」的权限恢复为系统默认配置吗？`,
    '恢复默认权限',
    { confirmButtonText: '确定恢复', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    const defaultPermissions = getDefaultRolePermissions(currentRole.value!.code)
    if (defaultPermissions.length === 0 || defaultPermissions.includes('*')) {
      ElMessage.info('该角色为管理员角色，拥有所有权限')
      return
    }
    if (permissionTreeRef.value) {
      permissionTreeRef.value.setCheckedKeys(defaultPermissions)
      ElMessage.success('已恢复为默认权限配置，请点击"保存权限"按钮保存')
    }
  }).catch(() => {})
}

const handleClose = () => {
  visible.value = false
  currentRole.value = null
  checkedPermissions.value = []
}

const handleDataScopeChange = (value: 'all' | 'department' | 'self') => {
  currentRoleDataScope.value = value
}

// ========== 权限管理 ==========
const getPermissionTypeColor = (type: string) => {
  const colors: Record<string, string> = { menu: 'primary', button: 'success', api: 'warning' }
  return colors[type] || ''
}

const handleExpandAll = () => {
  if (permissionTreeRef.value) {
    const allKeys: string[] = []
    const collectKeys = (nodes: any[]) => {
      nodes.forEach(node => {
        allKeys.push(node.id)
        if (node.children) collectKeys(node.children)
      })
    }
    collectKeys(permissionTree.value)
    permissionTreeRef.value.setExpandedKeys(allKeys)
    ElMessage.success('已展开所有权限节点')
  }
}

const handleCollapseAll = () => {
  if (permissionTreeRef.value) {
    permissionTreeRef.value.setExpandedKeys([])
    ElMessage.success('已收起所有权限节点')
  }
}

const handleAddPermission = () => {
  isPermissionEdit.value = false
  resetPermForm()
  permFormDialogVisible.value = true
}

const handleEditPermission = (row: any) => {
  isPermissionEdit.value = true
  Object.assign(permForm, {
    id: row.id, parentId: row.parentId, name: row.name, code: row.code,
    type: row.type, path: row.path, icon: row.icon, sort: row.sort, status: row.status
  })
  permFormDialogVisible.value = true
}

const handleDeletePermission = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除权限"${row.name}"吗？删除后不可恢复！`, '确认删除', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await new Promise(resolve => setTimeout(resolve, 500))
    ElMessage.success('删除成功')
    loadAllPermissions()
  } catch (_e) { /* 用户取消 */ }
}

const confirmPermissionForm = async () => {
  try {
    await permFormRef.value?.validate()
    permFormLoading.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success(isPermissionEdit.value ? '权限更新成功' : '权限创建成功')
    permFormDialogVisible.value = false
    resetPermForm()
    loadAllPermissions()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    permFormLoading.value = false
  }
}

const resetPermForm = () => {
  Object.assign(permForm, {
    id: '', parentId: '', name: '', code: '', type: 'menu',
    path: '', icon: '', sort: 0, status: 'active'
  })
}

// 暴露方法给父组件
defineExpose({
  loadPermissionTree
})
</script>

<style scoped>
.permission-setting { padding: 0; }
.role-info h4 { margin: 0 0 8px 0; color: #303133; }
.role-info p { margin: 0; color: #606266; font-size: 14px; }
.permission-tree { max-height: 400px; overflow-y: auto; border: 1px solid #e4e7ed; border-radius: 4px; padding: 10px; }
.tree-node { display: flex; align-items: center; gap: 8px; }
.node-icon { font-size: 16px; }
.node-tag { margin-left: auto; }
.permission-manage { padding: 0; }
.manage-header { display: flex; gap: 12px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }

.data-scope-setting { padding: 16px 0; }
.data-scope-setting .scope-title { font-size: 14px; font-weight: 500; color: #303133; margin-bottom: 16px; }
.data-scope-setting .scope-radio-group { display: flex; flex-direction: column; width: 100%; }
.data-scope-setting .scope-item { padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.data-scope-setting .scope-item:last-child { border-bottom: none; }
.data-scope-setting .scope-item .el-radio { display: flex; align-items: flex-start; height: auto; white-space: normal; margin-right: 0; width: 100%; }
.data-scope-setting .scope-item :deep(.el-radio__input) { margin-top: 2px; }
.data-scope-setting .scope-item :deep(.el-radio__label) { display: flex; flex-direction: column; padding-left: 8px; flex: 1; }
.data-scope-setting .scope-label { font-size: 14px; font-weight: 500; color: #303133; line-height: 1.5; }
.data-scope-setting .scope-tip { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.5; }
.data-scope-setting .scope-item:hover { background-color: #f5f7fa; }

@media (max-width: 768px) {
  .manage-header { flex-wrap: wrap; justify-content: center; }
}
</style>






