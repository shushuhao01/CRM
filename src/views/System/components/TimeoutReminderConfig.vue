<template>
  <div class="timeout-reminder-config">
    <!-- 配置卡片 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon class="header-icon"><AlarmClock /></el-icon>
            <span>超时提醒配置</span>
          </div>
          <div class="header-right">
            <el-switch
              v-model="config.isEnabled"
              active-text="已启用"
              inactive-text="已禁用"
              @change="handleEnableChange"
            />
          </div>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="config"
        :rules="rules"
        label-width="180px"
        :disabled="!config.isEnabled"
      >
        <!-- 订单审核超时 -->
        <el-form-item label="订单审核超时" prop="orderAuditTimeout">
          <el-input-number
            v-model="config.orderAuditTimeout"
            :min="1"
            :max="168"
            :step="1"
          />
          <span class="unit">小时</span>
          <span class="hint">订单提交后超过此时间未审核，将发送提醒</span>
        </el-form-item>

        <!-- 发货超时 -->
        <el-form-item label="发货超时" prop="orderShipmentTimeout">
          <el-input-number
            v-model="config.orderShipmentTimeout"
            :min="1"
            :max="168"
            :step="1"
          />
          <span class="unit">小时</span>
          <span class="hint">订单审核通过后超过此时间未发货，将发送提醒</span>
        </el-form-item>

        <!-- 售后处理超时 -->
        <el-form-item label="售后处理超时" prop="afterSalesTimeout">
          <el-input-number
            v-model="config.afterSalesTimeout"
            :min="1"
            :max="168"
            :step="1"
          />
          <span class="unit">小时</span>
          <span class="hint">售后申请提交后超过此时间未处理，将发送提醒</span>
        </el-form-item>

        <!-- 订单跟进提醒 -->
        <el-form-item label="订单跟进提醒" prop="orderFollowupDays">
          <el-input-number
            v-model="config.orderFollowupDays"
            :min="1"
            :max="30"
            :step="1"
          />
          <span class="unit">天</span>
          <span class="hint">订单签收后超过此天数，提醒销售员跟进客户满意度</span>
        </el-form-item>

        <!-- 检测间隔 -->
        <el-form-item label="检测间隔" prop="checkIntervalMinutes">
          <el-input-number
            v-model="config.checkIntervalMinutes"
            :min="5"
            :max="120"
            :step="5"
          />
          <span class="unit">分钟</span>
          <span class="hint">系统自动检测超时的时间间隔（需重启服务生效）</span>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="saveConfig" :loading="saving">
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
          <el-button @click="resetConfig">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="warning" @click="manualCheck" :loading="checking">
            <el-icon><Search /></el-icon>
            立即检测
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 说明卡片 -->
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><InfoFilled /></el-icon>
          <span>功能说明</span>
        </div>
      </template>

      <div class="info-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单审核超时">
            当订单处于"待审核"状态超过设定时间后，系统会自动向管理员和客服发送提醒消息
          </el-descriptions-item>
          <el-descriptions-item label="发货超时">
            当订单审核通过后超过设定时间仍未发货，系统会向管理员、客服和下单员发送提醒
          </el-descriptions-item>
          <el-descriptions-item label="售后处理超时">
            当售后申请处于"待处理"或"处理中"状态超过设定时间，系统会向管理员和处理人发送提醒
          </el-descriptions-item>
          <el-descriptions-item label="订单跟进提醒">
            当订单签收后超过设定天数，系统会提醒下单员跟进客户满意度
          </el-descriptions-item>
          <el-descriptions-item label="提醒频率">
            同一条记录在24小时内只会发送一次提醒，避免重复打扰
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <!-- 最近检测结果 -->
    <el-card v-if="lastCheckResult" class="result-card">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><DataAnalysis /></el-icon>
          <span>最近检测结果</span>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col :span="6">
          <el-statistic title="订单审核超时" :value="lastCheckResult.orderAuditTimeoutCount">
            <template #suffix>条</template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="发货超时" :value="lastCheckResult.orderShipmentTimeoutCount">
            <template #suffix>条</template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="售后处理超时" :value="lastCheckResult.afterSalesTimeoutCount">
            <template #suffix>条</template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="订单跟进提醒" :value="lastCheckResult.orderFollowupCount">
            <template #suffix>条</template>
          </el-statistic>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { timeoutReminderApi, type TimeoutConfig, type CheckResult } from '@/api/timeoutReminder'
import {
  AlarmClock,
  Check,
  Refresh,
  Search,
  InfoFilled,
  DataAnalysis
} from '@element-plus/icons-vue'

// 配置数据
const config = reactive<TimeoutConfig>({
  orderAuditTimeout: 24,
  orderShipmentTimeout: 48,
  afterSalesTimeout: 48,
  orderFollowupDays: 3,
  isEnabled: true,
  checkIntervalMinutes: 30
})

// 原始配置（用于重置）
const originalConfig = ref<TimeoutConfig | null>(null)

// 最近检测结果
const lastCheckResult = ref<CheckResult | null>(null)

// 状态
const saving = ref(false)
const checking = ref(false)

// 表单验证规则
const rules = {
  orderAuditTimeout: [
    { required: true, message: '请输入订单审核超时时间', trigger: 'blur' }
  ],
  orderShipmentTimeout: [
    { required: true, message: '请输入发货超时时间', trigger: 'blur' }
  ],
  afterSalesTimeout: [
    { required: true, message: '请输入售后处理超时时间', trigger: 'blur' }
  ],
  orderFollowupDays: [
    { required: true, message: '请输入订单跟进提醒天数', trigger: 'blur' }
  ]
}

// 加载配置
const loadConfig = async () => {
  try {
    const response = await timeoutReminderApi.getConfig()
    if (response.success && response.data) {
      Object.assign(config, response.data)
      originalConfig.value = { ...response.data }
    }
  } catch (error) {
    console.error('加载超时配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

// 保存配置
const saveConfig = async () => {
  saving.value = true
  try {
    const response = await timeoutReminderApi.updateConfig(config)
    if (response.success) {
      ElMessage.success('配置保存成功')
      originalConfig.value = { ...config }
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存超时配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// 重置配置
const resetConfig = () => {
  if (originalConfig.value) {
    Object.assign(config, originalConfig.value)
    ElMessage.info('已重置为上次保存的配置')
  }
}

// 启用/禁用变更
const handleEnableChange = async (value: boolean) => {
  try {
    await timeoutReminderApi.updateConfig({ isEnabled: value })
    ElMessage.success(value ? '超时提醒已启用' : '超时提醒已禁用')
  } catch (error) {
    console.error('更新启用状态失败:', error)
    config.isEnabled = !value // 回滚
    ElMessage.error('更新状态失败')
  }
}

// 手动触发检测
const manualCheck = async () => {
  checking.value = true
  try {
    const response = await timeoutReminderApi.manualCheck()
    if (response.success) {
      lastCheckResult.value = response.data
      ElMessage.success(`检测完成，共发送 ${response.data.totalSent} 条提醒`)
    } else {
      ElMessage.error(response.message || '检测失败')
    }
  } catch (error) {
    console.error('手动检测失败:', error)
    ElMessage.error('检测失败')
  } finally {
    checking.value = false
  }
}

// 页面初始化
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.timeout-reminder-config {
  padding: 0;
}

.config-card,
.info-card,
.result-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-icon {
  font-size: 18px;
  color: #409eff;
}

.unit {
  margin-left: 8px;
  color: #606266;
}

.hint {
  margin-left: 16px;
  color: #909399;
  font-size: 12px;
}

.info-content {
  padding: 0;
}

:deep(.el-descriptions__label) {
  width: 140px;
  font-weight: 500;
}

:deep(.el-statistic__head) {
  font-size: 14px;
  color: #606266;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  color: #409eff;
}
</style>
