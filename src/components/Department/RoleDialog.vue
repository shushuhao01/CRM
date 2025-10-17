<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑角色' : '新建角色'"
    width="800px"
    :before-close="handleClose"
    class="role-dialog"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="role-form"
    >
      <div class="form-section">
        <h4 class="section-title">基本信息</h4>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色名称" prop="name">
              <el-input
                v-model="formData.name"
                placeholder="请输入角色名称"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色类型" prop="type">
              <el-select v-model="formData.type" placeholder="选择角色类型" style="width: 100%">
                <el-option label="部门负责人" value="manager">
                  <div class="role-option">
                    <el-icon><Star /></el-icon>
                    <span>部门负责人</span>
                  </div>
                </el-option>
                <el-option label="主管" value="supervisor">
                  <div class="role-option">
                    <el-icon><Lock /></el-icon>
                    <span>主管</span>
                  </div>
                </el-option>
                <el-option label="专员" value="specialist">
                  <div class="role-option">
                    <el-icon><Star /></el-icon>
                    <span>专员</span>
                  </div>
                </el-option>
                <el-option label="普通成员" value="member">
                  <div class="role-option">
                    <el-icon><User /></el-icon>
                    <span>普通成员</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="所属部门" prop="departmentId">
          <el-select v-model="formData.departmentId" placeholder="选择所属部门" style="width: 100%">
            <el-option
              v-for="dept in departmentStore.departmentList"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </div>

      <div class="form-section">
        <h4 class="section-title">权限配置</h4>
        
        <div class="permission-templates">
          <div class="templates-header">
            <span>快速模板</span>
            <el-button type="text" size="small" @click="clearAllPermissions">
              清空权限
            </el-button>
          </div>
          <div class="templates-list">
            <el-button
              v-for="template in permissionTemplates"
              :key="template.key"
              size="small"
              :type="template.key === selectedTemplate ? 'primary' : 'default'"
              @click="applyTemplate(template)"
              class="template-btn"
            >
              {{ template.name }}
            </el-button>
          </div>
        </div>

        <div class="permissions-tree">
          <div
            v-for="menu in PERMISSION_TREE"
            :key="menu.code"
            class="permission-menu"
          >
            <!-- 一级菜单 -->
            <div class="menu-header">
              <el-checkbox
                v-model="formData.permissions"
                :value="menu.code"
                @change="handleMenuChange(menu)"
                :indeterminate="getMenuIndeterminate(menu)"
              >
                <span class="menu-title">
                  <el-icon><Folder /></el-icon>
                  {{ menu.name }}
                </span>
              </el-checkbox>
              <span class="menu-count">
                {{ getMenuSelectedCount(menu) }}/{{ getMenuTotalCount(menu) }}
              </span>
            </div>
            
            <!-- 二级菜单和操作按钮 -->
            <div v-if="menu.children" class="submenu-list">
              <div
                v-for="subMenu in menu.children"
                :key="subMenu.code"
                class="submenu-item"
              >
                <!-- 二级菜单权限 -->
                <div class="submenu-header">
                  <el-checkbox
                    v-model="formData.permissions"
                    :value="subMenu.code"
                    @change="handleSubMenuChange(subMenu)"
                    :indeterminate="getSubMenuIndeterminate(subMenu)"
                  >
                    <span class="submenu-title">
                      <el-icon><Document /></el-icon>
                      {{ subMenu.name }}
                    </span>
                  </el-checkbox>
                  <span class="submenu-count">
                    {{ getSubMenuSelectedCount(subMenu) }}/{{ getSubMenuTotalCount(subMenu) }}
                  </span>
                </div>
                
                <!-- 操作按钮权限 -->
                <div v-if="subMenu.actions" class="action-list">
                  <el-checkbox
                    v-for="action in subMenu.actions"
                    :key="`${subMenu.code}:${action.code}`"
                    v-model="formData.permissions"
                    :value="`${subMenu.code}:${action.code}`"
                    class="action-item"
                  >
                    <div class="action-content">
                      <span class="action-name">{{ action.name }}</span>
                      <span class="action-desc">{{ action.description }}</span>
                    </div>
                  </el-checkbox>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="permission-summary">
          <div class="summary-item">
            <span class="summary-label">已选权限：</span>
            <span class="summary-value">{{ formData.permissions.length }} 项</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">权限等级：</span>
            <el-tag :type="getPermissionLevelTag()" size="small">
              {{ getPermissionLevel() }}
            </el-tag>
          </div>
          <div class="summary-item">
            <span class="summary-label">覆盖模块：</span>
            <span class="summary-value">{{ getCoveredModules() }}</span>
          </div>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" class="cancel-btn">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading" class="submit-btn">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { Lock, Star, User, Folder, Document } from '@element-plus/icons-vue'
import { useDepartmentStore } from '@/stores/department'
import { PERMISSION_TREE, PERMISSION_TEMPLATES, type Permission } from '@/types/permissions'

// 角色接口定义
interface DepartmentRole {
  id: string
  name: string
  description: string
  departmentId: string
  type: 'manager' | 'member' | 'specialist' | 'supervisor'
  permissions: string[]
  userCount: number
  createdAt: string
  updatedAt: string
}

// 权限接口定义
interface Permission {
  key: string
  name: string
  description: string
}

interface PermissionCategory {
  key: string
  name: string
  permissions: Permission[]
  checked: boolean
  indeterminate: boolean
}

interface PermissionTemplate {
  key: string
  name: string
  permissions: string[]
}

const props = defineProps<{
  modelValue: boolean
  role?: DepartmentRole | null
  isEdit: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const departmentStore = useDepartmentStore()

// 响应式数据
const formRef = ref<FormInstance>()
const loading = ref(false)
const selectedTemplate = ref('')

const formData = ref({
  name: '',
  description: '',
  departmentId: '',
  type: 'member' as 'manager' | 'member' | 'specialist' | 'supervisor',
  permissions: [] as string[]
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 20, message: '角色名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择角色类型', trigger: 'change' }
  ],
  departmentId: [
    { required: true, message: '请选择所属部门', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入角色描述', trigger: 'blur' },
    { min: 5, max: 200, message: '角色描述长度在 5 到 200 个字符', trigger: 'blur' }
  ]
}

// 权限分类（基于新的权限树结构）
const permissionCategories = ref<PermissionCategory[]>(
  PERMISSION_TREE.map(menu => ({
    key: menu.code,
    name: menu.name,
    checked: false,
    indeterminate: false,
    permissions: menu.children?.flatMap(subMenu => [
      // 二级菜单权限
      { key: subMenu.code, name: `${subMenu.name}菜单`, description: `访问${subMenu.name}页面` },
      // 操作按钮权限
      ...(subMenu.actions?.map(action => ({
        key: `${subMenu.code}:${action.code}`,
        name: `${subMenu.name}-${action.name}`,
        description: action.description
      })) || [])
    ]) || []
  }))
)

// 权限模板（基于新的权限模板）
const permissionTemplates = ref<PermissionTemplate[]>(
  Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => ({
    key,
    name: template.name,
    permissions: template.permissions
  }))
)

// 计算属性 - 一级菜单
const getMenuSelectedCount = (menu: any) => {
  let count = 0
  if (formData.value.permissions.includes(menu.code)) count++
  if (menu.children) {
    menu.children.forEach((subMenu: any) => {
      if (formData.value.permissions.includes(subMenu.code)) count++
      if (subMenu.actions) {
        subMenu.actions.forEach((action: any) => {
          if (formData.value.permissions.includes(`${subMenu.code}:${action.code}`)) count++
        })
      }
    })
  }
  return count
}

const getMenuTotalCount = (menu: any) => {
  let count = 1 // 一级菜单本身
  if (menu.children) {
    count += menu.children.length // 二级菜单
    menu.children.forEach((subMenu: any) => {
      if (subMenu.actions) {
        count += subMenu.actions.length // 操作按钮
      }
    })
  }
  return count
}

const getMenuIndeterminate = (menu: any) => {
  const selected = getMenuSelectedCount(menu)
  const total = getMenuTotalCount(menu)
  return selected > 0 && selected < total
}

// 计算属性 - 二级菜单
const getSubMenuSelectedCount = (subMenu: any) => {
  let count = 0
  if (formData.value.permissions.includes(subMenu.code)) count++
  if (subMenu.actions) {
    subMenu.actions.forEach((action: any) => {
      if (formData.value.permissions.includes(`${subMenu.code}:${action.code}`)) count++
    })
  }
  return count
}

const getSubMenuTotalCount = (subMenu: any) => {
  let count = 1 // 二级菜单本身
  if (subMenu.actions) {
    count += subMenu.actions.length // 操作按钮
  }
  return count
}

const getSubMenuIndeterminate = (subMenu: any) => {
  const selected = getSubMenuSelectedCount(subMenu)
  const total = getSubMenuTotalCount(subMenu)
  return selected > 0 && selected < total
}

const getPermissionLevel = () => {
  const count = formData.value.permissions.length
  if (count >= 30) return '超级管理员'
  if (count >= 20) return '高级权限'
  if (count >= 10) return '中级权限'
  if (count >= 3) return '基础权限'
  return '无权限'
}

const getPermissionLevelTag = () => {
  const count = formData.value.permissions.length
  if (count >= 30) return 'danger'
  if (count >= 20) return 'warning'
  if (count >= 10) return 'primary'
  if (count >= 3) return 'success'
  return 'info'
}

const getCoveredModules = () => {
  const modules = new Set<string>()
  formData.value.permissions.forEach(permission => {
    const menuCode = permission.split(':')[0]
    const menu = PERMISSION_TREE.find(m => m.code === menuCode)
    if (menu) {
      modules.add(menu.name)
    }
  })
  return Array.from(modules).join('、')
}

// 方法 - 一级菜单处理
const handleMenuChange = (menu: any) => {
  const isChecked = formData.value.permissions.includes(menu.code)
  
  if (isChecked) {
    // 选中一级菜单，自动选中所有子权限
    if (!formData.value.permissions.includes(menu.code)) {
      formData.value.permissions.push(menu.code)
    }
    if (menu.children) {
      menu.children.forEach((subMenu: any) => {
        if (!formData.value.permissions.includes(subMenu.code)) {
          formData.value.permissions.push(subMenu.code)
        }
        if (subMenu.actions) {
          subMenu.actions.forEach((action: any) => {
            const actionCode = `${subMenu.code}:${action.code}`
            if (!formData.value.permissions.includes(actionCode)) {
              formData.value.permissions.push(actionCode)
            }
          })
        }
      })
    }
  } else {
    // 取消一级菜单，移除所有相关权限
    const index = formData.value.permissions.indexOf(menu.code)
    if (index > -1) {
      formData.value.permissions.splice(index, 1)
    }
    if (menu.children) {
      menu.children.forEach((subMenu: any) => {
        const subIndex = formData.value.permissions.indexOf(subMenu.code)
        if (subIndex > -1) {
          formData.value.permissions.splice(subIndex, 1)
        }
        if (subMenu.actions) {
          subMenu.actions.forEach((action: any) => {
            const actionCode = `${subMenu.code}:${action.code}`
            const actionIndex = formData.value.permissions.indexOf(actionCode)
            if (actionIndex > -1) {
              formData.value.permissions.splice(actionIndex, 1)
            }
          })
        }
      })
    }
  }
}

// 方法 - 二级菜单处理
const handleSubMenuChange = (subMenu: any) => {
  const isChecked = formData.value.permissions.includes(subMenu.code)
  
  if (isChecked) {
    // 选中二级菜单，自动选中所有操作按钮
    if (!formData.value.permissions.includes(subMenu.code)) {
      formData.value.permissions.push(subMenu.code)
    }
    if (subMenu.actions) {
      subMenu.actions.forEach((action: any) => {
        const actionCode = `${subMenu.code}:${action.code}`
        if (!formData.value.permissions.includes(actionCode)) {
          formData.value.permissions.push(actionCode)
        }
      })
    }
  } else {
    // 取消二级菜单，移除相关权限
    const index = formData.value.permissions.indexOf(subMenu.code)
    if (index > -1) {
      formData.value.permissions.splice(index, 1)
    }
    if (subMenu.actions) {
      subMenu.actions.forEach((action: any) => {
        const actionCode = `${subMenu.code}:${action.code}`
        const actionIndex = formData.value.permissions.indexOf(actionCode)
        if (actionIndex > -1) {
          formData.value.permissions.splice(actionIndex, 1)
        }
      })
    }
  }
}

const applyTemplate = (template: PermissionTemplate) => {
  selectedTemplate.value = template.key
  formData.value.permissions = [...template.permissions]
}

const clearAllPermissions = () => {
  selectedTemplate.value = ''
  formData.value.permissions = []
}

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    departmentId: '',
    type: 'member',
    permissions: []
  }
  selectedTemplate.value = ''
}

const initFormData = () => {
  if (props.isEdit && props.role) {
    formData.value = {
      name: props.role.name,
      description: props.role.description,
      departmentId: props.role.departmentId,
      type: props.role.type,
      permissions: [...props.role.permissions]
    }
  } else {
    resetForm()
  }
}

const handleClose = () => {
  resetForm()
  emit('update:modelValue', false)
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    emit('success')
    ElMessage.success(props.isEdit ? '角色更新成功' : '角色创建成功')
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听器
watch(() => props.modelValue, (visible) => {
  if (visible) {
    nextTick(() => {
      initFormData()
    })
  }
})

watch(() => formData.value.permissions, () => {
  updateAllCategoryStatus()
}, { deep: true })
</script>

<style scoped>
.role-dialog {
  border-radius: 12px;
}

.role-form {
  max-height: 70vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f3f4;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  margin-right: 8px;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-templates {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.templates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.templates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-btn {
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 12px;
}

.permissions-tree {
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: white;
}

.permission-menu {
  border-bottom: 1px solid #f1f3f4;
}

.permission-menu:last-child {
  border-bottom: none;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.menu-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.menu-count {
  font-size: 12px;
  color: #909399;
  background: #e9ecef;
  padding: 2px 8px;
  border-radius: 10px;
}

.submenu-list {
  padding: 0 16px;
}

.submenu-item {
  border-bottom: 1px solid #f5f5f5;
  padding: 12px 0;
}

.submenu-item:last-child {
  border-bottom: none;
}

.submenu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.submenu-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.submenu-count {
  font-size: 11px;
  color: #909399;
  background: #f1f3f4;
  padding: 1px 6px;
  border-radius: 8px;
}

.action-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-left: 24px;
  padding: 8px 0;
}

.action-item {
  margin: 0;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.action-item:hover {
  background: #f8f9fa;
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 8px;
}

.action-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.action-desc {
  font-size: 11px;
  color: #909399;
  line-height: 1.3;
}

.permission-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-label {
  font-size: 14px;
  color: #606266;
}

.summary-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
  padding: 10px 20px;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

:deep(.el-dialog__header) {
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid #f1f3f4;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 0 24px 24px 24px;
  border-top: 1px solid #f1f3f4;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
}

:deep(.el-checkbox__label) {
  font-weight: normal;
}

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
}
</style>