<template>
  <div class="second-row">
    <el-card class="stats-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><DataAnalysis /></el-icon>
            客户统计
          </span>
        </div>
      </template>
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <div class="stat-item consumption">
            <div class="stat-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">¥{{ customerStats.totalConsumption.toLocaleString() }}</div>
              <div class="stat-label">累计消费</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item orders">
            <div class="stat-icon">
              <el-icon><ShoppingBag /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ customerStats.orderCount }}</div>
              <div class="stat-label">订单数量</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item returns">
            <div class="stat-icon">
              <el-icon><RefreshLeft /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ customerStats.returnCount }}</div>
              <div class="stat-label">退货次数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item last-order">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ customerStats.lastOrderDate || '暂无' }}</div>
              <div class="stat-label">最后下单</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { DataAnalysis, Money, ShoppingBag, RefreshLeft, Clock } from '@element-plus/icons-vue'

defineProps<{
  customerStats: {
    totalConsumption: number
    orderCount: number
    returnCount: number
    lastOrderDate: string
  }
}>()
</script>

<style scoped>
.second-row { margin-bottom: 20px; }
.stats-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e8ecf1;
  transition: all 0.3s ease;
}
.stats-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e8ecf1;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  color: #495057;
}
.card-title .el-icon { font-size: 18px; color: #667eea; }
.stats-row { padding: 0; background: transparent; margin-bottom: 0; }
.stat-item {
  position: relative;
  padding: 24px 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 130px;
}
.stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--stat-color);
  transition: height 0.3s ease;
}
.stat-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #e2e8f0;
}
.stat-item:hover::before { height: 4px; }
.stat-item.consumption { --stat-color: #3b82f6; }
.stat-item.orders { --stat-color: #3b82f6; }
.stat-item.returns { --stat-color: #3b82f6; }
.stat-item.last-order { --stat-color: #3b82f6; }
.stat-icon {
  font-size: 32px;
  margin-bottom: 12px;
  display: block;
  color: #3b82f6;
  opacity: 0.85;
}
.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
  letter-spacing: -0.5px;
}
.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.3px;
}

@media (max-width: 768px) {
  .stat-item { padding: 20px 12px; min-height: 110px; }
  .stat-value { font-size: 22px; }
  .stat-icon { font-size: 26px; }
}
</style>
