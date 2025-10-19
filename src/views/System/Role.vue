<template>
  <div class="role-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>角色权限管理</h2>
        <div class="stats-section">
          <el-card class="stat-card primary" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon primary">
                <el-icon><UserFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number primary">{{ roleStats.total }}</div>
                <div class="stat-title">角色总数</div>
                <div class="stat-desc">系统中所有角色数量</div>
              </div>
            </div>
          </el-card>
          
          <el-card class="stat-card success" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon success">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number success">{{ roleStats.active }}</div>
                <div class="stat-title">启用角色</div>
                <div class="stat-desc">当前启用的角色数量</div>
              </div>
            </div>
          </el-card>
          
          <el-card class="stat-card warning" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon warning">
                <el-icon><Lock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number warning">{{ roleStats.permissions }}</div>
                <div class="stat-title">权限总数</div>
                <div class="stat-desc">系统中所有权限数量</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
      <div class="header-actions">
        <el-button 
          v-if="canAddRole"
          @click="handleAdd" 
          type="primary" 
          :icon="Plus"
        >
          新增角色
        </el-button>
        <el-button 
          v-if="canManagePermissions"
          @click="handlePermissionManage" 
          :icon="Setting"
        >
          权限管理
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="角色名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入角色名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="searchForm.createTimeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary" :icon="Search">
            搜索
          </el-button>
          <el-button @click="handleReset" :icon="Refresh">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>角色列表</span>
          <div class="table-actions">
            <el-button
              v-if="canDeleteRole"
              @click="handleBatchDelete"
              :disabled="!selectedRoles.length"
              type="danger"
              size="small"
              :icon="Delete"
            >
              批量删除
            </el-button>
            <el-button
              v-if="canBatchOperation"
              @click="handleBatchStatus('active')"
              :disabled="!selectedRoles.length"
              size="small"
              :icon="Check"
            >
              批量启用
            </el-button>
            <el-button
              v-if="canBatchOperation"
              @click="handleBatchStatus('inactive')"
              :disabled="!selectedRoles.length"
              size="small"
              :icon="Close"
            >
              批量禁用
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="roleList"
        v-loading="tableLoading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="code" label="角色编码" width="150" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户数量" width="100">
          <template #default="{ row }">
            <el-link @click="handleViewUsers(row)" type="primary">
              {{ row.userCount }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="权限数量" width="100">
          <template #default="{ row }">
            <el-link @click="handleViewPermissions(row)" type="primary">
              {{ row.permissionCount }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="canEditRole"
              @click="handleEdit(row)" 
              type="primary" 
              size="small" 
              link
            >
              编辑
            </el-button>
            <el-button 
              v-if="canAssignPermissions"
              @click="handlePermissions(row)" 
              type="primary" 
              size="small" 
              link
            >
              权限设置
            </el-button>
            <el-dropdown 
              v-if="canEditRole || canDeleteRole"
              @command="(cmd) => handleDropdownCommand(cmd, row)"
            >
              <el-button type="primary" size="small" link>
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    v-if="canEditRole"
                    command="copy"
                  >
                    复制角色
                  </el-dropdown-item>
                  <el-dropdown-item 
                    v-if="canEditRole"
                    command="toggle"
                  >
                    {{ row.status === 'active' ? '禁用' : '启用' }}
                  </el-dropdown-item>
                  <el-dropdown-item 
                    v-if="canDeleteRole"
                    command="delete" 
                    divided 
                    class="danger-item"
                  >
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑角色对话框 -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="dialogTitle"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="roleFormRef"
        :model="roleForm"
        :rules="roleFormRules"
        label-width="100px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input
            v-model="roleForm.name"
            placeholder="请输入角色名称"
          />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="roleForm.code"
            placeholder="请输入角色编码"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="roleForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button @click="confirmRole" type="primary" :loading="roleLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限设置对话框 -->
    <el-dialog
      v-model="permissionDialogVisible"
      title="权限设置"
      width="800px"
      :before-close="handlePermissionDialogClose"
    >
      <div class="permission-setting">
        <div class="role-info">
          <h4>角色：{{ currentRole?.name }}</h4>
          <p>{{ currentRole?.description }}</p>
        </div>
        
        <el-divider />
        
        <div class="permission-tree">
          <el-tree
            ref="permissionTreeRef"
            :data="permissionTree"
            :props="treeProps"
            show-checkbox
            node-key="id"
            :default-checked-keys="checkedPermissions"
            @check="handlePermissionCheck"
          >
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
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePermissionDialogClose">取消</el-button>
          <el-button @click="confirmPermissions" type="primary" :loading="permissionLoading">
            保存权限
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限管理对话框 -->
    <el-dialog
      v-model="permissionManageDialogVisible"
      title="权限管理"
      width="1000px"
    >
      <div class="permission-manage">
        <div class="manage-header">
          <el-button @click="handleAddPermission" type="primary" :icon="Plus">
            新增权限
          </el-button>
          <el-button @click="handleExpandAll" :icon="Expand">
            展开全部
          </el-button>
          <el-button @click="handleCollapseAll" :icon="Fold">
            收起全部
          </el-button>
        </div>
        
        <el-table
          :data="allPermissions"
          row-key="id"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
          style="width: 100%; margin-top: 20px"
        >
          <el-table-column prop="name" label="权限名称" width="200" />
          <el-table-column prop="code" label="权限编码" width="200" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getPermissionTypeColor(row.type)" size="small">
                {{ row.type }}
              </el-tag>
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
              <el-button @click="handleEditPermission(row)" type="primary" size="small" link>
                编辑
              </el-button>
              <el-button @click="handleDeletePermission(row)" type="danger" size="small" link>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 新增/编辑权限对话框 -->
    <el-dialog
      v-model="permissionFormDialogVisible"
      :title="permissionDialogTitle"
      width="500px"
    >
      <el-form
        ref="permissionFormRef"
        :model="permissionForm"
        :rules="permissionFormRules"
        label-width="100px"
      >
        <el-form-item label="上级权限" prop="parentId">
          <el-tree-select
            v-model="permissionForm.parentId"
            :data="permissionTreeSelect"
            :props="{ label: 'name', value: 'id' }"
            placeholder="请选择上级权限"
            clearable
            check-strictly
          />
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input
            v-model="permissionForm.name"
            placeholder="请输入权限名称"
          />
        </el-form-item>
        <el-form-item label="权限编码" prop="code">
          <el-input
            v-model="permissionForm.code"
            placeholder="请输入权限编码"
          />
        </el-form-item>
        <el-form-item label="权限类型" prop="type">
          <el-select v-model="permissionForm.type" placeholder="请选择权限类型">
            <el-option label="菜单" value="menu" />
            <el-option label="按钮" value="button" />
            <el-option label="接口" value="api" />
          </el-select>
        </el-form-item>
        <el-form-item label="路径" prop="path">
          <el-input
            v-model="permissionForm.path"
            placeholder="请输入路径"
          />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input
            v-model="permissionForm.icon"
            placeholder="请输入图标名称"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="permissionForm.sort"
            :min="0"
            placeholder="排序"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="permissionForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="permissionFormDialogVisible = false">取消</el-button>
          <el-button @click="confirmPermissionForm" type="primary" :loading="permissionFormLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import permissionService from '@/services/permissionService'
import { rolePermissionService } from '@/services/rolePermissionService'
import { roleApiService } from '@/services/roleApiService'
import {
  Plus,
  Setting,
  Search,
  Refresh,
  Delete,
  Check,
  Close,
  ArrowDown,
  Expand,
  Fold,
  UserFilled,
  User,
  Lock,
  Key,
  Headset
} from '@element-plus/icons-vue'

// 接口定义
interface RoleData {
  id: string
  name: string
  code: string
  status: string
  description?: string
  createTime?: string
  userCount?: number
  permissions?: string[]
}

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

interface TreeSelectData {
  id: string
  label: string
  children?: TreeSelectData[]
}

// 用户store
const userStore = useUserStore()

// 响应式数据
const tableLoading = ref(false)
const roleLoading = ref(false)
const permissionLoading = ref(false)
const permissionFormLoading = ref(false)
const roleDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const permissionManageDialogVisible = ref(false)
const permissionFormDialogVisible = ref(false)
const isEdit = ref(false)
const isPermissionEdit = ref(false)
const selectedRoles = ref([])
const currentRole = ref(null)
const checkedPermissions = ref([])

// 角色统计
const roleStats = ref({
  total: 0,
  active: 0,
  permissions: 0
})

// 搜索表单
const searchForm = reactive({
  name: '',
  status: '',
  createTimeRange: []
})

// 角色表单
const roleForm = reactive({
  id: '',
  name: '',
  code: '',
  status: 'active',
  description: ''
})

// 权限表单
const permissionForm = reactive({
  id: '',
  parentId: '',
  name: '',
  code: '',
  type: 'menu',
  path: '',
  icon: '',
  sort: 0,
  status: 'active'
})

// 角色列表
const roleList = ref([])

// 权限树
const permissionTree = ref([])
const allPermissions = ref([])
const permissionTreeSelect = ref([])

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 树形组件属性
const treeProps = {
  children: 'children',
  label: 'name'
}

// 表单验证规则
const roleFormRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[A-Z_]+$/, message: '角色编码只能包含大写字母和下划线', trigger: 'blur' }
  ]
}

const permissionFormRules = {
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入权限编码', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择权限类型', trigger: 'change' }
  ]
}

// 表单引用
const roleFormRef = ref()
const permissionFormRef = ref()
const permissionTreeRef = ref()

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑角色' : '新增角色')
const permissionDialogTitle = computed(() => isPermissionEdit.value ? '编辑权限' : '新增权限')

// 权限控制计算属性
const canAddRole = computed(() => {
  return userStore.isAdmin
})

const canEditRole = computed(() => {
  return userStore.isAdmin
})

const canDeleteRole = computed(() => {
  return userStore.isAdmin
})

const canManagePermissions = computed(() => {
  return userStore.isAdmin
})

const canAssignPermissions = computed(() => {
  return userStore.isAdmin
})

const canBatchOperation = computed(() => {
  return userStore.isAdmin
})

// 方法定义
/**
 * 获取权限类型颜色
 */
const getPermissionTypeColor = (type: string) => {
  const colors = {
    menu: 'primary',
    button: 'success',
    api: 'warning'
  }
  return colors[type] || ''
}

/**
 * 新增角色
 */
const handleAdd = () => {
  isEdit.value = false
  resetRoleForm()
  roleDialogVisible.value = true
}

/**
 * 编辑角色
 */
const handleEdit = (row: RoleData) => {
  isEdit.value = true
  Object.assign(roleForm, {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    description: row.description
  })
  roleDialogVisible.value = true
}

/**
 * 权限设置
 */
const handlePermissions = (row: RoleData) => {
  currentRole.value = row
  checkedPermissions.value = row.permissions || []
  permissionDialogVisible.value = true
}

/**
 * 权限管理
 */
const handlePermissionManage = () => {
  loadAllPermissions()
  permissionManageDialogVisible.value = true
}

/**
 * 查看用户
 */
const handleViewUsers = (row: RoleData) => {
  ElMessage.info(`查看角色"${row.name}"的用户列表功能开发中...`)
}

/**
 * 查看权限
 */
const handleViewPermissions = (row: RoleData) => {
  ElMessage.info(`查看角色"${row.name}"的权限列表功能开发中...`)
}

/**
 * 下拉菜单命令处理
 */
const handleDropdownCommand = (command: string, row: RoleData) => {
  switch (command) {
    case 'copy':
      handleCopy(row)
      break
    case 'toggle':
      handleToggleStatus(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

/**
 * 复制角色
 */
const handleCopy = (row: RoleData) => {
  isEdit.value = false
  Object.assign(roleForm, {
    id: '',
    name: `${row.name}_副本`,
    code: `${row.code}_COPY`,
    status: row.status,
    description: row.description
  })
  roleDialogVisible.value = true
}

/**
 * 切换角色状态
 */
const handleToggleStatus = async (row: RoleData) => {
  const action = row.status === 'active' ? '禁用' : '启用'
  
  try {
    await ElMessageBox.confirm(
      `确定要${action}角色"${row.name}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用真实API切换角色状态
    const newStatus = row.status === 'active' ? 'inactive' : 'active'
    await roleApiService.updateRole(row.id, { ...row, status: newStatus })
    
    row.status = newStatus
    ElMessage.success(`${action}成功`)
    
    // 重新加载角色统计数据
    await loadRoleStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换角色状态失败:', error)
      ElMessage.error(`${action}失败，请重试`)
    }
  }
}

/**
 * 删除角色
 */
const handleDelete = async (row: RoleData) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除角色"${row.name}"吗？删除后不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用真实API删除角色
    await roleApiService.deleteRole(row.id)
    
    ElMessage.success('删除成功')
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    if (error.message && error.message !== 'cancel') {
      console.error('删除角色失败:', error)
      ElMessage.error('删除失败')
    }
    // 用户取消操作时不显示错误
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRoles.value.length} 个角色吗？删除后不可恢复！`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用真实API批量删除角色
    const roleIds = selectedRoles.value.map(role => role.id)
    await roleApiService.batchDeleteRoles(roleIds)
    
    ElMessage.success('批量删除成功')
    selectedRoles.value = []
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    if (error.message && error.message !== 'cancel') {
      console.error('批量删除角色失败:', error)
      ElMessage.error('批量删除失败')
    }
    // 用户取消操作时不显示错误
  }
}

/**
 * 批量状态操作
 */
const handleBatchStatus = async (status: string) => {
  const action = status === 'active' ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(
      `确定要${action}选中的 ${selectedRoles.value.length} 个角色吗？`,
      `确认批量${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用真实API批量更新角色状态
    const roleIds = selectedRoles.value.map(role => role.id)
    await roleApiService.batchUpdateRoleStatus(roleIds, status)
    
    ElMessage.success(`批量${action}成功`)
    selectedRoles.value = []
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量更新角色状态失败:', error)
      ElMessage.error(`批量${action}失败，请重试`)
    }
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadRoleList()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    name: '',
    status: '',
    createTimeRange: []
  })
  handleSearch()
}

/**
 * 选择变化
 */
const handleSelectionChange = (selection: RoleData[]) => {
  selectedRoles.value = selection
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size: number) => {
  pagination.size = size
  loadRoleList()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadRoleList()
}

/**
 * 权限选择变化
 */
const handlePermissionCheck = (data: PermissionData, checked: boolean) => {
  // 获取当前选中的权限
  const checkedKeys = permissionTreeRef.value?.getCheckedKeys() || []
  const halfCheckedKeys = permissionTreeRef.value?.getHalfCheckedKeys() || []
  
  // 处理父子权限的级联选择逻辑
  if (checked) {
    // 选中时，自动选中所有父级权限
    const parentIds = getParentIds(data.id, permissionTree.value)
    parentIds.forEach(parentId => {
      if (!checkedKeys.includes(parentId)) {
        checkedKeys.push(parentId)
      }
    })
  } else {
    // 取消选中时，如果没有子权限被选中，则取消父级权限
    const childIds = getChildIds(data.id, permissionTree.value)
    const hasSelectedChildren = childIds.some(childId => checkedKeys.includes(childId))
    
    if (!hasSelectedChildren) {
      const parentIds = getParentIds(data.id, permissionTree.value)
      parentIds.forEach(parentId => {
        const siblings = getSiblingIds(parentId, permissionTree.value)
        const hasSelectedSiblings = siblings.some(siblingId => 
          siblingId !== data.id && checkedKeys.includes(siblingId)
        )
        
        if (!hasSelectedSiblings) {
          const index = checkedKeys.indexOf(parentId)
          if (index > -1) {
            checkedKeys.splice(index, 1)
          }
        }
      })
    }
  }
  
  // 更新选中的权限
  checkedPermissions.value = [...checkedKeys, ...halfCheckedKeys]
  
  console.log('权限选择变化:', {
    permission: data.name,
    checked,
    totalSelected: checkedPermissions.value.length
  })
}

/**
 * 展开全部
 */
const handleExpandAll = () => {
  if (permissionTreeRef.value) {
    // 获取所有节点的key
    const allKeys: string[] = []
    const collectKeys = (nodes: PermissionData[]) => {
      nodes.forEach(node => {
        allKeys.push(node.id)
        if (node.children) {
          collectKeys(node.children)
        }
      })
    }
    collectKeys(permissionTree.value)
    
    // 展开所有节点
    permissionTreeRef.value.setExpandedKeys(allKeys)
    ElMessage.success('已展开所有权限节点')
  }
}

/**
 * 收起全部
 */
const handleCollapseAll = () => {
  if (permissionTreeRef.value) {
    // 收起所有节点
    permissionTreeRef.value.setExpandedKeys([])
    ElMessage.success('已收起所有权限节点')
  }
}

/**
 * 新增权限
 */
const handleAddPermission = () => {
  isPermissionEdit.value = false
  resetPermissionForm()
  permissionFormDialogVisible.value = true
}

/**
 * 编辑权限
 */
const handleEditPermission = (row: PermissionData) => {
  isPermissionEdit.value = true
  Object.assign(permissionForm, {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    code: row.code,
    type: row.type,
    path: row.path,
    icon: row.icon,
    sort: row.sort,
    status: row.status
  })
  permissionFormDialogVisible.value = true
}

/**
 * 删除权限
 */
const handleDeletePermission = async (row: PermissionData) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除权限"${row.name}"吗？删除后不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    ElMessage.success('删除成功')
    loadAllPermissions()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 确认角色操作
 */
const confirmRole = async () => {
  try {
    await roleFormRef.value?.validate()
    
    roleLoading.value = true
    
    if (isEdit.value) {
      // 更新角色
      await roleApiService.updateRole(roleForm.id, {
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        status: roleForm.status
      })
      ElMessage.success('角色更新成功')
    } else {
      // 创建角色
      await roleApiService.createRole({
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        status: roleForm.status
      })
      ElMessage.success('角色创建成功')
    }
    
    handleDialogClose()
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    console.error('角色操作失败:', error)
    ElMessage.error(isEdit.value ? '角色更新失败' : '角色创建失败')
  } finally {
    roleLoading.value = false
  }
}

/**
 * 确认权限设置
 */
const confirmPermissions = async () => {
  try {
    permissionLoading.value = true
    
    // 获取选中的权限
    const checkedKeys = permissionTreeRef.value?.getCheckedKeys()
    
    if (!currentRole.value) {
      ElMessage.error('未选择角色')
      return
    }
    
    // 调用真正的API保存角色权限
    await rolePermissionService.saveRolePermissions(currentRole.value.id, checkedKeys || [])
    
    ElMessage.success('权限设置成功')
    handlePermissionDialogClose()
    loadRoleList()
  } catch (error) {
    console.error('权限设置失败:', error)
    ElMessage.error('权限设置失败')
  } finally {
    permissionLoading.value = false
  }
}

/**
 * 确认权限表单
 */
const confirmPermissionForm = async () => {
  try {
    await permissionFormRef.value?.validate()
    
    permissionFormLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success(isPermissionEdit.value ? '权限更新成功' : '权限创建成功')
    permissionFormDialogVisible.value = false
    resetPermissionForm()
    loadAllPermissions()
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    permissionFormLoading.value = false
  }
}

/**
 * 关闭角色对话框
 */
const handleDialogClose = () => {
  roleDialogVisible.value = false
  roleFormRef.value?.clearValidate()
  resetRoleForm()
}

/**
 * 关闭权限对话框
 */
const handlePermissionDialogClose = () => {
  permissionDialogVisible.value = false
  currentRole.value = null
  checkedPermissions.value = []
}

/**
 * 重置角色表单
 */
const resetRoleForm = () => {
  Object.assign(roleForm, {
    id: '',
    name: '',
    code: '',
    status: 'active',
    description: ''
  })
}

/**
 * 重置权限表单
 */
const resetPermissionForm = () => {
  Object.assign(permissionForm, {
    id: '',
    parentId: '',
    name: '',
    code: '',
    type: 'menu',
    path: '',
    icon: '',
    sort: 0,
    status: 'active'
  })
}

/**
 * 加载角色统计
 */
const loadRoleStats = async () => {
  try {
    // 调用真实API获取角色统计
    const stats = await roleApiService.getRoleStats()
    
    roleStats.value = {
      total: stats.total || 0,
      active: stats.active || 0,
      permissions: stats.permissions || 0
    }
  } catch (error) {
    console.error('加载角色统计失败:', error)
    ElMessage.error('加载统计数据失败')
    
    // 降级到默认数据
    roleStats.value = {
      total: 0,
      active: 0,
      permissions: 0
    }
  }
}

/**
 * 加载角色列表
 */
const loadRoleList = async () => {
  try {
    tableLoading.value = true
    
    // 调用真实API
    const roles = await roleApiService.getRoles()
    
    // 转换数据格式以适配前端显示
    roleList.value = roles.map(role => ({
      id: role.id,
      name: role.name,
      code: role.code,
      status: role.status,
      userCount: role.userCount || 0,
      permissionCount: role.permissionCount || 0,
      description: role.description || '',
      createTime: role.createdAt ? new Date(role.createdAt).toLocaleString() : '',
      permissions: role.permissions || []
    }))
    
    pagination.total = roles.length
  } catch (error) {
    console.error('加载角色列表失败:', error)
    ElMessage.error('加载角色列表失败')
  } finally {
    tableLoading.value = false
  }
}

// 加载权限树 - 使用统一权限服务
const loadPermissionTree = async () => {
  try {
    // 使用统一权限服务获取权限树
    const allPermissions = permissionService.getAllPermissions();
    permissionTree.value = allPermissions;
    console.log('权限树加载成功');
  } catch (error) {
    console.error('加载权限树失败:', error);
    
    // 降级到本地权限树
    permissionTree.value = [
       {
         id: 'system',
         name: '系统管理',
         icon: 'Setting',
         type: 'menu',
         children: [
           {
             id: 'system.department',
             name: '部门管理',
             icon: 'OfficeBuilding',
             type: 'menu',
             children: [
               { id: 'system.department.view', name: '查看部门', type: 'action' },
               { id: 'system.department.create', name: '新增部门', type: 'action' },
               { id: 'system.department.edit', name: '编辑部门', type: 'action' },
               { id: 'system.department.delete', name: '删除部门', type: 'action' },
               { id: 'system.department.manage', name: '管理部门', type: 'action' }
             ]
           },
           {
             id: 'system.user',
             name: '用户管理',
             icon: 'User',
             type: 'menu',
             children: [
               { id: 'system.user.view', name: '查看用户', type: 'action' },
               { id: 'system.user.create', name: '新增用户', type: 'action' },
               { id: 'system.user.edit', name: '编辑用户', type: 'action' },
               { id: 'system.user.delete', name: '删除用户', type: 'action' },
               { id: 'system.user.resetPassword', name: '重置密码', type: 'action' },
               { id: 'system.user.setPermissions', name: '权限设置', type: 'action' },
               { id: 'system.user.viewLogs', name: '操作日志', type: 'action' }
             ]
           },
           {
             id: 'system.role',
             name: '角色权限',
             icon: 'UserFilled',
             type: 'menu',
             children: [
               { id: 'system.role.view', name: '查看角色', type: 'action' },
               { id: 'system.role.create', name: '新增角色', type: 'action' },
               { id: 'system.role.edit', name: '编辑角色', type: 'action' },
               { id: 'system.role.delete', name: '删除角色', type: 'action' },
               { id: 'system.role.setPermissions', name: '设置权限', type: 'action' }
             ]
           },
           {
             id: 'system.permission',
             name: '权限管理',
             icon: 'Lock',
             type: 'menu',
             children: [
               { id: 'system.permission.view', name: '查看权限', type: 'action' },
               { id: 'system.permission.manage', name: '权限管理', type: 'action' },
               { id: 'system.permission.roleManage', name: '角色管理', type: 'action' },
               { id: 'system.permission.sensitivePermission', name: '敏感权限', type: 'action' },
               { id: 'system.permission.customerServiceManage', name: '客服管理', type: 'action' }
             ]
           },
           {
             id: 'system.superAdmin',
             name: '超管面板',
             icon: 'Crown',
             type: 'menu',
             children: [
               { id: 'system.superAdmin.view', name: '查看面板', type: 'action' },
               { id: 'system.superAdmin.editPermissions', name: '编辑权限', type: 'action' },
               { id: 'system.superAdmin.viewDetails', name: '查看详情', type: 'action' },
               { id: 'system.superAdmin.resetPassword', name: '重置密码', type: 'action' },
               { id: 'system.superAdmin.memberManage', name: '成员管理', type: 'action' },
               { id: 'system.superAdmin.permissionDetails', name: '权限详情', type: 'action' }
             ]
           },
           {
             id: 'system.customerService',
             name: '客服管理',
             icon: 'Headset',
             type: 'menu',
             children: [
               { id: 'system.customerService.view', name: '查看客服', type: 'action' },
               { id: 'system.customerService.manage', name: '管理客服', type: 'action' },
               { id: 'system.customerService.setPermissions', name: '设置权限', type: 'action' },
               { id: 'system.customerService.enableAll', name: '全部启用', type: 'action' },
               { id: 'system.customerService.disableAll', name: '全部禁用', type: 'action' }
             ]
           },
           {
             id: 'system.message',
             name: '消息管理',
             icon: 'ChatDotSquare',
             type: 'menu',
             children: [
               { id: 'system.message.view', name: '查看消息', type: 'action' },
               { id: 'system.message.send', name: '发送消息', type: 'action' },
               { id: 'system.message.delete', name: '删除消息', type: 'action' },
               { id: 'system.message.manage', name: '消息管理', type: 'action' }
             ]
           },
           {
             id: 'system.settings',
             name: '系统设置',
             icon: 'Tools',
             type: 'menu',
             children: [
               { id: 'system.settings.view', name: '查看设置', type: 'action' },
               { id: 'system.settings.edit', name: '编辑设置', type: 'action' },
               { id: 'system.settings.backup', name: '数据备份', type: 'action' },
               { id: 'system.settings.restore', name: '数据恢复', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'customer',
         name: '客户管理',
         icon: 'Avatar',
         type: 'menu',
         children: [
           {
             id: 'customer.list',
             name: '客户列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'customer.list.view', name: '查看客户', type: 'action' },
               { id: 'customer.list.export', name: '导出客户', type: 'action' },
               { id: 'customer.list.import', name: '导入客户', type: 'action' },
               { id: 'customer.list.edit', name: '编辑客户', type: 'action' },
               { id: 'customer.list.delete', name: '删除客户', type: 'action' },
               { id: 'customer.list.assign', name: '分配客户', type: 'action' },
               { id: 'customer.list.batchOperation', name: '批量操作', type: 'action' }
             ]
           },
           {
             id: 'customer.add',
             name: '新增客户',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'customer.add.create', name: '创建客户', type: 'action' }
             ]
           },
           {
             id: 'customer.tags',
             name: '客户标签',
             icon: 'PriceTag',
             type: 'menu',
             children: [
               { id: 'customer.tags.view', name: '查看标签', type: 'action' },
               { id: 'customer.tags.create', name: '新增标签', type: 'action' },
               { id: 'customer.tags.edit', name: '编辑标签', type: 'action' },
               { id: 'customer.tags.delete', name: '删除标签', type: 'action' },
               { id: 'customer.tags.assign', name: '分配标签', type: 'action' }
             ]
           },
           {
             id: 'customer.groups',
             name: '客户分组',
             icon: 'Collection',
             type: 'menu',
             children: [
               { id: 'customer.groups.view', name: '查看分组', type: 'action' },
               { id: 'customer.groups.create', name: '新增分组', type: 'action' },
               { id: 'customer.groups.edit', name: '编辑分组', type: 'action' },
               { id: 'customer.groups.delete', name: '删除分组', type: 'action' },
               { id: 'customer.groups.manage', name: '管理分组', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'order',
         name: '订单管理',
         icon: 'Document',
         type: 'menu',
         children: [
           {
             id: 'order.list',
             name: '订单列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'order.list.view', name: '查看订单', type: 'action' },
               { id: 'order.list.export', name: '导出订单', type: 'action' },
               { id: 'order.list.edit', name: '编辑订单', type: 'action' },
               { id: 'order.list.delete', name: '删除订单', type: 'action' },
               { id: 'order.list.cancel', name: '取消订单', type: 'action' },
               { id: 'order.list.batchOperation', name: '批量操作', type: 'action' }
             ]
           },
           {
             id: 'order.add',
             name: '新增订单',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'order.add.create', name: '创建订单', type: 'action' }
             ]
           },
           {
             id: 'order.audit',
             name: '订单审核',
             icon: 'DocumentChecked',
             type: 'menu',
             children: [
               { id: 'order.audit.view', name: '查看审核', type: 'action' },
               { id: 'order.audit.approve', name: '通过审核', type: 'action' },
               { id: 'order.audit.reject', name: '拒绝审核', type: 'action' },
               { id: 'order.audit.revoke', name: '撤销审核', type: 'action' },
               { id: 'order.audit.batchAudit', name: '批量审核', type: 'action' }
             ]
           },
           {
             id: 'order.audit',
             name: '订单审核',
             icon: 'CircleCheck',
             type: 'menu',
             children: [
               { id: 'order.audit.view', name: '查看待审核订单', type: 'action' },
               { id: 'order.audit.approve', name: '审核通过', type: 'action' },
               { id: 'order.audit.reject', name: '审核拒绝', type: 'action' },
               { id: 'order.audit.batch', name: '批量审核', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'service',
         name: '服务管理',
         icon: 'Headset',
         type: 'menu',
         children: [
           {
             id: 'service.ticket',
             name: '工单管理',
             icon: 'Tickets',
             type: 'menu',
             children: [
               { id: 'service.ticket.view', name: '查看工单', type: 'action' },
               { id: 'service.ticket.create', name: '创建工单', type: 'action' },
               { id: 'service.ticket.edit', name: '编辑工单', type: 'action' },
               { id: 'service.ticket.delete', name: '删除工单', type: 'action' },
               { id: 'service.ticket.assign', name: '分配工单', type: 'action' },
               { id: 'service.ticket.close', name: '关闭工单', type: 'action' },
               { id: 'service.ticket.export', name: '导出工单', type: 'action' }
             ]
           },
           {
             id: 'service.chat',
             name: '在线客服',
             icon: 'ChatDotRound',
             type: 'menu',
             children: [
               { id: 'service.chat.view', name: '查看对话', type: 'action' },
               { id: 'service.chat.reply', name: '回复消息', type: 'action' },
               { id: 'service.chat.transfer', name: '转接客服', type: 'action' },
               { id: 'service.chat.history', name: '查看历史', type: 'action' },
               { id: 'service.chat.settings', name: '客服设置', type: 'action' }
             ]
           },
           {
             id: 'service.knowledge',
             name: '知识库',
             icon: 'Collection',
             type: 'menu',
             children: [
               { id: 'service.knowledge.view', name: '查看知识库', type: 'action' },
               { id: 'service.knowledge.create', name: '创建文档', type: 'action' },
               { id: 'service.knowledge.edit', name: '编辑文档', type: 'action' },
               { id: 'service.knowledge.delete', name: '删除文档', type: 'action' },
               { id: 'service.knowledge.category', name: '分类管理', type: 'action' },
               { id: 'service.knowledge.publish', name: '发布文档', type: 'action' }
             ]
           },
           {
             id: 'service.call',
             name: '通话管理',
             icon: 'Phone',
             type: 'menu',
             children: [
               { id: 'service.call.view', name: '查看通话记录', type: 'action' },
               { id: 'service.call.make', name: '发起通话', type: 'action' },
               { id: 'service.call.record', name: '录音管理', type: 'action' },
               { id: 'service.call.statistics', name: '通话统计', type: 'action' }
             ]
           },
           {
             id: 'service.sms',
             name: '短信管理',
             icon: 'Message',
             type: 'menu',
             children: [
               { id: 'service.sms.view', name: '查看短信记录', type: 'action' },
               { id: 'service.sms.send', name: '发送短信', type: 'action' },
               { id: 'service.sms.template', name: '模板管理', type: 'action' },
               { id: 'service.sms.batch', name: '批量发送', type: 'action' },
               { id: 'service.sms.statistics', name: '短信统计', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'performance',
         name: '业绩统计',
         icon: 'TrendCharts',
         type: 'menu',
         children: [
           {
             id: 'performance.personal',
             name: '个人业绩',
             icon: 'User',
             type: 'menu',
             children: [
               { id: 'performance.personal.view', name: '查看个人业绩', type: 'action' },
               { id: 'performance.personal.export', name: '导出个人数据', type: 'action' }
             ]
           },
           {
             id: 'performance.team',
             name: '团队业绩',
             icon: 'UserFilled',
             type: 'menu',
             children: [
               { id: 'performance.team.view', name: '查看团队业绩', type: 'action' },
               { id: 'performance.team.export', name: '导出团队数据', type: 'action' },
               { id: 'performance.team.compare', name: '业绩对比', type: 'action' }
             ]
           },
           {
             id: 'performance.analysis',
             name: '业绩分析',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'performance.analysis.view', name: '查看分析报告', type: 'action' },
               { id: 'performance.analysis.trend', name: '趋势分析', type: 'action' },
               { id: 'performance.analysis.forecast', name: '业绩预测', type: 'action' }
             ]
           },
           {
             id: 'performance.share',
             name: '业绩分享',
             icon: 'Share',
             type: 'menu',
             children: [
               { id: 'performance.share.view', name: '查看分享', type: 'action' },
               { id: 'performance.share.create', name: '创建分享', type: 'action' },
               { id: 'performance.share.manage', name: '管理分享', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'logistics',
         name: '物流管理',
         icon: 'Van',
         type: 'menu',
         children: [
           {
             id: 'logistics.list',
             name: '物流列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'logistics.list.view', name: '查看物流列表', type: 'action' },
               { id: 'logistics.list.export', name: '导出物流数据', type: 'action' }
             ]
           },
           {
             id: 'logistics.track',
             name: '物流跟踪',
             icon: 'Position',
             type: 'menu',
             children: [
               { id: 'logistics.track.view', name: '查看跟踪信息', type: 'action' },
               { id: 'logistics.track.update', name: '更新跟踪状态', type: 'action' }
             ]
           },
           {
             id: 'logistics.companies',
             name: '物流公司',
             icon: 'OfficeBuilding',
             type: 'menu',
             children: [
               { id: 'logistics.companies.view', name: '查看物流公司', type: 'action' },
               { id: 'logistics.companies.create', name: '添加物流公司', type: 'action' },
               { id: 'logistics.companies.edit', name: '编辑物流公司', type: 'action' },
               { id: 'logistics.companies.delete', name: '删除物流公司', type: 'action' }
             ]
           },
           {
              id: 'logistics.shipping',
              name: '发货列表',
              icon: 'Box',
              type: 'menu',
              children: [
                { id: 'logistics.shipping.view', name: '查看发货列表', type: 'action' },
                { id: 'logistics.shipping.create', name: '创建发货单', type: 'action' },
                { id: 'logistics.shipping.edit', name: '编辑发货单', type: 'action' },
                { id: 'logistics.shipping.batchExport', name: '批量导出', type: 'action' }
              ]
            },
           {
             id: 'logistics.status',
             name: '状态更新',
             icon: 'Refresh',
             type: 'menu',
             children: [
               { id: 'logistics.status.view', name: '查看状态', type: 'action' },
               { id: 'logistics.status.update', name: '更新状态', type: 'action' },
               { id: 'logistics.status.batch', name: '批量更新', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'afterSales',
         name: '售后管理',
         icon: 'Tools',
         type: 'menu',
         children: [
           {
             id: 'afterSales.list',
             name: '售后订单',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'afterSales.list.view', name: '查看售后订单', type: 'action' },
               { id: 'afterSales.list.export', name: '导出售后数据', type: 'action' }
             ]
           },
           {
             id: 'afterSales.add',
             name: '新建售后',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'afterSales.add.create', name: '创建售后单', type: 'action' },
               { id: 'afterSales.add.batch', name: '批量创建', type: 'action' }
             ]
           },
           {
             id: 'afterSales.detail',
             name: '售后详情',
             icon: 'View',
             type: 'menu',
             children: [
               { id: 'afterSales.detail.view', name: '查看售后详情', type: 'action' },
               { id: 'afterSales.detail.edit', name: '编辑售后单', type: 'action' },
               { id: 'afterSales.detail.process', name: '处理售后', type: 'action' }
             ]
           },
           {
             id: 'afterSales.data',
             name: '售后数据',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'afterSales.data.view', name: '查看售后数据', type: 'action' },
               { id: 'afterSales.data.analysis', name: '售后分析', type: 'action' },
               { id: 'afterSales.data.report', name: '售后报告', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'data',
         name: '资料管理',
         icon: 'FolderOpened',
         type: 'menu',
         children: [
           {
             id: 'data.list',
             name: '资料列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'data.list.view', name: '查看资料列表', type: 'action' },
               { id: 'data.list.export', name: '导出资料', type: 'action' },
               { id: 'data.list.import', name: '导入资料', type: 'action' },
               { id: 'data.list.assign', name: '分配资料', type: 'action' }
             ]
           },
           {
             id: 'data.search',
             name: '客户查询',
             icon: 'Search',
             type: 'menu',
             children: [
               { id: 'data.search.basic', name: '基础查询', type: 'action' },
               { id: 'data.search.advanced', name: '高级查询', type: 'action' },
               { id: 'data.search.export', name: '导出查询结果', type: 'action' }
             ]
           },
           {
             id: 'data.recycle',
             name: '回收站',
             icon: 'Delete',
             type: 'menu',
             children: [
               { id: 'data.recycle.view', name: '查看回收站', type: 'action' },
               { id: 'data.recycle.restore', name: '恢复数据', type: 'action' },
               { id: 'data.recycle.delete', name: '彻底删除', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'product',
         name: '商品管理',
         icon: 'Goods',
         type: 'menu',
         children: [
           {
             id: 'product.list',
             name: '商品列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'product.list.view', name: '查看商品', type: 'action' },
               { id: 'product.list.export', name: '导出商品', type: 'action' },
               { id: 'product.list.edit', name: '编辑商品', type: 'action' },
               { id: 'product.list.delete', name: '删除商品', type: 'action' },
               { id: 'product.list.batchOperation', name: '批量操作', type: 'action' },
               { id: 'product.list.priceAdjust', name: '价格调整', type: 'action' }
             ]
           },
           {
             id: 'product.add',
             name: '新增商品',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'product.add.create', name: '创建商品', type: 'action' },
               { id: 'product.add.batchAdd', name: '批量新增', type: 'action' }
             ]
           },
           {
             id: 'product.category',
             name: '商品分类',
             icon: 'Collection',
             type: 'menu',
             children: [
               { id: 'product.category.view', name: '查看分类', type: 'action' },
               { id: 'product.category.create', name: '新增分类', type: 'action' },
               { id: 'product.category.edit', name: '编辑分类', type: 'action' },
               { id: 'product.category.delete', name: '删除分类', type: 'action' },
               { id: 'product.category.manage', name: '管理分类', type: 'action' }
             ]
           },
           {
             id: 'product.inventory',
             name: '库存管理',
             icon: 'Box',
             type: 'menu',
             children: [
               { id: 'product.inventory.view', name: '查看库存', type: 'action' },
               { id: 'product.inventory.adjust', name: '调整库存', type: 'action' },
               { id: 'product.inventory.inbound', name: '入库操作', type: 'action' },
               { id: 'product.inventory.outbound', name: '出库操作', type: 'action' },
               { id: 'product.inventory.transfer', name: '转移库存', type: 'action' },
               { id: 'product.inventory.alert', name: '预警设置', type: 'action' }
             ]
           },
           {
             id: 'product.analytics',
             name: '商品分析',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'product.analytics.view', name: '查看分析', type: 'action' },
               { id: 'product.analytics.sales', name: '销售分析', type: 'action' },
               { id: 'product.analytics.profit', name: '利润分析', type: 'action' },
               { id: 'product.analytics.trend', name: '趋势分析', type: 'action' },
               { id: 'product.analytics.exportReport', name: '导出报表', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'data',
         name: '资料管理',
         icon: 'FolderOpened',
         type: 'menu',
         children: [
           {
             id: 'data.list',
             name: '资料列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'data.list.view', name: '查看资料列表', type: 'action' },
               { id: 'data.list.export', name: '导出资料', type: 'action' },
               { id: 'data.list.import', name: '导入资料', type: 'action' },
               { id: 'data.list.assign', name: '分配资料', type: 'action' }
             ]
           },
           {
             id: 'data.search',
             name: '客户查询',
             icon: 'Search',
             type: 'menu',
             children: [
               { id: 'data.search.basic', name: '基础查询', type: 'action' },
               { id: 'data.search.advanced', name: '高级查询', type: 'action' },
               { id: 'data.search.export', name: '导出查询结果', type: 'action' }
             ]
           },
           {
             id: 'data.recycle',
             name: '回收站',
             icon: 'Delete',
             type: 'menu',
             children: [
               { id: 'data.recycle.view', name: '查看回收站', type: 'action' },
               { id: 'data.recycle.restore', name: '恢复数据', type: 'action' },
               { id: 'data.recycle.delete', name: '彻底删除', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'performance',
         name: '业绩统计',
         icon: 'TrendCharts',
         type: 'menu',
         children: [
           {
             id: 'performance.personal',
             name: '个人业绩',
             icon: 'User',
             type: 'menu',
             children: [
               { id: 'performance.personal.view', name: '查看个人业绩', type: 'action' },
               { id: 'performance.personal.export', name: '导出个人数据', type: 'action' }
             ]
           },
           {
             id: 'performance.team',
             name: '团队业绩',
             icon: 'UserFilled',
             type: 'menu',
             children: [
               { id: 'performance.team.view', name: '查看团队业绩', type: 'action' },
               { id: 'performance.team.export', name: '导出团队数据', type: 'action' },
               { id: 'performance.team.compare', name: '业绩对比', type: 'action' }
             ]
           },
           {
             id: 'performance.analysis',
             name: '业绩分析',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'performance.analysis.view', name: '查看分析报告', type: 'action' },
               { id: 'performance.analysis.trend', name: '趋势分析', type: 'action' },
               { id: 'performance.analysis.forecast', name: '业绩预测', type: 'action' }
             ]
           },
           {
             id: 'performance.share',
             name: '业绩分享',
             icon: 'Share',
             type: 'menu',
             children: [
               { id: 'performance.share.view', name: '查看分享', type: 'action' },
               { id: 'performance.share.create', name: '创建分享', type: 'action' },
               { id: 'performance.share.manage', name: '管理分享', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'afterSales',
         name: '售后管理',
         icon: 'Tools',
         type: 'menu',
         children: [
           {
             id: 'afterSales.list',
             name: '售后订单',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'afterSales.list.view', name: '查看售后订单', type: 'action' },
               { id: 'afterSales.list.export', name: '导出售后数据', type: 'action' }
             ]
           },
           {
             id: 'afterSales.add',
             name: '新建售后',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'afterSales.add.create', name: '创建售后单', type: 'action' },
               { id: 'afterSales.add.batch', name: '批量创建', type: 'action' }
             ]
           },
           {
             id: 'afterSales.detail',
             name: '售后详情',
             icon: 'View',
             type: 'menu',
             children: [
               { id: 'afterSales.detail.view', name: '查看售后详情', type: 'action' },
               { id: 'afterSales.detail.edit', name: '编辑售后单', type: 'action' },
               { id: 'afterSales.detail.process', name: '处理售后', type: 'action' }
             ]
           },
           {
             id: 'afterSales.data',
             name: '售后数据',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'afterSales.data.view', name: '查看售后数据', type: 'action' },
               { id: 'afterSales.data.analysis', name: '售后分析', type: 'action' },
               { id: 'afterSales.data.report', name: '售后报告', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'logistics',
         name: '物流管理',
         icon: 'Van',
         type: 'menu',
         children: [
           {
             id: 'logistics.list',
             name: '物流列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'logistics.list.view', name: '查看物流列表', type: 'action' },
               { id: 'logistics.list.export', name: '导出物流数据', type: 'action' }
             ]
           },
           {
             id: 'logistics.track',
             name: '物流跟踪',
             icon: 'Position',
             type: 'menu',
             children: [
               { id: 'logistics.track.view', name: '查看跟踪信息', type: 'action' },
               { id: 'logistics.track.update', name: '更新跟踪状态', type: 'action' }
             ]
           },
           {
             id: 'logistics.companies',
             name: '物流公司',
             icon: 'OfficeBuilding',
             type: 'menu',
             children: [
               { id: 'logistics.companies.view', name: '查看物流公司', type: 'action' },
               { id: 'logistics.companies.create', name: '添加物流公司', type: 'action' },
               { id: 'logistics.companies.edit', name: '编辑物流公司', type: 'action' },
               { id: 'logistics.companies.delete', name: '删除物流公司', type: 'action' }
             ]
           },
           {
             id: 'logistics.shipping',
             name: '发货列表',
             icon: 'Box',
             type: 'menu',
             children: [
               { id: 'logistics.shipping.view', name: '查看发货列表', type: 'action' },
               { id: 'logistics.shipping.create', name: '创建发货单', type: 'action' },
               { id: 'logistics.shipping.edit', name: '编辑发货单', type: 'action' },
               { id: 'logistics.shipping.batchExport', name: '批量导出', type: 'action' }
             ]
           },
           {
             id: 'logistics.status',
             name: '状态更新',
             icon: 'Refresh',
             type: 'menu',
             children: [
               { id: 'logistics.status.view', name: '查看状态', type: 'action' },
               { id: 'logistics.status.update', name: '更新状态', type: 'action' },
               { id: 'logistics.status.batch', name: '批量更新', type: 'action' }
             ]
           }
         ]
       }
     ];
  } finally {
    // 构建权限树选择数据
    permissionTreeSelect.value = buildTreeSelect(permissionTree.value);
  }
}
/**
 * 加载所有权限 - 使用统一权限服务
 */
const loadAllPermissions = async () => {
  try {
    // 使用统一权限服务获取所有权限
    const permissions = permissionService.getAllPermissions()
    allPermissions.value = permissions;
    console.log('所有权限加载成功');
  } catch (error) {
    console.error('加载所有权限失败:', error);
    
    // 降级到本地权限数据
    allPermissions.value = [
      {
        id: 'system',
        name: '系统管理',
        code: 'system',
        type: 'menu',
        path: '/system',
        icon: 'Setting',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'system.user',
            name: '用户管理',
            code: 'system.user',
            type: 'menu',
            path: '/system/user',
            icon: 'User',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'system.user.view',
                name: '查看用户',
                code: 'system.user.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'system.user.create',
                name: '创建用户',
                code: 'system.user.create',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'system.user.edit',
                name: '编辑用户',
                code: 'system.user.edit',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'system.user.delete',
                name: '删除用户',
                code: 'system.user.delete',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          },
          {
            id: 'system.role',
            name: '角色管理',
            code: 'system.role',
            type: 'menu',
            path: '/system/role',
            icon: 'UserFilled',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'system.role.view',
                name: '查看角色',
                code: 'system.role.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'system.role.create',
                name: '创建角色',
                code: 'system.role.create',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'system.role.edit',
                name: '编辑角色',
                code: 'system.role.edit',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'system.role.delete',
                name: '删除角色',
                code: 'system.role.delete',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          },
          {
            id: 'system.permission',
            name: '权限管理',
            code: 'system.permission',
            type: 'menu',
            path: '/system/permission',
            icon: 'Lock',
            sort: 3,
            status: 'active',
            children: [
              {
                id: 'system.permission.view',
                name: '查看权限',
                code: 'system.permission.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'system.permission.assign',
                name: '分配权限',
                code: 'system.permission.assign',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          }
        ]
      },
      {
        id: 'customer',
        name: '客户管理',
        code: 'customer',
        type: 'menu',
        path: '/customer',
        icon: 'Avatar',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'customer.list',
            name: '客户列表',
            code: 'customer.list',
            type: 'menu',
            path: '/customer/list',
            icon: 'List',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'customer.list.view',
                name: '查看客户列表',
                code: 'customer.list.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'customer.list.export',
                name: '导出客户数据',
                code: 'customer.list.export',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'customer.detail',
            name: '客户详情',
            code: 'customer.detail',
            type: 'menu',
            path: '/customer/detail',
            icon: 'View',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'customer.detail.view',
                name: '查看客户详情',
                code: 'customer.detail.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'customer.detail.edit',
                name: '编辑客户信息',
                code: 'customer.detail.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'customer.manage',
            name: '客户操作',
            code: 'customer.manage',
            type: 'menu',
            icon: 'Operation',
            sort: 3,
            status: 'active',
            children: [
              {
                id: 'customer.manage.create',
                name: '新增客户',
                code: 'customer.manage.create',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'customer.manage.edit',
                name: '编辑客户',
                code: 'customer.manage.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'customer.manage.delete',
                name: '删除客户',
                code: 'customer.manage.delete',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'customer.manage.assign',
                name: '分配客户',
                code: 'customer.manage.assign',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          }
        ]
      },
      {
        id: 'order',
        name: '订单管理',
        code: 'order',
        type: 'menu',
        path: '/order',
        icon: 'Document',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'order.list',
            name: '订单列表',
            code: 'order.list',
            type: 'menu',
            path: '/order/list',
            icon: 'List',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'order.list.view',
                name: '查看订单列表',
                code: 'order.list.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'order.list.export',
                name: '导出订单数据',
                code: 'order.list.export',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'order.detail',
            name: '订单详情',
            code: 'order.detail',
            type: 'menu',
            path: '/order/detail',
            icon: 'View',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'order.detail.view',
                name: '查看订单详情',
                code: 'order.detail.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'order.detail.edit',
                name: '编辑订单信息',
                code: 'order.detail.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'order.manage',
            name: '订单操作',
            code: 'order.manage',
            type: 'menu',
            icon: 'Operation',
            sort: 3,
            status: 'active',
            children: [
              {
                id: 'order.manage.create',
                name: '新增订单',
                code: 'order.manage.create',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'order.manage.edit',
                name: '编辑订单',
                code: 'order.manage.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'order.manage.delete',
                name: '删除订单',
                code: 'order.manage.delete',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'order.manage.approve',
                name: '审批订单',
                code: 'order.manage.approve',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          }
        ]
      },
      {
        id: 'data',
        name: '数据管理',
        code: 'data',
        type: 'menu',
        path: '/data',
        icon: 'DataAnalysis',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'data.analysis',
            name: '数据分析',
            code: 'data.analysis',
            type: 'menu',
            path: '/data/analysis',
            icon: 'TrendCharts',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'data.analysis.view',
                name: '查看数据分析',
                code: 'data.analysis.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'data.analysis.export',
                name: '导出分析报告',
                code: 'data.analysis.export',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'data.report',
            name: '报表管理',
            code: 'data.report',
            type: 'menu',
            path: '/data/report',
            icon: 'Document',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'data.report.view',
                name: '查看报表',
                code: 'data.report.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'data.report.create',
                name: '创建报表',
                code: 'data.report.create',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'data.report.edit',
                name: '编辑报表',
                code: 'data.report.edit',
                type: 'action',
                sort: 3,
                status: 'active'
              }
            ]
          }
        ]
      }
    ]
    
    // 构建权限树选择数据
    permissionTreeSelect.value = buildTreeSelect(allPermissions.value)
  }
}

/**
 * 构建树形选择数据
 */
const buildTreeSelect = (data: PermissionData[]): TreeSelectData[] => {
  return data.map(item => ({
    id: item.id,
    name: item.name,
    children: item.children ? buildTreeSelect(item.children) : undefined
  }))
}

/**
 * 获取权限的所有父级ID
 */
const getParentIds = (permissionId: string, tree: PermissionData[], parentIds: string[] = []): string[] => {
  for (const node of tree) {
    if (node.children) {
      if (node.children.some(child => child.id === permissionId)) {
        parentIds.push(node.id)
        return getParentIds(node.id, tree, parentIds)
      } else {
        const found = getParentIds(permissionId, node.children, parentIds)
        if (found.length > 0) {
          parentIds.push(node.id)
          return parentIds
        }
      }
    }
  }
  return parentIds
}

/**
 * 获取权限的所有子级ID
 */
const getChildIds = (permissionId: string, tree: PermissionData[]): string[] => {
  const childIds: string[] = []
  
  const findChildren = (nodes: PermissionData[]) => {
    for (const node of nodes) {
      if (node.id === permissionId && node.children) {
        const collectIds = (children: PermissionData[]) => {
          children.forEach(child => {
            childIds.push(child.id)
            if (child.children) {
              collectIds(child.children)
            }
          })
        }
        collectIds(node.children)
        return
      }
      if (node.children) {
        findChildren(node.children)
      }
    }
  }
  
  findChildren(tree)
  return childIds
}

/**
 * 获取同级权限ID
 */
const getSiblingIds = (parentId: string, tree: PermissionData[]): string[] => {
  const siblingIds: string[] = []
  
  const findSiblings = (nodes: PermissionData[]) => {
    for (const node of nodes) {
      if (node.id === parentId && node.children) {
        node.children.forEach(child => {
          siblingIds.push(child.id)
        })
        return
      }
      if (node.children) {
        findSiblings(node.children)
      }
    }
  }
  
  findSiblings(tree)
  return siblingIds
}

// 生命周期钩子
onMounted(() => {
  loadRoleStats()
  loadRoleList()
  loadPermissionTree()
})
</script>

<style scoped>
.role-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h2 {
  margin: 0 0 20px 0;
  color: #303133;
}

.stats-section {
  display: flex;
  gap: 20px;
  flex-wrap: nowrap;
}

.stat-card {
  flex: 1;
  min-width: 180px;
  max-width: 300px;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.stat-icon.success {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #e6a23c, #f0c78a);
}

.stat-icon.info {
  background: linear-gradient(135deg, #909399, #b1b3b8);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  font-family: Arial, sans-serif;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-number.primary {
  color: #409eff;
}

.stat-number.success {
  color: #67c23a;
}

.stat-number.warning {
  color: #e6a23c;
}

.stat-number.info {
  color: #909399;
}

.stat-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 2px;
  font-weight: 500;
}

.stat-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.2;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card,
.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.danger-item {
  color: #f56c6c;
}

.permission-setting {
  padding: 0;
}

.role-info h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.role-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.permission-tree {
  max-height: 400px;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  font-size: 16px;
}

.node-tag {
  margin-left: auto;
}

.permission-manage {
  padding: 0;
}

.manage-header {
  display: flex;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .stats-section {
    gap: 16px;
  }
  
  .stat-card {
    min-width: 160px;
  }
  
  .header-actions {
    justify-content: center;
  }
}

@media (max-width: 900px) {
  .stats-section {
    gap: 12px;
  }
  
  .stat-card {
    min-width: 140px;
  }
  
  .stat-content {
    gap: 12px;
    padding: 6px;
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .stat-number {
    font-size: 24px;
  }
}

@media (max-width: 768px) {
  .stats-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .stat-card {
    min-width: auto;
    max-width: none;
  }
  
  .stat-content {
    gap: 16px;
    padding: 8px;
  }
  
  .stat-icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
  
  .stat-number {
    font-size: 28px;
  }
  
  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .table-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .manage-header {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>