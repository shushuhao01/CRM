<template>
  <el-dialog
    v-model="visible"
    title="批量导入客户"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 步骤指示器 -->
    <el-steps :active="currentStep" finish-status="success" simple style="margin-bottom: 24px;">
      <el-step title="上传文件" />
      <el-step title="数据预览" />
      <el-step title="导入结果" />
    </el-steps>

    <!-- 步骤1：上传文件 -->
    <div v-if="currentStep === 0">
      <div class="upload-tips">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>导入说明</template>
          <p>1. 请先下载导入模板，按模板格式填写客户信息</p>
          <p>2. 必填字段：客户姓名、手机号（其他字段可留空）</p>
          <p>3. 手机号与系统已有客户重复的行将被自动跳过</p>
          <p>4. 导入数据仅对当前租户可见，其他租户无法查看</p>
        </el-alert>
      </div>

      <div class="upload-actions" style="margin: 24px 0; text-align: center;">
        <el-button type="success" @click="downloadTemplate" :loading="downloadingTemplate">
          <el-icon><Download /></el-icon>
          下载导入模板
        </el-button>
      </div>

      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        accept=".xlsx,.xls,.csv"
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">支持 .xlsx / .xls / .csv 格式，单次最多导入 5000 条</div>
        </template>
      </el-upload>
    </div>

    <!-- 步骤2：数据预览 -->
    <div v-if="currentStep === 1">
      <div class="preview-summary">
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="总行数">{{ previewData.length }}</el-descriptions-item>
          <el-descriptions-item label="有效数据">
            <el-text type="success">{{ validCount }}</el-text>
          </el-descriptions-item>
          <el-descriptions-item label="重复数据">
            <el-text type="warning">{{ duplicateCount }}</el-text>
          </el-descriptions-item>
          <el-descriptions-item label="错误数据">
            <el-text type="danger">{{ errorCount }}</el-text>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div v-if="duplicateCount > 0" style="margin: 12px 0;">
        <el-alert type="warning" :closable="false" show-icon>
          检测到 {{ duplicateCount }} 条与系统已有客户手机号重复的记录，导入时将自动跳过这些重复数据。
        </el-alert>
      </div>
      <div v-if="errorCount > 0" style="margin: 12px 0;">
        <el-alert type="error" :closable="false" show-icon>
          有 {{ errorCount }} 条数据存在错误（缺少必填字段），导入时将自动跳过。
        </el-alert>
      </div>

      <el-table
        :data="paginatedPreviewData"
        max-height="400"
        border
        size="small"
        style="margin-top: 12px;"
      >
        <el-table-column label="状态" width="80" fixed>
          <template #default="{ row }">
            <el-tag v-if="row._status === 'valid'" type="success" size="small">有效</el-tag>
            <el-tag v-else-if="row._status === 'duplicate'" type="warning" size="small">重复</el-tag>
            <el-tag v-else type="danger" size="small">错误</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="客户姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="gender" label="性别" width="60" />
        <el-table-column prop="age" label="年龄" width="60" />
        <el-table-column prop="level" label="客户等级" width="80" />
        <el-table-column prop="source" label="客户来源" width="80" />
        <el-table-column prop="address" label="地址" min-width="150" show-overflow-tooltip />
        <el-table-column prop="_error" label="错误原因" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-text v-if="row._error" type="danger" size="small">{{ row._error }}</el-text>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="previewPage"
          :page-size="previewPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="previewData.length"
          layout="total, sizes, prev, pager, next"
          small
          @size-change="(val: number) => { previewPageSize = val; previewPage = 1 }"
        />
      </div>
    </div>

    <!-- 步骤3：导入结果 -->
    <div v-if="currentStep === 2" class="import-result">
      <el-result
        :icon="importResult.success ? 'success' : 'warning'"
        :title="importResult.success ? '导入完成' : '导入完成（部分失败）'"
      >
        <template #sub-title>
          <div class="result-details">
            <p>成功导入：<strong>{{ importResult.successCount }}</strong> 条</p>
            <p>重复跳过：<strong>{{ importResult.duplicateCount }}</strong> 条</p>
            <p v-if="importResult.errorCount > 0">导入失败：<strong>{{ importResult.errorCount }}</strong> 条</p>
          </div>
        </template>
        <template #extra>
          <el-button type="primary" @click="handleClose">完成</el-button>
        </template>
      </el-result>
    </div>

    <template #footer v-if="currentStep < 2">
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep === 1" @click="currentStep = 0">上一步</el-button>
        <el-button
          v-if="currentStep === 1"
          type="primary"
          @click="confirmImport"
          :loading="importing"
          :disabled="validCount === 0"
        >
          确认导入 ({{ validCount }} 条)
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, UploadFilled } from '@element-plus/icons-vue'
import { useCustomerFieldConfigStore } from '@/stores/customerFieldConfig'
import { api } from '@/api/request'
import * as XLSX from 'xlsx'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'imported': []
}>()

const customerFieldConfigStore = useCustomerFieldConfigStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const currentStep = ref(0)
const uploadRef = ref()
const downloadingTemplate = ref(false)
const importing = ref(false)

interface PreviewRow {
  [key: string]: any
  _status: 'valid' | 'duplicate' | 'error'
  _error?: string
}

const previewData = ref<PreviewRow[]>([])
const previewPage = ref(1)
const previewPageSize = ref(10)
const importResult = ref({ success: true, successCount: 0, duplicateCount: 0, errorCount: 0 })

const paginatedPreviewData = computed(() => {
  const start = (previewPage.value - 1) * previewPageSize.value
  return previewData.value.slice(start, start + previewPageSize.value)
})

const validCount = computed(() => previewData.value.filter(r => r._status === 'valid').length)
const duplicateCount = computed(() => previewData.value.filter(r => r._status === 'duplicate').length)
const errorCount = computed(() => previewData.value.filter(r => r._status === 'error').length)

// 字段映射：模板列名 → 数据库字段
const fieldMap: Record<string, string> = {
  '客户姓名': 'name',
  '手机号': 'phone',
  '性别': 'gender',
  '年龄': 'age',
  '身高(cm)': 'height',
  '体重(kg)': 'weight',
  '邮箱': 'email',
  '微信号': 'wechat',
  '进粉时间': 'fanAcquisitionTime',
  '疾病史': 'medicalHistory',
  '改善问题': 'improvementGoals',
  '客户等级': 'level',
  '客户来源': 'source',
  '客户状态': 'status',
  '客户标签': 'tags',
  '客户备注': 'remark',
  '客户生日': 'birthday',
  '收货地址(整体)': 'address',
  '省份': 'province',
  '城市': 'city',
  '区县': 'district',
  '街道': 'street',
  '详细地址': 'detailAddress',
  '境外地址': 'overseasAddress',
  '公司名称': 'company',
  '企微UserID': 'wecomExternalUserid'
}

// 下载导入模板
const downloadTemplate = () => {
  downloadingTemplate.value = true
  try {
    const headers: string[] = [
      '客户姓名', '手机号', '性别', '年龄', '身高(cm)', '体重(kg)',
      '邮箱', '微信号', '进粉时间', '疾病史', '改善问题',
      '客户等级', '客户来源', '客户状态', '客户标签', '客户备注',
      '客户生日', '收货地址(整体)', '省份', '城市', '区县', '街道', '详细地址',
      '境外地址', '公司名称', '企微UserID'
    ]

    // 追加自定义字段列
    const customFields = customerFieldConfigStore.config.customFields || []
    customFields.forEach(f => {
      headers.push(f.fieldName)
      fieldMap[f.fieldName] = `cf_${f.fieldKey}`
    })

    // 示例数据行
    const sampleRow = [
      '张三', '13800138000', '男', '30', '170', '65',
      'zhangsan@example.com', 'wx_zhangsan', '2026-01-01', '无', '改善睡眠',
      '铜牌客户', '线上推广', '正常', '新客户', '备注信息',
      '1990-01-01', '广东省深圳市南山区xx街道xx号', '广东省', '深圳市', '南山区', 'xx街道', 'xx号',
      '', 'xx公司', ''
    ]
    // 填充自定义字段示例
    customFields.forEach(() => sampleRow.push(''))

    const wsData = [headers, sampleRow]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // 设置列宽
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 12) }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '客户导入模板')
    XLSX.writeFile(wb, `客户导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`)

    ElMessage.success('模板下载成功')
  } catch (e) {
    console.error('下载模板失败:', e)
    ElMessage.error('下载模板失败')
  } finally {
    downloadingTemplate.value = false
  }
}

// 文件选择后解析
const handleFileChange = async (file: any) => {
  try {
    const raw = file.raw || file
    const data = await readFileAsArrayBuffer(raw)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

    if (jsonData.length === 0) {
      ElMessage.warning('文件中没有数据')
      return
    }
    if (jsonData.length > 5000) {
      ElMessage.error('单次最多导入5000条数据')
      return
    }

    // 转换列名 → 字段名
    const rows: Record<string, any>[] = jsonData.map(row => {
      const mapped: Record<string, any> = {}
      Object.entries(row).forEach(([key, val]) => {
        const fieldKey = fieldMap[key.trim()]
        if (fieldKey) {
          mapped[fieldKey] = val
        } else {
          // 尝试匹配自定义字段
          const cf = customerFieldConfigStore.config.customFields.find(f => f.fieldName === key.trim())
          if (cf) {
            mapped[`cf_${cf.fieldKey}`] = val
          }
        }
      })
      return mapped
    })

    // 收集所有手机号，批量检查重复
    const phones = rows.map(r => r.phone?.toString().trim()).filter(Boolean)
    let duplicatePhones: string[] = []
    if (phones.length > 0) {
      try {
        const resp = await api.post<{ duplicates: string[] }>('/customers/check-batch-phones', { phones })
        duplicatePhones = resp.data?.duplicates || []
      } catch (e) {
        console.warn('批量检查手机号失败，跳过重复检测:', e)
      }
    }

    // 标记每行状态
    previewData.value = rows.map(row => {
      const phone = row.phone?.toString().trim()
      const name = row.name?.toString().trim()

      if (!name) {
        return { ...row, _status: 'error' as const, _error: '缺少客户姓名' }
      }
      if (!phone) {
        return { ...row, _status: 'error' as const, _error: '缺少手机号' }
      }
      if (duplicatePhones.includes(phone)) {
        return { ...row, _status: 'duplicate' as const, _error: '手机号已存在' }
      }
      return { ...row, _status: 'valid' as const }
    })

    // 文件内重复检测
    const seenPhones = new Set<string>()
    previewData.value.forEach(row => {
      if (row._status === 'valid') {
        const phone = row.phone?.toString().trim()
        if (seenPhones.has(phone)) {
          row._status = 'duplicate'
          row._error = '文件内手机号重复'
        } else {
          seenPhones.add(phone)
        }
      }
    })

    currentStep.value = 1
  } catch (e) {
    console.error('解析文件失败:', e)
    ElMessage.error('文件解析失败，请检查文件格式')
  }
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件，请移除已有文件后重新上传')
}

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target!.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// 确认导入
const confirmImport = async () => {
  const validRows = previewData.value.filter(r => r._status === 'valid')
  if (validRows.length === 0) {
    ElMessage.warning('没有可导入的有效数据')
    return
  }

  importing.value = true
  try {
    // 构造导入数据
    const customers = validRows.map(row => {
      const customFields: Record<string, any> = {}
      const baseData: Record<string, any> = {}

      Object.entries(row).forEach(([key, val]) => {
        if (key.startsWith('_')) return // 跳过内部字段
        if (key.startsWith('cf_')) {
          customFields[key.replace('cf_', '')] = val
        } else {
          baseData[key] = val
        }
      })

      // 性别映射
      if (baseData.gender) {
        const genderMap: Record<string, string> = { '男': 'male', '女': 'female' }
        baseData.gender = genderMap[baseData.gender] || baseData.gender
      }

      // 等级映射
      if (baseData.level) {
        const levelMap: Record<string, string> = {
          '铜牌客户': 'bronze', '银牌客户': 'silver', '金牌客户': 'gold', '钻石客户': 'diamond',
          '普通': 'normal', '白银': 'silver', '黄金': 'gold'
        }
        baseData.level = levelMap[baseData.level] || baseData.level
      }

      // 状态映射
      if (baseData.status) {
        const statusMap: Record<string, string> = { '正常': 'active', '停用': 'inactive' }
        baseData.status = statusMap[baseData.status] || baseData.status
      }

      // 标签处理
      if (baseData.tags && typeof baseData.tags === 'string') {
        baseData.tags = baseData.tags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean)
      }

      // 改善问题处理
      if (baseData.improvementGoals && typeof baseData.improvementGoals === 'string') {
        baseData.improvementGoals = baseData.improvementGoals.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean)
      }

      return {
        ...baseData,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined
      }
    })

    const resp = await api.post<{
      successCount: number
      duplicateCount: number
      errorCount: number
      errors?: string[]
    }>('/customers/batch-import', { customers })

    const result = resp.data!
    importResult.value = {
      success: result.errorCount === 0,
      successCount: result.successCount,
      duplicateCount: result.duplicateCount + duplicateCount.value,
      errorCount: result.errorCount
    }
    currentStep.value = 2

    if (result.successCount > 0) {
      emit('imported')
    }
  } catch (e: any) {
    console.error('批量导入失败:', e)
    ElMessage.error(e?.response?.data?.message || '批量导入失败')
  } finally {
    importing.value = false
  }
}

const handleClose = () => {
  currentStep.value = 0
  previewData.value = []
  previewPage.value = 1
  previewPageSize.value = 10
  importResult.value = { success: true, successCount: 0, duplicateCount: 0, errorCount: 0 }
  visible.value = false
}
</script>

<style scoped>
.upload-tips p {
  margin: 4px 0;
  font-size: 13px;
}
.upload-area {
  width: 100%;
}
.preview-summary {
  margin-bottom: 12px;
}
.import-result {
  padding: 20px 0;
}
.result-details p {
  margin: 8px 0;
  font-size: 15px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

