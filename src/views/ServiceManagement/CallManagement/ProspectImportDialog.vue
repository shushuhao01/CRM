<template>
  <el-dialog v-model="visible" title="导入外呼名单" width="780px" :close-on-click-modal="false" @close="handleClose">
    <el-tabs v-model="activeTab">
      <!-- 单个录入 -->
      <el-tab-pane label="单个录入" name="single">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" style="max-width: 500px; margin: 16px auto 0;">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <div style="display:flex; align-items:center; width:100%; gap:8px;">
              <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" @blur="handlePhoneBlur" style="flex:1;" />
              <el-button type="warning" :loading="phoneChecking" @click="handleCheckPhone" :disabled="!form.phone">验证客户</el-button>
            </div>
            <div v-if="phoneCheckResult" :style="{color: phoneCheckResult.exists ? '#f56c6c' : '#67c23a', fontSize:'12px', marginTop:'4px'}">
              {{ phoneCheckResult.message }}
            </div>
          </el-form-item>
          <el-form-item label="性别">
            <el-select v-model="form.gender" placeholder="请选择" clearable style="width: 120px;">
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
            </el-select>
          </el-form-item>
          <el-form-item label="收货地址">
            <el-input v-model="form.company" placeholder="请输入收货地址" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="form.tagsInput" placeholder="多个标签用逗号分隔" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSingleSubmit" :loading="submitting">确认录入</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 批量导入 -->
      <el-tab-pane label="批量导入" name="batch">
        <!-- 步骤指示器 -->
        <el-steps :active="batchStep" finish-status="success" simple style="margin-bottom: 20px;">
          <el-step title="上传文件" />
          <el-step title="数据预览" />
          <el-step title="导入结果" />
        </el-steps>

        <!-- Step 1: 上传 -->
        <div v-if="batchStep === 0" class="batch-upload">
          <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px;">
            <template #title>导入说明</template>
            <p>1. 请先下载导入模板，按模板格式填写客户信息</p>
            <p>2. 必填字段：客户姓名、手机号（其他字段可留空）</p>
            <p>3. 手机号与系统已有客户重复的行将被自动跳过</p>
            <p>4. 导入数据仅对当前租户可见，其他租户无法查看</p>
          </el-alert>

          <div style="text-align: center; margin-bottom: 16px;">
            <el-button type="primary" @click="downloadTemplate">
              <el-icon style="margin-right:4px"><Download /></el-icon>下载导入模板
            </el-button>
          </div>

          <el-upload
            ref="uploadRef"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls,.csv"
            :on-change="handleFileChange"
          >
            <el-icon :size="48" style="color: #c0c4cc"><UploadFilled /></el-icon>
            <div style="margin-top: 8px">拖拽文件到此处，或<em style="color:#409eff">点击上传</em></div>
            <template #tip>
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">支持 .xlsx / .xls / .csv 格式，单次最多导入 5000 条</div>
            </template>
          </el-upload>
        </div>

        <!-- Step 2: 预览 -->
        <div v-else-if="batchStep === 1" class="batch-preview">
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size:14px;">共 <strong>{{ parsedData.length }}</strong> 条，有效 <strong style="color:#67c23a">{{ validCount }}</strong> 条，重复 <strong style="color:#e6a23c">{{ duplicateCount }}</strong> 条</span>
            <div>
              <el-button @click="batchStep = 0">返回重选</el-button>
              <el-button type="primary" @click="handleBatchSubmit" :loading="submitting" :disabled="validCount === 0">
                确认导入 {{ validCount }} 条
              </el-button>
            </div>
          </div>
          <el-table :data="paginatedPreview" border style="font-size: 13px;" max-height="400">
            <el-table-column label="状态" width="70" align="center">
              <template #default="{ row }">
                <el-tag v-if="row._duplicate" type="warning" size="small">重复</el-tag>
                <el-tag v-else-if="row._error" type="danger" size="small">无效</el-tag>
                <el-tag v-else type="success" size="small">有效</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" min-width="80" />
            <el-table-column prop="phone" label="手机号" min-width="110" />
            <el-table-column prop="gender" label="性别" width="55" align="center" />
            <el-table-column prop="age" label="年龄" width="55" align="center" />
            <el-table-column prop="company" label="收货地址" min-width="120" show-overflow-tooltip />
            <el-table-column prop="email" label="邮箱" min-width="100" show-overflow-tooltip />
            <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
            <el-table-column prop="tags" label="标签" min-width="80" show-overflow-tooltip />
          </el-table>
          <el-pagination
            style="margin-top: 12px; justify-content: flex-end;"
            v-model:current-page="previewPage"
            v-model:page-size="previewPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="parsedData.length"
            layout="total, sizes, prev, pager, next"
            small
          />
        </div>

        <!-- Step 3: 结果 -->
        <div v-else class="batch-result" style="text-align: center; padding: 32px 0;">
          <el-icon :size="48" color="#67C23A"><CircleCheckFilled /></el-icon>
          <h3 style="margin: 12px 0 8px;">导入完成</h3>
          <p>成功 <strong style="color: #67C23A;">{{ importResult.success }}</strong> 条，
            跳过 <strong style="color: #E6A23C;">{{ importResult.skipped }}</strong> 条（重复），
            失败 <strong style="color: #F56C6C;">{{ importResult.failed }}</strong> 条</p>
          <el-button type="primary" @click="handleClose">完成</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, CircleCheckFilled, Download } from '@element-plus/icons-vue'
import { prospectApi } from '@/api/callProspect'
import { customerApi } from '@/api/customer'
import * as XLSX from 'xlsx'

const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ (e: 'imported'): void }>()

const activeTab = ref('single')
const submitting = ref(false)
const formRef = ref()

const form = ref({ name: '', phone: '', gender: '', company: '', remark: '', tagsInput: '' })

const phoneChecking = ref(false)
const phoneCheckResult = ref<{ exists: boolean; message: string } | null>(null)

const handlePhoneBlur = async () => {
  if (form.value.phone && /^1[3-9]\d{9}$/.test(form.value.phone)) {
    await handleCheckPhone()
  }
}

const handleCheckPhone = async () => {
  const phone = form.value.phone
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    phoneCheckResult.value = { exists: false, message: '请输入正确的手机号格式' }
    return
  }
  phoneChecking.value = true
  phoneCheckResult.value = null
  try {
    // 检查外呼名单是否重复
    const prospectRes: any = await prospectApi.checkPhones([phone])
    const prospectDuplicates = prospectRes?.data?.duplicates || []
    if (prospectDuplicates.length > 0) {
      phoneCheckResult.value = { exists: true, message: '该手机号已存在于外呼名单中，不支持重复导入' }
      return
    }
    // 检查客户列表是否重复
    const customerRes: any = await customerApi.checkExists(phone)
    if (customerRes?.data) {
      phoneCheckResult.value = { exists: true, message: `该手机号已存在于客户列表（${customerRes.data.name}），不支持重复导入` }
      return
    }
    phoneCheckResult.value = { exists: false, message: '验证通过，该手机号可以导入' }
  } catch (e: any) {
    phoneCheckResult.value = { exists: false, message: '验证服务暂时不可用，可继续录入' }
  } finally {
    phoneChecking.value = false
  }
}

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
}

const handleSingleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 提交前再次验证手机号是否重复
  if (phoneCheckResult.value?.exists) {
    ElMessage.error('手机号已存在，不支持重复导入')
    return
  }

  submitting.value = true
  try {
    // 最终验证
    const checkRes: any = await prospectApi.checkPhones([form.value.phone])
    if (checkRes?.data?.duplicates?.length > 0) {
      ElMessage.error('该手机号已存在于外呼名单中，不支持重复导入')
      return
    }
    const customerCheck: any = await customerApi.checkExists(form.value.phone)
    if (customerCheck?.data) {
      ElMessage.error(`该手机号已存在于客户列表（${customerCheck.data.name}），不支持重复导入`)
      return
    }

    const tags = form.value.tagsInput ? form.value.tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined
    await prospectApi.create({ ...form.value, tags })
    ElMessage.success('录入成功')
    form.value = { name: '', phone: '', gender: '', company: '', remark: '', tagsInput: '' }
    phoneCheckResult.value = null
    emit('imported')
    visible.value = false
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '录入失败')
  } finally {
    submitting.value = false
  }
}

// 批量导入
const batchStep = ref(0)
const parsedData = ref<any[]>([])
const importResult = ref({ success: 0, skipped: 0, failed: 0 })

const previewPage = ref(1)
const previewPageSize = ref(10)
const paginatedPreview = computed(() => {
  const start = (previewPage.value - 1) * previewPageSize.value
  return parsedData.value.slice(start, start + previewPageSize.value)
})

const validCount = computed(() => parsedData.value.filter(r => !r._duplicate && !r._error).length)
const duplicateCount = computed(() => parsedData.value.filter(r => r._duplicate).length)

const fieldMap: Record<string, string> = {
  '客户姓名': 'name', '姓名': 'name', '名字': 'name',
  '手机号': 'phone', '电话': 'phone', '手机': 'phone', '联系电话': 'phone',
  '性别': 'gender',
  '收货地址': 'company', '地址': 'company', '公司': 'company', '公司名称': 'company', '单位': 'company',
  '客户备注': 'remark', '备注': 'remark', '说明': 'remark',
  '客户标签': 'tags', '标签': 'tags',
  '年龄': 'age',
  '微信号': 'wechat', '微信': 'wechat',
  '邮箱': 'email',
  '客户来源': 'source', '来源': 'source',
  '身份证号': 'idCard',
  '银行卡': 'bankCards',
  '疾病史': 'medicalHistory',
  '改善问题': 'improvementGoals',
  '客户生日': 'birthday'
}

const downloadTemplate = () => {
  const headers = ['客户姓名', '手机号', '性别', '年龄', '收货地址', '微信号', '邮箱', '客户生日', '身份证号', '银行卡', '疾病史', '改善问题', '客户来源', '客户备注', '客户标签']
  const sampleRow = ['张三', '13800138000', '男', '30', '广东省广州市天河区xxx路1号', 'zhangsan_wx', 'zhangsan@qq.com', '1990-05-15', '440106199001011234', '中国工商银行:6222021234567890123', '高血压', '减重', '线上推广', '意向客户', '高意向,需回访']

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])

  // 设置列宽自适应
  ws['!cols'] = headers.map((_h, i) => {
    const hLen = headers[i].length
    const dLen = (sampleRow[i] || '').length
    return { wch: Math.max(hLen * 2.2, dLen * 1.2, 10) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '外呼名单导入模板')
  XLSX.writeFile(wb, '外呼名单导入模板.xlsx')
}

const handleFileChange = async (file: any) => {
  try {
    const data = await file.raw.arrayBuffer()
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][]
    if (rows.length < 2) { ElMessage.warning('文件为空或只有表头'); return }

    // 表头匹配：去除 * 号和空格后再映射
    const headers = rows[0].map((h: any) => String(h).trim().replace(/\*$/g, '').trim())
    const colMap: Record<number, string> = {}
    headers.forEach((h, i) => { if (fieldMap[h]) colMap[i] = fieldMap[h] })

    if (Object.keys(colMap).length === 0) {
      ElMessage.error('模板格式不正确，未能识别到有效列。请使用下载的导入模板。')
      return
    }

    const records: any[] = []
    for (let i = 1; i < Math.min(rows.length, 5001); i++) {
      const row = rows[i]
      if (!row?.length) continue
      const record: any = {}
      Object.entries(colMap).forEach(([idx, field]) => {
        let val = row[Number(idx)]
        if (val !== null && val !== undefined) {
          val = String(val).trim()
          // 手机号确保为字符串且保留前导零
          if (field === 'phone' && val) {
            val = val.replace(/[^\d]/g, '')
          }
        }
        record[field] = val || ''
      })
      if (!record.name && !record.phone) continue
      if (!record.name || !record.phone) { record._error = true }
      records.push(record)
    }

    // 查重
    const phones = records.filter(r => r.phone).map(r => r.phone)
    if (phones.length > 0) {
      try {
        const res: any = await prospectApi.checkPhones(phones)
        const dups = new Set(res?.data?.duplicates || [])
        records.forEach(r => { if (dups.has(r.phone)) r._duplicate = true })
      } catch { /* ignore */ }
    }

    // 文件内去重
    const seen = new Set<string>()
    records.forEach(r => {
      if (r.phone && seen.has(r.phone)) r._duplicate = true
      else if (r.phone) seen.add(r.phone)
    })

    // 处理特殊字段格式
    records.forEach(r => {
      // 银行卡格式转换："银行名称:卡号" → JSON格式
      if (r.bankCards && typeof r.bankCards === 'string') {
        const cards = r.bankCards.split(/[,，]/).map((item: string) => {
          const parts = item.trim().split(/[:：]/)
          if (parts.length >= 2) return { bank: parts[0].trim(), cardNo: parts.slice(1).join(':').trim() }
          return null
        }).filter(Boolean)
        r.bankCards = cards.length > 0 ? cards : null
      }
      // 改善问题格式转换
      if (r.improvementGoals && typeof r.improvementGoals === 'string') {
        r.improvementGoals = r.improvementGoals.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean)
      }
    })

    parsedData.value = records
    ElMessage.success(`解析完成：共${records.length}条，有效${records.filter(r => !r._duplicate && !r._error).length}条`)
    // 自动跳转到预览步骤
    if (records.length > 0) {
      batchStep.value = 1
    }
  } catch (e: any) {
    ElMessage.error('文件解析失败：' + (e?.message || '格式错误'))
  }
}

const handleBatchSubmit = async () => {
  const validRecords = parsedData.value.filter(r => !r._duplicate && !r._error)
  if (!validRecords.length) { ElMessage.warning('没有有效数据'); return }
  submitting.value = true
  try {
    const res: any = await prospectApi.batchImport(validRecords)
    importResult.value = res?.data || { success: validRecords.length, skipped: 0, failed: 0 }
    batchStep.value = 2
    emit('imported')
    ElMessage.success(res?.message || '导入完成')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '导入失败')
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  visible.value = false
  activeTab.value = 'single'
  batchStep.value = 0
  parsedData.value = []
  form.value = { name: '', phone: '', gender: '', company: '', remark: '', tagsInput: '' }
}
</script>

<style scoped>
.batch-upload { padding: 8px 0; }
.batch-preview { padding: 8px 0; }
.batch-upload :deep(.el-alert) { margin-bottom: 16px; }
.batch-upload :deep(.el-alert p) { margin: 2px 0; font-size: 13px; color: #606266; }
</style>
