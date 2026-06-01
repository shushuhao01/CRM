<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑部门' : '新建部门'"
    width="520px"
    :before-close="handleClose"
    class="department-dialog"
    align-center
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
      label-position="left"
      class="department-form"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="部门名称" prop="name">
            <el-input
              v-model="formData.name"
              placeholder="请输入部门名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="部门编码" prop="code">
            <el-input
              v-model="formData.code"
              placeholder="输入名称后自动生成"
              maxlength="20"
              show-word-limit
              @input="handleCodeInput"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="上级部门" prop="parentId">
            <el-tree-select
              v-model="formData.parentId"
              :data="parentDepartmentOptions"
              :props="treeProps"
              placeholder="无（顶级部门）"
              clearable
              check-strictly
              :render-after-expand="false"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="负责人" prop="managerId">
            <el-select
              v-model="formData.managerId"
              placeholder="请选择（可选）"
              clearable
              filterable
              style="width: 100%"
            >
              <el-option
                v-for="user in availableUsers"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="排序" prop="sortOrder">
            <el-input-number
              v-model="formData.sortOrder"
              :min="1"
              :max="999"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="formData.status">
              <el-radio label="active">启用</el-radio>
              <el-radio label="inactive">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="部门描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入部门描述（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useDepartmentStore, type Department } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { pinyin } from 'pinyin-pro'

interface Props {
  modelValue: boolean
  department?: Department | null
  isEdit?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  department: null,
  isEdit: false
})

const emit = defineEmits<Emits>()

const departmentStore = useDepartmentStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  level: 1,
  parentId: null as string | null,
  managerId: null as string | null,
  sortOrder: 1,
  status: 'active' as 'active' | 'inactive',
  description: ''
})

// 监听父部门变化，自动计算层级
watch(() => formData.parentId, (newParentId) => {
  if (newParentId) {
    const parentDept = departmentStore.getDepartmentById(newParentId)
    if (parentDept) {
      formData.level = (parentDept.level || 1) + 1
    }
  } else {
    formData.level = 1
  }
})

const codeManuallyModified = ref(false)

const generateCodeFromName = (name: string): string => {
  if (!name || !name.trim()) return ''
  const trimmed = name.trim()
  const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed)

  if (hasChinese) {
    try {
      const firstLetters = pinyin(trimmed, { pattern: 'first', toneType: 'none', type: 'array' })
      const code = firstLetters
        .map((letter: string) => letter.toUpperCase())
        .join('')
        .replace(/[^A-Z0-9]/g, '')
      return code || 'DEPT'
    } catch {
      return 'DEPT_' + Date.now().toString(36).toUpperCase().slice(-4)
    }
  } else {
    return trimmed
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
  }
}

watch(() => formData.name, (newName) => {
  if (!props.isEdit && !codeManuallyModified.value) {
    formData.code = generateCodeFromName(newName)
  }
})

const handleCodeInput = () => {
  codeManuallyModified.value = true
  formData.code = formData.code.toUpperCase().replace(/[^A-Z0-9_]/g, '')
}

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '部门名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { min: 2, max: 20, message: '部门编码长度在 2 到 20 个字符', trigger: 'blur' },
    { pattern: /^[A-Z0-9_]+$/, message: '只能包含大写字母、数字和下划线', trigger: 'blur' }
  ],
  sortOrder: [
    { required: true, message: '请输入排序号', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择部门状态', trigger: 'change' }
  ]
}

const treeProps = {
  value: 'id',
  label: 'name',
  children: 'children'
}

const parentDepartmentOptions = computed(() => {
  const filterDepartments = (departments: Department[]): Department[] => {
    return departments
      .filter(dept => {
        if (props.isEdit && props.department) {
          return dept.id !== props.department.id && !isChildDepartment(dept.id, props.department.id)
        }
        return true
      })
      .map(dept => ({
        ...dept,
        children: dept.children ? filterDepartments(dept.children) : []
      }))
  }
  return filterDepartments(departmentStore.departmentTree)
})

const isChildDepartment = (deptId: string, parentId: string): boolean => {
  const findInTree = (departments: Department[], targetId: string): Department | null => {
    for (const dept of departments) {
      if (dept.id === targetId) return dept
      if (dept.children) {
        const found = findInTree(dept.children, targetId)
        if (found) return found
      }
    }
    return null
  }

  const dept = findInTree(departmentStore.departmentTree, deptId)
  if (!dept) return false

  let current = dept
  while (current.parentId) {
    if (current.parentId === parentId) return true
    current = findInTree(departmentStore.departmentTree, current.parentId) || current
    if (!current.parentId) break
  }
  return false
}

const availableUsers = ref<Array<{ id: string; name: string; role?: string; department?: string }>>([])

const loadUsers = async () => {
  try {
    const { userApiService } = await import('@/services/userApiService')
    const response = await userApiService.getUsers({ status: 'active' })
    availableUsers.value = response.data.map(user => ({
      id: user.id.toString(),
      name: user.realName || user.username,
      role: user.role,
      department: user.department?.name
    }))
  } catch (error) {
    console.error('加载用户列表失败:', error)
    const userStore = useUserStore()
    await userStore.loadUsers()
    availableUsers.value = userStore.users.map(user => ({
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department
    }))
  }
}

const resetForm = () => {
  Object.assign(formData, {
    name: '',
    code: '',
    level: 1,
    parentId: null,
    managerId: null,
    sortOrder: 1,
    status: 'active',
    description: ''
  })
  codeManuallyModified.value = false
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const initFormData = async () => {
  if (props.isEdit && props.department) {
    Object.assign(formData, {
      name: props.department.name,
      code: props.department.code,
      level: props.department.level,
      parentId: props.department.parentId,
      managerId: props.department.managerId || null,
      sortOrder: props.department.sortOrder || 1,
      status: props.department.status,
      description: props.department.description || ''
    })
  } else {
    resetForm()
  }
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    initFormData()
    loadUsers()
  }
})

watch(() => props.department, () => {
  if (props.modelValue) {
    initFormData()
  }
})

const handleClose = () => {
  emit('update:modelValue', false)
  resetForm()
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    loading.value = true

    if (props.isEdit && props.department) {
      await departmentStore.updateDepartment(props.department.id, {
        name: formData.name,
        code: formData.code,
        level: formData.level,
        parentId: formData.parentId,
        managerId: formData.managerId,
        sortOrder: formData.sortOrder,
        status: formData.status,
        description: formData.description
      })
    } else {
      await departmentStore.addDepartment({
        name: formData.name,
        code: formData.code,
        level: formData.level,
        parentId: formData.parentId,
        managerId: formData.managerId,
        sortOrder: formData.sortOrder,
        status: formData.status,
        description: formData.description
      })
    }

    ElMessage.success(props.isEdit ? '部门更新成功' : '部门创建成功')
    emit('success')
  } catch (error) {
    console.error('部门操作失败:', error)
    let errorMessage = '操作失败'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.department-form {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
