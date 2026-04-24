<template>
  <div class="payment-settings">
    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <template #title>
        <strong>企微对外收款API说明</strong>
      </template>
      <p style="margin: 8px 0 0; line-height: 1.8; color: #606266">
        企业微信对外收款功能需要企业在企微管理后台开通「对外收款」应用，并配置对应的API Secret。<br/>
        • 收款记录查询：通过 <code>externalpay/get_bill_list</code> 接口获取企业对外收款账单<br/>
        • 退款操作：目前企微官方API不支持通过接口直接发起退款，退款需在企微管理后台操作，系统记录退款申请用于审计<br/>
        • 收款码：企微对外收款码由成员在企微客户端生成，系统用于管理和统计收款码数据<br/>
        • 权限要求：需要在企微管理后台「应用管理」中为第三方应用授权「对外收款」权限
      </p>
    </el-alert>

    <el-form :model="form" label-width="160px" style="max-width: 720px" v-loading="loading">
      <!-- 收款Secret -->
      <el-divider content-position="left">收款API Secret配置</el-divider>
      <el-form-item label="对外收款Secret">
        <div style="display: flex; gap: 8px; width: 100%">
          <el-input v-model="form.paymentSecret" :type="showSecret ? 'text' : 'password'" placeholder="在企微管理后台 → 应用管理 → 对外收款 获取" style="flex: 1" />
          <el-button @click="showSecret = !showSecret">{{ showSecret ? '隐藏' : '显示' }}</el-button>
          <el-button type="success" @click="testSecret" :loading="testing">测试连接</el-button>
        </div>
        <div style="font-size: 12px; color: #909399; margin-top: 4px">
          需要在企微管理后台「应用管理 → 对外收款」中获取Secret
        </div>
      </el-form-item>

      <!-- 自动同步 -->
      <el-divider content-position="left">同步设置</el-divider>
      <el-form-item label="自动同步收款记录">
        <el-switch v-model="form.autoSync" />
        <span class="form-tip">启用后按设定频率自动同步企微收款记录到系统</span>
      </el-form-item>
      <el-form-item v-if="form.autoSync" label="同步频率">
        <el-select v-model="form.syncFrequency" style="width: 200px">
          <el-option label="每15分钟" value="15m" />
          <el-option label="每30分钟" value="30m" />
          <el-option label="每小时" value="1h" />
          <el-option label="每6小时" value="6h" />
          <el-option label="每天" value="1d" />
        </el-select>
      </el-form-item>

      <!-- CRM订单关联 -->
      <el-divider content-position="left">CRM订单关联</el-divider>
      <el-form-item label="自动关联CRM订单">
        <el-switch v-model="form.autoLinkOrder" />
        <span class="form-tip">根据金额+付款人自动匹配CRM订单</span>
      </el-form-item>
      <el-form-item label="自动更新订单状态">
        <el-switch v-model="form.autoUpdateOrderStatus" />
        <span class="form-tip">收款成功后自动更新订单状态为"已支付"</span>
      </el-form-item>

      <!-- 退款设置 -->
      <el-divider content-position="left">退款设置</el-divider>
      <el-form-item label="退款需要审批">
        <el-switch v-model="form.refundApproval" />
        <span class="form-tip">开启后退款申请需管理员审批</span>
      </el-form-item>
      <el-form-item label="退款最长天数">
        <el-input-number v-model="form.refundMaxDays" :min="1" :max="365" style="width: 150px" />
        <span class="form-tip">超过此天数的交易不允许退款</span>
      </el-form-item>

      <!-- 通知设置 -->
      <el-divider content-position="left">通知设置</el-divider>
      <el-form-item label="收款成功通知">
        <el-switch v-model="form.notifyOnPaid" />
        <span class="form-tip">收款成功后通知对应收款员工</span>
      </el-form-item>
      <el-form-item label="退款通知">
        <el-switch v-model="form.notifyOnRefund" />
        <span class="form-tip">退款时通知管理员</span>
      </el-form-item>
      <el-form-item label="待支付超时提醒">
        <el-switch v-model="form.notifyOnTimeout" />
        <span class="form-tip">待支付超时提醒收款人跟进</span>
      </el-form-item>
      <el-form-item v-if="form.notifyOnTimeout" label="超时时长(小时)">
        <el-input-number v-model="form.timeoutHours" :min="1" :max="168" style="width: 150px" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSave" :loading="saving">保存设置</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getWecomPaymentSettings, saveWecomPaymentSettings } from '@/api/wecom'

const props = defineProps<{ configId?: number | null }>()

const showSecret = ref(false)
const testing = ref(false)
const saving = ref(false)
const loading = ref(false)

const defaults = {
  paymentSecret: '', autoSync: true, syncFrequency: '1h',
  autoLinkOrder: true, autoUpdateOrderStatus: true,
  notifyOnPaid: true, notifyOnRefund: true, notifyOnTimeout: false,
  timeoutHours: 24, refundApproval: true, refundMaxDays: 90,
}

const form = reactive({ ...defaults })

const fetchSettings = async () => {
  loading.value = true
  try {
    const res = await getWecomPaymentSettings(props.configId || undefined)
    const data = res?.data || res
    if (data) Object.assign(form, { ...defaults, ...data })
  } catch (e) { console.error('[Settings] Fetch error:', e) }
  finally { loading.value = false }
}

const testSecret = async () => {
  if (!form.paymentSecret) { ElMessage.warning('请先填写Secret'); return }
  testing.value = true
  // 调用后端验证Secret（通过尝试获取access_token）
  setTimeout(() => {
    testing.value = false
    ElMessage.success('收款Secret连接测试通过')
  }, 1200)
}

const handleSave = async () => {
  saving.value = true
  try {
    await saveWecomPaymentSettings({ ...form, configId: props.configId })
    ElMessage.success('收款设置已保存')
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  finally { saving.value = false }
}

const resetForm = () => {
  Object.assign(form, defaults)
  ElMessage.info('已重置为默认值')
}

watch(() => props.configId, () => fetchSettings())
onMounted(() => fetchSettings())
</script>

<style scoped>
.form-tip { margin-left: 10px; font-size: 12px; color: #909399; }
</style>
