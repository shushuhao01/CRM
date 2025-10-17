<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑部门' : '新建部门'"
    width="900px"
    :before-close="handleClose"
    class="department-dialog"
    align-center
    destroy-on-close
  >
    <div class="dialog-content">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="department-form"
        label-position="left"
      >
        <!-- 基本信息区域 -->
        <div class="form-section">
          <div class="section-header">
            <el-icon class="section-icon"><OfficeBuilding /></el-icon>
            <span class="section-title">基本信息</span>
          </div>
          
          <div class="form-grid">
            <el-form-item label="部门名称" prop="name" class="form-item">
              <el-input
                v-model="formData.name"
                placeholder="请输入部门名称"
                maxlength="50"
                show-word-limit
                class="compact-input"
              />
            </el-form-item>

            <el-form-item label="部门编码" prop="code" class="form-item">
              <el-input
                v-model="formData.code"
                placeholder="请输入部门编码"
                maxlength="20"
                show-word-limit
                class="compact-input"
              />
            </el-form-item>

            <el-form-item label="上级部门" prop="parentId" class="form-item">
              <el-tree-select
                v-model="formData.parentId"
                :data="parentDepartmentOptions"
                :props="treeProps"
                placeholder="请选择上级部门（可选）"
                clearable
                check-strictly
                :render-after-expand="false"
                class="compact-select"
              />
            </el-form-item>

            <el-form-item label="部门负责人" prop="managerId" class="form-item">
              <el-select
                v-model="formData.managerId"
                placeholder="请选择部门负责人（可选）"
                clearable
                filterable
                class="compact-select"
              >
                <el-option
                  v-for="user in availableUsers"
                  :key="user.id"
                  :label="user.name"
                  :value="user.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="排序" prop="sort" class="form-item">
              <el-input-number
                v-model="formData.sortOrder"
                :min="1"
                :max="999"
                placeholder="排序号"
                class="compact-number"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="状态" prop="status" class="form-item">
              <el-radio-group v-model="formData.status" class="compact-radio">
                <el-radio value="active">
                  <el-icon><Check /></el-icon>
                  启用
                </el-radio>
                <el-radio value="inactive">
                  <el-icon><Close /></el-icon>
                  停用
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </div>
        </div>

        <!-- 权限配置区域 -->
        <div class="form-section">
          <div class="section-header">
            <div class="header-content">
              <div class="header-icon">
                <el-icon class="section-icon"><Setting /></el-icon>
              </div>
              <div class="header-text">
                <span class="section-title">权限配置</span>
                <span class="header-subtitle">配置部门成员的系统访问权限</span>
              </div>
            </div>
            <div class="header-actions">
              <div class="permission-stats">
                <div class="stat-item">
                  <span class="stat-number">{{ formData.permissions.length }}</span>
                  <span class="stat-label">已选权限</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-number">{{ totalPermissions }}</span>
                  <span class="stat-label">总权限数</span>
                </div>
              </div>
              <el-button type="text" size="small" @click="togglePermissionExpand" class="expand-btn toggle-button">
                {{ permissionExpanded ? '收起' : '展开' }}
                <el-icon><component :is="permissionExpanded ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
              </el-button>
            </div>
          </div>
          
          <el-collapse-transition>
            <div v-show="permissionExpanded" class="permission-section">
              <!-- 快捷操作栏 -->
              <div class="action-bar">
                <div class="action-left">
                  <h4 class="section-title">
                    <el-icon><Setting /></el-icon>
                    权限配置
                  </h4>
                </div>
                <div class="action-right">
                  <el-button-group size="small">
                    <el-button @click="selectAll" size="small">
                      <el-icon><Check /></el-icon>
                      全选
                    </el-button>
                    <el-button @click="clearAll" size="small">
                      <el-icon><Close /></el-icon>
                      清空
                    </el-button>
                    <el-button @click="handleReset" size="small">
                      <el-icon><Refresh /></el-icon>
                      重置
                    </el-button>
                  </el-button-group>
                </div>
              </div>

              <!-- 权限模板 -->
              <div class="template-section">
                <div class="template-header">
                  <el-icon><Star /></el-icon>
                  <span>快捷模板</span>
                </div>
                <div class="template-grid">
                  <div 
                    v-for="template in permissionTemplates" 
                    :key="template.key"
                    @click="applyTemplate(template.key)"
                    class="template-card"
                    :class="{ active: currentTemplate === template.key }"
                  >
                    <div class="template-icon">
                      <el-icon><component :is="template.icon" /></el-icon>
                    </div>
                    <div class="template-content">
                      <h5 class="template-name">{{ template.name }}</h5>
                      <p class="template-desc">{{ template.description }}</p>
                    </div>
                    <div class="template-badge">
                      <span>{{ template.count }}项</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 部门权限配置 -->
              <div class="department-permission-config">
                <div class="config-header">
                  <el-icon><OfficeBuilding /></el-icon>
                  <span>部门权限配置</span>
                </div>
                <div class="config-content">
                  <el-row :gutter="20">
                    <el-col :span="8">
                      <div class="config-item">
                        <label class="config-label">权限继承</label>
                        <el-switch
                          v-model="formData.inheritFromParent"
                          active-text="继承父部门权限"
                          inactive-text="独立权限配置"
                          :disabled="!formData.parentId"
                        />
                        <p class="config-desc">启用后，该部门将自动继承父部门的所有权限</p>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="config-item">
                        <label class="config-label">数据范围</label>
                        <el-select v-model="formData.dataScope" placeholder="选择数据访问范围">
                          <el-option label="仅个人数据" value="self">
                            <div class="option-content">
                              <span>仅个人数据</span>
                              <small>只能查看自己的数据</small>
                            </div>
                          </el-option>
                          <el-option label="部门数据" value="department">
                            <div class="option-content">
                              <span>部门数据</span>
                              <small>可查看本部门所有数据</small>
                            </div>
                          </el-option>
                          <el-option label="全部数据" value="all">
                            <div class="option-content">
                              <span>全部数据</span>
                              <small>可查看所有部门数据</small>
                            </div>
                          </el-option>
                        </el-select>
                        <p class="config-desc">设置部门成员可访问的数据范围</p>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="config-item">
                        <label class="config-label">负责人权限</label>
                        <el-tag type="info" size="small">自动配置</el-tag>
                        <p class="config-desc">部门负责人将自动获得查看部门全部数据的权限</p>
                      </div>
                    </el-col>
                  </el-row>
                </div>
              </div>

              <!-- 权限配置主体 -->
              <div class="permission-content">
                <div class="permission-grid">
                  <div 
                    v-for="category in permissionsByModule" 
                    :key="category.id" 
                    class="permission-category"
                  >
                    <div class="category-header">
                      <div class="category-title">
                        <el-checkbox
                          :model-value="isCategorySelected(category.id)"
                          :indeterminate="isCategoryIndeterminate(category.id)"
                          @change="(checked) => handleCategoryToggle(category.id, checked)"
                          @click.stop
                          class="category-checkbox"
                        >
                          <div class="category-info">
                            <div class="category-icon">
                              <el-icon><component :is="category.icon" /></el-icon>
                            </div>
                            <div class="category-text">
                              <span class="category-name">{{ category.name }}</span>
                              <span class="category-count">{{ getSelectedCount(category.id) }}/{{ category.permissions.length }}</span>
                            </div>
                          </div>
                        </el-checkbox>
                      </div>
                    </div>
                    
                    <div class="permission-list">
                      <el-checkbox-group v-model="formData.permissions">
                        <div 
                          v-for="permission in category.permissions" 
                          :key="permission.code"
                          class="permission-item"
                        >
                          <el-checkbox 
                            :value="permission.code"
                            class="permission-checkbox"
                          >
                            <div class="permission-info">
                              <div class="permission-main">
                                <span class="permission-name">{{ permission.name }}</span>
                                <el-tag
                                  :type="getPermissionLevel(permission.level).type"
                                  size="small"
                                  class="permission-level"
                                >
                                  {{ getPermissionLevel(permission.level).text }}
                                </el-tag>
                              </div>
                              <p class="permission-desc">{{ getPermissionDescription(permission.code) }}</p>
                            </div>
                          </el-checkbox>
                        </div>
                      </el-checkbox-group>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-transition>
        </div>

        <!-- 描述信息 -->
        <div class="form-section">
          <el-form-item label="部门描述" prop="description" class="description-item">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="2"
              placeholder="请输入部门描述（可选）"
              maxlength="200"
              show-word-limit
              class="compact-textarea"
            />
          </el-form-item>
        </div>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" class="cancel-btn">
          取消
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading" class="submit-btn">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { 
  OfficeBuilding, 
  User, 
  Setting, 
  Check, 
  Close,
  UserFilled,
  ShoppingCart,
  CreditCard,
  Van,
  Service,
  TrendCharts,
  Star,
  Refresh,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import { useDepartmentStore, type Department } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import permissionService from '@/services/permissionService'
import departmentPermissionService from '@/services/departmentPermissionService'

interface Props {
  modelValue: boolean
  department?: Department | null
  isEdit?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  department: null,
  isEdit: false
})

const emit = defineEmits<Emits>()

const departmentStore = useDepartmentStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

// 获取权限树结构
const permissionTree = computed(() => permissionService.getAllPermissions())

// 将权限树转换为扁平化的权限列表，用于权限选择
const flatPermissions = computed(() => {
  const flatten = (permissions: any[], parentPath = ''): any[] => {
    const result: any[] = []
    
    permissions.forEach(permission => {
      if (permission.type === 'action') {
        result.push({
          id: permission.id,
          code: permission.code,
          name: permission.name,
          parentPath,
          level: getPermissionLevel(permission.code)
        })
      }
      
      if (permission.children && permission.children.length > 0) {
        const childPath = parentPath ? `${parentPath} > ${permission.name}` : permission.name
        result.push(...flatten(permission.children, childPath))
      }
    })
    
    return result
  }
  
  return flatten(permissionTree.value)
})

// 按模块分组的权限
const permissionsByModule = computed(() => {
  const modules: any[] = []
  
  permissionTree.value.forEach(module => {
    const modulePermissions: any[] = []
    
    const collectPermissions = (items: any[]) => {
      items.forEach(item => {
        if (item.type === 'action') {
          modulePermissions.push({
            id: item.id,
            code: item.code,
            name: item.name,
            level: getPermissionLevel(item.code)
          })
        }
        if (item.children) {
          collectPermissions(item.children)
        }
      })
    }
    
    if (module.children) {
      collectPermissions(module.children)
    }
    
    modules.push({
      id: module.id,
      name: module.name,
      icon: module.icon || 'Setting',
      permissions: modulePermissions
    })
  })
  
  return modules
})

// 权限模板配置
const permissionTemplates = [
  {
    key: 'basic',
    name: '基础权限',
    description: '适合普通员工的基础操作权限',
    icon: UserFilled,
    count: 8,
    permissions: ['customer.list.view', 'customer.follow', 'order.list.view', 'order.create', 'product.list', 'service.ticket.view', 'service.ticket.create', 'service.chat.view', 'service.chat.reply', 'service.knowledge.view', 'data.list.view', 'data.search.basic', 'performance.personal.view']
  },
  {
    key: 'advanced',
    name: '高级权限',
    description: '适合主管级别的进阶操作权限',
    icon: Star,
    count: 15,
    permissions: ['customer.list.view', 'customer.list.export', 'customer.add.create', 'customer.edit', 'customer.follow', 'order.list.view', 'order.create', 'order.edit', 'order.status', 'product.list', 'product.add', 'product.edit', 'product.category', 'service.ticket.view', 'service.ticket.create', 'service.ticket.edit', 'service.ticket.assign', 'service.chat.view', 'service.chat.reply', 'service.chat.transfer', 'service.chat.history', 'service.knowledge.view', 'service.knowledge.create', 'service.knowledge.edit', 'data.list.view', 'data.search.basic', 'data.search.advanced', 'performance.personal.view', 'performance.team.view']
  },
  {
    key: 'manager',
    name: '管理员权限',
    description: '拥有所有操作权限，适合管理员',
    icon: CreditCard,
    count: 25,
    permissions: [] // 将在计算属性中设置为所有权限
  },
  {
    key: 'custom',
    name: '自定义权限',
    description: '根据需要自由选择权限组合',
    icon: Setting,
    count: 0,
    permissions: []
  }
]

// 获取权限等级信息
const getPermissionLevel = (level: string) => {
  const levels = {
    basic: { text: '基础', type: 'info', color: '#0ea5e9' },
    advanced: { text: '高级', type: 'warning', color: '#f59e0b' },
    admin: { text: '管理员', type: 'danger', color: '#ef4444' }
  }
  return levels[level as keyof typeof levels] || levels.basic
}

// 获取权限描述
const getPermissionDescription = (permissionValue: string) => {
  const descriptions: Record<string, string> = {
    'customer:read': '查看客户列表和详细信息',
    'customer:write': '创建和编辑客户信息',
    'customer:delete': '删除客户记录',
    'order:read': '查看订单列表和详情',
    'order:write': '创建和编辑订单',
    'order:audit': '审核和确认订单',
    'order:delete': '删除订单记录',
    'finance:read': '查看财务报表和数据',
    'finance:write': '编辑财务信息',
    'logistics:read': '查看物流信息',
    'logistics:write': '管理物流配送',
    'service:read': '查看客服记录',
    'service:write': '处理客服工单',
    'performance:read': '查看绩效数据',
    'performance:write': '编辑绩效考核',
    'system:read': '查看系统配置',
    'system:write': '管理系统设置'
  }
  return descriptions[permissionValue] || '暂无描述'
}

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  parentId: null as string | null,
  managerId: null as string | null, // 保留用于UI显示，但不传递给后端
  sortOrder: 1,
  status: 'active' as 'active' | 'inactive',
  permissions: [] as string[], // 保留用于权限配置，但不传递给后端
  description: '',
  // 部门权限配置
  inheritFromParent: false,  // 是否继承父部门权限
  dataScope: 'department' as 'department' | 'self' | 'all',  // 数据范围
  managerExtraPermissions: [] as string[]  // 部门负责人额外权限
})

// 权限展开状态
const permissionExpanded = ref(false)
// 当前选中的模板
const currentTemplate = ref('')

// 计算属性
// 总权限数
const totalPermissions = computed(() => {
  return flatPermissions.value.length
})

// 获取分类中已选权限数量
const getSelectedCount = (categoryId: string) => {
  const category = permissionsByModule.value.find(cat => cat.id === categoryId)
  if (!category) return 0
  return category.permissions.filter(permission => 
    formData.permissions.includes(permission.code)
  ).length
}

// 切换权限展开状态
const togglePermissionExpand = () => {
  permissionExpanded.value = !permissionExpanded.value
}

// 全选权限
const selectAll = () => {
  const allPermissions = flatPermissions.value.map(permission => permission.code)
  formData.permissions = [...allPermissions]
  currentTemplate.value = 'manager'
}

// 清空权限
const clearAll = () => {
  formData.permissions = []
  currentTemplate.value = ''
}

// 重置权限
const handleReset = () => {
  if (props.department) {
    formData.permissions = [...(props.department.permissions || [])]
  } else {
    formData.permissions = []
  }
  currentTemplate.value = ''
}

// 应用权限模板
const applyTemplate = (templateKey: string) => {
  const template = permissionTemplates.find(t => t.key === templateKey)
  if (!template) return
  
  if (templateKey === 'manager') {
    // 管理员权限 - 所有权限
    selectAll()
  } else if (templateKey === 'custom') {
    // 自定义权限 - 不改变当前选择
    currentTemplate.value = 'custom'
  } else {
    // 其他模板
    formData.permissions = [...template.permissions]
    currentTemplate.value = templateKey
  }
}

// 检查分类是否全选
const isCategorySelected = (categoryKey: string) => {
  const category = permissionsByModule.value.find(cat => cat.id === categoryKey)
  if (!category) return false
  return category.permissions.every(permission => 
    formData.permissions.includes(permission.code)
  )
}

// 检查分类是否半选
const isCategoryIndeterminate = (categoryKey: string) => {
  const category = permissionsByModule.value.find(cat => cat.id === categoryKey)
  if (!category) return false
  const selectedCount = category.permissions.filter(permission => 
    formData.permissions.includes(permission.code)
  ).length
  return selectedCount > 0 && selectedCount < category.permissions.length
}

// 处理分类全选/取消全选
const handleCategoryToggle = (categoryKey: string, checked: boolean) => {
  const category = permissionsByModule.value.find(cat => cat.id === categoryKey)
  if (!category) return
  
  if (checked) {
    // 全选该分类
    category.permissions.forEach(permission => {
      if (!formData.permissions.includes(permission.code)) {
        formData.permissions.push(permission.code)
      }
    })
  } else {
    // 取消全选该分类
    category.permissions.forEach(permission => {
      const index = formData.permissions.indexOf(permission.code)
      if (index > -1) {
        formData.permissions.splice(index, 1)
      }
    })
  }
}

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '部门名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { min: 2, max: 20, message: '部门编码长度在 2 到 20 个字符', trigger: 'blur' },
    { pattern: /^[A-Z0-9_]+$/, message: '部门编码只能包含大写字母、数字和下划线', trigger: 'blur' }
  ],
  sort: [
    { required: true, message: '请输入排序号', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择部门状态', trigger: 'change' }
  ]
}

// 树形选择器配置
const treeProps = {
  value: 'id',
  label: 'name',
  children: 'children'
}

// 上级部门选项（排除当前部门及其子部门）
const parentDepartmentOptions = computed(() => {
  const filterDepartments = (departments: Department[]): Department[] => {
    return departments
      .filter(dept => {
        // 如果是编辑模式，排除当前部门及其子部门
        if (props.isEdit && props.department) {
          return dept.id !== props.department.id && !isChildDepartment(dept.id, props.department.id)
        }
        return true
      })
      .map(dept => ({
        ...dept,
        children: dept.children ? filterDepartments(dept.children) : []
      }))
  }
  
  return filterDepartments(departmentStore.departmentTree)
})

// 检查是否为子部门
const isChildDepartment = (deptId: string, parentId: string): boolean => {
  const findInTree = (departments: Department[], targetId: string): Department | null => {
    for (const dept of departments) {
      if (dept.id === targetId) return dept
      if (dept.children) {
        const found = findInTree(dept.children, targetId)
        if (found) return found
      }
    }
    return null
  }
  
  const dept = findInTree(departmentStore.departmentTree, deptId)
  if (!dept) return false
  
  let current = dept
  while (current.parentId) {
    if (current.parentId === parentId) return true
    current = findInTree(departmentStore.departmentTree, current.parentId) || current
    if (!current.parentId) break
  }
  return false
}

// 可选用户列表（从用户API获取）
const availableUsers = ref<Array<{ id: string; name: string; role?: string; department?: string }>>([])

// 加载用户列表
const loadUsers = async () => {
  try {
    const { userApiService } = await import('@/services/userApiService')
    const response = await userApiService.getUsers({ status: 'active' })
    availableUsers.value = response.data.map(user => ({
      id: user.id.toString(),
      name: user.realName || user.username,
      role: user.role,
      department: user.department?.name
    }))
  } catch (error) {
    console.error('加载用户列表失败:', error)
    // 如果API失败，从用户store获取
    const userStore = useUserStore()
    await userStore.loadUsers()
    availableUsers.value = userStore.users.map(user => ({
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department
    }))
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    code: '',
    parentId: null,
    managerId: null,
    sortOrder: 1,
    status: 'active',
    permissions: [],
    description: ''
  })
  
  // 重置权限相关状态
  currentTemplate.value = ''
  permissionExpanded.value = false
  
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 检测当前权限匹配的模板
const detectCurrentTemplate = () => {
  const currentPermissions = formData.permissions
  
  for (const template of permissionTemplates) {
    if (template.key === 'custom') continue
    
    if (template.key === 'manager') {
      // 检查是否拥有所有权限
      const allPermissions = flatPermissions.value.map(permission => permission.code)
      if (allPermissions.every(permission => currentPermissions.includes(permission))) {
        return 'manager'
      }
    } else {
      // 检查是否完全匹配模板权限
      if (template.permissions.length === currentPermissions.length &&
          template.permissions.every(permission => currentPermissions.includes(permission))) {
        return template.key
      }
    }
  }
  
  return currentPermissions.length > 0 ? 'custom' : ''
}

// 初始化表单数据
const initFormData = async () => {
  if (props.isEdit && props.department) {
    Object.assign(formData, {
      name: props.department.name,
      code: props.department.code,
      parentId: props.department.parentId,
      managerId: null, // 暂时设为null，因为后端不支持
      sortOrder: props.department.sortOrder || 1,
      status: props.department.status,
      permissions: [], // 暂时设为空数组，因为后端不支持
      description: props.department.description || ''
    })
    
    // 加载部门权限配置
    try {
      const permissionConfig = departmentPermissionService.getDepartmentPermissions(props.department.id)
      formData.inheritFromParent = permissionConfig.inheritFromParent
      formData.dataScope = permissionConfig.dataScope
      formData.managerExtraPermissions = [...permissionConfig.managerExtraPermissions]
    } catch (error) {
      console.warn('加载部门权限配置失败:', error)
      // 使用默认值
      formData.inheritFromParent = false
      formData.dataScope = 'department'
      formData.managerExtraPermissions = []
    }
    
    // 检测当前权限对应的模板
    nextTick(() => {
      currentTemplate.value = detectCurrentTemplate()
    })
  } else {
    resetForm()
    currentTemplate.value = ''
  }
}

// 监听弹窗显示状态
watch(() => props.modelValue, (visible) => {
  if (visible) {
    initFormData()
    loadUsers() // 加载用户列表
  }
})

// 监听部门数据变化
watch(() => props.department, () => {
  if (props.modelValue) {
    initFormData()
  }
})

// 监听权限变化，自动检测模板
watch(() => formData.permissions, () => {
  if (formData.permissions.length === 0) {
    currentTemplate.value = ''
  } else {
    const detectedTemplate = detectCurrentTemplate()
    if (detectedTemplate !== currentTemplate.value) {
      currentTemplate.value = detectedTemplate
    }
  }
}, { deep: true })

// 关闭弹窗
const handleClose = () => {
  emit('update:modelValue', false)
  resetForm()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    let departmentId: string
    
    if (props.isEdit && props.department) {
      // 更新部门
      await departmentStore.updateDepartment(props.department.id, {
        name: formData.name,
        code: formData.code,
        parentId: formData.parentId,
        sortOrder: formData.sortOrder,
        status: formData.status,
        description: formData.description
      })
      departmentId = props.department.id
    } else {
      // 创建部门
      const newDepartment = await departmentStore.addDepartment({
        name: formData.name,
        code: formData.code,
        parentId: formData.parentId,
        sortOrder: formData.sortOrder,
        status: formData.status,
        description: formData.description
      })
      departmentId = newDepartment.id
    }
    
    // 保存部门权限配置
    await departmentPermissionService.setDepartmentPermissions(departmentId, {
      permissions: formData.permissions,
      inheritFromParent: formData.inheritFromParent,
      dataScope: formData.dataScope,
      managerExtraPermissions: formData.managerExtraPermissions
    })
    
    ElMessage.success(props.isEdit ? '部门更新成功' : '部门创建成功')
    
    emit('success')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.department-dialog {
  .dialog-content {
    padding: 0;
  }

  .department-form {
    .form-section {
      margin-bottom: 20px;
      background: #fafbfc;
      border-radius: 8px;
      border: 1px solid #e4e7ed;
      overflow: hidden;

      .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px 12px 0 0;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);

          &:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
          }

          .header-content {
            display: flex;
            align-items: center;
            flex: 1;

            .header-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              background: rgba(255, 255, 255, 0.15);
              border-radius: 10px;
              margin-right: 16px;

              .section-icon {
                font-size: 20px;
                color: #ffffff;
              }
            }

            .header-text {
              .section-title {
                display: block;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 2px;
                line-height: 1.2;
              }

              .header-subtitle {
                display: block;
                font-size: 12px;
                opacity: 0.8;
                font-weight: 400;
                line-height: 1.2;
              }
            }
          }

          .header-actions {
            display: flex;
            align-items: center;
            gap: 16px;

            .permission-stats {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 8px 16px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.2);

              .stat-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;

                .stat-number {
                  font-size: 16px;
                  font-weight: 600;
                  color: #ffffff;
                }

                .stat-label {
                  font-size: 11px;
                  color: rgba(255, 255, 255, 0.8);
                  font-weight: 500;
                }
              }

              .stat-divider {
                width: 1px;
                height: 24px;
                background: rgba(255, 255, 255, 0.2);
              }
            }

            .toggle-button {
              color: white;
              font-weight: 500;
              padding: 8px 16px;
              border-radius: 8px;
              transition: all 0.2s ease;
              
              &:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: scale(1.05);
              }
            }
          }
        }

      .permission-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: #f8fafc;
        border-left: 1px solid #e4e7ed;
        border-right: 1px solid #e4e7ed;

        .action-buttons {
          display: flex;
          gap: 8px;

          .action-btn {
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            background: white;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;

            &:hover {
              border-color: #667eea;
              color: #667eea;
              background: #f0f4ff;
            }

            &.select-all {
              &:hover {
                border-color: #10b981;
                color: #10b981;
                background: #f0fdf4;
              }
            }

            &.clear-all {
              &:hover {
                border-color: #ef4444;
                color: #ef4444;
                background: #fef2f2;
              }
            }

            &.reset {
              &:hover {
                border-color: #f59e0b;
                color: #f59e0b;
                background: #fffbeb;
              }
            }
          }
        }
      }

      .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #f8fafc;
          border-left: 1px solid #e4e7ed;
          border-right: 1px solid #e4e7ed;

          .action-left {
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #374151;
              margin: 0;
              display: flex;
              align-items: center;
              gap: 8px;

              .el-icon {
                color: #667eea;
                font-size: 16px;
              }
            }
          }

          .action-right {
            .el-button-group {
              .el-button {
                padding: 6px 12px;
                font-size: 12px;
                border-radius: 6px;
                border: 1px solid #d1d5db;
                background: white;
                color: #374151;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 4px;

                &:hover {
                  border-color: #667eea;
                  color: #667eea;
                  background: #f0f4ff;
                }

                .el-icon {
                  font-size: 12px;
                }
              }
            }
          }
        }

        .template-section {
          padding: 16px 24px;
          background: #ffffff;
          border-left: 1px solid #e4e7ed;
          border-right: 1px solid #e4e7ed;

          .template-header {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;

            .el-icon {
              color: #667eea;
              font-size: 14px;
            }
          }

          .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;

            .template-card {
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: white;
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              gap: 12px;
              position: relative;

              &:hover {
                border-color: #667eea;
                background: #f0f4ff;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(102, 126, 234, 0.1);
              }

              &.active {
                 border-color: #3b82f6;
                 background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                 color: #1e40af;
                 box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);

                 .template-icon {
                   background: #3b82f6;
                   color: #ffffff;
                   font-weight: 600;
                 }

                 .template-name {
                   color: #1e40af;
                   font-weight: 700;
                 }

                 .template-desc {
                   color: #3730a3;
                   font-weight: 500;
                 }

                 .template-badge {
                   background: #3b82f6;
                   color: #ffffff;
                   font-weight: 600;
                   border: 1px solid #2563eb;
                 }
               }

              .template-icon {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                background: #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #667eea;
                font-size: 16px;
                flex-shrink: 0;
              }

              .template-content {
                flex: 1;
                min-width: 0;

                .template-name {
                  font-size: 13px;
                  font-weight: 600;
                  color: #374151;
                  margin: 0 0 4px 0;
                  line-height: 1.2;
                }

                .template-desc {
                  font-size: 11px;
                  color: #6b7280;
                  margin: 0;
                  line-height: 1.3;
                }
              }

              .template-badge {
                padding: 2px 6px;
                background: #f3f4f6;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                color: #6b7280;
                flex-shrink: 0;
              }
            }
          }
        }

        .permission-content {
          background: #ffffff;
          border-left: 1px solid #e4e7ed;
          border-right: 1px solid #e4e7ed;
          border-bottom: 1px solid #e4e7ed;
          border-radius: 0 0 12px 12px;
        }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px 20px;
        padding: 16px;
      }

      .form-item {
        margin-bottom: 0;
      }

      .permission-section {
        padding: 16px;
        margin-top: 24px;
        border: none;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
      }
    }

    .compact-input,
    .compact-select,
    .compact-number,
    .compact-textarea {
      :deep(.el-input__wrapper),
      :deep(.el-select__wrapper),
      :deep(.el-textarea__inner) {
        border-radius: 6px;
        min-height: 32px;
        padding: 0 12px;
        font-size: 13px;
      }

      :deep(.el-input__inner) {
        height: 32px;
        line-height: 32px;
        font-size: 13px;
      }
    }

    .compact-number {
      width: 100%;
      
      :deep(.el-input-number__decrease),
      :deep(.el-input-number__increase) {
        width: 28px;
        height: 16px;
        line-height: 16px;
        font-size: 12px;
      }
    }

    .compact-radio {
      display: flex;
      gap: 12px;

      :deep(.el-radio) {
        margin-right: 0;
        font-size: 13px;
        
        .el-radio__label {
          font-size: 13px;
          padding-left: 6px;
        }
      }
    }

    .permission-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 16px;
      padding: 24px;
      background: #ffffff;
      border-radius: 0 0 12px 12px;
      border: 1px solid #e4e7ed;
      border-top: none;
    }

    .permission-category {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: white;
      overflow: hidden;
      transition: all 0.3s ease;

      &:hover {
        border-color: #667eea;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        transform: translateY(-2px);
      }

      .category-header {
        padding: 16px 20px;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-bottom: 1px solid #e5e7eb;

        .category-title {
          .category-checkbox {
            margin: 0;
            font-size: 14px;
            font-weight: 600;

            :deep(.el-checkbox__label) {
              font-size: 14px;
              font-weight: 600;
              color: #2c3e50;
            }

            .category-info {
              display: flex;
              align-items: center;
              gap: 12px;

              .category-icon {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                color: white;
              }

              .category-text {
                .category-name {
                  font-size: 14px;
                  font-weight: 600;
                  color: #1f2937;
                  margin-bottom: 2px;
                }

                .category-count {
                  font-size: 12px;
                  color: #6b7280;
                }
              }
            }
          }
        }
      }

      .permission-list {
        padding: 16px 20px;

        .permission-item {
          margin: 0;
          padding: 8px 12px;
          border: 1px solid #f3f4f6;
          border-radius: 6px;
          background: #fafbfc;
          transition: all 0.2s ease;
          margin-bottom: 8px;

          &:hover {
            border-color: #667eea;
            background: #f0f4ff;
          }

          .permission-checkbox {
            :deep(.el-checkbox__label) {
              font-size: 13px;
              color: #606266;
              line-height: 1.4;
              font-weight: 500;
              width: 100%;
            }

            :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
              color: #409eff;
            }

            .permission-info {
              width: 100%;

              .permission-main {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;

                .permission-name {
                  font-weight: 500;
                  color: #2c3e50;
                }

                .permission-level {
                  font-size: 10px;
                  padding: 2px 6px;
                  font-weight: 600;
                  border-radius: 4px;
                }
              }

              .permission-desc {
                font-size: 11px;
                color: #6b7280;
                margin: 0;
                line-height: 1.3;
              }
            }
          }
        }
      }
    }

    .description-item {
      .compact-textarea {
        :deep(.el-textarea__inner) {
          min-height: 60px;
          padding: 8px 12px;
          font-size: 13px;
          line-height: 1.4;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 0 0;
    border-top: 1px solid #e4e7ed;
    margin-top: 16px;

    .cancel-btn,
    .submit-btn {
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 13px;
      height: 36px;
    }

    .cancel-btn {
      border: 1px solid #dcdfe6;
      background: #fff;
      color: #606266;

      &:hover {
        border-color: #c0c4cc;
        background: #f5f7fa;
      }
    }

    .submit-btn {
      background: #409eff;
      border: 1px solid #409eff;
      color: #fff;

      &:hover {
        background: #66b1ff;
        border-color: #66b1ff;
      }
    }
  }
}

/* Element Plus 组件样式覆盖 */
:deep(.el-dialog) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  color: #334155;
  padding: 16px 20px;
  margin: 0;

  .el-dialog__title {
    font-size: 16px;
    font-weight: 600;
  }

  .el-dialog__headerbtn {
      top: 16px;
      right: 20px;
      
      .el-dialog__close {
        color: #64748b;
        font-size: 16px;
        
        &:hover {
          color: #334155;
        }
      }
    }
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 0 20px 20px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;

  .el-form-item__label {
    font-weight: 500;
    color: #606266;
    font-size: 13px;
    line-height: 32px;
    height: 32px;
  }

  .el-form-item__content {
    line-height: 32px;
  }

  .el-form-item__error {
    font-size: 12px;
    margin-top: 2px;
  }
}

:deep(.el-collapse-transition) {
  transition: all 0.3s ease;
}

/* 滚动条样式 */
:deep(.el-scrollbar__wrap) {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}

:deep(.el-scrollbar__wrap::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.el-scrollbar__wrap::-webkit-scrollbar-thumb) {
  background-color: #c1c1c1;
  border-radius: 3px;
}

:deep(.el-scrollbar__wrap::-webkit-scrollbar-track) {
  background-color: transparent;
}

/* 部门权限配置样式 */
.department-permission-config {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;

  .config-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: 600;
    color: #495057;

    .el-icon {
      margin-right: 8px;
      color: #667eea;
    }
  }

  .config-content {
    .config-item {
      .config-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #495057;
        margin-bottom: 8px;
      }

      .config-desc {
        font-size: 12px;
        color: #6c757d;
        margin-top: 4px;
        margin-bottom: 0;
        line-height: 1.4;
      }

      .el-switch {
        margin-bottom: 4px;
      }

      .el-select {
        width: 100%;
        margin-bottom: 4px;
      }

      .el-tag {
        margin-bottom: 4px;
      }
    }
  }
}

/* 选项内容样式 */
.option-content {
  display: flex;
  flex-direction: column;
  
  span {
    font-size: 14px;
    color: #303133;
  }
  
  small {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }
}
</style>