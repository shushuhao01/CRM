<template>
  <el-dialog
    v-model="visible"
    title="批量权限配置"
    width="900px"
    :before-close="handleClose"
    class="batch-config-dialog"
  >
    <!-- 配置目标选择 -->
    <div class="config-target-section">
      <h4>配置目标</h4>
      <el-radio-group v-model="configType" @change="handleConfigTypeChange">
        <el-radio value="roles">按角色配置</el-radio>
        <el-radio value="departments">按部门配置</el-radio>
      </el-radio-group>
      
      <div class="target-selection" v-if="configType">
        <el-transfer
          v-model="selectedTargets"
          :data="availableTargets"
          :titles="transferTitles"
          :button-texts="['移除', '添加']"
          :format="{
            noChecked: '${total}',
            hasChecked: '${checked}/${total}'
          }"
          filterable
          :filter-placeholder="filterPlaceholder"
          style="text-align: left; display: inline-block"
        >
          <template #default="{ option }">
            <div class="target-item">
              <div class="target-info">
                <span class="target-name">{{ option.label }}</span>
                <span class="target-desc">{{ option.description }}</span>
              </div>
              <div class="target-stats" v-if="configType === 'roles'">
                <el-tag size="small" type="info">{{ option.userCount }}人</el-tag>
                <el-tag size="small" type="success">{{ option.permissionCount }}权限</el-tag>
              </div>
              <div class="target-stats" v-else>
                <el-tag size="small" type="info">{{ option.memberCount }}成员</el-tag>
                <el-tag size="small" type="warning">{{ option.level }}级</el-tag>
              </div>
            </div>
          </template>
        </el-transfer>
      </div>
    </div>

    <!-- 权限配置方式 -->
    <div class="config-method-section" v-if="selectedTargets.length > 0">
      <h4>配置方式</h4>
      <el-radio-group v-model="configMethod">
        <el-radio value="template">使用权限模板</el-radio>
        <el-radio value="custom">自定义权限</el-radio>
        <el-radio value="copy">复制现有权限</el-radio>
      </el-radio-group>

      <!-- 权限模板选择 -->
      <div class="template-selection" v-if="configMethod === 'template'">
        <el-select v-model="selectedTemplate" placeholder="选择权限模板" style="width: 300px;">
          <el-option
            v-for="template in permissionTemplates"
            :key="template.id"
            :label="template.name"
            :value="template.id"
          >
            <div class="template-option">
              <span>{{ template.name }}</span>
              <el-tag size="small" type="info">{{ template.permissions.length }}项权限</el-tag>
            </div>
          </el-option>
        </el-select>
        <div class="template-preview" v-if="selectedTemplate">
          <h5>模板权限预览：</h5>
          <div class="permission-tags">
            <el-tag
              v-for="permission in getTemplatePermissions(selectedTemplate)"
              :key="permission"
              size="small"
              style="margin: 2px;"
            >
              {{ getPermissionName(permission) }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 自定义权限配置 -->
      <div class="custom-permissions" v-if="configMethod === 'custom'">
        <div class="permission-categories">
          <div
            v-for="category in permissionCategories"
            :key="category.id"
            class="category-section"
          >
            <div class="category-header">
              <el-checkbox
                v-model="category.checked"
                :indeterminate="category.indeterminate"
                @change="handleCategoryChange(category)"
              >
                {{ category.name }}
              </el-checkbox>
              <span class="category-count">({{ category.checkedCount }}/{{ category.permissions.length }})</span>
            </div>
            <div class="category-permissions">
              <el-checkbox-group v-model="selectedPermissions">
                <el-checkbox
                  v-for="permission in category.permissions"
                  :key="permission.id"
                  :value="permission.id"
                  :label="permission.name"
                />
              </el-checkbox-group>
            </div>
          </div>
        </div>
      </div>

      <!-- 复制权限源选择 -->
      <div class="copy-source" v-if="configMethod === 'copy'">
        <el-select v-model="copySource" placeholder="选择权限复制源" style="width: 300px;">
          <el-option-group
            v-for="group in copySourceOptions"
            :key="group.label"
            :label="group.label"
          >
            <el-option
              v-for="item in group.options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
              <div class="copy-source-option">
                <span>{{ item.label }}</span>
                <el-tag size="small" type="success">{{ item.permissionCount }}权限</el-tag>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
      </div>
    </div>

    <!-- 配置预览 -->
    <div class="config-preview" v-if="canPreview">
      <h4>配置预览</h4>
      <el-alert
        :title="`将为 ${selectedTargets.length} 个${configType === 'roles' ? '角色' : '部门'}配置权限`"
        type="info"
        show-icon
        :closable="false"
      />
      <div class="preview-details">
        <div class="affected-targets">
          <h5>影响的{{ configType === 'roles' ? '角色' : '部门' }}：</h5>
          <div class="target-list">
            <el-tag
              v-for="targetId in selectedTargets"
              :key="targetId"
              style="margin: 2px;"
            >
              {{ getTargetName(targetId) }}
            </el-tag>
          </div>
        </div>
        <div class="permission-summary">
          <h5>权限配置：</h5>
          <div class="summary-stats">
            <el-statistic title="总权限数" :value="getConfiguredPermissions().length" />
            <el-statistic title="覆盖模块" :value="getCoveredModules().length" />
            <el-statistic title="权限等级" :value="getPermissionLevel()" value-style="color: #409EFF" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading" :disabled="!canSubmit">
          确认配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDepartmentStore } from '@/stores/department'

interface Permission {
  id: string
  name: string
}

interface PermissionCategory {
  id: string
  name: string
  checked: boolean
  indeterminate: boolean
  checkedCount: number
  permissions: Permission[]
}

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const departmentStore = useDepartmentStore()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const configType = ref<'roles' | 'departments'>('roles')
const configMethod = ref<'template' | 'custom' | 'copy'>('template')
const selectedTargets = ref<string[]>([])
const selectedTemplate = ref('')
const selectedPermissions = ref<string[]>([])
const copySource = ref('')

// 权限模板
const permissionTemplates = ref([
  {
    id: 'sales',
    name: '销售人员',
    permissions: ['customer.view', 'customer.create', 'customer.edit', 'order.view', 'order.create']
  },
  {
    id: 'manager',
    name: '部门经理',
    permissions: ['customer.all', 'order.all', 'report.view', 'team.manage']
  },
  {
    id: 'audit',
    name: '审核人员',
    permissions: ['order.audit', 'customer.audit', 'report.view']
  },
  {
    id: 'finance',
    name: '财务人员',
    permissions: ['order.finance', 'report.finance', 'customer.finance']
  }
])

// 权限分类
const permissionCategories = ref([
  {
    id: 'customer',
    name: '客户管理',
    checked: false,
    indeterminate: false,
    checkedCount: 0,
    permissions: [
      { id: 'customer.view', name: '查看客户' },
      { id: 'customer.create', name: '创建客户' },
      { id: 'customer.edit', name: '编辑客户' },
      { id: 'customer.delete', name: '删除客户' },
      { id: 'customer.export', name: '导出客户' }
    ]
  },
  {
    id: 'order',
    name: '订单管理',
    checked: false,
    indeterminate: false,
    checkedCount: 0,
    permissions: [
      { id: 'order.view', name: '查看订单' },
      { id: 'order.create', name: '创建订单' },
      { id: 'order.edit', name: '编辑订单' },
      { id: 'order.delete', name: '删除订单' },
      { id: 'order.audit', name: '审核订单' }
    ]
  },
  {
    id: 'report',
    name: '报表管理',
    checked: false,
    indeterminate: false,
    checkedCount: 0,
    permissions: [
      { id: 'report.view', name: '查看报表' },
      { id: 'report.export', name: '导出报表' },
      { id: 'report.create', name: '创建报表' }
    ]
  }
])

// 计算属性
const availableTargets = computed(() => {
  if (configType.value === 'roles') {
    return departmentStore.roles.map(role => ({
      key: role.id,
      label: role.name,
      description: role.description,
      userCount: role.userCount || 0,
      permissionCount: role.permissions?.length || 0
    }))
  } else {
    return departmentStore.departments.map(dept => ({
      key: dept.id,
      label: dept.name,
      description: dept.description || '',
      memberCount: dept.memberCount || 0,
      level: dept.level
    }))
  }
})

const transferTitles = computed(() => {
  const type = configType.value === 'roles' ? '角色' : '部门'
  return [`可选${type}`, `已选${type}`]
})

const filterPlaceholder = computed(() => {
  return configType.value === 'roles' ? '搜索角色' : '搜索部门'
})

const copySourceOptions = computed(() => {
  const options = []
  
  if (configType.value === 'roles') {
    options.push({
      label: '角色',
      options: departmentStore.roles.map(role => ({
        value: `role_${role.id}`,
        label: role.name,
        permissionCount: role.permissions?.length || 0
      }))
    })
  }
  
  options.push({
    label: '部门',
    options: departmentStore.departments.map(dept => ({
      value: `dept_${dept.id}`,
      label: dept.name,
      permissionCount: dept.permissions?.length || 0
    }))
  })
  
  return options
})

const canPreview = computed(() => {
  return selectedTargets.value.length > 0 && (
    (configMethod.value === 'template' && selectedTemplate.value) ||
    (configMethod.value === 'custom' && selectedPermissions.value.length > 0) ||
    (configMethod.value === 'copy' && copySource.value)
  )
})

const canSubmit = computed(() => {
  return canPreview.value && !loading.value
})

// 监听权限选择变化
watch(selectedPermissions, () => {
  updateCategoryStatus()
}, { deep: true })

// 方法
const handleConfigTypeChange = () => {
  selectedTargets.value = []
  resetForm()
}

const handleCategoryChange = (category: PermissionCategory) => {
  if (category.checked) {
    // 全选该分类
    category.permissions.forEach((permission: Permission) => {
      if (!selectedPermissions.value.includes(permission.id)) {
        selectedPermissions.value.push(permission.id)
      }
    })
  } else {
    // 取消选择该分类
    category.permissions.forEach((permission: Permission) => {
      const index = selectedPermissions.value.indexOf(permission.id)
      if (index > -1) {
        selectedPermissions.value.splice(index, 1)
      }
    })
  }
  updateCategoryStatus()
}

const updateCategoryStatus = () => {
  permissionCategories.value.forEach(category => {
    const checkedCount = category.permissions.filter(p => 
      selectedPermissions.value.includes(p.id)
    ).length
    
    category.checkedCount = checkedCount
    category.checked = checkedCount === category.permissions.length
    category.indeterminate = checkedCount > 0 && checkedCount < category.permissions.length
  })
}

const getTemplatePermissions = (templateId: string) => {
  const template = permissionTemplates.value.find(t => t.id === templateId)
  return template?.permissions || []
}

const getPermissionName = (permissionId: string) => {
  for (const category of permissionCategories.value) {
    const permission = category.permissions.find(p => p.id === permissionId)
    if (permission) return permission.name
  }
  return permissionId
}

const getTargetName = (targetId: string) => {
  const target = availableTargets.value.find(t => t.key === targetId)
  return target?.label || targetId
}

const getConfiguredPermissions = () => {
  if (configMethod.value === 'template' && selectedTemplate.value) {
    return getTemplatePermissions(selectedTemplate.value)
  } else if (configMethod.value === 'custom') {
    return selectedPermissions.value
  } else if (configMethod.value === 'copy' && copySource.value) {
    // 从复制源获取权限
    const [type, id] = copySource.value.split('_')
    if (type === 'role') {
      const role = departmentStore.roles.find(r => r.id === id)
      return role?.permissions || []
    } else if (type === 'dept') {
      const dept = departmentStore.departments.find(d => d.id === id)
      return dept?.permissions || []
    }
  }
  return []
}

const getCoveredModules = () => {
  const permissions = getConfiguredPermissions()
  const modules = new Set()
  permissions.forEach(permission => {
    const module = permission.split('.')[0]
    modules.add(module)
  })
  return Array.from(modules)
}

const getPermissionLevel = () => {
  const permissions = getConfiguredPermissions()
  if (permissions.length >= 15) return '高级'
  if (permissions.length >= 8) return '中级'
  if (permissions.length >= 3) return '基础'
  return '无'
}

const handleReset = () => {
  configType.value = 'roles'
  configMethod.value = 'template'
  selectedTargets.value = []
  selectedTemplate.value = ''
  selectedPermissions.value = []
  copySource.value = ''
  updateCategoryStatus()
}

const resetForm = () => {
  configMethod.value = 'template'
  selectedTemplate.value = ''
  selectedPermissions.value = []
  copySource.value = ''
  updateCategoryStatus()
}

const handleClose = () => {
  visible.value = false
  handleReset()
}

const handleSubmit = async () => {
  try {
    await ElMessageBox.confirm(
      `确认为 ${selectedTargets.value.length} 个${configType.value === 'roles' ? '角色' : '部门'}配置权限？`,
      '确认操作',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    
    const permissions = getConfiguredPermissions()
    
    if (configType.value === 'roles') {
      await departmentStore.batchUpdateRolePermissions(selectedTargets.value, permissions)
    } else {
      await departmentStore.batchUpdatePermissions(selectedTargets.value, permissions)
    }

    ElMessage.success('批量权限配置成功')
    emit('success')
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量权限配置失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.batch-config-dialog {
  .config-target-section,
  .config-method-section,
  .config-preview {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
    
    h5 {
      margin: 12px 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: #606266;
    }
  }

  .target-selection {
    margin-top: 16px;
  }

  .target-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    
    .target-info {
      flex: 1;
      
      .target-name {
        display: block;
        font-weight: 500;
        color: #303133;
      }
      
      .target-desc {
        display: block;
        font-size: 12px;
        color: #909399;
        margin-top: 2px;
      }
    }
    
    .target-stats {
      display: flex;
      gap: 4px;
    }
  }

  .template-selection,
  .copy-source {
    margin-top: 16px;
  }

  .template-option,
  .copy-source-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .template-preview {
    margin-top: 12px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    
    .permission-tags {
      max-height: 120px;
      overflow-y: auto;
    }
  }

  .custom-permissions {
    margin-top: 16px;
    
    .category-section {
      margin-bottom: 16px;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      
      .category-header {
        padding: 12px 16px;
        background: #f5f7fa;
        border-bottom: 1px solid #e4e7ed;
        display: flex;
        align-items: center;
        gap: 8px;
        
        .category-count {
          font-size: 12px;
          color: #909399;
        }
      }
      
      .category-permissions {
        padding: 16px;
        
        :deep(.el-checkbox-group) {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 8px;
        }
      }
    }
  }

  .config-preview {
    border-top: 1px solid #e4e7ed;
    padding-top: 24px;
    
    .preview-details {
      margin-top: 16px;
      
      .affected-targets,
      .permission-summary {
        margin-bottom: 16px;
      }
      
      .target-list {
        max-height: 100px;
        overflow-y: auto;
      }
      
      .summary-stats {
        display: flex;
        gap: 32px;
        
        :deep(.el-statistic) {
          text-align: center;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>