<template>
  <el-dialog
    v-model="visible"
    :title="`管理部门成员 - ${department?.name}`"
    width="800px"
    @close="handleClose"
  >
    <div class="member-management">
      <div class="actions">
        <el-button @click="showAddMember = true" type="primary">
          <el-icon><Plus /></el-icon>
          添加成员
        </el-button>
        <el-button @click="batchRemoveMembers" type="danger" :disabled="selectedMembers.length === 0">
          <el-icon><Delete /></el-icon>
          批量移除
        </el-button>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索成员"
          style="width: 200px; margin-left: 10px;"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-table 
        :data="filteredMembers" 
        style="width: 100%; margin-top: 20px;"
        @selection-change="handleSelectionChange"
        v-loading="loading"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)">
              {{ getRoleDisplayName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="joinDate" label="加入时间" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button @click="editMemberRole(row)" size="small" type="primary">编辑角色</el-button>
            <el-button @click="removeMember(row)" size="small" type="danger">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加成员对话框 -->
    <el-dialog
      v-model="showAddMember"
      title="添加部门成员"
      width="500px"
      append-to-body
    >
      <el-form :model="addMemberForm" label-width="100px">
        <el-form-item label="选择用户">
          <el-select
            v-model="addMemberForm.userIds"
            placeholder="请选择要添加的用户"
            multiple
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in availableUsers"
              :key="user.id"
              :label="`${user.name} (${user.email})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="默认角色">
          <el-select v-model="addMemberForm.defaultRole" placeholder="请选择默认角色">
            <el-option label="部门负责人" value="department_manager" />
            <el-option label="销售员" value="sales_staff" />
            <el-option label="客服" value="customer_service" />
            <el-option label="财务" value="finance" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddMember = false">取消</el-button>
        <el-button type="primary" @click="confirmAddMembers" :loading="addLoading">确定</el-button>
      </template>
    </el-dialog>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Search } from '@element-plus/icons-vue'

interface Department {
  id: string
  name: string
}

interface Member {
  id: string
  name: string
  email: string
  role: string
  joinDate: string
  status: 'active' | 'inactive'
}

interface User {
  id: string
  name: string
  email: string
}

interface Props {
  modelValue: boolean
  department?: Department | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const addLoading = ref(false)
const showAddMember = ref(false)
const searchKeyword = ref('')
const selectedMembers = ref<Member[]>([])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 模拟数据
const members = ref<Member[]>([
  {
    id: '1',
    name: '张三',
    email: 'zhangsan@example.com',
    role: 'department_manager',
    joinDate: '2024-01-15',
    status: 'active'
  },
  {
    id: '2',
    name: '李四',
    email: 'lisi@example.com',
    role: 'sales_staff',
    joinDate: '2024-02-01',
    status: 'active'
  }
])

const availableUsers = ref<User[]>([
  { id: '3', name: '王五', email: 'wangwu@example.com' },
  { id: '4', name: '赵六', email: 'zhaoliu@example.com' }
])

const addMemberForm = ref({
  userIds: [] as string[],
  defaultRole: 'sales_staff'
})

const filteredMembers = computed(() => {
  if (!searchKeyword.value) return members.value
  return members.value.filter(member => 
    member.name.includes(searchKeyword.value) || 
    member.email.includes(searchKeyword.value)
  )
})

const getRoleTagType = (role: string) => {
  const types: Record<string, string> = {
    'department_manager': 'danger',
    'sales_staff': 'primary',
    'customer_service': 'success',
    'finance': 'warning'
  }
  return types[role] || 'info'
}

const getRoleDisplayName = (role: string) => {
  const names: Record<string, string> = {
    'department_manager': '部门负责人',
    'sales_staff': '销售员',
    'customer_service': '客服',
    'finance': '财务'
  }
  return names[role] || role
}

const handleSelectionChange = (selection: Member[]) => {
  selectedMembers.value = selection
}

const editMemberRole = (member: Member) => {
  ElMessage.info(`编辑 ${member.name} 的角色`)
}

const removeMember = async (member: Member) => {
  try {
    await ElMessageBox.confirm(
      `确定要将 ${member.name} 从部门中移除吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    members.value = members.value.filter(m => m.id !== member.id)
    ElMessage.success('成员移除成功')
  } catch {
    // 用户取消
  }
}

const batchRemoveMembers = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要移除选中的 ${selectedMembers.value.length} 个成员吗？`,
      '批量移除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const selectedIds = selectedMembers.value.map(m => m.id)
    members.value = members.value.filter(m => !selectedIds.includes(m.id))
    selectedMembers.value = []
    ElMessage.success('批量移除成功')
  } catch {
    // 用户取消
  }
}

const confirmAddMembers = async () => {
  if (addMemberForm.value.userIds.length === 0) {
    ElMessage.warning('请选择要添加的用户')
    return
  }
  
  addLoading.value = true
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 添加新成员到列表
    const newMembers = addMemberForm.value.userIds.map(userId => {
      const user = availableUsers.value.find(u => u.id === userId)
      return {
        id: userId,
        name: user?.name || '',
        email: user?.email || '',
        role: addMemberForm.value.defaultRole,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active' as const
      }
    })
    
    members.value.push(...newMembers)
    
    // 从可选用户中移除已添加的用户
    availableUsers.value = availableUsers.value.filter(
      user => !addMemberForm.value.userIds.includes(user.id)
    )
    
    showAddMember.value = false
    addMemberForm.value.userIds = []
    addMemberForm.value.defaultRole = 'sales_staff'
    
    ElMessage.success('成员添加成功')
  } catch (error) {
    ElMessage.error('添加成员失败')
  } finally {
    addLoading.value = false
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.member-management {
  padding: 10px 0;
}

.actions {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.dialog-footer {
  text-align: right;
}
</style>