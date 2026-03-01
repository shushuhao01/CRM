# ValueAddedManage.vue 更新指南

## 需要手动修改的部分

由于文件较大,请按以下步骤手动修改 `src/views/Finance/ValueAddedManage.vue` 文件:

### 1. 在 `<script setup>` 部分的 import 语句中添加:

```typescript
import ValueAddedConfigDialog from './components/ValueAddedConfigDialog.vue'
import TrackingDialog from '@/components/Logistics/TrackingDialog.vue'
```

### 2. 在标签页操作按钮区域,在"外包公司管理"按钮前添加:

找到这段代码:
```vue
<div class="tabs-actions">
  <el-button type="success" :icon="Plus" @click="showCompanyDialog">外包公司管理</el-button>
```

改为:
```vue
<div class="tabs-actions">
  <el-button type="info" :icon="Setting" @click="showStatusConfigDialog">状态配置</el-button>
  <el-button type="success" :icon="Plus" @click="showCompanyDialog">外包公司管理</el-button>
```

### 3. 修改筛选器中的"状态"字段为"有效状态":

找到:
```vue
<el-select v-model="statusFilter" placeholder="状态" clearable @change="handleSearch" class="filter-item">
```

改为:
```vue
<el-select v-model="statusFilter" placeholder="有效状态" clearable @change="handleSearch" class="filter-item">
```

### 4. 修改表格列名称"状态"为"有效状态":

找到:
```vue
<el-table-column prop="status" label="状态" width="120">
```

改为:
```vue
<el-table-column prop="status" label="有效状态" width="120">
```

### 5. 修改物流单号列,添加超链接:

找到:
```vue
<el-table-column prop="trackingNumber" label="物流单号" min-width="140" />
```

改为:
```vue
<el-table-column prop="trackingNumber" label="物流单号" min-width="140">
  <template #default="{ row }">
    <el-link 
      v-if="row.trackingNumber" 
      type="primary" 
      @click="showTrackingDialog(row)"
    >
      {{ row.trackingNumber }}
    </el-link>
    <span v-else>-</span>
  </template>
</el-table-column>
```

### 6. 在所有弹窗后面添加状态配置弹窗和物流弹窗:

在 `</template>` 标签前添加:
```vue
    <!-- 状态配置弹窗 -->
    <ValueAddedConfigDialog 
      v-model:visible="statusConfigDialogVisible" 
      @saved="loadStatusConfigs" 
    />

    <!-- 物流详情弹窗 -->
    <TrackingDialog 
      v-model="trackingDialogVisible" 
      :tracking-no="currentTrackingNo" 
      :company="currentExpressCompany" 
      :phone="currentPhone" 
    />
  </div>
</template>
```

### 7. 在 `<script setup>` 中添加响应式数据:

在其他 ref 定义后添加:
```typescript
// 状态配置弹窗
const statusConfigDialogVisible = ref(false)

// 物流弹窗
const trackingDialogVisible = ref(false)
const currentTrackingNo = ref('')
const currentExpressCompany = ref('')
const currentPhone = ref('')
```

### 8. 添加方法:

在其他方法后添加:
```typescript
// 显示状态配置弹窗
const showStatusConfigDialog = () => {
  statusConfigDialogVisible.value = true
}

// 显示物流详情弹窗
const showTrackingDialog = (row: ValueAddedOrder) => {
  currentTrackingNo.value = row.trackingNumber || ''
  currentExpressCompany.value = row.expressCompany || ''
  currentPhone.value = row.customerPhone || ''
  trackingDialogVisible.value = true
}

// 加载状态配置
const loadStatusConfigs = () => {
  // 重新加载数据以应用新的状态配置
  handleSearch()
}
```

### 9. 确认 formatMoney 函数返回两位小数:

检查 formatMoney 函数:
```typescript
const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)
```

### 10. 确认实际结算价格列已经有正确的样式:

检查这一列是否已经有 font-weight: 600:
```vue
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
```

## 完成后的测试步骤

1. 启动前端和后端服务器
2. 在MySQL数据库中执行迁移脚本: `backend/database-migrations/create-value-added-status-configs.sql`
3. 访问增值管理页面
4. 点击"状态配置"按钮,测试添加/删除状态
5. 检查列表中的字段名称是否正确
6. 检查实际结算价格是否有两位小数、加粗、颜色
7. 点击物流单号,测试物流详情弹窗

## 注意事项

- 确保所有导入的组件路径正确
- 确保 ValueAddedOrder 类型包含 expressCompany 字段
- 如果物流单号为空,显示"-"
- 实际结算价格的颜色根据订单状态动态变化
