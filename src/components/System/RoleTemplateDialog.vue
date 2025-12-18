<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑角色模板' : '创建角色模板'"
    width="900px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="模板名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入模板名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="模板编码" prop="code">
            <el-input
              v-model="formData.code"
              placeholder="请输入模板编码（英文）"
              :disabled="isEdit"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="模板颜色" prop="color">
            <el-select v-model="formData.color" placeholder="请选择颜色">
              <el-option label="主色（蓝色）" value="primary" />
              <el-option label="成功（绿色）" value="success" />
              <el-option label="警告（橙色）" value="warning" />
              <el-option label="危险（红色）" value="danger" />
              <el-option label="信息（灰色）" value="info" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="优先级" prop="level">
            <el-input-number v-model="formData.level" :min="1" :max="100" />
            <span style="margin-left: 10px; color: #909399; font-size: 12px;">数字越小优先级越高</span>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="模板描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入模板描述，说明此模板适用的场景"
        />
      </el-form-item>

      <el-form-item label="权限配置" prop="permissions">
        <div class="permission-header">
          <el-button size="small" @click="selectAllPermissions">全选</el-button>
          <el-button size="small" @click="clearAllPermissions">清空</el-button>
          <span class="selected-count">已选择 {{ formData.permissions.length }} 个权限</span>
        </div>
        <el-tabs v-model="activePermissionTab" type="border-card">
          <el-tab-pane label="数据看板" name="dashboard">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in dashboardPermissions" :key="permission.value">
                  <el-checkbox :label="permission.value">
                    <span>{{ permission.label }}</span>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="客户管理" name="customer">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in customerPermissions" :key="permission.value">
                  <el-checkbox :label="permission.value">
                    <span>{{ permission.label }}</span>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="订单管理" name="order">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in orderPermissions" :key="permission.value">
                  <el-checkbox :label="permission.value">
                    <span>{{ permission.label }}</span>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="业绩统计" name="performance">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in performancePermissions" :key="permission.value">
                  <el-checkbox :label="permission.value">
                    <span>{{ permission.label }}</span>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="物流管理" name="logistics">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in logisticsPermissions" :key="permission.value">
                  <el-checkbox :label="permission.value">
                    <span>{{ permission.label }}</span>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="售后管理" name="afterSales">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in afterSalesPermissions" :key="permission.value">
                  <el-checkbox :label="permission.value">
                    <span>{{ permission.label }}</span>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="系统管理" name="system">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in systemPermissions" :key="permission.value">
                  <el-checkbox :label="permission.value">
                    <span>{{ permission.label }}</span>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>
        </el-tabs>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          {{ isEdit ? '更新模板' : '创建模板' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { roleApiService } from '@/services/roleApiService'

interface RoleTemplate {
  id?: string
  name: string
  code: string
  description: string
  permissions: string[]
  color: string
  level: number
}

interface Props {
  modelValue: boolean
  template?: RoleTemplate | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: RoleTemplate): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref()
const loading = ref(false)
const activePermissionTab = ref('dashboard')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.template?.id)

const formData = ref<RoleTemplate>({
  name: '',
  code: '',
  description: '',
  permissions: [],
  color: 'primary',
  level: 10
})

// 权限配置 - 与系统实际权限对应
const dashboardPermissions = [
  { label: '数据看板', value: 'dashboard' },
  { label: '个人看板', value: 'dashboard.personal' },
  { label: '个人看板查看', value: 'dashboard.personal.view' },
  { label: '部门看板', value: 'dashboard.department' },
  { label: '部门看板查看', value: 'dashboard.department.view' }
]

const customerPermissions = [
  { label: '客户管理', value: 'customer' },
  { label: '客户列表', value: 'customer.list' },
  { label: '客户查看', value: 'customer.list.view' },
  { label: '客户编辑', value: 'customer.list.edit' },
  { label: '客户导出', value: 'customer.list.export' },
  { label: '客户导入', value: 'customer.list.import' },
  { label: '新增客户', value: 'customer.add' },
  { label: '创建客户', value: 'customer.add.create' },
  { label: '客户分组', value: 'customer.groups' },
  { label: '客户标签', value: 'customer.tags' }
]

const orderPermissions = [
  { label: '订单管理', value: 'order' },
  { label: '订单列表', value: 'order.list' },
  { label: '订单查看', value: 'order.list.view' },
  { label: '订单编辑', value: 'order.list.edit' },
  { label: '新增订单', value: 'order.add' },
  { label: '创建订单', value: 'order.add.create' },
  { label: '订单审核', value: 'order.audit' },
  { label: '审核查看', value: 'order.audit.view' },
  { label: '审核通过', value: 'order.audit.approve' },
  { label: '审核拒绝', value: 'order.audit.reject' }
]

const performancePermissions = [
  { label: '业绩统计', value: 'performance' },
  { label: '个人业绩', value: 'performance.personal' },
  { label: '个人业绩查看', value: 'performance.personal.view' },
  { label: '团队业绩', value: 'performance.team' },
  { label: '团队业绩查看', value: 'performance.team.view' },
  { label: '业绩分析', value: 'performance.analysis' },
  { label: '业绩分析查看', value: 'performance.analysis.view' },
  { label: '业绩分享', value: 'performance.share' },
  { label: '业绩分享查看', value: 'performance.share.view' }
]

const logisticsPermissions = [
  { label: '物流管理', value: 'logistics' },
  { label: '物流列表', value: 'logistics.list' },
  { label: '物流查看', value: 'logistics.list.view' },
  { label: '发货管理', value: 'logistics.shipping' },
  { label: '发货查看', value: 'logistics.shipping.view' },
  { label: '发货创建', value: 'logistics.shipping.create' },
  { label: '物流跟踪', value: 'logistics.track' },
  { label: '跟踪查看', value: 'logistics.track.view' },
  { label: '跟踪更新', value: 'logistics.track.update' },
  { label: '状态更新', value: 'logistics.status' },
  { label: '状态查看', value: 'logistics.status.view' },
  { label: '状态修改', value: 'logistics.status.update' }
]

const afterSalesPermissions = [
  { label: '售后管理', value: 'afterSales' },
  { label: '售后列表', value: 'afterSales.list' },
  { label: '售后查看', value: 'afterSales.list.view' },
  { label: '新增售后', value: 'afterSales.add' },
  { label: '创建售后', value: 'afterSales.add.create' },
  { label: '售后数据', value: 'afterSales.data' },
  { label: '数据查看', value: 'afterSales.data.view' },
  { label: '数据分析', value: 'afterSales.data.analysis' }
]

const systemPermissions = [
  { label: '系统管理', value: 'system' },
  { label: '用户管理', value: 'system.users' },
  { label: '角色管理', value: 'system.roles' },
  { label: '部门管理', value: 'system.departments' },
  { label: '系统设置', value: 'system.settings' },
  { label: '日志管理', value: 'system.logs' }
]

const allPermissions = [
  ...dashboardPermissions,
  ...customerPermissions,
  ...orderPermissions,
  ...performancePermissions,
  ...logisticsPermissions,
  ...afterSalesPermissions,
  ...systemPermissions
]

const rules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入模板编码', trigger: 'blur' },
    { pattern: /^[a-z_]+$/, message: '编码只能包含小写字母和下划线', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入模板描述', trigger: 'blur' }
  ]
}

const resetForm = () => {
  formData.value = {
    name: '',
    code: '',
    description: '',
    permissions: [],
    color: 'primary',
    level: 10
  }
  formRef.value?.clearValidate()
}

watch(() => props.template, (newTemplate) => {
  if (newTemplate) {
    formData.value = {
      ...newTemplate,
      permissions: newTemplate.permissions || []
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const selectAllPermissions = () => {
  formData.value.permissions = allPermissions.map(p => p.value)
}

const clearAllPermissions = () => {
  formData.value.permissions = []
}

const handleClose = () => {
  visible.value = false
  resetForm()
}

const handleConfirm = async () => {
  try {
    await formRef.value.validate()

    if (formData.value.permissions.length === 0) {
      ElMessage.warning('请至少选择一个权限')
      return
    }

    loading.value = true

    if (isEdit.value) {
      // 更新模板
      await roleApiService.updateRole({
        id: props.template!.id!,
        name: formData.value.name,
        code: formData.value.code,
        description: formData.value.description,
        permissions: formData.value.permissions,
        level: formData.value.level
      })
    } else {
      // 创建新模板
      await roleApiService.createRoleTemplate({
        name: formData.value.name,
        code: formData.value.code,
        description: formData.value.description,
        permissions: formData.value.permissions,
        level: formData.value.level,
        isTemplate: true
      })
    }

    emit('confirm', { ...formData.value })
    handleClose()

    ElMessage.success(isEdit.value ? '角色模板更新成功' : '角色模板创建成功')
  } catch (error: any) {
    console.error('保存模板失败:', error)
    ElMessage.error(error?.message || '保存模板失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}

.permission-header {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-count {
  color: #409eff;
  font-size: 14px;
  margin-left: auto;
}

:deep(.el-checkbox) {
  margin-bottom: 10px;
  width: 100%;
}

:deep(.el-tabs__content) {
  padding: 20px;
  max-height: 300px;
  overflow-y: auto;
}
</style>
