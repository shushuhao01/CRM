<template>
  <el-dialog
    v-model="visible"
    title="批量导入成员"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-container">
      <!-- 导入步骤 -->
      <el-steps :active="currentStep" finish-status="success" class="import-steps">
        <el-step title="下载模板" description="下载Excel模板文件" />
        <el-step title="填写数据" description="按模板格式填写成员信息" />
        <el-step title="上传文件" description="上传填写好的Excel文件" />
        <el-step title="确认导入" description="预览并确认导入数据" />
      </el-steps>

      <!-- 步骤内容 -->
      <div class="step-content">
        <!-- 步骤1: 下载模板 -->
        <div v-if="currentStep === 0" class="step-panel">
          <div class="template-info">
            <el-icon class="info-icon"><Download /></el-icon>
            <h3>下载导入模板</h3>
            <p>请先下载Excel模板文件，按照模板格式填写成员信息</p>
            <el-button type="primary" :icon="Download" @click="downloadTemplate">
              下载模板文件
            </el-button>
          </div>
          <div class="template-preview">
            <h4>模板格式说明：</h4>
            <el-table :data="templateData" size="small" border>
              <el-table-column prop="userName" label="姓名*" width="100" />
              <el-table-column prop="userId" label="用户ID*" width="100" />
              <el-table-column prop="position" label="职位*" width="120" />
              <el-table-column prop="joinDate" label="加入日期" width="120" />
              <el-table-column prop="status" label="状态" width="80" />
            </el-table>
            <div class="template-notes">
              <p><strong>注意事项：</strong></p>
              <ul>
                <li>带*号的字段为必填项</li>
                <li>用户ID必须是系统中已存在的用户</li>
                <li>加入日期格式：YYYY-MM-DD</li>
                <li>状态只能填写：active（活跃）或 inactive（停用）</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 步骤2: 上传文件 -->
        <div v-if="currentStep === 1" class="step-panel">
          <div class="upload-area">
            <el-upload
              ref="uploadRef"
              class="upload-demo"
              drag
              :auto-upload="false"
              :on-change="handleFileChange"
              :before-upload="beforeUpload"
              accept=".xlsx,.xls"
              :limit="1"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将Excel文件拖拽到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  只能上传xlsx/xls文件，且不超过10MB
                </div>
              </template>
            </el-upload>
          </div>
        </div>

        <!-- 步骤3: 预览数据 -->
        <div v-if="currentStep === 2" class="step-panel">
          <div class="preview-info">
            <el-alert
              :title="`共解析到 ${importData.length} 条数据，其中 ${validData.length} 条有效，${errorData.length} 条有误`"
              :type="errorData.length > 0 ? 'warning' : 'success'"
              show-icon
              :closable="false"
            />
          </div>
          
          <el-tabs v-model="activeTab" class="preview-tabs">
            <el-tab-pane label="有效数据" name="valid" :badge="validData.length">
              <el-table :data="validData" size="small" max-height="300">
                <el-table-column prop="userName" label="姓名" width="100" />
                <el-table-column prop="userId" label="用户ID" width="100" />
                <el-table-column prop="position" label="职位" width="120" />
                <el-table-column prop="joinDate" label="加入日期" width="120" />
                <el-table-column prop="status" label="状态" width="80">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                      {{ row.status === 'active' ? '活跃' : '停用' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            
            <el-tab-pane label="错误数据" name="error" :badge="errorData.length" v-if="errorData.length > 0">
              <el-table :data="errorData" size="small" max-height="300">
                <el-table-column prop="userName" label="姓名" width="100" />
                <el-table-column prop="userId" label="用户ID" width="100" />
                <el-table-column prop="position" label="职位" width="120" />
                <el-table-column prop="joinDate" label="加入日期" width="120" />
                <el-table-column prop="status" label="状态" width="80" />
                <el-table-column prop="error" label="错误信息" min-width="200">
                  <template #default="{ row }">
                    <el-text type="danger" size="small">{{ row.error }}</el-text>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button 
          v-if="currentStep < 2" 
          type="primary" 
          @click="nextStep"
          :disabled="!canNextStep"
        >
          下一步
        </el-button>
        <el-button 
          v-if="currentStep === 2" 
          type="primary" 
          @click="confirmImport"
          :disabled="validData.length === 0"
          :loading="importing"
        >
          确认导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, UploadFilled } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useDepartmentStore } from '@/stores/department'

interface ImportMember {
  userName: string
  userId: string
  position: string
  joinDate: string
  status: 'active' | 'inactive'
  error?: string
}

interface User {
  id: string
  username: string
  realName: string
}

const props = defineProps<{
  modelValue: boolean
  departmentId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const departmentStore = useDepartmentStore()

// 获取用户数据库
const getUserDatabase = () => {
  const savedData = localStorage.getItem('userDatabase')
  if (savedData) {
    return JSON.parse(savedData)
  }
  // 返回默认用户数据
  return [
    { id: '1', username: 'admin', realName: '超级管理员' },
    { id: '2', username: 'manager', realName: '张经理' },
    { id: '3', username: 'sales001', realName: '李销售' },
    { id: '4', username: 'service001', realName: '王客服' },
    { id: '5', username: 'finance001', realName: '赵会计' },
    { id: '6', username: 'logistics001', realName: '刘主管' },
    { id: '7', username: 'service002', realName: '陈主管' },
    { id: '8', username: 'sales002', realName: '孙组长' }
  ]
}

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 状态变量
const currentStep = ref(0)
const uploadRef = ref()
const importData = ref<ImportMember[]>([])
const activeTab = ref('valid')
const importing = ref(false)

// 模板数据示例
const templateData = ref([
  {
    userName: '张三',
    userId: '1',
    position: '销售专员',
    joinDate: '2024-01-15',
    status: 'active'
  },
  {
    userName: '李四',
    userId: '2',
    position: '客服专员',
    joinDate: '2024-01-16',
    status: 'active'
  }
])

// 计算属性
const validData = computed(() => {
  return importData.value.filter(item => !item.error)
})

const errorData = computed(() => {
  return importData.value.filter(item => item.error)
})

const canNextStep = computed(() => {
  if (currentStep.value === 0) return true
  if (currentStep.value === 1) return importData.value.length > 0
  return false
})

// 方法
const handleClose = () => {
  visible.value = false
  resetDialog()
}

const resetDialog = () => {
  currentStep.value = 0
  importData.value = []
  activeTab.value = 'valid'
  importing.value = false
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

const downloadTemplate = () => {
  // 创建工作簿
  const wb = XLSX.utils.book_new()
  
  // 创建工作表数据
  const wsData = [
    ['姓名', '用户ID', '职位', '加入日期', '状态'],
    ['张三', '1', '销售专员', '2024-01-15', 'active'],
    ['李四', '2', '客服专员', '2024-01-16', 'active']
  ]
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // 设置列宽
  ws['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 }
  ]
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '成员导入模板')
  
  // 下载文件
  XLSX.writeFile(wb, '部门成员导入模板.xlsx')
  ElMessage.success('模板下载成功')
}

const beforeUpload = (file: File) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  file.type === 'application/vnd.ms-excel'
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isExcel) {
    ElMessage.error('只能上传Excel文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB!')
    return false
  }
  return false // 阻止自动上传
}

const handleFileChange = (file: { raw: File }) => {
  if (file.raw) {
    parseExcelFile(file.raw)
  }
}

const parseExcelFile = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      // 解析数据
      const parsedData: ImportMember[] = []
      for (let i = 1; i < jsonData.length; i++) { // 跳过标题行
        const row = jsonData[i] as any[]
        if (row.length === 0 || !row[0]) continue // 跳过空行
        
        const member: ImportMember = {
          userName: row[0]?.toString().trim() || '',
          userId: row[1]?.toString().trim() || '',
          position: row[2]?.toString().trim() || '',
          joinDate: row[3]?.toString().trim() || '',
          status: (row[4]?.toString().trim() || 'active') as 'active' | 'inactive'
        }
        
        // 验证数据
        validateMember(member)
        parsedData.push(member)
      }
      
      importData.value = parsedData
      ElMessage.success(`成功解析 ${parsedData.length} 条数据`)
    } catch (error) {
      ElMessage.error('文件解析失败，请检查文件格式')
    }
  }
  reader.readAsArrayBuffer(file)
}

const validateMember = (member: ImportMember) => {
  const errors: string[] = []
  
  // 必填字段验证
  if (!member.userName) errors.push('姓名不能为空')
  if (!member.userId) errors.push('用户ID不能为空')
  if (!member.position) errors.push('职位不能为空')
  
  // 用户ID验证（检查是否存在）
  if (member.userId) {
    const userDatabase = getUserDatabase()
    if (!userDatabase.find((u: User) => u.id === member.userId)) {
      errors.push('用户ID不存在')
    }
  }
  
  // 状态验证
  if (member.status && !['active', 'inactive'].includes(member.status)) {
    errors.push('状态只能是active或inactive')
  }
  
  // 日期格式验证
  if (member.joinDate && !/^\d{4}-\d{2}-\d{2}$/.test(member.joinDate)) {
    errors.push('日期格式错误，应为YYYY-MM-DD')
  }
  
  if (errors.length > 0) {
    member.error = errors.join('; ')
  }
}

const nextStep = () => {
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
  if (validData.value.length === 0) {
    ElMessage.warning('没有有效数据可导入')
    return
  }
  
  importing.value = true
  try {
    // 批量添加成员
    for (const member of validData.value) {
      await departmentStore.addDepartmentMember({
        userId: member.userId,
        userName: member.userName,
        departmentId: props.departmentId,
        position: member.position,
        joinDate: member.joinDate || new Date().toISOString().split('T')[0],
        status: member.status
      })
    }
    
    ElMessage.success(`成功导入 ${validData.value.length} 个成员`)
    emit('success')
  } catch (error) {
    ElMessage.error('导入失败，请重试')
  } finally {
    importing.value = false
  }
}

// 监听弹窗关闭
watch(visible, (newVal) => {
  if (!newVal) {
    resetDialog()
  }
})
</script>

<style scoped>
.import-container {
  padding: 20px 0;
}

.import-steps {
  margin-bottom: 30px;
}

.step-content {
  min-height: 400px;
}

.step-panel {
  padding: 20px 0;
}

.template-info {
  text-align: center;
  margin-bottom: 30px;
}

.info-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.template-info h3 {
  margin: 16px 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.template-info p {
  color: #606266;
  margin-bottom: 20px;
}

.template-preview {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.template-preview h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.template-notes {
  margin-top: 16px;
  padding: 16px;
  background: white;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.template-notes p {
  margin: 0 0 8px 0;
  color: #303133;
  font-weight: 500;
}

.template-notes ul {
  margin: 0;
  padding-left: 20px;
}

.template-notes li {
  color: #606266;
  margin-bottom: 4px;
}

.upload-area {
  padding: 40px 0;
}

.upload-demo {
  width: 100%;
}

.preview-info {
  margin-bottom: 20px;
}

.preview-tabs {
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>