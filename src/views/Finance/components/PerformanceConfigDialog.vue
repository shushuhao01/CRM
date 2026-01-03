<template>
  <el-dialog
    v-model="dialogVisible"
    title="绩效配置管理"
    width="850px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <!-- 预设配置 -->
      <el-tab-pane label="预设配置" name="preset">
        <div class="preset-section">
          <!-- 有效状态预设 -->
          <div class="preset-group">
            <div class="preset-header">
              <span class="preset-title">有效状态预设</span>
              <div class="preset-add">
                <el-input v-model="newStatus" placeholder="输入新状态" size="small" style="width: 120px;" @keyup.enter="addConfig('status', newStatus)" />
                <el-button type="primary" size="small" @click="addConfig('status', newStatus)">添加</el-button>
              </div>
            </div>
            <div class="preset-tags">
              <el-tag
                v-for="item in configData.statusConfigs"
                :key="item.id"
                closable
                class="preset-tag"
                @close="deleteConfig(item.id)"
              >
                {{ getStatusLabel(item.configValue) }}
              </el-tag>
              <span v-if="configData.statusConfigs.length === 0" class="empty-hint">暂无配置，请添加</span>
            </div>
          </div>

          <!-- 系数预设 -->
          <div class="preset-group">
            <div class="preset-header">
              <span class="preset-title">系数预设</span>
              <div class="preset-add">
                <el-input v-model="newCoefficient" placeholder="输入系数" size="small" style="width: 120px;" type="number" step="0.1" @keyup.enter="addConfig('coefficient', newCoefficient)" />
                <el-button type="primary" size="small" @click="addConfig('coefficient', newCoefficient)">添加</el-button>
              </div>
            </div>
            <div class="preset-tags">
              <el-tag
                v-for="item in configData.coefficientConfigs"
                :key="item.id"
                closable
                class="preset-tag"
                type="success"
                @close="deleteConfig(item.id)"
              >
                {{ item.configValue }}
              </el-tag>
              <span v-if="configData.coefficientConfigs.length === 0" class="empty-hint">暂无配置，请添加</span>
            </div>
          </div>

          <!-- 备注预设 -->
          <div class="preset-group">
            <div class="preset-header">
              <span class="preset-title">备注预设</span>
              <div class="preset-add">
                <el-input v-model="newRemark" placeholder="输入备注" size="small" style="width: 120px;" @keyup.enter="addConfig('remark', newRemark)" />
                <el-button type="primary" size="small" @click="addConfig('remark', newRemark)">添加</el-button>
              </div>
            </div>
            <div class="preset-tags">
              <el-tag
                v-for="item in configData.remarkConfigs"
                :key="item.id"
                closable
                class="preset-tag"
                type="warning"
                @close="deleteConfig(item.id)"
              >
                {{ getRemarkLabel(item.configValue) }}
              </el-tag>
              <span v-if="configData.remarkConfigs.length === 0" class="empty-hint">暂无配置，请添加</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 计提阶梯 -->
      <el-tab-pane label="计提阶梯" name="ladder">
        <div class="ladder-section">
          <div class="ladder-tip">
            <el-alert type="info" :closable="false" show-icon>
              <template #title>
                每个阶梯可设置适用部门，未设置部门的阶梯为全局默认配置
              </template>
            </el-alert>
          </div>

          <!-- 按业绩金额 -->
          <div class="ladder-group">
            <div class="ladder-group-header">
              <div class="ladder-title-wrap">
                <span class="ladder-group-title">按签收业绩计提</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 280px; line-height: 1.6;">
                      1. 先统计成员在时间范围内的签收业绩总金额<br>
                      2. 根据总金额匹配对应的阶梯比例<br>
                      3. 每个订单佣金 = 订单金额 × 系数 × 阶梯比例
                    </div>
                  </template>
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-button type="primary" size="small" @click="addAmountLadder">+ 添加阶梯</el-button>
            </div>
            <div class="ladder-list">
              <div v-for="(item, index) in configData.amountLadders" :key="item.id" class="ladder-item">
                <span class="ladder-index">{{ index + 1 }}</span>
                <div class="ladder-field">
                  <el-input-number v-model="item.minValue" :min="0" size="small" placeholder="起点" controls-position="right" />
                </div>
                <span class="ladder-sep">~</span>
                <div class="ladder-field">
                  <el-input-number v-model="item.maxValue" :min="0" size="small" placeholder="无上限" controls-position="right" />
                </div>
                <span class="ladder-unit-fixed">元</span>
                <span class="ladder-sep">→</span>
                <div class="ladder-field rate-field">
                  <el-input-number v-model="item.commissionRate" :min="0" :max="1" :step="0.01" :precision="4" size="small" controls-position="right" />
                </div>
                <span class="ladder-unit-fixed">({{ ((item.commissionRate || 0) * 100).toFixed(2) }}%)</span>
                <div class="ladder-field dept-field">
                  <el-select v-model="item.departmentId" placeholder="适用部门" size="small" clearable @change="(val: string) => onDepartmentChange(item, val)">
                    <el-option label="全局" value="" />
                    <el-option
                      v-for="dept in availableAmountDepts"
                      :key="dept.id"
                      :label="dept.name"
                      :value="dept.id"
                    />
                  </el-select>
                </div>
                <div class="ladder-actions">
                  <el-button type="primary" size="small" link @click="updateLadder(item)">保存</el-button>
                  <el-button type="danger" size="small" link @click="deleteLadder(item.id)">删除</el-button>
                </div>
              </div>
              <div v-if="configData.amountLadders.length === 0" class="empty-hint">暂无阶梯配置</div>
            </div>
          </div>

          <!-- 按签收单数 -->
          <div class="ladder-group">
            <div class="ladder-group-header">
              <div class="ladder-title-wrap">
                <span class="ladder-group-title">按签收单数计提</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 280px; line-height: 1.6;">
                      1. 先统计成员在时间范围内的签收订单数量（按系数累加）<br>
                      2. 根据总数量匹配对应的阶梯单价<br>
                      3. 每个订单佣金 = 系数 × 阶梯单价
                    </div>
                  </template>
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-button type="primary" size="small" @click="addCountLadder">+ 添加阶梯</el-button>
            </div>
            <div class="ladder-list">
              <div v-for="(item, index) in configData.countLadders" :key="item.id" class="ladder-item">
                <span class="ladder-index">{{ index + 1 }}</span>
                <div class="ladder-field">
                  <el-input-number v-model="item.minValue" :min="0" size="small" placeholder="起点" controls-position="right" />
                </div>
                <span class="ladder-sep">~</span>
                <div class="ladder-field">
                  <el-input-number v-model="item.maxValue" :min="0" size="small" placeholder="无上限" controls-position="right" />
                </div>
                <span class="ladder-unit-fixed">单</span>
                <span class="ladder-sep">→</span>
                <div class="ladder-field rate-field">
                  <el-input-number v-model="item.commissionPerUnit" :min="0" size="small" controls-position="right" />
                </div>
                <span class="ladder-unit-fixed">元/单</span>
                <div class="ladder-field dept-field">
                  <el-select v-model="item.departmentId" placeholder="适用部门" size="small" clearable @change="(val: string) => onDepartmentChange(item, val)">
                    <el-option label="全局" value="" />
                    <el-option
                      v-for="dept in availableCountDepts"
                      :key="dept.id"
                      :label="dept.name"
                      :value="dept.id"
                    />
                  </el-select>
                </div>
                <div class="ladder-actions">
                  <el-button type="primary" size="small" link @click="updateLadder(item)">保存</el-button>
                  <el-button type="danger" size="small" link @click="deleteLadder(item.id)">删除</el-button>
                </div>
              </div>
              <div v-if="configData.countLadders.length === 0" class="empty-hint">暂无阶梯配置</div>
            </div>
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
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { financeApi, type FinanceConfigData, type CommissionLadder } from '@/api/finance'
import { useDepartmentStore } from '@/stores/department'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'saved'): void
}>()

const departmentStore = useDepartmentStore()
const departments = computed(() => departmentStore.departments)

const dialogVisible = ref(false)
const activeTab = ref('preset')

const configData = reactive<FinanceConfigData>({
  statusConfigs: [],
  coefficientConfigs: [],
  remarkConfigs: [],
  amountLadders: [],
  countLadders: [],
  settings: {}
})

const newStatus = ref('')
const newCoefficient = ref('')
const newRemark = ref('')

// 状态中文映射
const statusLabelMap: Record<string, string> = {
  pending: '待处理',
  valid: '有效',
  invalid: '无效'
}

// 备注中文映射
const remarkLabelMap: Record<string, string> = {
  normal: '正常',
  return: '退货',
  refund: '退款'
}

const getStatusLabel = (value: string) => statusLabelMap[value] || value
const getRemarkLabel = (value: string) => remarkLabelMap[value] || value

// 获取已在"按业绩"中使用的部门ID列表
const usedAmountDeptIds = computed(() => {
  return configData.amountLadders
    .filter(l => l.departmentId)
    .map(l => l.departmentId)
})

// 获取已在"按单数"中使用的部门ID列表
const usedCountDeptIds = computed(() => {
  return configData.countLadders
    .filter(l => l.departmentId)
    .map(l => l.departmentId)
})

// 获取"按业绩"可选的部门（排除已在"按单数"中使用的部门）
const availableAmountDepts = computed(() => {
  return departments.value.filter((d: any) => !usedCountDeptIds.value.includes(d.id))
})

// 获取"按单数"可选的部门（排除已在"按业绩"中使用的部门）
const availableCountDepts = computed(() => {
  return departments.value.filter((d: any) => !usedAmountDeptIds.value.includes(d.id))
})

onMounted(() => {
  departmentStore.fetchDepartments()
})

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) loadConfig()
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

const loadConfig = async () => {
  try {
    const res = (await financeApi.getConfig()) as any
    if (res && typeof res === 'object') {
      if (res.statusConfigs) {
        Object.assign(configData, res)
      } else if (res.data && res.data.statusConfigs) {
        Object.assign(configData, res.data)
      }
    }
  } catch (e) {
    console.error('加载配置失败:', e)
    ElMessage.error('加载配置失败')
  }
}

const addConfig = async (type: string, value: string) => {
  if (!value?.trim()) {
    ElMessage.warning('请输入内容')
    return
  }
  try {
    let label = value.trim()
    if (type === 'status') label = statusLabelMap[value.trim()] || value.trim()
    else if (type === 'remark') label = remarkLabelMap[value.trim()] || value.trim()

    await financeApi.addConfig({ configType: type, configValue: value.trim(), configLabel: label })
    ElMessage.success('添加成功')
    if (type === 'status') newStatus.value = ''
    if (type === 'coefficient') newCoefficient.value = ''
    if (type === 'remark') newRemark.value = ''
    setTimeout(() => loadConfig(), 100)
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

const deleteConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除此配置项？', '提示', { type: 'warning' })
  } catch { return }
  try {
    await financeApi.deleteConfig(id)
    ElMessage.success('删除成功')
    setTimeout(() => loadConfig(), 100)
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// 部门选择变化时更新部门名称
const onDepartmentChange = (item: CommissionLadder, deptId: string) => {
  if (deptId) {
    const dept = departments.value.find((d: any) => d.id === deptId)
    item.departmentName = dept?.name || ''
  } else {
    item.departmentName = ''
  }
}

const addAmountLadder = async () => {
  try {
    const last = configData.amountLadders[configData.amountLadders.length - 1]
    await financeApi.addLadder({
      commissionType: 'amount',
      minValue: last?.maxValue || 0,
      commissionRate: 0.03
    })
    ElMessage.success('添加成功')
    setTimeout(() => loadConfig(), 100)
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

const addCountLadder = async () => {
  try {
    const last = configData.countLadders[configData.countLadders.length - 1]
    await financeApi.addLadder({
      commissionType: 'count',
      minValue: last?.maxValue || 0,
      commissionPerUnit: 30
    })
    ElMessage.success('添加成功')
    setTimeout(() => loadConfig(), 100)
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

const updateLadder = async (ladder: CommissionLadder) => {
  try {
    await financeApi.updateLadder(ladder.id, {
      minValue: ladder.minValue,
      maxValue: ladder.maxValue,
      commissionRate: ladder.commissionRate,
      commissionPerUnit: ladder.commissionPerUnit,
      departmentId: ladder.departmentId || '',
      departmentName: ladder.departmentName || ''
    })
    ElMessage.success('保存成功')
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

const deleteLadder = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除此阶梯？', '提示', { type: 'warning' })
  } catch { return }
  try {
    await financeApi.deleteLadder(id)
    ElMessage.success('删除成功')
    setTimeout(() => loadConfig(), 100)
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.preset-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-group {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 16px;
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.preset-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.preset-add {
  display: flex;
  gap: 8px;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  align-items: center;
}

.preset-tag {
  font-size: 13px;
}

.empty-hint {
  color: #909399;
  font-size: 13px;
}

.ladder-section {
  padding: 10px 0;
}

.ladder-tip {
  margin-bottom: 16px;
}

.ladder-group {
  margin-bottom: 20px;
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.ladder-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ladder-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ladder-group-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.info-icon {
  color: #909399;
  cursor: help;
  font-size: 16px;
}

.info-icon:hover {
  color: #409eff;
}

.ladder-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ladder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.ladder-index {
  width: 24px;
  height: 24px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.ladder-field {
  flex: 1;
  min-width: 80px;
}

.ladder-field :deep(.el-input-number) {
  width: 100%;
}

.ladder-field :deep(.el-select) {
  width: 100%;
}

.ladder-field.rate-field {
  flex: 0.8;
  min-width: 70px;
}

.ladder-field.dept-field {
  flex: 1.2;
  min-width: 100px;
}

.ladder-sep {
  color: #909399;
  flex-shrink: 0;
}

.ladder-unit-fixed {
  color: #606266;
  font-size: 12px;
  flex-shrink: 0;
  white-space: nowrap;
}

.ladder-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.ladder-unit {
  color: #909399;
  font-size: 12px;
}
</style>
