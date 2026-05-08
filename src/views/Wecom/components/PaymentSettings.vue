<template>
  <div class="payment-settings">
    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <template #title>
        <strong>企微对外收款API说明</strong>
      </template>
      <p style="margin: 8px 0 0; line-height: 1.8; color: #606266">
        • 收款记录查询：通过 <code>externalpay/get_bill_list</code> 接口获取企业对外收款账单<br/>
        • 退款操作：企微官方<strong>无服务端退款API</strong>，退款需在企微管理后台或企微APP中操作，本系统记录退款申请用于审批审计<br/>
        • 收款码：企微收款码由成员在企微APP中创建，<strong>无法通过API生成</strong><br/>
        • 接口限制：2023年12月起不再支持系统应用Secret调用，自建应用需在企微后台配置「可调用接口的应用」<br/>
        • 第三方应用：授权时勾选「对外收款」权限即可调用，但4.1.0后新增的部分商户号记录不会返回
      </p>
    </el-alert>

    <el-form :model="form" label-width="160px" style="max-width: 720px" v-loading="loading">
      <!-- 收款API权限配置 -->
      <el-divider content-position="left">收款API权限</el-divider>
      <el-form-item label="接入模式">
        <template v-if="isThirdParty">
          <div style="display: flex; gap: 8px; width: 100%; align-items: center">
            <el-tag type="success" size="large">第三方应用授权</el-tag>
            <el-button type="success" @click="testSecret" :loading="testing">验证收款权限</el-button>
          </div>
          <div style="font-size: 12px; color: #909399; margin-top: 6px; line-height: 1.8">
            第三方应用通过企业授权自动获取收款权限，无需单独配置Secret。<br/>
            如企业授权时未勾选「对外收款」权限，请联系企业管理员重新授权并勾选。<br/>
            <strong>注意：</strong>4.1.0及以上版本新增的部分商户号收款记录不会返回给第三方应用。
          </div>
        </template>
        <template v-else>
          <div style="display: flex; gap: 8px; width: 100%; align-items: center">
            <el-tag type="primary" size="large">自建应用模式</el-tag>
            <el-button type="success" @click="testSecret" :loading="testing">测试收款API</el-button>
          </div>
          <div style="font-size: 12px; color: #909399; margin-top: 6px; line-height: 1.8">
            自建应用调用收款API需完成以下配置：<br/>
            1. 企微管理后台 → 应用管理 → 对外收款 → 点击「API」 → 设置「可调用接口的应用」<br/>
            2. 在弹出的列表中勾选当前使用的自建应用（如已在企微授权页配置的应用）<br/>
            3. 系统将使用该自建应用的corpSecret调用收款API<br/>
            <strong>注意：</strong>2023年12月起不再支持独立的「对外收款Secret」，所有调用均通过自建应用Secret完成。
          </div>
        </template>
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
import { getWecomPaymentSettings, saveWecomPaymentSettings, testPaymentSecret as testPaymentSecretApi } from '@/api/wecom'

const props = defineProps<{ configId?: number | null }>()

const testing = ref(false)
const saving = ref(false)
const loading = ref(false)
const isThirdParty = ref(false)

const defaults = {
  autoSync: true, syncFrequency: '1h',
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
    if (data) {
      isThirdParty.value = data.authType === 'third_party'
      Object.assign(form, { ...defaults, ...data })
    }
  } catch (e) { console.error('[Settings] Fetch error:', e) }
  finally { loading.value = false }
}

const testSecret = async () => {
  testing.value = true
  try {
    const res = await testPaymentSecretApi({ configId: props.configId || undefined }) as any
    // axios拦截器解包后 res = { connected, message }
    if (res?.connected) {
      ElMessage.success(res.message || '收款Secret连接测试通过')
    } else {
      ElMessage.warning(res?.message || '连接测试失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '连接测试失败，请检查Secret是否正确')
  } finally {
    testing.value = false
  }
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
