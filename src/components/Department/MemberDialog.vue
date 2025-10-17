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
          <el-radio value="active">活跃</el-radio>
          <el-radio value="inactive">停用</el-radio>
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
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useDepartmentStore, type DepartmentMember } from '@/stores/department'

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
const formRef = ref<FormInstance>()
const loading = ref(false)

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

// 可选用户列表（排除已在部门中的用户）
const availableUsers = computed(() => {
  const allUsers = [
    { id: 'user1', name: '张总' },
    { id: 'user2', name: '李经理' },
    { id: 'user3', name: '王主管' },
    { id: 'user4', name: '赵会计' },
    { id: 'user5', name: '刘主管' },
    { id: 'user6', name: '陈主管' },
    { id: 'user7', name: '孙组长' },
    { id: 'user8', name: '周组长' },
    { id: 'user9', name: '吴专员' },
    { id: 'user10', name: '郑助理' },
    { id: 'user11', name: '钱秘书' },
    { id: 'user12', name: '孙销售' },
    { id: 'user13', name: '李客服' },
    { id: 'user14', name: '王物流' },
    { id: 'user15', name: '赵财务' }
  ]
  
  if (props.isEdit) return allUsers
  
  // 获取当前部门已有成员的用户ID
  const existingUserIds = departmentStore.getDepartmentMembers(props.departmentId)
    .map(member => member.userId)
  
  // 返回未在当前部门的用户
  return allUsers.filter(user => !existingUserIds.includes(user.id))
})

// 常用职位列表
const commonPositions = ref([
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
])

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
      // 更新成员信息（这里应该调用store的更新方法）
      // 由于当前store没有更新成员的方法，这里模拟更新
      const memberIndex = departmentStore.members.findIndex(m => m.id === props.member!.id)
      if (memberIndex !== -1) {
        departmentStore.members[memberIndex] = {
          ...departmentStore.members[memberIndex],
          position: formData.position,
          joinDate: formData.joinDate,
          status: formData.status
        }
      }
    } else {
      // 添加新成员（支持批量添加）
      if (formData.userIds && formData.userIds.length > 0) {
        // 批量添加多个用户
        for (const userId of formData.userIds) {
          const user = availableUsers.value.find(u => u.id === userId)
          if (user) {
            await departmentStore.addDepartmentMember({
              userId: userId,
              userName: user.name,
              departmentId: props.departmentId,
              position: formData.position,
              joinDate: formData.joinDate,
              status: formData.status
            })
          }
        }
      } else {
        // 单个用户添加（编辑模式或兼容旧逻辑）
        await departmentStore.addDepartmentMember({
          userId: formData.userId,
          userName: formData.userName,
          departmentId: props.departmentId,
          position: formData.position,
          joinDate: formData.joinDate,
          status: formData.status
        })
      }
    }
    
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