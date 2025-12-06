<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑成员' : '添加成员'"
    width="500px"
    :before-close="handleClose"
    class="member-dialog"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
      class="member-form"
    >
      <el-form-item label="选择用户" prop="userIds" v-if="!isEdit">
        <el-select
          v-model="formData.userIds"
          placeholder="请选择要添加的用户（支持多选）"
          filterable
          multiple
          collapse-tags
          collapse-tags-tooltip
          style="width: 100%"
          @change="handleUserChange"
        >
          <el-option
            v-for="user in availableUsers"
            :key="user.id"
            :label="user.name"
            :value="user.id"
          >
            <div class="user-option">
              <el-avatar :size="24" class="user-avatar">
                {{ user.name.charAt(0) }}
              </el-avatar>
              <span class="user-name">{{ user.name }}</span>
              <span class="user-id">ID: {{ user.id }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="用户姓名" v-if="isEdit">
        <el-input v-model="formData.userName" disabled />
      </el-form-item>

      <el-form-item label="职位" prop="position">
        <el-select
          v-model="formData.position"
          placeholder="请选择或输入职位"
          filterable
          allow-create
          style="width: 100%"
        >
          <el-option
            v-for="position in commonPositions"
            :key="position"
            :label="position"
            :value="position"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="加入时间" prop="joinDate">
        <el-date-picker
          v-model="formData.joinDate"
          type="date"
          placeholder="选择加入时间"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio label="active">活跃</el-radio>
          <el-radio label="inactive">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" class="cancel-btn">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading" class="submit-btn">
          {{ isEdit ? '更新' : '添加' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useDepartmentStore, type DepartmentMember } from '@/stores/department'
import { useUserStore } from '@/stores/user'

interface Props {
  modelValue: boolean
  member?: DepartmentMember | null
  departmentId: string
  isEdit?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  member: null,
  isEdit: false
})

const emit = defineEmits<Emits>()

const departmentStore = useDepartmentStore()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

// 确保用户列表已加载
onMounted(async () => {
  if (userStore.users.length === 0) {
    await userStore.loadUsers()
  }
})

// 表单数据
const formData = reactive({
  userId: '', // 编辑时使用
  userIds: [] as string[], // 新增时使用，支持多选
  userName: '',
  position: '',
  joinDate: '',
  status: 'active' as 'active' | 'inactive'
})

// 表单验证规则
const formRules: FormRules = {
  userId: [
    { required: true, message: '请选择用户', trigger: 'change' }
  ],
  userIds: [
    {
      required: true,
      message: '请至少选择一个用户',
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少选择一个用户'))
        } else {
          callback()
        }
      }
    }
  ],
  position: [
    { required: true, message: '请输入职位', trigger: 'blur' },
    { min: 2, max: 50, message: '职位长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  joinDate: [
    { required: true, message: '请选择加入时间', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 可选用户列表（从userStore获取真实用户，排除已在部门中的用户）
const availableUsers = computed(() => {
  try {
    // 从userStore获取用户数据
    const users = userStore.users
    if (!users || users.length === 0) {
      console.log('[成员对话框] userStore中没有用户数据')
      return []
    }

    console.log('[成员对话框] 原始用户数据:', users.length)

    // 只显示活跃用户
    const activeUsers = users
      .filter((user: any) => {
        const isActive = user.status === 'active'
        if (!isActive) {
          console.log('[成员对话框] 过滤非活跃用户:', user.username || user.name)
        }
        return isActive
      })
      .map((user: any) => ({
        id: user.id,
        name: user.realName || user.name || user.username,
        account: user.username || user.id,
        department: user.departmentName || user.department || '',
        departmentId: user.departmentId,
        phone: user.phone || ''
      }))

    console.log('[成员对话框] 活跃用户总数:', activeUsers.length)
    console.log('[成员对话框] 活跃用户列表:', activeUsers.map(u => `${u.name}(${u.id})`).join(', '))

    if (props.isEdit) {
      // 编辑模式，返回所有活跃用户
      console.log('[成员对话框] 编辑模式，返回所有活跃用户')
      return activeUsers
    }

    // 新增模式，排除已在当前部门的用户
    const existingMembers = departmentStore.getDepartmentMembers(props.departmentId)
    const existingUserIds = existingMembers.map(member => member.userId)

    console.log('[成员对话框] 当前部门ID:', props.departmentId)
    console.log('[成员对话框] 当前部门已有成员:', existingUserIds.length)
    console.log('[成员对话框] 已有成员ID列表:', existingUserIds.join(', '))

    // 返回还不是该部门成员的用户
    const available = activeUsers.filter(user => {
      // 排除已经在当前部门的用户
      const isInCurrentDept = existingUserIds.includes(user.id)
      if (isInCurrentDept) {
        console.log('[成员对话框] 过滤已在部门的用户:', user.name)
        return false
      }
      return true
    })

    console.log('[成员对话框] 可添加用户数:', available.length)
    console.log('[成员对话框] 可添加用户列表:', available.map(u => `${u.name}(${u.id}, 部门:${u.departmentId || '未分配'})`).join(', '))

    return available
  } catch (error) {
    console.error('[成员对话框] 获取可用用户失败:', error)
    console.error('[成员对话框] 错误详情:', error)
    return []
  }
})

// 常用职位列表（从localStorage的user数据中提取真实职位，同时保留常用职位）
const commonPositions = computed(() => {
  try {
    // 基础职位列表
    const basePositions = [
      '总经理',
      '副总经理',
      '部门经理',
      '主管',
      '组长',
      '专员',
      '助理',
      '秘书',
      '销售经理',
      '销售专员',
      '客服主管',
      '客服专员',
      '财务经理',
      '会计',
      '出纳',
      '物流主管',
      '物流专员',
      '审核员',
      '质检员'
    ]

    // 从localStorage获取真实用户的职位
    const usersStr = localStorage.getItem('crm_mock_users')
    if (usersStr) {
      const users = JSON.parse(usersStr)
      const realPositions = users
        .map((user: unknown) => user.roleName || user.role || user.position)
        .filter((pos: string) => pos && pos.trim())
        .filter((pos: string, index: number, self: string[]) => self.indexOf(pos) === index) // 去重

      // 合并基础职位和真实职位，去重
      const allPositions = [...new Set([...basePositions, ...realPositions])]
      console.log('[成员对话框] 可用职位列表:', allPositions)
      return allPositions
    }

    return basePositions
  } catch (error) {
    console.error('[成员对话框] 获取职位列表失败:', error)
    return [
      '总经理',
      '副总经理',
      '部门经理',
      '主管',
      '组长',
      '专员',
      '助理',
      '秘书'
    ]
  }
})

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    userId: '',
    userIds: [],
    userName: '',
    position: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active'
  })
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 初始化表单数据
const initFormData = () => {
  if (props.isEdit && props.member) {
    Object.assign(formData, {
      userId: props.member.userId,
      userName: props.member.userName,
      position: props.member.position,
      joinDate: props.member.joinDate,
      status: props.member.status
    })
  } else {
    resetForm()
  }
}

// 处理用户选择变化
const handleUserChange = (userIds: string[] | string) => {
  if (props.isEdit) {
    // 编辑模式，单选
    const userId = userIds as string
    const user = availableUsers.value.find(u => u.id === userId)
    if (user) {
      formData.userName = user.name
    }
  } else {
    // 新增模式，多选
    // 多选时不需要设置userName，因为会批量添加多个用户
    // userName会在提交时根据每个userId动态获取
  }
}

// 监听弹窗显示状态
watch(() => props.modelValue, (visible) => {
  if (visible) {
    initFormData()
  }
})

// 监听成员数据变化
watch(() => props.member, () => {
  if (props.modelValue) {
    initFormData()
  }
})

// 关闭弹窗
const handleClose = () => {
  emit('update:modelValue', false)
  resetForm()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    loading.value = true

    if (props.isEdit && props.member) {
      // 更新成员信息 - 直接更新localStorage中的crm_mock_users
      const usersStr = localStorage.getItem('crm_mock_users')
      if (usersStr) {
        const users = JSON.parse(usersStr)
        const userIndex = users.findIndex((u: unknown) => u.id === props.member!.userId)
        if (userIndex !== -1) {
          // 更新用户的职位信息（注意：这里是position字段，不是role）
          users[userIndex].position = formData.position
          users[userIndex].status = formData.status
          // 保存回localStorage
          localStorage.setItem('crm_mock_users', JSON.stringify(users))
          console.log('[成员对话框] 已更新用户信息:', users[userIndex])
        }
      }

      // 同步部门成员数
      departmentStore.syncAllDepartmentMemberCounts()
    } else {
      // 添加新成员（支持批量添加）- 直接更新localStorage中的crm_mock_users
      const usersStr = localStorage.getItem('crm_mock_users')
      if (usersStr) {
        const users = JSON.parse(usersStr)

        if (formData.userIds && formData.userIds.length > 0) {
          // 批量添加多个用户
          for (const userId of formData.userIds) {
            const userIndex = users.findIndex((u: unknown) => u.id === userId)
            if (userIndex !== -1) {
              // 更新用户的部门信息和职位（注意：这里是position字段，不是role）
              users[userIndex].departmentId = props.departmentId
              users[userIndex].position = formData.position
              users[userIndex].status = formData.status
              console.log('[成员对话框] 已添加用户到部门:', users[userIndex].username)
            }
          }
        }

        // 保存回localStorage
        localStorage.setItem('crm_mock_users', JSON.stringify(users))
      }

      // 同步部门成员数
      departmentStore.syncAllDepartmentMemberCounts()
    }

    ElMessage.success(props.isEdit ? '成员更新成功' : '成员添加成功')

    // 关闭对话框
    handleClose()

    // 触发成功事件，让父组件刷新列表
    emit('success')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.member-dialog {
  border-radius: 12px;
}

.member-form {
  padding: 0 8px;
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.user-name {
  font-weight: 500;
  color: #303133;
  flex: 1;
}

.user-id {
  font-size: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
  padding: 10px 20px;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-date-editor.el-input) {
  border-radius: 8px;
}

:deep(.el-select-dropdown__item) {
  padding: 8px 12px;
}
</style>
