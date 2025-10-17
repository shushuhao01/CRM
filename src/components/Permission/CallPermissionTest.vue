<template>
  <div class="permission-test">
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>通话权限测试</span>
          <el-select v-model="currentTestUser" @change="switchTestUser" placeholder="选择测试用户">
            <el-option
              v-for="user in testUsers"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </div>
      </template>

      <div class="permission-grid">
        <div class="permission-item" v-for="permission in callPermissions" :key="permission.type">
          <div class="permission-info">
            <span class="permission-name">{{ permission.name }}</span>
            <span class="permission-desc">{{ permission.description }}</span>
          </div>
          <div class="permission-status">
            <el-tag 
              :type="checkPermission(permission.type) ? 'success' : 'danger'"
              size="small"
            >
              {{ checkPermission(permission.type) ? '有权限' : '无权限' }}
            </el-tag>
          </div>
        </div>
      </div>

      <div class="test-buttons">
        <h4>功能测试按钮</h4>
        <el-space wrap>
          <el-button 
            @click="testMakeCall" 
            :disabled="!checkPermission('MAKE_CALL')"
            type="success"
            size="small"
          >
            发起通话
          </el-button>
          <el-button 
            @click="testViewRecords" 
            :disabled="!checkPermission('VIEW_RECORDS')"
            type="primary"
            size="small"
          >
            查看记录
          </el-button>
          <el-button 
            @click="testPlayRecording" 
            :disabled="!checkPermission('PLAY_RECORDING')"
            type="info"
            size="small"
          >
            播放录音
          </el-button>
          <el-button 
            @click="testDownloadRecording" 
            :disabled="!checkPermission('DOWNLOAD_RECORDING')"
            type="warning"
            size="small"
          >
            下载录音
          </el-button>
          <el-button 
            @click="testEditRecords" 
            :disabled="!checkPermission('EDIT_RECORDS')"
            type="danger"
            size="small"
          >
            编辑记录
          </el-button>
          <el-button 
            @click="testDeleteRecords" 
            :disabled="!checkPermission('DELETE_RECORDS')"
            type="danger"
            size="small"
          >
            删除记录
          </el-button>
          <el-button 
            @click="testManageConfig" 
            :disabled="!checkPermission('MANAGE_CONFIG')"
            type="primary"
            size="small"
          >
            管理配置
          </el-button>
          <el-button 
            @click="testViewStatistics" 
            :disabled="!checkPermission('VIEW_STATISTICS')"
            type="success"
            size="small"
          >
            查看统计
          </el-button>
        </el-space>
      </div>

      <div class="test-results" v-if="testResults.length > 0">
        <h4>测试结果</h4>
        <div class="results-list">
          <div 
            v-for="(result, index) in testResults" 
            :key="index"
            class="result-item"
            :class="{ 'success': result.success, 'error': !result.success }"
          >
            <span class="result-time">{{ result.time }}</span>
            <span class="result-message">{{ result.message }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { permissionService, CallPermissionType } from '@/services/permission'

// 测试用户
const testUsers = ref([
  { id: 'admin', name: '超级管理员' },
  { id: 'manager', name: '部门经理' },
  { id: 'sales001', name: '销售员工' },
  { id: 'service001', name: '客服员工' }
])

// 当前测试用户
const currentTestUser = ref('admin')

// 通话权限列表
const callPermissions = ref([
  { type: 'MAKE_CALL', name: '发起通话', description: '允许发起外呼通话' },
  { type: 'VIEW_RECORDS', name: '查看记录', description: '允许查看通话记录' },
  { type: 'PLAY_RECORDING', name: '播放录音', description: '允许播放通话录音' },
  { type: 'DOWNLOAD_RECORDING', name: '下载录音', description: '允许下载通话录音' },
  { type: 'EDIT_RECORDS', name: '编辑记录', description: '允许编辑通话记录' },
  { type: 'DELETE_RECORDS', name: '删除记录', description: '允许删除通话记录' },
  { type: 'MANAGE_CONFIG', name: '管理配置', description: '允许管理电话配置' },
  { type: 'VIEW_STATISTICS', name: '查看统计', description: '允许查看通话统计' }
])

// 测试结果
const testResults = ref<Array<{
  time: string
  message: string
  success: boolean
}>>([])

// 检查权限
const checkPermission = (permissionType: string) => {
  return permissionService.checkCallPermission(
    currentTestUser.value,
    permissionType as CallPermissionType
  ).hasAccess
}

// 切换测试用户
const switchTestUser = (userId: string) => {
  const user = testUsers.value.find(u => u.id === userId)
  addTestResult(`切换到用户: ${user?.name}`, true)
  ElMessage.success(`已切换到用户: ${user?.name}`)
}

// 添加测试结果
const addTestResult = (message: string, success: boolean) => {
  testResults.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    success
  })
}

// 测试功能
const testMakeCall = () => {
  if (checkPermission('MAKE_CALL')) {
    addTestResult('发起通话测试 - 权限验证通过', true)
    ElMessage.success('发起通话权限验证通过')
  } else {
    addTestResult('发起通话测试 - 权限验证失败', false)
    ElMessage.error('无权限发起通话')
  }
}

const testViewRecords = () => {
  if (checkPermission('VIEW_RECORDS')) {
    addTestResult('查看记录测试 - 权限验证通过', true)
    ElMessage.success('查看记录权限验证通过')
  } else {
    addTestResult('查看记录测试 - 权限验证失败', false)
    ElMessage.error('无权限查看记录')
  }
}

const testPlayRecording = () => {
  if (checkPermission('PLAY_RECORDING')) {
    addTestResult('播放录音测试 - 权限验证通过', true)
    ElMessage.success('播放录音权限验证通过')
  } else {
    addTestResult('播放录音测试 - 权限验证失败', false)
    ElMessage.error('无权限播放录音')
  }
}

const testDownloadRecording = () => {
  if (checkPermission('DOWNLOAD_RECORDING')) {
    addTestResult('下载录音测试 - 权限验证通过', true)
    ElMessage.success('下载录音权限验证通过')
  } else {
    addTestResult('下载录音测试 - 权限验证失败', false)
    ElMessage.error('无权限下载录音')
  }
}

const testEditRecords = () => {
  if (checkPermission('EDIT_RECORDS')) {
    addTestResult('编辑记录测试 - 权限验证通过', true)
    ElMessage.success('编辑记录权限验证通过')
  } else {
    addTestResult('编辑记录测试 - 权限验证失败', false)
    ElMessage.error('无权限编辑记录')
  }
}

const testDeleteRecords = () => {
  if (checkPermission('DELETE_RECORDS')) {
    addTestResult('删除记录测试 - 权限验证通过', true)
    ElMessage.success('删除记录权限验证通过')
  } else {
    addTestResult('删除记录测试 - 权限验证失败', false)
    ElMessage.error('无权限删除记录')
  }
}

const testManageConfig = () => {
  if (checkPermission('MANAGE_CONFIG')) {
    addTestResult('管理配置测试 - 权限验证通过', true)
    ElMessage.success('管理配置权限验证通过')
  } else {
    addTestResult('管理配置测试 - 权限验证失败', false)
    ElMessage.error('无权限管理配置')
  }
}

const testViewStatistics = () => {
  if (checkPermission('VIEW_STATISTICS')) {
    addTestResult('查看统计测试 - 权限验证通过', true)
    ElMessage.success('查看统计权限验证通过')
  } else {
    addTestResult('查看统计测试 - 权限验证失败', false)
    ElMessage.error('无权限查看统计')
  }
}
</script>

<style scoped>
.permission-test {
  padding: 20px;
}

.test-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.permission-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.permission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fafafa;
}

.permission-info {
  display: flex;
  flex-direction: column;
}

.permission-name {
  font-weight: bold;
  color: #303133;
}

.permission-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.permission-status {
  flex-shrink: 0;
}

.test-buttons {
  margin: 20px 0;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.test-buttons h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
}

.test-results {
  margin-top: 20px;
  padding: 20px;
  background: #fafafa;
  border-radius: 4px;
}

.test-results h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
}

.results-list {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 14px;
}

.result-item.success {
  background: #f0f9ff;
  border-left: 3px solid #67c23a;
}

.result-item.error {
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
}

.result-time {
  font-size: 12px;
  color: #909399;
  min-width: 80px;
}

.result-message {
  color: #303133;
}
</style>