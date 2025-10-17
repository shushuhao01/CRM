<template>
  <el-dialog
    v-model="visible"
    :title="`部门权限详情 - ${department?.name}`"
    width="900px"
    @close="handleClose"
  >
    <div class="permission-details">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 功能权限 -->
        <el-tab-pane label="功能权限" name="functional">
          <div class="permission-section">
            <div class="section-header">
              <h4>客户管理权限</h4>
              <el-button @click="editPermissionGroup('customer')" size="small" type="primary">编辑</el-button>
            </div>
            <el-row :gutter="20">
              <el-col :span="6" v-for="permission in customerPermissions" :key="permission.key">
                <el-checkbox 
                  :model-value="hasPermission(permission.key)" 
                  @change="togglePermission(permission.key, $event)"
                  :disabled="!editMode"
                >
                  {{ permission.label }}
                </el-checkbox>
              </el-col>
            </el-row>
          </div>

          <div class="permission-section">
            <div class="section-header">
              <h4>订单管理权限</h4>
              <el-button @click="editPermissionGroup('order')" size="small" type="primary">编辑</el-button>
            </div>
            <el-row :gutter="20">
              <el-col :span="6" v-for="permission in orderPermissions" :key="permission.key">
                <el-checkbox 
                  :model-value="hasPermission(permission.key)" 
                  @change="togglePermission(permission.key, $event)"
                  :disabled="!editMode"
                >
                  {{ permission.label }}
                </el-checkbox>
              </el-col>
            </el-row>
          </div>

          <div class="permission-section">
            <div class="section-header">
              <h4>系统管理权限</h4>
              <el-button @click="editPermissionGroup('system')" size="small" type="primary">编辑</el-button>
            </div>
            <el-row :gutter="20">
              <el-col :span="6" v-for="permission in systemPermissions" :key="permission.key">
                <el-checkbox 
                  :model-value="hasPermission(permission.key)" 
                  @change="togglePermission(permission.key, $event)"
                  :disabled="!editMode"
                >
                  {{ permission.label }}
                </el-checkbox>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- 数据权限 -->
        <el-tab-pane label="数据权限" name="data">
          <div class="data-permission">
            <el-form label-width="120px">
              <el-form-item label="数据范围">
                <el-radio-group v-model="dataScope" :disabled="!editMode">
                  <el-radio value="all">全部数据</el-radio>
                  <el-radio value="department">本部门数据</el-radio>
                  <el-radio value="personal">个人数据</el-radio>
                  <el-radio value="custom">自定义范围</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="客户数据权限" v-if="dataScope === 'custom'">
                <el-checkbox-group v-model="customDataPermissions.customer" :disabled="!editMode">
                  <el-checkbox value="view">查看</el-checkbox>
                  <el-checkbox value="create">创建</el-checkbox>
                  <el-checkbox value="edit">编辑</el-checkbox>
                  <el-checkbox value="delete">删除</el-checkbox>
                  <el-checkbox value="export">导出</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="订单数据权限" v-if="dataScope === 'custom'">
                <el-checkbox-group v-model="customDataPermissions.order" :disabled="!editMode">
                  <el-checkbox value="view">查看</el-checkbox>
                  <el-checkbox value="create">创建</el-checkbox>
                  <el-checkbox value="edit">编辑</el-checkbox>
                  <el-checkbox value="delete">删除</el-checkbox>
                  <el-checkbox value="export">导出</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="报表数据权限" v-if="dataScope === 'custom'">
                <el-checkbox-group v-model="customDataPermissions.report" :disabled="!editMode">
                  <el-checkbox value="view">查看</el-checkbox>
                  <el-checkbox value="export">导出</el-checkbox>
                  <el-checkbox value="share">分享</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 权限继承 -->
        <el-tab-pane label="权限继承" name="inheritance">
          <div class="inheritance-info">
            <el-alert
              title="权限继承说明"
              type="info"
              :closable="false"
              style="margin-bottom: 20px;"
            >
              <p>部门权限会自动继承给部门内的所有成员，成员的个人权限不能超过部门权限范围。</p>
            </el-alert>

            <div class="inheritance-tree">
              <h4>权限继承关系</h4>
              <el-tree
                :data="inheritanceTree"
                :props="{ children: 'children', label: 'label' }"
                default-expand-all
                show-checkbox
                :check-strictly="false"
                :default-checked-keys="inheritedPermissions"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button v-if="!editMode" @click="editMode = true" type="primary">编辑权限</el-button>
        <template v-else>
          <el-button @click="cancelEdit">取消</el-button>
          <el-button @click="savePermissions" type="primary" :loading="saving">保存</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

interface Department {
  id: string
  name: string
  permissions?: string[]
  dataScope?: string
}

interface Props {
  modelValue: boolean
  department?: Department | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'update', department: Department): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref('functional')
const editMode = ref(false)
const saving = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 权限数据
const departmentPermissions = ref<string[]>([])
const dataScope = ref('department')
const customDataPermissions = ref({
  customer: ['view', 'create'],
  order: ['view'],
  report: ['view']
})

// 权限选项
const customerPermissions = [
  { key: 'customer.view', label: '查看客户' },
  { key: 'customer.create', label: '创建客户' },
  { key: 'customer.edit', label: '编辑客户' },
  { key: 'customer.delete', label: '删除客户' },
  { key: 'customer.export', label: '导出客户' },
  { key: 'customer.import', label: '导入客户' }
]

const orderPermissions = [
  { key: 'order.view', label: '查看订单' },
  { key: 'order.create', label: '创建订单' },
  { key: 'order.edit', label: '编辑订单' },
  { key: 'order.delete', label: '删除订单' },
  { key: 'order.export', label: '导出订单' },
  { key: 'order.audit', label: '审核订单' }
]

const systemPermissions = [
  { key: 'system.user', label: '用户管理' },
  { key: 'system.role', label: '角色管理' },
  { key: 'system.permission', label: '权限管理' },
  { key: 'system.config', label: '系统配置' }
]

// 权限继承树
const inheritanceTree = ref([
  {
    label: '销售部',
    children: [
      { label: '客户管理权限' },
      { label: '订单管理权限' },
      { label: '报表查看权限' }
    ]
  }
])

const inheritedPermissions = ref(['customer.view', 'customer.create', 'order.view'])

watch(() => props.department, (newDept) => {
  if (newDept) {
    departmentPermissions.value = newDept.permissions || []
    dataScope.value = newDept.dataScope || 'department'
  }
}, { immediate: true })

const hasPermission = (permission: string) => {
  return departmentPermissions.value.includes(permission)
}

const togglePermission = (permission: string, checked: boolean) => {
  if (checked) {
    if (!departmentPermissions.value.includes(permission)) {
      departmentPermissions.value.push(permission)
    }
  } else {
    const index = departmentPermissions.value.indexOf(permission)
    if (index > -1) {
      departmentPermissions.value.splice(index, 1)
    }
  }
}

const editPermissionGroup = (group: string) => {
  editMode.value = true
  ElMessage.info(`编辑${group}权限组`)
}

const cancelEdit = () => {
  editMode.value = false
  // 重置权限数据
  if (props.department) {
    departmentPermissions.value = props.department.permissions || []
    dataScope.value = props.department.dataScope || 'department'
  }
}

const savePermissions = async () => {
  saving.value = true
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (props.department) {
      const updatedDepartment = {
        ...props.department,
        permissions: [...departmentPermissions.value],
        dataScope: dataScope.value
      }
      emit('update', updatedDepartment)
    }
    
    editMode.value = false
    ElMessage.success('权限保存成功')
  } catch (error) {
    ElMessage.error('权限保存失败')
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  editMode.value = false
  emit('update:modelValue', false)
}
</script>

<style scoped>
.permission-details {
  padding: 10px 0;
}

.permission-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h4 {
  margin: 0;
  color: #303133;
}

.data-permission {
  padding: 20px;
}

.inheritance-info {
  padding: 20px;
}

.inheritance-tree {
  margin-top: 20px;
}

.inheritance-tree h4 {
  margin-bottom: 15px;
  color: #303133;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-checkbox) {
  margin-bottom: 10px;
  width: 100%;
}
</style>