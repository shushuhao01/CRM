<template>
  <el-dialog
    v-model="visible"
    title="导入角色模板"
    width="700px"
    @close="handleClose"
  >
    <div class="import-content">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择文件" />
        <el-step title="预览数据" />
        <el-step title="确认导入" />
      </el-steps>

      <!-- 步骤1: 选择文件 -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="upload-section">
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :before-upload="beforeUpload"
            accept=".json,.xlsx,.csv"
            :limit="1"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 JSON、Excel、CSV 格式文件，文件大小不超过 10MB
              </div>
            </template>
          </el-upload>

          <div class="template-options" v-if="uploadedFile">
            <h4>导入选项</h4>
            <el-form :model="importOptions" label-width="120px">
              <el-form-item label="导入模式">
                <el-radio-group v-model="importOptions.mode">
                  <el-radio label="merge">合并模式（保留现有模板）</el-radio>
          <el-radio label="replace">替换模式（覆盖同名模板）</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="冲突处理">
                <el-select v-model="importOptions.conflictResolution" placeholder="选择冲突处理方式">
                  <el-option label="跳过冲突项" value="skip" />
                  <el-option label="自动重命名" value="rename" />
                  <el-option label="覆盖现有项" value="overwrite" />
                </el-select>
              </el-form-item>
              <el-form-item label="验证权限">
                <el-switch v-model="importOptions.validatePermissions" />
                <span class="form-tip">验证导入的权限是否在系统中存在</span>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>

      <!-- 步骤2: 预览数据 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="preview-section">
          <div class="preview-summary">
            <el-alert
              :title="`共解析到 ${previewData.length} 个角色模板`"
              type="info"
              :closable="false"
              style="margin-bottom: 20px;"
            />
          </div>

          <el-table :data="previewData" style="width: 100%;" max-height="400">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="模板名称" width="150" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="permissionCount" label="权限数量" width="100" />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button @click="previewPermissions(row)" size="small" type="primary" link>
                  查看权限
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="validation-results" v-if="validationErrors.length > 0">
            <h4>验证结果</h4>
            <el-alert
              v-for="error in validationErrors"
              :key="error.id"
              :title="error.message"
              type="warning"
              :closable="false"
              style="margin-bottom: 10px;"
            />
          </div>
        </div>
      </div>

      <!-- 步骤3: 确认导入 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="confirm-section">
          <el-result
            icon="success"
            title="准备导入"
            :sub-title="`将导入 ${selectedTemplates.length} 个角色模板`"
          />

          <div class="import-summary">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="导入模式">{{ importModeText }}</el-descriptions-item>
              <el-descriptions-item label="冲突处理">{{ conflictResolutionText }}</el-descriptions-item>
              <el-descriptions-item label="模板数量">{{ selectedTemplates.length }}</el-descriptions-item>
              <el-descriptions-item label="权限验证">{{ importOptions.validatePermissions ? '已启用' : '已禁用' }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="selected-templates">
            <h4>将要导入的模板：</h4>
            <el-tag
              v-for="template in selectedTemplates"
              :key="template.id"
              style="margin: 5px;"
              type="primary"
            >
              {{ template.name }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep < 2" @click="nextStep" type="primary" :disabled="!canProceed">
          下一步
        </el-button>
        <el-button v-if="currentStep === 2" @click="confirmImport" type="primary" :loading="importing">
          确认导入
        </el-button>
      </div>
    </template>

    <!-- 权限预览对话框 -->
    <el-dialog
      v-model="permissionPreviewVisible"
      :title="`权限预览 - ${currentPreviewTemplate?.name}`"
      width="500px"
    >
      <div class="permission-preview">
        <div v-for="(permissions, module) in currentPreviewTemplate?.permissions" :key="module">
          <h5>{{ getModuleName(module) }}</h5>
          <el-tag
            v-for="permission in permissions"
            :key="permission"
            size="small"
            style="margin: 2px;"
          >
            {{ permission }}
          </el-tag>
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'imported', templates: any[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const currentStep = ref(0)
const importing = ref(false)
const uploadRef = ref()
const uploadedFile = ref<File | null>(null)
const permissionPreviewVisible = ref(false)
const currentPreviewTemplate = ref<any>(null)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 导入选项
const importOptions = ref({
  mode: 'merge',
  conflictResolution: 'skip',
  validatePermissions: true
})

// 预览数据
const previewData = ref([
  {
    id: '1',
    name: '销售经理模板',
    description: '销售经理角色权限模板',
    permissionCount: 18,
    status: 'valid',
    permissions: {
      customer: ['查看客户', '创建客户', '编辑客户', '分配客户', '导出客户'],
      order: ['查看订单', '创建订单', '编辑订单', '审核订单', '导出订单'],
      product: ['查看商品', '编辑商品'],
      report: ['查看报表', '导出报表', '自定义报表']
    },
    dataPermissions: {
      customer: { level: 'department', scopes: ['所属部门及下级部门'] },
      order: { level: 'department', scopes: ['所属部门及下级部门'] }
    },
    systemPermissions: {
      config: ['基础配置'],
      security: ['密码策略']
    }
  },
  {
    id: '2',
    name: '客服专员模板',
    description: '客服专员角色权限模板',
    permissionCount: 12,
    status: 'conflict',
    permissions: {
      customer: ['查看客户', '编辑客户'],
      order: ['查看订单'],
      service: ['查看服务', '创建服务', '编辑服务', '处理服务'],
      logistics: ['查看物流', '跟踪物流']
    },
    dataPermissions: {
      customer: { level: 'personal', scopes: ['本人负责'] },
      service: { level: 'department', scopes: ['所属部门'] }
    },
    systemPermissions: {
      config: [],
      security: []
    }
  },
  {
    id: '3',
    name: '仓库管理员模板',
    description: '仓库管理员角色权限模板',
    permissionCount: 10,
    status: 'valid',
    permissions: {
      product: ['查看商品', '编辑商品', '库存管理'],
      order: ['查看订单', '处理订单'],
      logistics: ['查看物流', '更新物流', '物流管理']
    },
    dataPermissions: {
      product: { level: 'category', scopes: ['负责分类'] },
      logistics: { level: 'region', scopes: ['负责区域'] }
    },
    systemPermissions: {
      config: ['库存配置'],
      security: []
    }
  }
])

const validationErrors = ref([
  {
    id: '1',
    message: '模板"客服专员模板"与现有模板名称冲突'
  },
  {
    id: '2',
    message: '权限配置"删除客户"超出当前用户权限范围'
  },
  {
    id: '3',
    message: '数据权限级别"全部"需要超级管理员权限'
  },
  {
    id: '4',
    message: '系统权限"数据备份"仅限系统管理员使用'
  }
])

const selectedTemplates = ref<any[]>([])

// 计算属性
const canProceed = computed(() => {
  if (currentStep.value === 0) return uploadedFile.value !== null
  if (currentStep.value === 1) return selectedTemplates.value.length > 0
  return true
})

const importModeText = computed(() => {
  return importOptions.value.mode === 'merge' ? '合并模式' : '替换模式'
})

const conflictResolutionText = computed(() => {
  const texts = {
    skip: '跳过冲突项',
    rename: '自动重命名',
    overwrite: '覆盖现有项'
  }
  return texts[importOptions.value.conflictResolution as keyof typeof texts]
})

// 方法
const handleFileChange = async (file: any) => {
  uploadedFile.value = file.raw

  // 解析JSON文件
  if (file.raw.type === 'application/json' || file.raw.name.endsWith('.json')) {
    try {
      const text = await file.raw.text()
      const data = JSON.parse(text)

      // 解析导入的角色模板数据
      if (data.roleTemplates && Array.isArray(data.roleTemplates)) {
        previewData.value = data.roleTemplates.map((template: any, index: number) => ({
          id: String(index + 1),
          name: template.name,
          description: template.description || '暂无描述',
          permissionCount: Array.isArray(template.permissions) ? template.permissions.length : 0,
          status: 'valid',
          permissions: template.permissions || [],
          dataPermissions: template.dataPermissions || {},
          systemPermissions: template.systemPermissions || {}
        }))

        // 清空验证错误
        validationErrors.value = []

        ElMessage.success(`文件解析成功，共发现 ${previewData.value.length} 个角色模板`)
      } else {
        ElMessage.error('文件格式不正确，请确保包含 roleTemplates 数组')
        uploadedFile.value = null
      }
    } catch (error) {
      console.error('解析文件失败:', error)
      ElMessage.error('文件解析失败，请检查文件格式')
      uploadedFile.value = null
    }
  } else {
    ElMessage.warning('目前仅支持JSON格式文件')
    uploadedFile.value = null
  }
}

const beforeUpload = (file: File) => {
  const isValidType = ['application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只支持 JSON、Excel、CSV 格式文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB!')
    return false
  }
  return false // 阻止自动上传
}

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    valid: 'success',
    conflict: 'warning',
    error: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    valid: '有效',
    conflict: '冲突',
    error: '错误'
  }
  return texts[status] || '未知'
}

const getModuleName = (module: string) => {
  const names: Record<string, string> = {
    customer: '客户管理',
    order: '订单管理',
    report: '报表管理',
    service: '客服管理'
  }
  return names[module] || module
}

const previewPermissions = (template: any) => {
  currentPreviewTemplate.value = template
  permissionPreviewVisible.value = true
}

// 步骤控制
const nextStep = () => {
  if (currentStep.value === 0) {
    // 解析文件并生成预览数据
    selectedTemplates.value = previewData.value.filter(item => item.status === 'valid')
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

const confirmImport = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要导入 ${selectedTemplates.value.length} 个角色模板吗？`,
      '确认导入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    importing.value = true

    // 导入角色模板到系统
    const { roleApiService } = await import('@/services/roleApiService')
    let successCount = 0
    let failCount = 0

    for (const template of selectedTemplates.value) {
      try {
        // 根据导入模式处理
        if (importOptions.value.mode === 'replace') {
          // 替换模式：先尝试删除同名角色，再创建
          try {
            const existingRoles = await roleApiService.getRoles()
            const existing = existingRoles.find(r => r.name === template.name)
            if (existing) {
              await roleApiService.deleteRole(existing.id)
            }
          } catch (e) {
            // 忽略删除错误
          }
        }

        await roleApiService.createRole({
          name: template.name,
          code: template.name.toLowerCase().replace(/\s+/g, '_'),
          description: template.description,
          permissions: template.permissions || [],
          roleType: 'custom'
        })
        successCount++
      } catch (error) {
        console.error(`导入角色 ${template.name} 失败:`, error)
        failCount++
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功导入 ${successCount} 个角色模板${failCount > 0 ? `，${failCount} 个失败` : ''}`)
    } else {
      ElMessage.error('导入失败')
    }

    emit('imported', selectedTemplates.value)
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('导入失败')
    }
  } finally {
    importing.value = false
  }
}

const handleClose = () => {
  currentStep.value = 0
  uploadedFile.value = null
  selectedTemplates.value = []
  permissionPreviewVisible.value = false
  currentPreviewTemplate.value = null
  emit('update:modelValue', false)
}
</script>

<style scoped>
.import-content {
  padding: 20px 0;
}

.step-content {
  margin: 30px 0;
  min-height: 400px;
}

.upload-section {
  text-align: center;
}

.template-options {
  margin-top: 30px;
  text-align: left;
}

.template-options h4 {
  margin-bottom: 20px;
  color: #303133;
}

.form-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}

.preview-section {
  padding: 20px;
}

.preview-summary {
  margin-bottom: 20px;
}

.validation-results {
  margin-top: 20px;
}

.validation-results h4 {
  margin-bottom: 15px;
  color: #E6A23C;
}

.confirm-section {
  text-align: center;
  padding: 20px;
}

.import-summary {
  margin: 30px 0;
}

.selected-templates {
  margin-top: 30px;
  text-align: left;
}

.selected-templates h4 {
  margin-bottom: 15px;
  color: #303133;
}

.permission-preview {
  padding: 10px;
}

.permission-preview h5 {
  margin: 15px 0 10px 0;
  color: #606266;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 5px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>
