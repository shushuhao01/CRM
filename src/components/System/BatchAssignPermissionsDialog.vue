<template>
  <el-dialog
    v-model="visible"
    title="批量分配权限"
    width="800px"
    @close="handleClose"
  >
    <div class="batch-assign">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择部门" />
        <el-step title="配置权限" />
        <el-step title="确认分配" />
      </el-steps>

      <!-- 步骤1: 选择部门 -->
      <div v-if="currentStep === 0" class="step-content">
        <h4>选择要分配权限的部门</h4>
        <el-transfer
          v-model="selectedDepartments"
          :data="departmentList"
          :titles="['可选部门', '已选部门']"
          :button-texts="['移除', '添加']"
          :format="{
            noChecked: '${total}',
            hasChecked: '${checked}/${total}'
          }"
          filterable
          filter-placeholder="搜索部门"
        />
      </div>

      <!-- 步骤2: 配置权限 -->
      <div v-if="currentStep === 1" class="step-content">
        <h4>配置权限模板</h4>
        <el-tabs v-model="activePermissionTab" type="border-card">
          <el-tab-pane label="功能权限" name="functional">
            <div class="permission-group">
              <h5>客户管理</h5>
              <el-checkbox-group v-model="permissions.customer">
                <el-checkbox label="view">查看客户</el-checkbox>
            <el-checkbox label="create">创建客户</el-checkbox>
            <el-checkbox label="edit">编辑客户</el-checkbox>
            <el-checkbox label="delete">删除客户</el-checkbox>
            <el-checkbox label="export">导出客户</el-checkbox>
              </el-checkbox-group>
            </div>

            <div class="permission-group">
              <h5>订单管理</h5>
              <el-checkbox-group v-model="permissions.order">
                <el-checkbox label="view">查看订单</el-checkbox>
            <el-checkbox label="create">创建订单</el-checkbox>
            <el-checkbox label="edit">编辑订单</el-checkbox>
            <el-checkbox label="delete">删除订单</el-checkbox>
            <el-checkbox label="audit">审核订单</el-checkbox>
              </el-checkbox-group>
            </div>

            <div class="permission-group">
              <h5>系统管理</h5>
              <el-checkbox-group v-model="permissions.system">
                <el-checkbox label="user">用户管理</el-checkbox>
            <el-checkbox label="role">角色管理</el-checkbox>
            <el-checkbox label="permission">权限管理</el-checkbox>
            <el-checkbox label="config">系统配置</el-checkbox>
              </el-checkbox-group>
            </div>
          </el-tab-pane>

          <el-tab-pane label="数据权限" name="data">
            <el-form label-width="120px">
              <el-form-item label="数据范围">
                <el-radio-group v-model="dataScope">
                  <el-radio value="all">全部数据</el-radio>
                  <el-radio value="department">本部门数据</el-radio>
                  <el-radio value="personal">个人数据</el-radio>
                  <el-radio value="custom">自定义范围</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="权限级别">
                <el-select v-model="permissionLevel" placeholder="选择权限级别">
                  <el-option label="只读" value="readonly" />
                  <el-option label="编辑" value="edit" />
                  <el-option label="管理" value="manage" />
                  <el-option label="超级管理员" value="super" />
                </el-select>
              </el-form-item>

              <el-form-item label="生效时间">
                <el-date-picker
                  v-model="effectiveDate"
                  type="datetimerange"
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss"
                />
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <div class="template-actions">
          <el-button @click="loadTemplate" type="primary" plain>加载权限模板</el-button>
          <el-button @click="saveAsTemplate" type="success" plain>保存为模板</el-button>
          <el-button @click="clearPermissions" type="danger" plain>清空权限</el-button>
        </div>
      </div>

      <!-- 步骤3: 确认分配 -->
      <div v-if="currentStep === 2" class="step-content">
        <h4>确认分配信息</h4>
        <div class="confirm-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="选择部门数量">
              {{ selectedDepartmentNames.length }}
            </el-descriptions-item>
            <el-descriptions-item label="权限级别">
              {{ permissionLevelText }}
            </el-descriptions-item>
            <el-descriptions-item label="数据范围">
              {{ dataScopeText }}
            </el-descriptions-item>
            <el-descriptions-item label="生效时间">
              {{ effectiveDateText }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="selected-departments">
            <h5>选择的部门：</h5>
            <el-tag
              v-for="name in selectedDepartmentNames"
              :key="name"
              style="margin: 5px;"
              type="primary"
            >
              {{ name }}
            </el-tag>
          </div>

          <div class="selected-permissions">
            <h5>分配的权限：</h5>
            <div class="permission-summary">
              <div v-if="permissions.customer.length > 0">
                <strong>客户管理：</strong>
                <el-tag v-for="perm in permissions.customer" :key="perm" size="small" style="margin: 2px;">
                  {{ getPermissionText('customer', perm) }}
                </el-tag>
              </div>
              <div v-if="permissions.order.length > 0">
                <strong>订单管理：</strong>
                <el-tag v-for="perm in permissions.order" :key="perm" size="small" style="margin: 2px;">
                  {{ getPermissionText('order', perm) }}
                </el-tag>
              </div>
              <div v-if="permissions.system.length > 0">
                <strong>系统管理：</strong>
                <el-tag v-for="perm in permissions.system" :key="perm" size="small" style="margin: 2px;">
                  {{ getPermissionText('system', perm) }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep < 2" @click="nextStep" type="primary">下一步</el-button>
        <el-button v-if="currentStep === 2" @click="confirmAssign" type="primary" :loading="assigning">
          确认分配
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'assigned'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const currentStep = ref(0)
const activePermissionTab = ref('functional')
const assigning = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 部门数据
const departmentList = ref([
  { key: '1', label: '销售部', disabled: false },
  { key: '2', label: '市场部', disabled: false },
  { key: '3', label: '技术部', disabled: false },
  { key: '4', label: '客服部', disabled: false },
  { key: '5', label: '财务部', disabled: false },
  { key: '6', label: '人事部', disabled: false }
])

const selectedDepartments = ref<string[]>([])

// 权限配置
const permissions = ref({
  customer: ['view'],
  order: ['view'],
  system: []
})

const dataScope = ref('department')
const permissionLevel = ref('readonly')
const effectiveDate = ref<[string, string] | null>(null)

// 计算属性
const selectedDepartmentNames = computed(() => {
  return departmentList.value
    .filter(dept => selectedDepartments.value.includes(dept.key))
    .map(dept => dept.label)
})

const permissionLevelText = computed(() => {
  const levels = {
    readonly: '只读',
    edit: '编辑',
    manage: '管理',
    super: '超级管理员'
  }
  return levels[permissionLevel.value as keyof typeof levels] || '未设置'
})

const dataScopeText = computed(() => {
  const scopes = {
    all: '全部数据',
    department: '本部门数据',
    personal: '个人数据',
    custom: '自定义范围'
  }
  return scopes[dataScope.value as keyof typeof scopes] || '未设置'
})

const effectiveDateText = computed(() => {
  if (!effectiveDate.value) return '立即生效'
  return `${effectiveDate.value[0]} 至 ${effectiveDate.value[1]}`
})

// 权限文本映射
const permissionTexts = {
  customer: {
    view: '查看客户',
    create: '创建客户',
    edit: '编辑客户',
    delete: '删除客户',
    export: '导出客户'
  },
  order: {
    view: '查看订单',
    create: '创建订单',
    edit: '编辑订单',
    delete: '删除订单',
    audit: '审核订单'
  },
  system: {
    user: '用户管理',
    role: '角色管理',
    permission: '权限管理',
    config: '系统配置'
  }
}

const getPermissionText = (module: string, permission: string) => {
  return permissionTexts[module as keyof typeof permissionTexts]?.[permission as keyof any] || permission
}

// 步骤控制
const nextStep = () => {
  if (currentStep.value === 0 && selectedDepartments.value.length === 0) {
    ElMessage.warning('请至少选择一个部门')
    return
  }
  
  if (currentStep.value === 1) {
    const hasPermissions = permissions.value.customer.length > 0 || 
                          permissions.value.order.length > 0 || 
                          permissions.value.system.length > 0
    if (!hasPermissions) {
      ElMessage.warning('请至少选择一个权限')
      return
    }
  }
  
  if (currentStep.value < 2) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 权限模板操作
const loadTemplate = () => {
  ElMessage.info('加载权限模板功能开发中')
}

const saveAsTemplate = () => {
  ElMessage.info('保存权限模板功能开发中')
}

const clearPermissions = () => {
  permissions.value = {
    customer: [],
    order: [],
    system: []
  }
  ElMessage.success('权限已清空')
}

// 确认分配
const confirmAssign = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要为 ${selectedDepartmentNames.value.length} 个部门分配权限吗？`,
      '确认分配',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    assigning.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('权限分配成功')
    emit('assigned')
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('权限分配失败')
    }
  } finally {
    assigning.value = false
  }
}

const handleClose = () => {
  currentStep.value = 0
  selectedDepartments.value = []
  permissions.value = {
    customer: ['view'],
    order: ['view'],
    system: []
  }
  dataScope.value = 'department'
  permissionLevel.value = 'readonly'
  effectiveDate.value = null
  emit('update:modelValue', false)
}
</script>

<style scoped>
.batch-assign {
  padding: 20px 0;
}

.step-content {
  margin: 30px 0;
  min-height: 400px;
}

.step-content h4 {
  margin-bottom: 20px;
  color: #303133;
}

.permission-group {
  margin-bottom: 25px;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.permission-group h5 {
  margin: 0 0 15px 0;
  color: #606266;
  font-weight: 600;
}

.template-actions {
  margin-top: 20px;
  text-align: center;
  padding: 20px;
  border-top: 1px solid #ebeef5;
}

.confirm-info {
  padding: 20px;
}

.selected-departments,
.selected-permissions {
  margin: 20px 0;
}

.selected-departments h5,
.selected-permissions h5 {
  margin-bottom: 10px;
  color: #303133;
}

.permission-summary > div {
  margin: 10px 0;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-transfer) {
  text-align: center;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}
</style>