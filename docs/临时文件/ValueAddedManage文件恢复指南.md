# ValueAddedManage.vue 文件恢复指南

## 问题说明
由于文件操作失误,ValueAddedManage.vue文件被删除。现在需要恢复完整的文件内容。

## 临时解决方案
已创建一个最小版本的文件,页面可以打开但功能不完整。

## 恢复方法

### 方法1: 从版本控制恢复(推荐)
如果你使用了git或其他版本控制:
```bash
# 查看文件历史
git log --all --full-history -- src/views/Finance/ValueAddedManage.vue

# 恢复到之前的版本
git checkout <commit-hash> -- src/views/Finance/ValueAddedManage.vue
```

### 方法2: 从备份恢复
检查是否有以下备份:
- IDE自动备份 (VSCode: .vscode/backup)
- 系统备份
- 云同步备份

### 方法3: 参考其他页面重新创建
可以参考以下相似页面的结构:
- `src/views/Finance/CodCollection.vue` - 代收管理(列表、筛选、批量操作)
- `src/views/Finance/PerformanceManage.vue` - 绩效管理(配置弹窗)

## 完整文件结构参考

基于之前的实现,ValueAddedManage.vue应该包含以下部分:

### 1. Template部分
```vue
<template>
  <div class="value-added-manage-page">
    <!-- 汇总卡片 -->
    <div class="stats-cards">...</div>
    
    <!-- 快捷日期筛选 -->
    <div class="quick-date-filters">...</div>
    
    <!-- 筛选器 -->
    <div class="filter-bar">...</div>
    
    <!-- 标签页选项卡 -->
    <div class="tabs-section">
      <div class="tabs-header">
        <el-tabs>...</el-tabs>
        <div class="tabs-actions">
          <!-- 新增:状态配置按钮 -->
          <el-button type="info" :icon="Setting" @click="showStatusConfigDialog">状态配置</el-button>
          <el-button type="success" :icon="Plus" @click="showCompanyDialog">外包公司管理</el-button>
          <el-button type="warning" :icon="Setting" @click="showPriceConfigDialog">费用配置</el-button>
          <el-button type="primary" :icon="Download" @click="handleBatchExport">批量导出</el-button>
        </div>
      </div>
    </div>
    
    <!-- 批量操作栏 -->
    <div class="batch-actions" v-if="selectedIds.length > 0">...</div>
    
    <!-- 数据列表 -->
    <el-table>
      <!-- 物流单号列 - 添加超链接 -->
      <el-table-column prop="trackingNumber" label="物流单号" min-width="140">
        <template #default="{ row }">
          <el-link v-if="row.trackingNumber" type="primary" @click="showTrackingDialog(row)">
            {{ row.trackingNumber }}
          </el-link>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <!-- 有效状态列 - 修改label -->
      <el-table-column prop="status" label="有效状态" width="120">...</el-table-column>
      
      <!-- 实际结算列 - 加粗、颜色、两位小数 -->
      <el-table-column prop="settlementAmount" label="实际结算" width="110" align="right">
        <template #default="{ row }">
          <span v-if="row.status === 'valid'" style="color: #67c23a; font-weight: 600;">
            ¥{{ formatMoney(row.settlementAmount) }}
          </span>
          <span v-else-if="row.status === 'invalid'" style="color: #f56c6c; font-weight: 600;">
            ¥0.00
          </span>
          <span v-else-if="row.settlementStatus === 'settled'" style="color: #409eff; font-weight: 600;">
            ¥{{ formatMoney(row.settlementAmount) }}
          </span>
          <span v-else style="color: #909399; font-weight: 600;">-</span>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination-wrapper">...</div>
    
    <!-- 各种弹窗 -->
    <el-dialog>...</el-dialog>
    
    <!-- 新增:状态配置弹窗 -->
    <ValueAddedConfigDialog 
      v-model:visible="statusConfigDialogVisible" 
      @saved="loadStatusConfigs" 
    />
    
    <!-- 新增:物流详情弹窗 -->
    <TrackingDialog 
      v-model="trackingDialogVisible" 
      :tracking-no="currentTrackingNo" 
      :company="currentExpressCompany" 
      :phone="currentPhone" 
    />
  </div>
</template>
```

### 2. Script部分
```typescript
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Setting, Document, CircleCheck, CircleClose, Clock, Money, Download, Refresh } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'
import {
  getValueAddedOrders,
  getValueAddedStats,
  batchProcessOrders,
  getOutsourceCompanies,
  createOutsourceCompany,
  updateOutsourceCompany,
  getPriceConfigs,
  createPriceConfig,
  updatePriceConfig,
  type ValueAddedOrder,
  type ValueAddedStats,
  type OutsourceCompany,
  type PriceConfig
} from '@/api/valueAdded'
// 新增导入
import ValueAddedConfigDialog from './components/ValueAddedConfigDialog.vue'
import TrackingDialog from '@/components/Logistics/TrackingDialog.vue'

defineOptions({ name: 'ValueAddedManage' })

// 所有响应式数据...
const stats = ref<ValueAddedStats>({...})
const activeTab = ref('pending')
// ... 其他数据

// 新增:状态配置弹窗
const statusConfigDialogVisible = ref(false)

// 新增:物流弹窗
const trackingDialogVisible = ref(false)
const currentTrackingNo = ref('')
const currentExpressCompany = ref('')
const currentPhone = ref('')

// 工具函数
const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)
const formatDate = (date: string) => date ? date.substring(0, 10) : '-'

// 所有方法...

// 新增:显示状态配置弹窗
const showStatusConfigDialog = () => {
  statusConfigDialogVisible.value = true
}

// 新增:显示物流详情弹窗
const showTrackingDialog = (row: ValueAddedOrder) => {
  currentTrackingNo.value = row.trackingNumber || ''
  currentExpressCompany.value = row.expressCompany || ''
  currentPhone.value = row.customerPhone || ''
  trackingDialogVisible.value = true
}

// 新增:加载状态配置
const loadStatusConfigs = () => {
  handleSearch()
}

// 生命周期
onMounted(() => {
  loadCompanies()
  handleQuickDateFilter('thisMonth')
})
</script>
```

### 3. Style部分
```vue
<style scoped>
.value-added-manage-page {
  padding: 20px;
  background: #f5f7fa;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* ... 更多样式 */
</style>
```

## 快速恢复步骤

1. 如果有git历史,使用方法1恢复
2. 如果没有,可以:
   - 复制CodCollection.vue的结构
   - 根据上面的参考修改
   - 添加新功能(状态配置、物流弹窗)

## 关键功能清单

确保恢复后的文件包含:
- [ ] 汇总卡片(5个)
- [ ] 快捷日期筛选
- [ ] 筛选器(批量搜索、外包公司、有效状态、结算状态)
- [ ] 标签页(全部、待处理、有效、无效)
- [ ] 操作按钮(状态配置、外包公司管理、费用配置、批量导出)
- [ ] 数据表格(包含物流单号超链接)
- [ ] 分页控件
- [ ] 外包公司管理弹窗
- [ ] 费用配置弹窗
- [ ] 状态配置弹窗(新增)
- [ ] 物流详情弹窗(新增)

## 需要帮助?

如果无法恢复,可以:
1. 提供错误信息
2. 说明是否有备份
3. 我可以帮你重新创建完整文件

## 临时方案

当前已创建最小版本,页面可以打开。你可以:
1. 先使用其他功能
2. 找到备份后替换
3. 或者让我帮你重新创建完整版本
