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
          <el-form-item label="适用角色" prop="targetRole">
            <el-select v-model="formData.targetRole" placeholder="请选择适用角色">
              <el-option label="部门负责人" value="department_manager" />
              <el-option label="销售员" value="sales_staff" />
              <el-option label="客服" value="customer_service" />
              <el-option label="财务" value="finance" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="模板描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入模板描述"
        />
      </el-form-item>

      <el-form-item label="权限配置" prop="permissions">
        <el-tabs v-model="activePermissionTab" type="border-card">
          <el-tab-pane label="客户管理" name="customer">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in customerPermissions" :key="permission.value">
                  <el-checkbox :value="permission.value">
                    <span>{{ permission.label }}</span>
                    <el-tooltip :content="permission.description" placement="top">
                      <el-icon style="margin-left: 5px; color: #909399;"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="订单管理" name="order">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in orderPermissions" :key="permission.value">
                  <el-checkbox :value="permission.value">
                    <span>{{ permission.label }}</span>
                    <el-tooltip :content="permission.description" placement="top">
                      <el-icon style="margin-left: 5px; color: #909399;"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="报表分析" name="report">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in reportPermissions" :key="permission.value">
                  <el-checkbox :value="permission.value">
                    <span>{{ permission.label }}</span>
                    <el-tooltip :content="permission.description" placement="top">
                      <el-icon style="margin-left: 5px; color: #909399;"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>

          <el-tab-pane label="系统管理" name="system">
            <el-checkbox-group v-model="formData.permissions">
              <el-row :gutter="20">
                <el-col :span="8" v-for="permission in systemPermissions" :key="permission.value">
                  <el-checkbox :value="permission.value">
                    <span>{{ permission.label }}</span>
                    <el-tooltip :content="permission.description" placement="top">
                      <el-icon style="margin-left: 5px; color: #909399;"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </el-tab-pane>
        </el-tabs>
      </el-form-item>

      <el-form-item label="数据范围">
        <el-radio-group v-model="formData.dataScope">
          <el-radio value="all">全部数据</el-radio>
          <el-radio value="department">部门数据</el-radio>
          <el-radio value="personal">个人数据</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="模板状态">
        <el-switch
          v-model="formData.isActive"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handlePreview" type="info">预览权限</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          {{ isEdit ? '更新模板' : '创建模板' }}
        </el-button>
      </div>
    </template>

    <!-- 权限预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="权限预览"
      width="600px"
      append-to-body
    >
      <div class="permission-preview">
        <h4>已选择的权限：</h4>
        <el-tag
          v-for="permission in selectedPermissionLabels"
          :key="permission"
          style="margin: 5px;"
          type="success"
        >
          {{ permission }}
        </el-tag>
        <div v-if="selectedPermissionLabels.length === 0" class="no-permissions">
          暂未选择任何权限
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'

interface RoleTemplate {
  id?: string
  name: string
  description: string
  targetRole: string
  permissions: string[]
  dataScope: string
  isActive: boolean
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
const previewVisible = ref(false)
const activePermissionTab = ref('customer')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.template?.id)

const formData = ref<RoleTemplate>({
  name: '',
  description: '',
  targetRole: '',
  permissions: [],
  dataScope: 'department',
  isActive: true
})

// 权限配置
const customerPermissions = [
  { label: '客户查看', value: 'customer_view', description: '查看客户基本信息和联系方式' },
  { label: '客户新增', value: 'customer_create', description: '创建新的客户档案' },
  { label: '客户编辑', value: 'customer_edit', description: '修改客户信息' },
  { label: '客户删除', value: 'customer_delete', description: '删除客户档案' },
  { label: '客户导入', value: 'customer_import', description: '批量导入客户数据' },
  { label: '客户导出', value: 'customer_export', description: '导出客户数据' }
]

const orderPermissions = [
  { label: '订单查看', value: 'order_view', description: '查看订单详情和状态' },
  { label: '订单创建', value: 'order_create', description: '创建新订单' },
  { label: '订单编辑', value: 'order_edit', description: '修改订单信息' },
  { label: '订单删除', value: 'order_delete', description: '删除订单记录' },
  { label: '订单审核', value: 'order_approve', description: '审核订单状态' },
  { label: '订单发货', value: 'order_ship', description: '处理订单发货' }
]

const reportPermissions = [
  { label: '销售报表', value: 'report_sales', description: '查看销售数据报表' },
  { label: '客户报表', value: 'report_customer', description: '查看客户分析报表' },
  { label: '业绩报表', value: 'report_performance', description: '查看业绩统计报表' },
  { label: '财务报表', value: 'report_finance', description: '查看财务数据报表' },
  { label: '报表导出', value: 'report_export', description: '导出各类报表数据' },
  { label: '报表打印', value: 'report_print', description: '打印报表文档' }
]

const systemPermissions = [
  { label: '用户管理', value: 'user_management', description: '管理系统用户账户' },
  { label: '角色管理', value: 'role_management', description: '管理用户角色权限' },
  { label: '部门管理', value: 'department_management', description: '管理组织架构' },
  { label: '系统设置', value: 'system_setting', description: '配置系统参数' },
  { label: '日志查看', value: 'log_view', description: '查看系统操作日志' },
  { label: '数据备份', value: 'data_backup', description: '执行数据备份操作' }
]

const allPermissions = [
  ...customerPermissions,
  ...orderPermissions,
  ...reportPermissions,
  ...systemPermissions
]

const selectedPermissionLabels = computed(() => {
  return formData.value.permissions.map(permissionValue => {
    const permission = allPermissions.find(p => p.value === permissionValue)
    return permission ? permission.label : permissionValue
  })
})

const rules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入模板描述', trigger: 'blur' }
  ],
  targetRole: [
    { required: true, message: '请选择适用角色', trigger: 'change' }
  ],
  permissions: [
    { required: true, message: '请至少选择一个权限', trigger: 'change' }
  ]
}

// 重置表单函数 - 需要在watch之前定义
const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    targetRole: '',
    permissions: [],
    dataScope: 'department',
    isActive: true
  }
  formRef.value?.clearValidate()
}

// 监听模板数据变化
watch(() => props.template, (newTemplate) => {
  if (newTemplate) {
    formData.value = { ...newTemplate }
  } else {
    resetForm()
  }
}, { immediate: true })

const handleClose = () => {
  visible.value = false
  resetForm()
}

const handlePreview = () => {
  previewVisible.value = true
}

const handleConfirm = async () => {
  try {
    await formRef.value.validate()
    
    if (formData.value.permissions.length === 0) {
      ElMessage.warning('请至少选择一个权限')
      return
    }
    
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    emit('confirm', { ...formData.value })
    handleClose()
    
    ElMessage.success(isEdit.value ? '角色模板更新成功' : '角色模板创建成功')
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}

.permission-preview {
  padding: 20px;
}

.permission-preview h4 {
  margin-bottom: 15px;
  color: #303133;
}

.no-permissions {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

:deep(.el-checkbox) {
  margin-bottom: 10px;
  width: 100%;
}

:deep(.el-tabs__content) {
  padding: 20px;
}
</style>