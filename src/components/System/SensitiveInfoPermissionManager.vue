<template>
  <div class="sensitive-info-permission-manager">
    <el-card class="manager-card">
      <template #header>
        <div class="card-header">
          <h3>
            <el-icon><Lock /></el-icon>
            客户敏感信息权限管理
          </h3>
          <p class="header-description">设置不同角色对客户敏感信息的访问权限</p>
        </div>
      </template>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>

      <!-- 权限配置表格 -->
      <el-table
        v-else
        :data="permissionMatrix"
        border
        style="width: 100%"
        class="permission-table"
      >
        <el-table-column prop="infoType" label="敏感信息类型" width="150" fixed="left">
          <template #default="{ row }">
            <div class="info-type-cell">
              <span>{{ getInfoTypeName(row.infoType) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          v-for="role in userRoles"
          :key="role.value"
          :label="role.label"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-switch
              v-model="row.permissions[role.value]"
              @change="handlePermissionChange(row.infoType, role.value, $event)"
              :disabled="role.value === 'super_admin'"
              active-color="#13ce66"
              inactive-color="#ff4949"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="showPermissionDetail(row)"
              link
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 批量操作 -->
      <div class="batch-operations">
        <el-divider content-position="left">批量操作</el-divider>
        <div class="batch-controls">
          <el-select v-model="selectedRole" placeholder="选择角色" style="width: 150px;">
            <el-option
              v-for="role in userRoles.filter(r => r.value !== 'super_admin')"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
          <el-button type="success" @click="enableAllForRole" :disabled="!selectedRole">
            全部启用
          </el-button>
          <el-button type="danger" @click="disableAllForRole" :disabled="!selectedRole">
            全部禁用
          </el-button>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="save-section">
        <el-button type="primary" size="large" @click="savePermissions" :loading="saving">
          <el-icon><Check /></el-icon>
          保存权限配置
        </el-button>
        <el-button @click="resetPermissions" :disabled="saving">
          重置
        </el-button>
      </div>
    </el-card>

    <!-- 权限详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="敏感信息权限详情"
      width="600px"
    >
      <div v-if="selectedInfoType" class="permission-detail">
        <h4>{{ getInfoTypeName(selectedInfoType.infoType) }}</h4>
        <p class="info-description">{{ getInfoTypeDescription(selectedInfoType.infoType) }}</p>

        <el-table :data="getRolePermissionDetails(selectedInfoType)" border>
          <el-table-column prop="roleName" label="角色" width="120" />
          <el-table-column prop="hasPermission" label="权限状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.hasPermission ? 'success' : 'danger'">
                {{ row.hasPermission ? '有权限' : '无权限' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock, Check } from '@element-plus/icons-vue'
import { getSensitiveInfoPermissions, saveSensitiveInfoPermissions } from '@/api/sensitiveInfoPermission'

// 敏感信息类型
const INFO_TYPES = ['phone', 'id_card', 'email', 'wechat', 'address', 'bank', 'financial']

// 响应式数据
const permissionMatrix = ref<Array<{
  infoType: string
  permissions: Record<string, boolean>
}>>([])

const userRoles = ref([
  { value: 'super_admin', label: '超级管理员' },
  { value: 'admin', label: '管理员' },
  { value: 'department_manager', label: '部门经理' },
  { value: 'sales_staff', label: '销售员' },
  { value: 'customer_service', label: '客服' }
])

const selectedRole = ref('')
const saving = ref(false)
const loading = ref(false)
const detailDialogVisible = ref(false)
const selectedInfoType = ref<any>(null)

// 敏感信息类型配置
const sensitiveInfoConfig: Record<string, { name: string; description: string }> = {
  phone: {
    name: '手机号码',
    description: '客户的手机号码信息，用于联系和身份验证'
  },
  id_card: {
    name: '身份证号',
    description: '客户的身份证号码，重要的身份识别信息'
  },
  email: {
    name: '邮箱地址',
    description: '客户的电子邮箱地址，用于邮件通信'
  },
  wechat: {
    name: '微信号',
    description: '客户的微信号码，用于微信联系'
  },
  address: {
    name: '地址信息',
    description: '客户的详细地址信息，包括收货地址等'
  },
  bank: {
    name: '银行账户',
    description: '客户的银行账户信息，财务相关敏感数据'
  },
  financial: {
    name: '财务信息',
    description: '客户的财务状况、收入等敏感财务数据'
  }
}

// 加载权限配置
const loadPermissions = async () => {
  loading.value = true
  try {
    const response = await getSensitiveInfoPermissions()
    const responseData = response.data

    if (responseData && responseData.success && responseData.data) {
      const data = responseData.data

      // 转换为表格数据格式
      const matrix: Array<{ infoType: string; permissions: Record<string, boolean> }> = []

      INFO_TYPES.forEach(infoType => {
        const permissions: Record<string, boolean> = {}
        userRoles.value.forEach(role => {
          if (data[infoType] && data[infoType][role.value] !== undefined) {
            permissions[role.value] = data[infoType][role.value]
          } else {
            // 默认值：超级管理员和管理员有权限，其他无权限
            permissions[role.value] = role.value === 'super_admin' || role.value === 'admin'
          }
        })
        matrix.push({ infoType, permissions })
      })

      permissionMatrix.value = matrix
    } else {
      console.warn('API返回数据格式不正确，使用默认配置')
      initializeDefaultPermissions()
    }
  } catch (error) {
    console.error('加载权限配置失败:', error)
    ElMessage.error('加载权限配置失败，使用默认配置')
    // 使用默认配置
    initializeDefaultPermissions()
  } finally {
    loading.value = false
  }
}

// 初始化默认权限配置
const initializeDefaultPermissions = () => {
  const matrix: Array<{ infoType: string; permissions: Record<string, boolean> }> = []

  INFO_TYPES.forEach(infoType => {
    const permissions: Record<string, boolean> = {}
    userRoles.value.forEach(role => {
      // 超级管理员和管理员默认有权限
      permissions[role.value] = role.value === 'super_admin' || role.value === 'admin'
    })
    matrix.push({ infoType, permissions })
  })

  permissionMatrix.value = matrix
}

// 获取信息类型名称
const getInfoTypeName = (infoType: string): string => {
  return sensitiveInfoConfig[infoType]?.name || infoType
}

// 获取信息类型描述
const getInfoTypeDescription = (infoType: string): string => {
  return sensitiveInfoConfig[infoType]?.description || ''
}

// 处理权限变更
const handlePermissionChange = (infoType: string, role: string, hasPermission: boolean) => {
  console.log(`权限变更: ${infoType} - ${role} - ${hasPermission}`)
}

// 显示权限详情
const showPermissionDetail = (row: any) => {
  selectedInfoType.value = row
  detailDialogVisible.value = true
}

// 获取角色权限详情
const getRolePermissionDetails = (infoTypeRow: any) => {
  return userRoles.value.map(role => ({
    roleName: role.label,
    hasPermission: infoTypeRow.permissions[role.value],
    description: role.value === 'super_admin' ? '超级管理员拥有所有权限' :
                 infoTypeRow.permissions[role.value] ? '可以查看此类敏感信息' : '无法查看此类敏感信息'
  }))
}

// 批量启用角色权限
const enableAllForRole = () => {
  if (!selectedRole.value) return

  permissionMatrix.value.forEach(item => {
    item.permissions[selectedRole.value] = true
  })

  const roleName = userRoles.value.find(r => r.value === selectedRole.value)?.label
  ElMessage.success(`已为${roleName}启用所有敏感信息权限`)
}

// 批量禁用角色权限
const disableAllForRole = () => {
  if (!selectedRole.value) return

  const roleName = userRoles.value.find(r => r.value === selectedRole.value)?.label

  ElMessageBox.confirm(
    `确定要禁用${roleName}的所有敏感信息权限吗？`,
    '确认操作',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    permissionMatrix.value.forEach(item => {
      item.permissions[selectedRole.value] = false
    })
    ElMessage.success(`已禁用${roleName}的所有敏感信息权限`)
  })
}

// 保存权限配置
const savePermissions = async () => {
  saving.value = true

  try {
    // 转换为API需要的格式
    const permissions: Record<string, Record<string, boolean>> = {}

    permissionMatrix.value.forEach(item => {
      permissions[item.infoType] = { ...item.permissions }
    })

    const response = await saveSensitiveInfoPermissions(permissions)

    if (response.data.success) {
      ElMessage.success('权限配置保存成功！')
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败，请重试')
    console.error('保存权限配置失败:', error)
  } finally {
    saving.value = false
  }
}

// 重置权限配置
const resetPermissions = () => {
  ElMessageBox.confirm(
    '确定要重置所有权限配置吗？这将重新从服务器加载配置。',
    '确认重置',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    loadPermissions()
    ElMessage.success('权限配置已重置')
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadPermissions()
})
</script>

<style scoped>
.sensitive-info-permission-manager {
  padding: 20px;
}

.manager-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h3 {
  margin: 0 0 10px 0;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.header-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.loading-container {
  padding: 20px;
}

.permission-table {
  margin: 20px 0;
}

.info-type-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.batch-operations {
  margin: 30px 0;
}

.batch-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.save-section {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.save-section .el-button {
  margin: 0 10px;
}

.permission-detail h4 {
  color: #303133;
  margin-bottom: 10px;
}

.info-description {
  color: #606266;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .sensitive-info-permission-manager {
    padding: 10px;
  }

  .batch-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-controls .el-select,
  .batch-controls .el-button {
    margin-bottom: 10px;
  }
}
</style>
