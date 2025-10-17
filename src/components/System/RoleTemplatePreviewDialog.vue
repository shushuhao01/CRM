<template>
  <el-dialog
    v-model="visible"
    :title="`预览角色模板 - ${template?.name}`"
    width="900px"
    @close="handleClose"
  >
    <div class="preview-content" v-if="template">
      <!-- 基本信息 -->
      <div class="template-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ template.name }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ template.createTime }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ template.description }}</el-descriptions-item>
          <el-descriptions-item label="权限总数">{{ totalPermissions }}</el-descriptions-item>
          <el-descriptions-item label="适用角色">{{ template.applicableRoles?.join(', ') || '通用' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 权限详情 -->
      <div class="permissions-detail">
        <h3>权限配置详情</h3>
        
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 功能权限 -->
          <el-tab-pane label="功能权限" name="functional">
            <div class="permission-grid">
              <div v-for="(permissions, module) in functionalPermissions" :key="module" class="permission-module">
                <div class="module-header">
                  <el-icon><component :is="getModuleIcon(module)" /></el-icon>
                  <span>{{ getModuleName(module) }}</span>
                  <el-tag size="small" type="info">{{ permissions.length }}</el-tag>
                </div>
                <div class="permission-list">
                  <el-tag
                    v-for="permission in permissions"
                    :key="permission.code"
                    :type="getPermissionType(permission.level)"
                    size="small"
                    class="permission-tag"
                  >
                    {{ permission.name }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 数据权限 -->
          <el-tab-pane label="数据权限" name="data">
            <div class="data-permissions">
              <div v-for="(scope, resource) in dataPermissions" :key="resource" class="data-scope">
                <h4>{{ getResourceName(resource) }}</h4>
                <el-descriptions :column="1" size="small" border>
                  <el-descriptions-item label="访问范围">
                    <el-tag :type="getScopeType(scope.level)">{{ getScopeText(scope.level) }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="具体权限">
                    <div class="scope-permissions">
                      <el-tag
                        v-for="perm in scope.permissions"
                        :key="perm"
                        size="small"
                        style="margin: 2px;"
                      >
                        {{ perm }}
                      </el-tag>
                    </div>
                  </el-descriptions-item>
                  <el-descriptions-item label="限制条件" v-if="scope.conditions">
                    <div class="scope-conditions">
                      <div v-for="condition in scope.conditions" :key="condition.field">
                        <span class="condition-field">{{ condition.field }}:</span>
                        <span class="condition-value">{{ condition.value }}</span>
                      </div>
                    </div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-tab-pane>

          <!-- 系统权限 -->
          <el-tab-pane label="系统权限" name="system">
            <div class="system-permissions">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="system-section">
                    <h4>系统配置</h4>
                    <el-checkbox-group v-model="systemConfig" disabled>
                      <el-checkbox
                        v-for="config in template.systemPermissions?.config || []"
                        :key="config.code"
                        :label="config.code"
                      >
                        {{ config.name }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="system-section">
                    <h4>安全设置</h4>
                    <el-checkbox-group v-model="securitySettings" disabled>
                      <el-checkbox
                        v-for="setting in template.systemPermissions?.security || []"
                        :key="setting.code"
                        :label="setting.code"
                      >
                        {{ setting.name }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <!-- 权限矩阵 -->
          <el-tab-pane label="权限矩阵" name="matrix">
            <div class="permission-matrix">
              <el-table :data="permissionMatrix" style="width: 100%;" border>
                <el-table-column prop="module" label="功能模块" width="150" fixed />
                <el-table-column prop="view" label="查看" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.view" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="create" label="创建" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.create" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="edit" label="编辑" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.edit" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="delete" label="删除" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.delete" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="export" label="导出" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.export" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="special" label="特殊权限" min-width="200">
                  <template #default="{ row }">
                    <el-tag
                      v-for="perm in row.special"
                      :key="perm"
                      size="small"
                      style="margin: 2px;"
                    >
                      {{ perm }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 应用统计 -->
      <div class="usage-stats" v-if="template.usageStats">
        <h3>应用统计</h3>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="应用次数" :value="template.usageStats.applyCount" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="当前使用" :value="template.usageStats.currentUsers" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="最后应用" :value="template.usageStats.lastApplied" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="成功率" :value="template.usageStats.successRate" suffix="%" />
          </el-col>
        </el-row>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button @click="exportTemplate" type="primary">导出模板</el-button>
        <el-button @click="applyTemplate" type="success">应用模板</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Check, 
  Close, 
  User, 
  ShoppingCart,
  Document, 
  Setting,
  DataAnalysis,
  Service,
  Goods,
  Van
} from '@element-plus/icons-vue'

interface Props {
  modelValue: boolean
  template?: any
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', template: any): void
  (e: 'export', template: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref('functional')
const systemConfig = ref([])
const securitySettings = ref([])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 模拟数据
const functionalPermissions = computed(() => ({
  customer: [
    { code: 'customer_view', name: '查看客户', level: 'basic' },
    { code: 'customer_create', name: '创建客户', level: 'basic' },
    { code: 'customer_edit', name: '编辑客户', level: 'intermediate' },
    { code: 'customer_delete', name: '删除客户', level: 'advanced' },
    { code: 'customer_export', name: '导出客户', level: 'intermediate' },
    { code: 'customer_assign', name: '分配客户', level: 'advanced' },
    { code: 'customer_transfer', name: '转移客户', level: 'advanced' },
    { code: 'customer_merge', name: '合并客户', level: 'advanced' }
  ],
  order: [
    { code: 'order_view', name: '查看订单', level: 'basic' },
    { code: 'order_create', name: '创建订单', level: 'basic' },
    { code: 'order_edit', name: '编辑订单', level: 'intermediate' },
    { code: 'order_cancel', name: '取消订单', level: 'advanced' },
    { code: 'order_audit', name: '审核订单', level: 'advanced' },
    { code: 'order_export', name: '导出订单', level: 'intermediate' },
    { code: 'order_refund', name: '退款处理', level: 'advanced' },
    { code: 'order_price_adjust', name: '价格调整', level: 'advanced' }
  ],
  product: [
    { code: 'product_view', name: '查看商品', level: 'basic' },
    { code: 'product_create', name: '创建商品', level: 'intermediate' },
    { code: 'product_edit', name: '编辑商品', level: 'intermediate' },
    { code: 'product_delete', name: '删除商品', level: 'advanced' },
    { code: 'product_publish', name: '上架商品', level: 'intermediate' },
    { code: 'product_unpublish', name: '下架商品', level: 'intermediate' },
    { code: 'product_category', name: '分类管理', level: 'advanced' },
    { code: 'product_inventory', name: '库存管理', level: 'intermediate' }
  ],
  service: [
    { code: 'service_view', name: '查看服务', level: 'basic' },
    { code: 'service_create', name: '创建服务', level: 'basic' },
    { code: 'service_edit', name: '编辑服务', level: 'intermediate' },
    { code: 'service_close', name: '关闭服务', level: 'intermediate' },
    { code: 'service_assign', name: '分配服务', level: 'advanced' },
    { code: 'service_escalate', name: '升级服务', level: 'advanced' }
  ],
  logistics: [
    { code: 'logistics_view', name: '查看物流', level: 'basic' },
    { code: 'logistics_track', name: '跟踪物流', level: 'basic' },
    { code: 'logistics_update', name: '更新物流', level: 'intermediate' },
    { code: 'logistics_manage', name: '物流管理', level: 'advanced' }
  ],
  report: [
    { code: 'report_view', name: '查看报表', level: 'basic' },
    { code: 'report_export', name: '导出报表', level: 'intermediate' },
    { code: 'report_custom', name: '自定义报表', level: 'advanced' },
    { code: 'report_share', name: '分享报表', level: 'intermediate' },
    { code: 'report_schedule', name: '定时报表', level: 'advanced' }
  ],
  system: [
    { code: 'system_user_manage', name: '用户管理', level: 'advanced' },
    { code: 'system_permission_manage', name: '权限管理', level: 'advanced' },
    { code: 'system_config', name: '系统配置', level: 'advanced' },
    { code: 'system_log_view', name: '日志查看', level: 'intermediate' },
    { code: 'system_backup', name: '数据备份', level: 'advanced' },
    { code: 'system_monitor', name: '系统监控', level: 'advanced' }
  ]
}))

const dataPermissions = computed(() => ({
  customer: {
    level: 'department',
    permissions: ['查看', '编辑', '分配', '导出'],
    conditions: [
      { field: '部门', value: '所属部门及下级部门' },
      { field: '状态', value: '有效客户' },
      { field: '创建时间', value: '近一年' }
    ]
  },
  order: {
    level: 'personal',
    permissions: ['查看', '处理', '审核'],
    conditions: [
      { field: '负责人', value: '本人创建或分配' },
      { field: '订单状态', value: '待处理、处理中' }
    ]
  },
  product: {
    level: 'category',
    permissions: ['查看', '编辑', '上下架'],
    conditions: [
      { field: '分类', value: '负责分类及子分类' },
      { field: '状态', value: '正常状态' }
    ]
  },
  service: {
    level: 'department',
    permissions: ['查看', '处理', '分配'],
    conditions: [
      { field: '部门', value: '所属部门' },
      { field: '优先级', value: '普通、紧急' }
    ]
  },
  logistics: {
    level: 'region',
    permissions: ['查看', '跟踪', '更新'],
    conditions: [
      { field: '区域', value: '负责区域' },
      { field: '状态', value: '运输中、待配送' }
    ]
  },
  report: {
    level: 'department',
    permissions: ['查看', '导出', '分享'],
    conditions: [
      { field: '数据范围', value: '部门数据' },
      { field: '时间范围', value: '近三个月' }
    ]
  }
}))

const permissionMatrix = computed(() => [
  {
    module: '客户管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: true,
    special: ['客户分配', '客户转移', '客户合并']
  },
  {
    module: '订单管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: true,
    special: ['订单审核', '价格调整', '退款处理']
  },
  {
    module: '商品管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: false,
    special: ['上架商品', '下架商品', '分类管理', '库存管理']
  },
  {
    module: '服务管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: false,
    special: ['服务分配', '服务升级', '服务关闭']
  },
  {
    module: '物流管理',
    view: true,
    create: false,
    edit: true,
    delete: false,
    export: false,
    special: ['物流跟踪', '状态更新', '配送管理']
  },
  {
    module: '报表管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: true,
    special: ['自定义报表', '报表分享', '定时报表']
  },
  {
    module: '系统管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: false,
    special: ['用户管理', '权限管理', '系统配置', '数据备份']
  },
  {
    module: '商品管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: false,
    special: []
  },
  {
    module: '报表管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: true,
    special: ['自定义报表']
  }
])

const totalPermissions = computed(() => {
  return Object.values(functionalPermissions.value).reduce((total, perms) => total + perms.length, 0)
})

// 方法
const getModuleIcon = (module: string) => {
  const icons: Record<string, any> = {
    customer: User,
    order: ShoppingCart,
    product: Goods,
    report: DataAnalysis,
    service: Service,
    logistics: Van,
    system: Setting
  }
  return icons[module] || Document
}

const getModuleName = (module: string) => {
  const names: Record<string, string> = {
    customer: '客户管理',
    order: '订单管理',
    product: '商品管理',
    report: '报表管理',
    service: '客服管理',
    logistics: '物流管理',
    system: '系统管理'
  }
  return names[module] || module
}

const getPermissionType = (level: string) => {
  const types: Record<string, string> = {
    basic: 'success',
    intermediate: 'warning',
    advanced: 'danger'
  }
  return types[level] || 'info'
}

const getResourceName = (resource: string) => {
  const names: Record<string, string> = {
    customer: '客户数据',
    order: '订单数据',
    product: '商品数据',
    report: '报表数据'
  }
  return names[resource] || resource
}

const getScopeType = (level: string) => {
  const types: Record<string, string> = {
    all: 'danger',
    department: 'warning',
    personal: 'success'
  }
  return types[level] || 'info'
}

const getScopeText = (level: string) => {
  const texts: Record<string, string> = {
    all: '全部数据',
    department: '部门数据',
    personal: '个人数据'
  }
  return texts[level] || level
}

const exportTemplate = () => {
  ElMessage.success('模板导出成功')
  emit('export', props.template)
}

const applyTemplate = () => {
  ElMessage.success('模板应用成功')
  emit('apply', props.template)
  handleClose()
}

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.preview-content {
  padding: 20px 0;
}

.template-info {
  margin-bottom: 30px;
}

.permissions-detail h3 {
  margin-bottom: 20px;
  color: #303133;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.permission-module {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
}

.module-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-weight: 600;
  color: #303133;
}

.module-header .el-icon {
  margin-right: 8px;
  font-size: 18px;
}

.module-header .el-tag {
  margin-left: auto;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  margin: 2px;
}

.data-permissions {
  padding: 20px;
}

.data-scope {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.data-scope h4 {
  margin-bottom: 15px;
  color: #606266;
}

.scope-permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.scope-conditions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.condition-field {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
}

.condition-value {
  color: #303133;
}

.system-permissions {
  padding: 20px;
}

.system-section {
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.system-section h4 {
  margin-bottom: 15px;
  color: #606266;
}

.permission-matrix {
  padding: 20px;
}

.usage-stats {
  margin-top: 30px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
}

.usage-stats h3 {
  margin-bottom: 20px;
  color: #303133;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: 600;
}
</style>