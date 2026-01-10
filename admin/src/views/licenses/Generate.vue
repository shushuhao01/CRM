<template>
  <div class="page-container">
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="card-header">
          <span>生成授权码（私有部署）</span>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="form">
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="form.customerName" placeholder="请输入客户/企业名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="customerContact">
          <el-input v-model="form.customerContact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="customerPhone">
          <el-input v-model="form.customerPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="customerEmail">
          <el-input v-model="form.customerEmail" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="授权类型" prop="licenseType">
          <el-radio-group v-model="form.licenseType">
            <el-radio label="trial">试用授权（30天）</el-radio>
            <el-radio label="annual">年度授权</el-radio>
            <el-radio label="perpetual">永久授权</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.licenseType === 'annual'" label="有效期" prop="expiresAt">
          <el-date-picker v-model="form.expiresAt" type="date" placeholder="请选择到期时间" style="width: 100%" />
        </el-form-item>
        <el-form-item label="用户数量" prop="maxUsers">
          <el-input-number v-model="form.maxUsers" :min="1" :max="9999" />
          <span class="form-tip">最大允许用户数</span>
        </el-form-item>
        <el-form-item label="功能模块" prop="features">
          <el-checkbox-group v-model="form.features">
            <el-checkbox label="customer">客户管理</el-checkbox>
            <el-checkbox label="order">订单管理</el-checkbox>
            <el-checkbox label="product">商品管理</el-checkbox>
            <el-checkbox label="logistics">物流管理</el-checkbox>
            <el-checkbox label="performance">业绩管理</el-checkbox>
            <el-checkbox label="call">外呼系统</el-checkbox>
            <el-checkbox label="finance">财务管理</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="3" placeholder="请输入备注信息" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">生成授权码</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog v-model="showResult" title="授权码生成成功" width="550px" :close-on-click-modal="false">
      <div class="result-content">
        <el-result icon="success" title="授权码已生成">
          <template #sub-title>
            <p>请将以下授权码发送给客户，用于激活系统</p>
          </template>
        </el-result>
        <div class="result-key">
          <label>授权码：</label>
          <code>{{ generatedKey }}</code>
          <el-button type="primary" size="small" @click="copyKey">复制</el-button>
        </div>
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>
            <span>请妥善保管授权码，建议同时发送给客户邮箱</span>
          </template>
        </el-alert>
        <div class="result-info">
          <p><strong>客户名称：</strong>{{ form.customerName }}</p>
          <p><strong>授权类型：</strong>{{ getLicenseTypeText(form.licenseType) }}</p>
          <p><strong>用户数量：</strong>{{ form.maxUsers }} 人</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="handleContinue">继续生成</el-button>
        <el-button type="primary" @click="$router.push('/licenses/list')">返回列表</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { adminApi } from '@/api/admin'

const formRef = ref<FormInstance>()
const loading = ref(false)
const showResult = ref(false)
const generatedKey = ref('')

const form = reactive({
  customerName: '',
  customerContact: '',
  customerPhone: '',
  customerEmail: '',
  licenseType: 'perpetual' as 'trial' | 'annual' | 'perpetual',
  expiresAt: null as Date | null,
  maxUsers: 50,
  features: ['customer', 'order', 'product', 'logistics', 'performance'],
  notes: ''
})

const rules: FormRules = {
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  licenseType: [{ required: true, message: '请选择授权类型', trigger: 'change' }],
  maxUsers: [{ required: true, message: '请输入用户数量', trigger: 'blur' }],
  expiresAt: [{ required: true, message: '请选择到期时间', trigger: 'change' }]
}

const getLicenseTypeText = (type: string) => ({
  trial: '试用授权（30天）',
  annual: '年度授权',
  perpetual: '永久授权'
}[type] || type)

const handleSubmit = async () => {
  await formRef.value?.validate()
  loading.value = true
  try {
    // 计算到期时间
    let expiresAt: string | undefined
    if (form.licenseType === 'trial') {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      expiresAt = date.toISOString()
    } else if (form.licenseType === 'annual' && form.expiresAt) {
      expiresAt = (form.expiresAt as Date).toISOString()
    }

    const res = await adminApi.createLicense({
      customerName: form.customerName,
      customerContact: form.customerContact,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      licenseType: form.licenseType,
      maxUsers: form.maxUsers,
      features: form.features,
      expiresAt,
      notes: form.notes
    })

    if (res.success) {
      generatedKey.value = res.data.licenseKey
      showResult.value = true
    } else {
      ElMessage.error(res.message || '生成失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '生成失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    customerName: '', customerContact: '', customerPhone: '', customerEmail: '',
    licenseType: 'perpetual', expiresAt: null, maxUsers: 50,
    features: ['customer', 'order', 'product', 'logistics', 'performance'], notes: ''
  })
}

const handleContinue = () => {
  showResult.value = false
  handleReset()
}

const copyKey = async () => {
  try {
    await navigator.clipboard.writeText(generatedKey.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped lang="scss">
.page-container { max-width: 800px; }
.form-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 650px; }
.form-tip { margin-left: 12px; color: #909399; font-size: 12px; }

.result-content {
  display: flex;
  flex-direction: column;
  gap: 16px;

  :deep(.el-result) {
    padding: 16px 0;
  }
}

.result-key {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;

  label { color: #606266; }
  code {
    flex: 1;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 16px;
    font-weight: 600;
    color: #409eff;
    letter-spacing: 1px;
  }
}

.result-info {
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;

  p { margin: 6px 0; }
  strong { color: #303133; }
}
</style>
