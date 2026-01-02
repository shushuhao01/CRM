<template>
  <el-dialog
    v-model="dialogVisible"
    title="绩效配置管理"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <!-- 预设配置 -->
      <el-tab-pane label="预设配置" name="preset">
        <div class="config-section">
          <el-row :gutter="20">
            <!-- 有效状态预设 -->
            <el-col :span="8">
              <div class="config-card">
                <div class="config-title">有效状态预设</div>
                <div class="config-list">
                  <div v-for="item in configData.statusConfigs" :key="item.id" class="config-item">
                    <span class="config-label">{{ item.configLabel }}</span>
                    <el-button type="danger" size="small" link @click="deleteConfig(item.id)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div class="config-add">
                  <el-input v-model="newStatus" placeholder="新增状态" size="small" />
                  <el-button type="primary" size="small" @click="addConfig('status', newStatus)">添加</el-button>
                </div>
              </div>
            </el-col>

            <!-- 系数预设 -->
            <el-col :span="8">
              <div class="config-card">
                <div class="config-title">系数预设</div>
                <div class="config-list">
                  <div v-for="item in configData.coefficientConfigs" :key="item.id" class="config-item">
                    <span class="config-label">{{ item.configLabel }}</span>
                    <el-button type="danger" size="small" link @click="deleteConfig(item.id)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div class="config-add">
                  <el-input v-model="newCoefficient" placeholder="新增系数" size="small" type="number" step="0.1" />
                  <el-button type="primary" size="small" @click="addConfig('coefficient', newCoefficient)">添加</el-button>
                </div>
              </div>
            </el-col>

            <!-- 备注预设 -->
            <el-col :span="8">
              <div class="config-card">
                <div class="config-title">备注预设</div>
                <div class="config-list">
                  <div v-for="item in configData.remarkConfigs" :key="item.id" class="config-item">
                    <span class="config-label">{{ item.configLabel }}</span>
                    <el-button type="danger" size="small" link @click="deleteConfig(item.id)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div class="config-add">
                  <el-input v-model="newRemark" placeholder="新增备注" size="small" />
                  <el-button type="primary" size="small" @click="addConfig('remark', newRemark)">添加</el-button>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>

      <!-- 计提阶梯 -->
      <el-tab-pane label="计提阶梯" name="ladder">
        <div class="ladder-section">
          <!-- 计提方式选择 -->
          <div class="commission-type-selector">
            <span class="label">计提方式：</span>
            <el-radio-group v-model="commissionType" @change="handleCommissionTypeChange">
              <el-radio value="amount">按业绩金额</el-radio>
              <el-radio value="count">按签收单数</el-radio>
            </el-radio-group>
          </div>

          <!-- 按业绩金额阶梯 -->
          <div v-if="commissionType === 'amount'" class="ladder-card">
            <div class="ladder-title">按业绩金额阶梯</div>
            <el-table :data="configData.amountLadders" border size="small">
              <el-table-column label="起点（元）" width="150">
                <template #default="{ row }">
                  <el-input-number v-model="row.minValue" :min="0" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="终点（元）" width="150">
                <template #default="{ row }">
                  <el-input-number v-model="row.maxValue" :min="0" size="small" controls-position="right" placeholder="无上限" />
                </template>
              </el-table-column>
              <el-table-column label="提成比例" width="150">
                <template #default="{ row }">
                  <el-input-number v-model="row.commissionRate" :min="0" :max="1" :step="0.01" :precision="4" size="small" controls-position="right" />
                  <span class="rate-hint">（{{ ((row.commissionRate || 0) * 100).toFixed(2) }}%）</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button type="primary" size="small" link @click="updateLadder(row)">保存</el-button>
                  <el-button type="danger" size="small" link @click="deleteLadder(row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button type="primary" size="small" class="add-ladder-btn" @click="addAmountLadder">
              + 添加阶梯
            </el-button>
          </div>

          <!-- 按签收单数阶梯 -->
          <div v-if="commissionType === 'count'" class="ladder-card">
            <div class="ladder-title">按签收单数阶梯</div>
            <el-table :data="configData.countLadders" border size="small">
              <el-table-column label="起点（单）" width="150">
                <template #default="{ row }">
                  <el-input-number v-model="row.minValue" :min="0" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="终点（单）" width="150">
                <template #default="{ row }">
                  <el-input-number v-model="row.maxValue" :min="0" size="small" controls-position="right" placeholder="无上限" />
                </template>
              </el-table-column>
              <el-table-column label="每单金额（元）" width="150">
                <template #default="{ row }">
                  <el-input-number v-model="row.commissionPerUnit" :min="0" :step="1" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button type="primary" size="small" link @click="updateLadder(row)">保存</el-button>
                  <el-button type="danger" size="small" link @click="deleteLadder(row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button type="primary" size="small" class="add-ladder-btn" @click="addCountLadder">
              + 添加阶梯
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { financeApi, type FinanceConfigData, type CommissionLadder } from '@/api/finance'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'saved'): void
}>()

const dialogVisible = ref(false)
const activeTab = ref('preset')

// 配置数据
const configData = reactive<FinanceConfigData>({
  statusConfigs: [],
  coefficientConfigs: [],
  remarkConfigs: [],
  amountLadders: [],
  countLadders: [],
  settings: {}
})

// 新增输入
const newStatus = ref('')
const newCoefficient = ref('')
const newRemark = ref('')

// 计提方式
const commissionType = ref<'amount' | 'count'>('amount')

// 监听visible
watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    loadConfig()
  }
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

// 加载配置
const loadConfig = async () => {
  try {
    const res = await financeApi.getConfig()
    if (res.data?.success) {
      Object.assign(configData, res.data.data)
      commissionType.value = (configData.settings.commission_type as 'amount' | 'count') || 'amount'
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  }
}

// 添加配置
const addConfig = async (type: string, value: string) => {
  if (!value?.trim()) {
    ElMessage.warning('请输入内容')
    return
  }
  try {
    await financeApi.addConfig({
      configType: type,
      configValue: value.trim(),
      configLabel: value.trim()
    })
    ElMessage.success('添加成功')

    // 清空输入
    if (type === 'status') newStatus.value = ''
    if (type === 'coefficient') newCoefficient.value = ''
    if (type === 'remark') newRemark.value = ''

    loadConfig()
    emit('saved')
  } catch (_e) {
    ElMessage.error('添加失败')
  }
}

// 删除配置
const deleteConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除此配置项？', '提示', { type: 'warning' })
    await financeApi.deleteConfig(id)
    ElMessage.success('删除成功')
    loadConfig()
    emit('saved')
  } catch (_e: any) {
    if (_e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 切换计提方式
const handleCommissionTypeChange = async (val: 'amount' | 'count') => {
  try {
    await financeApi.updateSetting('commission_type', val)
    ElMessage.success('计提方式已更新')
    emit('saved')
  } catch (_e) {
    ElMessage.error('更新失败')
  }
}

// 添加业绩阶梯
const addAmountLadder = async () => {
  try {
    const lastLadder = configData.amountLadders[configData.amountLadders.length - 1]
    await financeApi.addLadder({
      commissionType: 'amount',
      minValue: lastLadder?.maxValue || 0,
      maxValue: undefined,
      commissionRate: 0.03
    })
    ElMessage.success('添加成功')
    loadConfig()
    emit('saved')
  } catch (_e) {
    ElMessage.error('添加失败')
  }
}

// 添加单数阶梯
const addCountLadder = async () => {
  try {
    const lastLadder = configData.countLadders[configData.countLadders.length - 1]
    await financeApi.addLadder({
      commissionType: 'count',
      minValue: lastLadder?.maxValue || 0,
      maxValue: undefined,
      commissionPerUnit: 30
    })
    ElMessage.success('添加成功')
    loadConfig()
    emit('saved')
  } catch (_e) {
    ElMessage.error('添加失败')
  }
}

// 更新阶梯
const updateLadder = async (ladder: CommissionLadder) => {
  try {
    await financeApi.updateLadder(ladder.id, {
      minValue: ladder.minValue,
      maxValue: ladder.maxValue,
      commissionRate: ladder.commissionRate,
      commissionPerUnit: ladder.commissionPerUnit
    })
    ElMessage.success('保存成功')
    emit('saved')
  } catch (_e) {
    ElMessage.error('保存失败')
  }
}

// 删除阶梯
const deleteLadder = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除此阶梯？', '提示', { type: 'warning' })
    await financeApi.deleteLadder(id)
    ElMessage.success('删除成功')
    loadConfig()
    emit('saved')
  } catch (_e: any) {
    if (_e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 关闭
const handleClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.config-section {
  padding: 10px 0;
}

.config-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  height: 300px;
  display: flex;
  flex-direction: column;
}

.config-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.config-list {
  flex: 1;
  overflow-y: auto;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 8px;
}

.config-label {
  font-size: 13px;
  color: #606266;
}

.config-add {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.config-add .el-input {
  flex: 1;
}

.ladder-section {
  padding: 10px 0;
}

.commission-type-selector {
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.commission-type-selector .label {
  font-weight: 500;
  margin-right: 16px;
}

.ladder-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.ladder-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
}

.add-ladder-btn {
  margin-top: 12px;
}

.rate-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}
</style>
