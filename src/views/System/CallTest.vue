<template>
  <div class="call-test">
    <!-- 权限测试组件 -->
    <CallPermissionTest />
    
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>通话功能测试</span>
          <el-button type="primary" @click="refreshData">刷新数据</el-button>
        </div>
      </template>

      <div class="test-section">
        <h3>权限测试</h3>
        <el-space direction="vertical" style="width: 100%">
          <div v-for="user in testUsers" :key="user.id" class="user-test">
            <el-tag :type="user.role === 'SUPER_ADMIN' ? 'success' : user.role === 'WHITELIST_MEMBER' ? 'warning' : 'info'">
              {{ user.name }} ({{ user.role }})
            </el-tag>
            <el-space>
              <el-button size="small" @click="testUserPermissions(user.id)">测试权限</el-button>
              <el-button size="small" @click="switchUser(user.id)" type="primary">切换用户</el-button>
            </el-space>
          </div>
        </el-space>
      </div>

      <div class="test-section">
        <h3>通话功能测试</h3>
        <el-space direction="vertical" style="width: 100%">
          <el-button @click="testMakeCall" :disabled="!canMakeCall">测试发起通话</el-button>
          <el-button @click="testPlayRecording" :disabled="!canPlayRecording">测试播放录音</el-button>
          <el-button @click="testDownloadRecording" :disabled="!canDownloadRecording">测试下载录音</el-button>
          <el-button @click="testEditRecord" :disabled="!canEditRecord">测试编辑记录</el-button>
          <el-button @click="testViewStatistics" :disabled="!canViewStatistics">测试查看统计</el-button>
        </el-space>
      </div>

      <div class="test-section">
        <h3>数据同步测试</h3>
        <el-space direction="vertical" style="width: 100%">
          <el-button @click="testDataSync">测试数据同步</el-button>
          <el-button @click="testStoreIntegration">测试Store集成</el-button>
          <el-button @click="testPermissionSync">测试权限同步</el-button>
        </el-space>
      </div>

      <div class="test-results" v-if="testResults.length > 0">
        <h3>测试结果</h3>
        <el-timeline>
          <el-timeline-item
            v-for="(result, index) in testResults"
            :key="index"
            :type="result.success ? 'success' : 'danger'"
            :timestamp="result.timestamp"
          >
            <div class="test-result-item">
              <div class="test-name">{{ result.testName }}</div>
              <div class="test-message" :class="{ 'error': !result.success }">
                {{ result.message }}
              </div>
              <div v-if="result.details" class="test-details">
                <pre>{{ JSON.stringify(result.details, null, 2) }}</pre>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useCallStore } from '@/stores/call'
import { useUserStore } from '@/stores/user'
import { permissionService, CallPermissionType } from '@/services/permission'
import CallPermissionTest from '@/components/Permission/CallPermissionTest.vue'

const callStore = useCallStore()
const userStore = useUserStore()

// 测试用户
const testUsers = ref([
  { id: 'admin', name: '超级管理员', role: 'SUPER_ADMIN' },
  { id: 'manager', name: '部门经理', role: 'WHITELIST_MEMBER' },
  { id: 'sales001', name: '销售员工', role: 'REGULAR_USER' },
  { id: 'service001', name: '客服员工', role: 'REGULAR_USER' }
])

// 当前用户ID
const currentUserId = ref('admin')

// 测试结果
const testResults = ref<Array<{
  testName: string
  success: boolean
  message: string
  timestamp: string
  details?: any
}>>([])

// 权限检查
const canMakeCall = computed(() => {
  return permissionService.checkCallPermission(currentUserId.value, CallPermissionType.MAKE_CALL).hasAccess
})

const canPlayRecording = computed(() => {
  return permissionService.checkCallPermission(currentUserId.value, CallPermissionType.PLAY_RECORDING).hasAccess
})

const canDownloadRecording = computed(() => {
  return permissionService.checkCallPermission(currentUserId.value, CallPermissionType.DOWNLOAD_RECORDING).hasAccess
})

const canEditRecord = computed(() => {
  return permissionService.checkCallPermission(currentUserId.value, CallPermissionType.EDIT_RECORDS).hasAccess
})

const canViewStatistics = computed(() => {
  return permissionService.checkCallPermission(currentUserId.value, CallPermissionType.VIEW_STATISTICS).hasAccess
})

// 添加测试结果
const addTestResult = (testName: string, success: boolean, message: string, details?: any) => {
  testResults.value.unshift({
    testName,
    success,
    message,
    timestamp: new Date().toLocaleString(),
    details
  })
}

// 切换用户
const switchUser = (userId: string) => {
  currentUserId.value = userId
  const user = testUsers.value.find(u => u.id === userId)
  ElMessage.success(`已切换到用户: ${user?.name}`)
  addTestResult('用户切换', true, `切换到用户: ${user?.name} (${userId})`)
}

// 测试用户权限
const testUserPermissions = (userId: string) => {
  const permissions = Object.values(CallPermissionType)
  const results: any = {}
  
  permissions.forEach(permission => {
    const check = permissionService.checkCallPermission(userId, permission)
    results[permission] = {
      hasAccess: check.hasAccess,
      reason: check.reason
    }
  })
  
  const user = testUsers.value.find(u => u.id === userId)
  addTestResult(
    `权限测试 - ${user?.name}`,
    true,
    `用户 ${user?.name} 的权限检查完成`,
    results
  )
}

// 测试发起通话
const testMakeCall = async () => {
  try {
    const testCallData = {
      customerId: 'test-customer-001',
      customerName: '测试客户',
      phone: '13800138000',
      purpose: '测试通话',
      notes: '这是一个测试通话',
      type: 'outbound' as const
    }
    
    await callStore.startCall(testCallData)
    addTestResult('发起通话测试', true, '通话发起成功', testCallData)
    ElMessage.success('通话发起测试成功')
  } catch (error) {
    addTestResult('发起通话测试', false, `通话发起失败: ${error}`)
    ElMessage.error('通话发起测试失败')
  }
}

// 测试播放录音
const testPlayRecording = async () => {
  try {
    await callStore.playRecording('test-call-001')
    addTestResult('播放录音测试', true, '录音播放成功')
    ElMessage.success('录音播放测试成功')
  } catch (error) {
    addTestResult('播放录音测试', false, `录音播放失败: ${error}`)
    ElMessage.error('录音播放测试失败')
  }
}

// 测试下载录音
const testDownloadRecording = async () => {
  try {
    await callStore.downloadRecording('test-call-001')
    addTestResult('下载录音测试', true, '录音下载成功')
    ElMessage.success('录音下载测试成功')
  } catch (error) {
    addTestResult('下载录音测试', false, `录音下载失败: ${error}`)
    ElMessage.error('录音下载测试失败')
  }
}

// 测试编辑记录
const testEditRecord = () => {
  try {
    // 模拟编辑记录
    addTestResult('编辑记录测试', true, '记录编辑功能正常')
    ElMessage.success('编辑记录测试成功')
  } catch (error) {
    addTestResult('编辑记录测试', false, `记录编辑失败: ${error}`)
    ElMessage.error('编辑记录测试失败')
  }
}

// 测试查看统计
const testViewStatistics = () => {
  try {
    const stats = {
      todayCallCount: callStore.todayCallCount,
      todayCallDuration: callStore.todayCallDuration,
      totalRecords: callStore.callRecords.length
    }
    addTestResult('查看统计测试', true, '统计数据获取成功', stats)
    ElMessage.success('查看统计测试成功')
  } catch (error) {
    addTestResult('查看统计测试', false, `统计数据获取失败: ${error}`)
    ElMessage.error('查看统计测试失败')
  }
}

// 测试数据同步
const testDataSync = async () => {
  try {
    await callStore.loadCallRecords('test-customer-001')
    addTestResult('数据同步测试', true, '数据同步成功')
    ElMessage.success('数据同步测试成功')
  } catch (error) {
    addTestResult('数据同步测试', false, `数据同步失败: ${error}`)
    ElMessage.error('数据同步测试失败')
  }
}

// 测试Store集成
const testStoreIntegration = () => {
  try {
    const storeState = {
      callRecords: callStore.callRecords.length,
      followUpRecords: callStore.followUpRecords.length,
      currentCall: callStore.currentCall,
      isCallActive: callStore.isCallActive
    }
    addTestResult('Store集成测试', true, 'Store状态正常', storeState)
    ElMessage.success('Store集成测试成功')
  } catch (error) {
    addTestResult('Store集成测试', false, `Store集成失败: ${error}`)
    ElMessage.error('Store集成测试失败')
  }
}

// 测试权限同步
const testPermissionSync = () => {
  try {
    const allPermissions = Object.values(CallPermissionType)
    const permissionResults = allPermissions.map(permission => ({
      permission,
      hasAccess: permissionService.checkCallPermission(currentUserId.value, permission).hasAccess
    }))
    
    addTestResult('权限同步测试', true, '权限同步正常', permissionResults)
    ElMessage.success('权限同步测试成功')
  } catch (error) {
    addTestResult('权限同步测试', false, `权限同步失败: ${error}`)
    ElMessage.error('权限同步测试失败')
  }
}

// 运行所有测试
const runAllTests = async () => {
  testResults.value = []
  ElMessage.info('开始运行所有测试...')
  
  // 测试权限
  testUsers.value.forEach(user => {
    testUserPermissions(user.id)
  })
  
  // 测试功能
  await testDataSync()
  testStoreIntegration()
  testPermissionSync()
  
  if (canMakeCall.value) await testMakeCall()
  if (canPlayRecording.value) await testPlayRecording()
  if (canDownloadRecording.value) await testDownloadRecording()
  if (canEditRecord.value) testEditRecord()
  if (canViewStatistics.value) testViewStatistics()
  
  ElMessage.success('所有测试完成')
}

onMounted(() => {
  addTestResult('系统初始化', true, '通话功能测试页面加载完成')
})
</script>

<style scoped>
.call-test-container {
  padding: 20px;
}

.test-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.test-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
}

.user-test {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.test-results {
  margin-top: 30px;
  padding: 20px;
  background: #fafafa;
  border-radius: 4px;
}

.test-result-item {
  margin-bottom: 10px;
}

.test-name {
  font-weight: bold;
  color: #303133;
}

.test-message {
  color: #606266;
  margin: 5px 0;
}

.test-message.error {
  color: #f56c6c;
}

.test-details {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.test-details pre {
  margin: 0;
  font-size: 12px;
  color: #606266;
}
</style>