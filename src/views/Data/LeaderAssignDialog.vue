<template>
  <el-dialog
    v-model="visible"
    title="部门负责人分配"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="assign-content">
      <div class="info-section">
        <el-alert
          title="分配说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>您有 <strong>{{ pendingAssignments.length }}</strong> 条待分配的客户资料</p>
            <p>请选择部门成员进行分配，系统将按轮流方式确保公平分配</p>
          </template>
        </el-alert>
      </div>

      <div class="assignment-section">
        <el-form :model="assignForm" label-width="100px">
          <el-form-item label="分配方式">
            <el-radio-group v-model="assignForm.assignType">
          <el-radio label="leader_roundrobin">轮流分配</el-radio>
          <el-radio label="leader_specific">指定成员</el-radio>
          <el-radio label="leader_custom">自定义分配</el-radio>
        </el-radio-group>
          </el-form-item>

          <el-form-item 
              label="选择成员" 
              v-if="assignForm.assignType === 'leader_specific'"
            >
            <el-select 
              v-model="assignForm.assignTo" 
              placeholder="选择部门成员"
              style="width: 100%"
            >
              <el-option
                v-for="member in departmentMembers"
                :key="member.id"
                :label="`${member.name} (已分配: ${member.assignmentCount}条)`"
                :value="member.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item 
              label="分配说明" 
              v-if="assignForm.assignType === 'leader_roundrobin'"
            >
            <div class="preview-section">
              <el-table 
                :data="assignmentPreview" 
                size="small"
                max-height="200px"
              >
                <el-table-column prop="memberName" label="成员" width="120" />
                <el-table-column prop="currentCount" label="当前分配" width="80" />
                <el-table-column prop="willAssign" label="将分配" width="80" />
                <el-table-column prop="totalAfter" label="分配后总数" width="100" />
              </el-table>
            </div>
          </el-form-item>

          <el-form-item 
              label="自定义分配" 
              v-if="assignForm.assignType === 'leader_custom'"
            >
            <div class="custom-assign-section">
              <div 
                v-for="member in departmentMembers" 
                :key="member.id"
                class="member-assign-item"
              >
                <span class="member-name">{{ member.name }}</span>
                <el-input-number
                  v-model="customAssignments[member.id]"
                  :min="0"
                  :max="pendingAssignments.length"
                  size="small"
                  style="width: 120px"
                />
                <span class="current-count">当前: {{ member.assignmentCount }}条</span>
              </div>
              <div class="assign-summary">
                <el-text type="info">
                  总计分配: {{ totalCustomAssigned }} / {{ pendingAssignments.length }}
                </el-text>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="备注">
            <el-input
              v-model="assignForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入分配备注（可选）"
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="data-list-section">
        <el-divider content-position="left">待分配资料列表</el-divider>
        <el-table 
          :data="pendingAssignments" 
          size="small"
          max-height="300px"
        >
          <el-table-column prop="customerName" label="客户姓名" width="120" />
          <el-table-column prop="phone" label="联系电话" width="130">
            <template #default="{ row }">
              {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
            </template>
          </el-table-column>
          <el-table-column prop="orderAmount" label="订单金额" width="100">
            <template #default="{ row }">
              ¥{{ row.orderAmount.toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column prop="orderDate" label="下单时间" width="100">
            <template #default="{ row }">
              {{ formatDate(row.orderDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="source" label="来源" />
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="confirmAssign"
          :loading="assigning"
          :disabled="!canAssign"
        >
          确认分配
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { getDepartmentMembers } from '@/api/department'
import { getAssignmentStats } from '@/api/data'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'

interface PendingAssignment {
  id: string
  customerName: string
  phone: string
  orderAmount: number
  orderDate: string
  source: string
}

interface DepartmentMember {
  id: string
  name: string
  assignmentCount: number
}

const props = defineProps<{
  modelValue: boolean
  pendingData: PendingAssignment[]
  departmentId: string
  departmentName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'assigned': []
}>()

const dataStore = useDataStore()
const departmentStore = useDepartmentStore()
const userStore = useUserStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const pendingAssignments = computed(() => props.pendingData || [])

// 部门成员列表
const departmentMembers = ref<DepartmentMember[]>([])
const loading = ref(false)

const assignForm = reactive({
  assignType: 'leader_roundrobin',
  assignTo: '',
  remark: ''
})

const customAssignments = ref<Record<string, number>>({})
const assigning = ref(false)

// 加载部门成员
const loadDepartmentMembers = async () => {
  try {
    loading.value = true
    const currentUser = userStore.currentUser
    if (!currentUser?.departmentId) {
      ElMessage.error('无法获取当前用户部门信息')
      return
    }

    // 获取部门成员
    const members = await getDepartmentMembers(currentUser.departmentId)
    
    // 获取成员分配统计
    const stats = await getAssignmentStats({
      departmentId: currentUser.departmentId
    })

    // 合并成员信息和分配统计
    departmentMembers.value = members.map(member => {
      const memberStats = stats.find(stat => stat.userId === member.id)
      return {
        id: member.id,
        name: member.name,
        assignmentCount: memberStats?.totalAssigned || 0
      }
    })

    // 初始化自定义分配
    initCustomAssignments()
  } catch (error) {
    console.error('加载部门成员失败:', error)
    ElMessage.error('加载部门成员失败')
  } finally {
    loading.value = false
  }
}

// 初始化自定义分配
const initCustomAssignments = () => {
  const assignments: Record<string, number> = {}
  departmentMembers.value.forEach(member => {
    assignments[member.id] = 0
  })
  customAssignments.value = assignments
}

// 轮流分配预览
const assignmentPreview = computed(() => {
  if (assignForm.assignType !== 'leader_roundrobin') return []
  
  const members = [...departmentMembers.value].sort((a, b) => a.assignmentCount - b.assignmentCount)
  const totalToAssign = pendingAssignments.value.length
  const memberCount = members.length
  
  return members.map((member, index) => {
    const willAssign = Math.floor(totalToAssign / memberCount) + (index < totalToAssign % memberCount ? 1 : 0)
    return {
      memberName: member.name,
      currentCount: member.assignmentCount,
      willAssign,
      totalAfter: member.assignmentCount + willAssign
    }
  })
})

// 自定义分配总数
const totalCustomAssigned = computed(() => {
  return Object.values(customAssignments.value).reduce((sum, count) => sum + count, 0)
})

// 是否可以分配
const canAssign = computed(() => {
  if (assignForm.assignType === 'leader_specific') {
    return !!assignForm.assignTo
  }
  if (assignForm.assignType === 'leader_custom') {
    return totalCustomAssigned.value === pendingAssignments.value.length
  }
  return true // leader_roundrobin
})

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString()
}

// 确认分配
const confirmAssign = async () => {
  try {
    assigning.value = true
    
    let assignments: Array<{
      dataId: string
      assigneeId: string
      assigneeName: string
    }> = []

    if (assignForm.assignType === 'leader_specific') {
      // 指定成员分配
      const member = departmentMembers.value.find(m => m.id === assignForm.assignTo)
      if (!member) {
        ElMessage.error('请选择有效的部门成员')
        return
      }
      
      assignments = pendingAssignments.value.map(item => ({
        dataId: item.id,
        assigneeId: member.id,
        assigneeName: member.name
      }))
    } else if (assignForm.assignType === 'leader_roundrobin') {
      // 轮流分配
      const sortedMembers = [...departmentMembers.value].sort((a, b) => a.assignmentCount - b.assignmentCount)
      
      assignments = pendingAssignments.value.map((item, index) => {
        const memberIndex = index % sortedMembers.length
        const member = sortedMembers[memberIndex]
        return {
          dataId: item.id,
          assigneeId: member.id,
          assigneeName: member.name
        }
      })
    } else {
      // 自定义分配
      let assignmentIndex = 0
      for (const [memberId, count] of Object.entries(customAssignments.value)) {
        const member = departmentMembers.value.find(m => m.id === memberId)
        if (member && count > 0) {
          for (let i = 0; i < count; i++) {
            if (assignmentIndex < pendingAssignments.value.length) {
              assignments.push({
                dataId: pendingAssignments.value[assignmentIndex].id,
                assigneeId: member.id,
                assigneeName: member.name
              })
              assignmentIndex++
            }
          }
        }
      }
    }

    // 调用分配API
    await dataStore.batchAssignData({
      dataIds: assignments.map(a => a.dataId),
      assigneeId: assignments[0].assigneeId, // 这里需要根据实际API调整
      assigneeName: assignments[0].assigneeName,
      remark: assignForm.remark
    })

    ElMessage.success(`成功分配 ${assignments.length} 条资料`)
    emit('assigned')
    handleClose()
  } catch (error) {
    ElMessage.error('分配失败')
  } finally {
    assigning.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  // 重置表单
  assignForm.assignType = 'leader_roundrobin'
  assignForm.assignTo = ''
  assignForm.remark = ''
  initCustomAssignments()
}

// 监听弹窗打开，加载部门成员
watch(visible, (newVal) => {
  if (newVal) {
    loadDepartmentMembers()
  }
})

// 组件挂载时加载数据
onMounted(() => {
  if (visible.value) {
    loadDepartmentMembers()
  }
})
</script>

<style scoped>
.assign-content {
  max-height: 70vh;
  overflow-y: auto;
}

.info-section {
  margin-bottom: 20px;
}

.assignment-section {
  margin-bottom: 20px;
}

.preview-section {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
}

.custom-assign-section {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
}

.member-assign-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 15px;
}

.member-name {
  width: 80px;
  font-weight: 500;
}

.current-count {
  color: #909399;
  font-size: 12px;
}

.assign-summary {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #e4e7ed;
  text-align: center;
}

.data-list-section {
  margin-top: 20px;
}

.dialog-footer {
  text-align: right;
}
</style>