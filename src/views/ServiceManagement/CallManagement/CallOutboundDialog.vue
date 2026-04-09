<template>
  <!-- 外呼对话框 -->
  <el-dialog :model-value="visible" @update:model-value="$emit('update:visible', $event)" title="发起外呼" width="650px" @open="$emit('init')">
    <el-form :model="outboundForm" :rules="outboundRules" ref="outboundFormRef" label-width="100px">
      <el-form-item label="外呼方式" prop="callMethod">
        <el-select v-model="outboundForm.callMethod" placeholder="请选择外呼方式" style="width: 100%" @change="$emit('outbound-method-change', $event)">
          <el-option v-if="workPhones.length > 0" label="工作手机" value="work_phone">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <div style="flex: 1;"><div style="font-weight: 500;">工作手机</div><div style="color: #8492a6; font-size: 12px;">使用绑定的工作手机拨打</div></div>
              <el-tag size="small" type="success" style="margin-left: 12px;">推荐</el-tag>
            </div>
          </el-option>
          <el-option v-if="availableLines.length > 0" label="网络电话" value="network_phone">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <div style="flex: 1;"><div style="font-weight: 500;">网络电话</div><div style="color: #8492a6; font-size: 12px;">使用系统分配的外呼线路</div></div>
              <el-tag size="small" type="info" style="margin-left: 12px;">录音</el-tag>
            </div>
          </el-option>
        </el-select>
        <div v-if="!workPhones.length && !availableLines.length" style="color: #f56c6c; font-size: 12px; margin-top: 4px;">
          暂无可用的外呼方式，请先在"呼出配置"中绑定工作手机或联系管理员分配线路
        </div>
      </el-form-item>

      <!-- 工作手机选择 -->
      <el-form-item v-if="outboundForm.callMethod === 'work_phone'" label="选择手机" prop="selectedWorkPhone">
        <el-select v-model="outboundForm.selectedWorkPhone" placeholder="请选择工作手机" style="width: 100%" popper-class="outbound-select-popper">
          <el-option v-for="phone in workPhones" :key="phone.id"
            :label="`${phone.number} (${phone.status === 'online' || phone.status === '在线' ? '在线' : '离线'})`"
            :value="phone.id" :disabled="phone.status !== 'online' && phone.status !== '在线'">
            <div class="select-option-row">
              <div class="option-content"><div class="option-title">{{ phone.number }}</div><div class="option-desc">{{ phone.name || '工作手机' }}</div></div>
              <el-tag size="small" :type="phone.status === 'online' || phone.status === '在线' ? 'success' : 'danger'" class="option-tag">
                {{ phone.status === 'online' || phone.status === '在线' ? '在线' : '离线' }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
        <div v-if="selectedWorkPhoneOnline" class="phone-online-tip">
          <el-alert type="success" :closable="false" show-icon>
            <template #title>
              <span>已连接到手机，可拨打电话</span>
              <el-button type="primary" size="small" link @click="$emit('refresh-device-status')" style="margin-left: 12px;">刷新状态</el-button>
            </template>
          </el-alert>
        </div>
        <div v-if="selectedWorkPhoneOffline" class="phone-offline-tip">
          <el-alert type="warning" :closable="false" show-icon>
            <template #title>
              <span>当前选择的手机已离线，请在手机APP上重新连接</span>
              <el-button type="primary" size="small" link @click="$emit('refresh-device-status')" style="margin-left: 12px;">刷新状态</el-button>
              <el-button type="primary" size="small" link @click="$emit('show-bind-qr-code')" style="margin-left: 8px;">重新扫码绑定</el-button>
            </template>
          </el-alert>
        </div>
      </el-form-item>

      <!-- 网络电话线路选择 -->
      <el-form-item v-if="outboundForm.callMethod === 'network_phone'" label="选择线路" prop="selectedLine">
        <el-select v-model="outboundForm.selectedLine" placeholder="请选择外呼线路" style="width: 100%" popper-class="outbound-select-popper">
          <el-option v-for="line in availableLines" :key="line.id" :label="`${line.name} (${line.status})`" :value="line.id">
            <div class="select-option-row">
              <div class="option-content"><div class="option-title">{{ line.name }}</div><div class="option-desc">{{ getProviderText(line.provider) }} · {{ line.callerNumber || '未设置主叫号码' }}</div></div>
              <el-tag size="small" :type="line.status === '正常' ? 'success' : 'warning'" class="option-tag">{{ line.status }}</el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="选择客户" prop="selectedCustomer">
        <el-select v-model="outboundForm.selectedCustomer" placeholder="请输入客户姓名、编号、电话或公司名称进行搜索"
          filterable remote :remote-method="(q: string) => $emit('search-customers', q)"
          :loading="isSearching" style="width: 100%" popper-class="outbound-select-popper"
          @change="$emit('customer-change', $event)"
          @focus="() => { if (customerOptions.length === 0) $emit('search-customers', '') }"
          clearable no-data-text="暂无客户数据，请输入关键词搜索" no-match-text="未找到匹配的客户" loading-text="正在搜索客户..." value-key="id">
          <el-option v-for="customer in customerOptions" :key="customer.id" :label="customer.name" :value="customer">
            <div class="select-option-row">
              <div class="option-content">
                <div class="option-title">{{ customer.name }}</div>
                <div class="option-desc">
                  <span v-if="customer.phone">{{ displaySensitiveInfoNew(customer.phone, SensitiveInfoType.PHONE) }}</span>
                  <el-tag v-if="customer.phone && getPhoneCarrier(customer.phone)" size="small" type="info" style="margin-left: 6px; transform: scale(0.9);">{{ getPhoneCarrier(customer.phone) }}</el-tag>
                </div>
              </div>
              <el-tag size="small" type="primary" class="option-tag">{{ customer.code || '无编号' }}</el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="选择号码" prop="customerPhone">
        <el-select v-model="outboundForm.customerPhone" placeholder="请选择号码" style="width: 100%" popper-class="outbound-select-popper" :disabled="!outboundForm.selectedCustomer">
          <el-option v-for="phone in phoneOptions" :key="phone.phone" :label="displaySensitiveInfoNew(phone.phone, SensitiveInfoType.PHONE)" :value="phone.phone">
            <div class="select-option-row">
              <div class="option-content">
                <span>{{ displaySensitiveInfoNew(phone.phone, SensitiveInfoType.PHONE) }}</span>
                <el-tag v-if="getPhoneCarrier(phone.phone)" size="small" type="info" style="margin-left: 6px; transform: scale(0.9);">{{ getPhoneCarrier(phone.phone) }}</el-tag>
              </div>
              <el-tag size="small" type="info" class="option-tag">{{ phone.type }}</el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="手动输入号码">
        <el-input v-model="outboundForm.manualPhone" placeholder="或手动输入电话号码" />
        <div style="color: #909399; font-size: 12px; margin-top: 4px;">手动输入号码将优先使用，不会同步客户信息</div>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="outboundForm.notes" type="textarea" :rows="3" placeholder="请输入通话备注" maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer-buttons">
        <el-button @click="$emit('close')">取消</el-button>
        <el-tooltip :disabled="canStartCall" :content="getCannotCallReason" placement="top">
          <span>
            <el-button type="primary" @click="$emit('start-call')" :loading="outboundLoading" :disabled="!canStartCall">开始呼叫</el-button>
          </span>
        </el-tooltip>
      </div>
    </template>
  </el-dialog>

  <!-- 绑定二维码弹窗 -->
  <el-dialog :model-value="bindQRDialogVisible" @update:model-value="$emit('update:bindQRDialogVisible', $event)" title="扫码绑定工作手机" width="400px" @close="$emit('stop-bind-status-check')">
    <div class="qr-bind-content">
      <div v-if="bindQRCodeUrl" class="qr-code-wrapper">
        <img :src="bindQRCodeUrl" alt="绑定二维码" class="qr-code-img" />
        <div class="qr-status">
          <template v-if="bindStatus === 'pending'"><el-icon class="is-loading"><Loading /></el-icon> 等待扫码...</template>
          <template v-else-if="bindStatus === 'connected'"><el-icon style="color: #67c23a;"><CircleCheckFilled /></el-icon> 绑定成功！</template>
          <template v-else-if="bindStatus === 'expired'"><el-icon style="color: #f56c6c;"><WarningFilled /></el-icon> 二维码已过期</template>
        </div>
      </div>
      <div v-else class="qr-loading">
        <el-icon class="is-loading" size="32"><Loading /></el-icon>
        <p>正在生成二维码...</p>
      </div>
      <div class="qr-tips">
        <p>1. 在工作手机上打开"外呼助手"APP</p>
        <p>2. 点击"扫码绑定"功能</p>
        <p>3. 扫描上方二维码完成绑定</p>
      </div>
    </div>
    <template #footer>
      <el-button v-if="bindStatus === 'expired'" type="primary" @click="$emit('refresh-bind-qr-code')">重新生成</el-button>
      <el-button @click="$emit('update:bindQRDialogVisible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loading, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { getProviderText, getPhoneCarrier } from './helpers'

defineProps<{
  visible: boolean
  outboundForm: any
  outboundRules: any
  outboundLoading: boolean
  workPhones: any[]
  availableLines: any[]
  customerOptions: any[]
  phoneOptions: any[]
  isSearching: boolean
  canStartCall: boolean
  getCannotCallReason: string
  selectedWorkPhoneOnline: boolean
  selectedWorkPhoneOffline: boolean
  bindQRDialogVisible: boolean
  bindQRCodeUrl: string
  bindStatus: string
}>()

defineEmits<{
  'update:visible': [value: boolean]
  'update:bindQRDialogVisible': [value: boolean]
  init: []
  close: []
  'start-call': []
  'search-customers': [query: string]
  'customer-change': [customer: any]
  'outbound-method-change': [method: string]
  'refresh-device-status': []
  'show-bind-qr-code': []
  'refresh-bind-qr-code': []
  'stop-bind-status-check': []
}>()

const outboundFormRef = ref()
</script>

<style scoped>
.phone-offline-tip { margin-top: 12px; }
.phone-online-tip { margin-top: 12px; }
.qr-bind-content { text-align: center; padding: 20px 0; }
.qr-code-wrapper { margin-bottom: 20px; }
.qr-code-img { width: 200px; height: 200px; border: 1px solid #eee; border-radius: 8px; }
.qr-status { margin-top: 16px; font-size: 14px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.qr-loading { padding: 40px 0; color: #999; }
.qr-loading p { margin-top: 12px; }
.qr-tips { text-align: left; background: #f5f7fa; padding: 16px; border-radius: 8px; margin-top: 20px; }
.qr-tips p { margin: 8px 0; font-size: 13px; color: #666; }
.select-option-row { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 4px 0; }
.option-content { flex: 1; min-width: 0; margin-right: 12px; }
.option-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.option-desc { color: #8492a6; font-size: 12px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.option-tag { flex-shrink: 0; }
.dialog-footer-buttons { display: flex; justify-content: flex-end; gap: 16px; }
</style>

<style>
.outbound-select-popper { min-width: 450px !important; }
.outbound-select-popper .el-select-dropdown__item { height: auto; padding: 8px 12px; line-height: 1.4; }
</style>

