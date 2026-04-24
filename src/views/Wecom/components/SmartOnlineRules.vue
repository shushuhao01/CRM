<template>
  <el-dialog
    v-model="visible"
    title="智能上下线规则"
    width="680px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="$emit('close')"
  >
    <el-form label-position="top" class="rules-form">
      <!-- 一、自动下线规则 -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">🔴</span>
          <span class="section-name">自动下线规则</span>
        </div>

        <!-- 每日上限 -->
        <div class="rule-item">
          <el-checkbox v-model="rules.dailyLimitEnabled">达到每日上限自动下线</el-checkbox>
          <div v-if="rules.dailyLimitEnabled" class="rule-detail">
            <span>每人每日最多</span>
            <el-input-number v-model="rules.dailyLimitPerUser" :min="1" :max="999" size="small" style="width: 100px" />
            <span>人，达上限后：</span>
            <el-select v-model="rules.dailyLimitAction" size="small" style="width: 140px">
              <el-option label="自动下线" value="offline" />
              <el-option label="权重降低50%" value="reduce_weight" />
            </el-select>
          </div>
        </div>

        <!-- 非工作时间 -->
        <div class="rule-item">
          <el-checkbox v-model="rules.workTimeEnabled">非工作时间自动下线</el-checkbox>
          <div v-if="rules.workTimeEnabled" class="rule-detail">
            <span>工作时间：</span>
            <el-time-select v-model="rules.workTimeStart" :max-time="rules.workTimeEnd" placeholder="开始" start="06:00" end="23:00" step="00:30" size="small" style="width: 100px" />
            <span>至</span>
            <el-time-select v-model="rules.workTimeEnd" :min-time="rules.workTimeStart" placeholder="结束" start="06:00" end="23:00" step="00:30" size="small" style="width: 100px" />
            <div class="weekday-checks">
              <el-checkbox-group v-model="rules.workDays" size="small">
                <el-checkbox-button v-for="(d, i) in weekdayLabels" :key="i" :value="i + 1">{{ d }}</el-checkbox-button>
              </el-checkbox-group>
            </div>
          </div>
        </div>

        <!-- 未及时回复 -->
        <div class="rule-item">
          <el-checkbox v-model="rules.slowReplyEnabled">未及时回复自动降权</el-checkbox>
          <div v-if="rules.slowReplyEnabled" class="rule-detail">
            <span>超过</span>
            <el-input-number v-model="rules.slowReplyMinutes" :min="5" :max="120" size="small" style="width: 100px" />
            <span>分钟未回复，处理：</span>
            <el-select v-model="rules.slowReplyAction" size="small" style="width: 140px">
              <el-option label="自动下线" value="offline" />
              <el-option label="权重降低50%" value="reduce_weight" />
            </el-select>
          </div>
        </div>

        <!-- 流失率过高 -->
        <div class="rule-item">
          <el-checkbox v-model="rules.lossRateEnabled">客户流失率过高自动下线</el-checkbox>
          <div v-if="rules.lossRateEnabled" class="rule-detail">
            <span>7日流失率超过</span>
            <el-input-number v-model="rules.lossRateThreshold" :min="10" :max="100" size="small" style="width: 100px" />
            <span>% 触发下线</span>
          </div>
        </div>
      </div>

      <!-- 二、自动上线规则 -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">🟢</span>
          <span class="section-name">自动上线规则</span>
        </div>

        <!-- 次日自动上线 -->
        <div class="rule-item">
          <el-checkbox v-model="rules.nextDayAutoOnline">次日自动重新上线</el-checkbox>
          <div v-if="rules.nextDayAutoOnline" class="rule-detail">
            <span>每日</span>
            <el-time-select v-model="rules.nextDayOnlineTime" placeholder="时间" start="06:00" end="12:00" step="00:30" size="small" style="width: 100px" />
            <span>自动恢复上线</span>
            <div class="exclude-checks">
              <el-checkbox v-model="rules.nextDayExcludeManual">手动下线的不自动上线</el-checkbox>
              <el-checkbox v-model="rules.nextDayExcludeLossRate">流失率过高下线的不自动上线</el-checkbox>
            </div>
          </div>
        </div>
      </div>

      <!-- 三、部门级管理 -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">🏢</span>
          <span class="section-name">部门级管理</span>
        </div>

        <div class="rule-item">
          <el-checkbox v-model="rules.deptQuotaEnabled">按部门设置接待配额</el-checkbox>
          <div v-if="rules.deptQuotaEnabled" class="rule-detail">
            <div class="dept-quotas">
              <div v-for="(dq, idx) in rules.deptQuotas" :key="idx" class="dept-quota-row">
                <el-input v-model="dq.deptName" placeholder="部门名称" size="small" style="width: 120px" />
                <span>每日最多</span>
                <el-input-number v-model="dq.quota" :min="1" :max="999" size="small" style="width: 100px" />
                <span>人</span>
                <el-button type="danger" link size="small" @click="rules.deptQuotas.splice(idx, 1)">删除</el-button>
              </div>
              <el-button type="primary" link size="small" @click="addDeptQuota">+ 添加部门</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">保存规则</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getAcquisitionSmartRules, saveAcquisitionSmartRules } from '@/api/wecom'
import type { SmartOnlineRule } from '../types'

const props = defineProps<{
  modelValue: boolean
  linkId: number | null
  isDemoMode: boolean
}>()

const emit = defineEmits(['update:modelValue', 'close', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const saving = ref(false)
const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

const defaultRules = (): SmartOnlineRule => ({
  dailyLimitEnabled: true,
  dailyLimitPerUser: 50,
  dailyLimitAction: 'offline',
  workTimeEnabled: true,
  workTimeStart: '09:00',
  workTimeEnd: '18:00',
  workDays: [1, 2, 3, 4, 5],
  slowReplyEnabled: false,
  slowReplyMinutes: 30,
  slowReplyAction: 'reduce_weight',
  lossRateEnabled: false,
  lossRateThreshold: 30,
  nextDayAutoOnline: true,
  nextDayOnlineTime: '09:00',
  nextDayExcludeManual: true,
  nextDayExcludeLossRate: false,
  deptQuotaEnabled: false,
  deptQuotas: [{ deptName: '销售部', quota: 100 }]
})

const rules = reactive(defaultRules())

const addDeptQuota = () => {
  rules.deptQuotas.push({ deptName: '', quota: 50 })
}

// 加载规则
watch(() => [props.modelValue, props.linkId], async ([show, linkId]) => {
  if (!show || !linkId) return
  if (props.isDemoMode) {
    Object.assign(rules, defaultRules())
    return
  }
  try {
    const res: any = await getAcquisitionSmartRules(linkId as number)
    if (res) Object.assign(rules, res)
  } catch (e) {
    console.error('[SmartOnlineRules] Load error:', e)
  }
}, { immediate: true })

const handleSave = async () => {
  if (props.isDemoMode) {
    ElMessage.success('规则已保存（示例模式）')
    emit('saved')
    emit('close')
    return
  }
  if (!props.linkId) return
  saving.value = true
  try {
    await saveAcquisitionSmartRules(props.linkId, { ...rules })
    ElMessage.success('智能规则已保存')
    emit('saved')
    emit('close')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.rules-form { padding: 0 4px; }
.section { margin-bottom: 24px; }
.section-header {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: #F9FAFB; border-radius: 8px; margin-bottom: 12px;
}
.section-icon { font-size: 18px; }
.section-name { font-weight: 600; font-size: 15px; color: #1F2937; }
.rule-item { margin-bottom: 16px; padding-left: 8px; }
.rule-detail {
  margin-top: 8px; margin-left: 24px; padding: 10px 14px;
  background: #FAFBFC; border-radius: 8px; border: 1px solid #F3F4F6;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  font-size: 13px; color: #4B5563;
}
.weekday-checks { width: 100%; margin-top: 8px; }
.exclude-checks { width: 100%; margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.dept-quotas { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.dept-quota-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
</style>

