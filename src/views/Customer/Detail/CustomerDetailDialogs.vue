<template>
  <!-- 外呼对话框 -->
  <el-dialog v-model="localShowCallDialog" title="发起外呼" width="500px">
    <el-form :model="callForm" label-width="80px">
      <el-form-item label="电话号码">
        <el-select v-model="callForm.phone" placeholder="请选择客户号码" filterable allow-create>
          <el-option
            v-if="customerInfo.phone"
            :label="`${displaySensitiveInfoNew(customerInfo.phone, SensitiveInfoType.PHONE)} (主号码)`"
            :value="customerInfo.phone"
          />
          <el-option
            v-for="(phone, index) in customerInfo.otherPhones"
            :key="phone"
            :label="`${displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE)} (备用号码${index + 1})`"
            :value="phone"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="通话目的">
        <el-select v-model="callForm.purpose" placeholder="请选择">
          <el-option label="销售跟进" value="sales" />
          <el-option label="客户回访" value="callback" />
          <el-option label="售后服务" value="service" />
          <el-option label="其他" value="other" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="callForm.note" type="textarea" rows="3" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="localShowCallDialog = false">取消</el-button>
      <el-button @click="$emit('start-call')" type="primary" :loading="calling">开始通话</el-button>
    </template>
  </el-dialog>

  <!-- 跟进对话框 -->
  <el-dialog v-model="localShowFollowUpDialog" :title="isEditingFollowUp ? '编辑跟进记录' : '添加跟进记录'" width="600px">
    <el-form :model="followUpForm" :rules="followUpRules" ref="followUpFormRef" label-width="80px">
      <el-form-item label="跟进类型" prop="type">
        <el-select v-model="followUpForm.type" placeholder="请选择">
          <el-option label="电话跟进" value="电话跟进" />
          <el-option label="微信沟通" value="微信沟通" />
          <el-option label="上门拜访" value="上门拜访" />
          <el-option label="邮件联系" value="邮件联系" />
          <el-option label="其他" value="其他" />
        </el-select>
      </el-form-item>
      <el-form-item label="跟进标题" prop="title">
        <el-input v-model="followUpForm.title" placeholder="请输入跟进标题" />
      </el-form-item>
      <el-form-item label="跟进内容" prop="content">
        <el-input v-model="followUpForm.content" type="textarea" rows="4" placeholder="请输入跟进内容" />
      </el-form-item>
      <el-form-item label="下次跟进">
        <el-date-picker v-model="followUpForm.nextFollowUp" type="datetime" placeholder="选择下次跟进时间" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('cancel-followup')">取消</el-button>
      <el-button @click="$emit('save-followup')" type="primary" :loading="savingFollowUp">
        {{ isEditingFollowUp ? '更新' : '保存' }}
      </el-button>
    </template>
  </el-dialog>

  <!-- 短信发送对话框 -->
  <el-dialog v-model="localShowSMSDialog" title="发送短信" width="600px">
    <el-form :model="smsForm" :rules="smsRules" ref="smsFormRef" label-width="100px">
      <el-form-item label="接收号码" prop="phone">
        <el-select v-model="smsForm.phone" placeholder="请选择客户号码" filterable>
          <el-option
            v-if="customerInfo.phone"
            :label="`${displaySensitiveInfoNew(customerInfo.phone, SensitiveInfoType.PHONE)} (主号码)`"
            :value="customerInfo.phone"
          />
          <el-option
            v-for="(phone, index) in customerInfo.otherPhones"
            :key="phone"
            :label="`${displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE)} (备用号码${index + 1})`"
            :value="phone"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="短信模板" prop="templateId">
        <div class="template-select-wrapper">
          <el-select
            v-model="smsForm.templateId"
            placeholder="请选择短信模板"
            @change="$emit('template-change', $event)"
            style="flex: 1; margin-right: 10px;"
          >
            <el-option
              v-for="template in smsTemplates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            />
          </el-select>
          <el-button
            type="primary"
            :icon="DocumentAdd"
            @click="$emit('apply-template')"
            class="apply-template-btn"
            title="申请新模板"
          >
            申请模板
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="模板预览" v-if="selectedTemplate">
        <div class="template-preview">
          <div class="preview-title">{{ selectedTemplate.name }}</div>
          <div class="preview-content">{{ previewContent }}</div>
          <div class="preview-note">注：实际发送时会替换模板变量</div>
        </div>
      </el-form-item>
      <el-form-item label="模板变量" v-if="selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0">
        <div class="template-variables">
          <div v-for="variable in selectedTemplate.variables" :key="variable.key" class="variable-item">
            <label>{{ variable.label }}：</label>
            <el-input
              v-model="smsForm.variables[variable.key]"
              :placeholder="variable.placeholder || `请输入${variable.label}`"
              size="small"
            />
          </div>
        </div>
      </el-form-item>
      <el-form-item label="发送限制">
        <div class="send-limit-info">
          <el-alert
            :title="`今日已发送：${userSmsStats.todayCount}/1 条，本月已发送：${userSmsStats.monthCount}/5 条`"
            type="info"
            :closable="false"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="localShowSMSDialog = false">取消</el-button>
      <el-button @click="$emit('send-sms')" type="primary" :loading="sendingSMS" :disabled="!canSendSMS">发送短信</el-button>
    </template>
  </el-dialog>

  <!-- 标签对话框 -->
  <el-dialog v-model="localShowTagDialog" title="添加标签" width="400px">
    <el-form :model="tagForm" label-width="80px">
      <el-form-item label="标签名称">
        <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
      </el-form-item>
      <el-form-item label="标签颜色">
        <el-select v-model="tagForm.type" placeholder="请选择颜色">
          <el-option label="默认" value="" />
          <el-option label="成功" value="success" />
          <el-option label="信息" value="info" />
          <el-option label="警告" value="warning" />
          <el-option label="危险" value="danger" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="localShowTagDialog = false">取消</el-button>
      <el-button @click="$emit('save-tag')" type="primary" :loading="savingTag">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DocumentAdd } from '@element-plus/icons-vue'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'

const props = defineProps<{
  showCallDialog: boolean
  showFollowUpDialog: boolean
  showSMSDialog: boolean
  showTagDialog: boolean
  customerInfo: any
  callForm: any
  calling: boolean
  followUpForm: any
  followUpRules: any
  isEditingFollowUp: boolean
  savingFollowUp: boolean
  smsForm: any
  smsRules: any
  smsTemplates: any[]
  selectedTemplate: any
  previewContent: string
  userSmsStats: { todayCount: number; monthCount: number }
  canSendSMS: boolean
  sendingSMS: boolean
  tagForm: any
  savingTag: boolean
}>()

const emit = defineEmits<{
  'update:showCallDialog': [val: boolean]
  'update:showFollowUpDialog': [val: boolean]
  'update:showSMSDialog': [val: boolean]
  'update:showTagDialog': [val: boolean]
  'start-call': []
  'cancel-followup': []
  'save-followup': []
  'template-change': [val: any]
  'apply-template': []
  'send-sms': []
  'save-tag': []
}>()

const localShowCallDialog = ref(props.showCallDialog)
const localShowFollowUpDialog = ref(props.showFollowUpDialog)
const localShowSMSDialog = ref(props.showSMSDialog)
const localShowTagDialog = ref(props.showTagDialog)

watch(() => props.showCallDialog, (v) => { localShowCallDialog.value = v })
watch(localShowCallDialog, (v) => { emit('update:showCallDialog', v) })
watch(() => props.showFollowUpDialog, (v) => { localShowFollowUpDialog.value = v })
watch(localShowFollowUpDialog, (v) => { emit('update:showFollowUpDialog', v) })
watch(() => props.showSMSDialog, (v) => { localShowSMSDialog.value = v })
watch(localShowSMSDialog, (v) => { emit('update:showSMSDialog', v) })
watch(() => props.showTagDialog, (v) => { localShowTagDialog.value = v })
watch(localShowTagDialog, (v) => { emit('update:showTagDialog', v) })
</script>

<style scoped>
.template-select-wrapper { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.apply-template-btn { flex-shrink: 0; }
.template-preview { background: #f5f7fa; border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #e4e7ed; }
.preview-title { font-weight: 600; color: #303133; margin-bottom: 8px; }
.preview-content { color: #606266; font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
.preview-note { color: #909399; font-size: 12px; }
.template-variables { margin-bottom: 12px; }
.variable-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.send-limit-info { color: #909399; font-size: 12px; margin-top: 8px; }
</style>
