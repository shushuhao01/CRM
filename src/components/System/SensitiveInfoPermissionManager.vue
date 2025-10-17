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

      <!-- 权限配置表格 -->
      <el-table 
        :data="permissionMatrix" 
        border 
        style="width: 100%"
        class="permission-table"
      >
        <el-table-column prop="infoType" label="敏感信息类型" width="150" fixed="left">
          <template #default="{ row }">
            <div class="info-type-cell">
              <el-icon :class="getInfoTypeIcon(row.infoType)"></el-icon>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock, Check, Phone, CreditCard, Message, User, Location, Wallet } from '@element-plus/icons-vue'
import { SensitiveInfoType, UserRole, permissionService } from '@/services/permission'

// 响应式数据
const permissionMatrix = ref<Array<{
  infoType: SensitiveInfoType
  permissions: Record<string, boolean>
}>>([])

const userRoles = ref([
  { value: 'super_admin', label: '超级管理员' },
  { value: 'department_manager', label: '部门经理' },
  { value: 'sales_staff', label: '销售员' },
  { value: 'customer_service', label: '客服' }
])

const selectedRole = ref('')
const saving = ref(false)
const detailDialogVisible = ref(false)
const selectedInfoType = ref<any>(null)

// 敏感信息类型配置
const sensitiveInfoConfig = {
  [SensitiveInfoType.PHONE]: {
    name: '手机号码',
    icon: 'Phone',
    description: '客户的手机号码信息，用于联系和身份验证'
  },
  [SensitiveInfoType.ID_CARD]: {
    name: '身份证号',
    icon: 'CreditCard',
    description: '客户的身份证号码，重要的身份识别信息'
  },
  [SensitiveInfoType.EMAIL]: {
    name: '邮箱地址',
    icon: 'Message',
    description: '客户的电子邮箱地址，用于邮件通信'
  },
  [SensitiveInfoType.WECHAT]: {
    name: '微信号',
    icon: 'User',
    description: '客户的微信号码，用于微信联系'
  },
  [SensitiveInfoType.ADDRESS]: {
    name: '地址信息',
    icon: 'Location',
    description: '客户的详细地址信息，包括收货地址等'
  },
  [SensitiveInfoType.BANK_ACCOUNT]: {
    name: '银行账户',
    icon: 'Wallet',
    description: '客户的银行账户信息，财务相关敏感数据'
  },
  [SensitiveInfoType.FINANCIAL]: {
    name: '财务信息',
    icon: 'Wallet',
    description: '客户的财务状况、收入等敏感财务数据'
  }
}

// 初始化权限矩阵
const initializePermissionMatrix = () => {
  const matrix: Array<{
    infoType: SensitiveInfoType
    permissions: Record<string, boolean>
  }> = []

  Object.values(SensitiveInfoType).forEach(infoType => {
    const permissions: Record<string, boolean> = {}
    
    userRoles.value.forEach(role => {
      if (role.value === 'super_admin') {
        permissions[role.value] = true // 超级管理员默认有所有权限
      } else {
        permissions[role.value] = false // 其他角色默认无权限
      }
    })

    matrix.push({
      infoType,
      permissions
    })
  })

  permissionMatrix.value = matrix
}

// 获取信息类型名称
const getInfoTypeName = (infoType: SensitiveInfoType): string => {
  return sensitiveInfoConfig[infoType]?.name || infoType
}

// 获取信息类型图标
const getInfoTypeIcon = (infoType: SensitiveInfoType): string => {
  return sensitiveInfoConfig[infoType]?.icon || 'Document'
}

// 获取信息类型描述
const getInfoTypeDescription = (infoType: SensitiveInfoType): string => {
  return sensitiveInfoConfig[infoType]?.description || ''
}

// 处理权限变更
const handlePermissionChange = (infoType: SensitiveInfoType, role: string, hasPermission: boolean) => {
  console.log(`权限变更: ${infoType} - ${role} - ${hasPermission}`)
  // 这里可以添加实时保存逻辑
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
  
  ElMessage.success(`已为${userRoles.value.find(r => r.value === selectedRole.value)?.label}启用所有敏感信息权限`)
}

// 批量禁用角色权限
const disableAllForRole = () => {
  if (!selectedRole.value) return
  
  ElMessageBox.confirm(
    `确定要禁用${userRoles.value.find(r => r.value === selectedRole.value)?.label}的所有敏感信息权限吗？`,
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
    ElMessage.success(`已禁用${userRoles.value.find(r => r.value === selectedRole.value)?.label}的所有敏感信息权限`)
  })
}

// 保存权限配置
const savePermissions = async () => {
  saving.value = true
  
  try {
    // 这里应该调用后端API保存权限配置
    // 模拟保存过程
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 实际保存逻辑应该是：
    // await permissionService.saveSensitiveInfoPermissions(permissionMatrix.value)
    
    ElMessage.success('权限配置保存成功！')
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
    '确定要重置所有权限配置吗？这将恢复到默认设置。',
    '确认重置',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    initializePermissionMatrix()
    ElMessage.success('权限配置已重置')
  })
}

// 组件挂载时初始化
onMounted(() => {
  initializePermissionMatrix()
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

/* 响应式设计 */
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