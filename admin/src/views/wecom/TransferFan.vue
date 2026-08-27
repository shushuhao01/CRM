<template>
  <div class="page-container">
    <el-tabs v-model="activeTab" class="convert-tabs">
      <!-- ==================== Tab 1 代办工单 ==================== -->
      <el-tab-pane label="代办工单" name="orders">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>服务商代办工单</span>
              <div class="header-actions">
                <el-input v-model="orderQuery.keyword" placeholder="搜索工单号/租户ID/跟进人" clearable style="width: 220px" @keyup.enter="fetchOrders" @clear="fetchOrders" />
                <el-select v-model="orderQuery.status" placeholder="状态" clearable style="width: 140px" @change="fetchOrders">
                  <el-option label="全部" value="" />
                  <el-option label="待支付" value="pending" />
                  <el-option label="已支付·待执行" value="paid" />
                  <el-option label="已发起" value="submitted" />
                  <el-option label="部分成功" value="partial" />
                  <el-option label="全部成功" value="success" />
                  <el-option label="有客户拒绝" value="rejected" />
                  <el-option label="失败" value="failed" />
                  <el-option label="已关闭" value="closed" />
                </el-select>
                <el-button type="primary" @click="fetchOrders">搜索</el-button>
              </div>
            </div>
          </template>

          <el-table :data="orders" v-loading="ordersLoading" stripe>
            <el-table-column prop="orderNo" label="工单号" width="180" show-overflow-tooltip />
            <el-table-column label="租户" min-width="130">
              <template #default="{ row }">
                <div class="cell-two-line">
                  <span class="strong">{{ row.tenantName || '-' }}</span>
                  <span class="sub">{{ row.tenantId }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="转接类型" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.transferType === 'resigned' ? 'danger' : 'primary'" size="small" effect="plain">
                  {{ row.transferType === 'resigned' ? '离职转接' : '在职转接' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="计费" min-width="150">
              <template #default="{ row }">
                <span v-if="billingLabel(row)" class="strong">{{ billingLabel(row) }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="客户数" width="80" align="center">
              <template #default="{ row }">{{ row.customerCount }}</template>
            </el-table-column>
            <el-table-column label="原跟进人" width="110">
              <template #default="{ row }">{{ row.handoverName || row.handoverUserid }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="租户备注" min-width="130" show-overflow-tooltip>
              <template #default="{ row }">{{ row.agentRemark || '-' }}</template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button v-if="['pending', 'paid'].includes(row.status)" link type="success" size="small"
                  @click="openExecFromOrder(row)">执行</el-button>
                <el-button v-if="['pending', 'paid'].includes(row.status)"
                  v-permission="'wecom-management:convert-fan:execute'"
                  link type="danger" size="small" @click="rejectOrder(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pager">
            <el-pagination v-model:current-page="orderQuery.page" v-model:page-size="orderQuery.pageSize"
              :total="orderTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
              @size-change="fetchOrders" @current-change="fetchOrders" />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ==================== Tab 2 直接代转 ==================== -->
      <el-tab-pane label="直接代转" name="direct">
        <el-card shadow="never" header="代执行转粉（自动按每批 ≤100 个客户分批调用企业微信官方接口）">
          <el-form label-width="90px" style="max-width: 720px">
            <el-form-item label="目标租户" required>
              <el-select v-model="direct.tenantId" filterable remote :remote-method="searchTenants"
                placeholder="输入关键字搜索租户" style="width: 320px" @change="onDirectTenantChange">
                <el-option v-for="t in tenantOptions" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="企微配置" required>
              <el-select v-model="direct.configId" placeholder="选择该租户的企微配置" style="width: 320px"
                :loading="direct.configsLoading" :disabled="!direct.tenantId" @change="direct.configId && openExecDialog()">
                <el-option v-for="c in direct.configs" :key="c.id"
                  :label="`${c.name}（${c.corpId}）${c.thirdParty ? ' · 第三方' : ''}`" :value="c.id" />
              </el-select>
            </el-form-item>
            <el-alert v-if="direct.tenantId && direct.configs.length === 0 && !direct.configsLoading"
              title="该租户暂无启用的企业微信配置，请先在 CRM 端完成授权" type="warning" :closable="false" style="margin-left: 90px; max-width: 630px" />
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- ==================== Tab 3 转接记录 ==================== -->
      <el-tab-pane label="转接记录" name="records">
        <el-row :gutter="16" style="margin-bottom: 16px">
          <el-col :span="6" v-for="stat in recordStats" :key="stat.label">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-num" :style="{ color: stat.color }">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>全租户转接记录</span>
              <div class="header-actions">
                <el-input v-model="recordQuery.keyword" placeholder="订单号/租户ID" clearable style="width: 200px" @keyup.enter="fetchRecords" @clear="fetchRecords" />
                <el-select v-model="recordQuery.mode" placeholder="模式" clearable style="width: 110px" @change="fetchRecords">
                  <el-option label="全部模式" value="" />
                  <el-option label="服务商代办" value="agent" />
                  <el-option label="自助套餐" value="self" />
                </el-select>
                <el-select v-model="recordQuery.status" placeholder="状态" clearable style="width: 130px" @change="fetchRecords">
                  <el-option label="全部状态" value="" />
                  <el-option label="已发起" value="submitted" />
                  <el-option label="部分成功" value="partial" />
                  <el-option label="全部成功" value="success" />
                  <el-option label="有客户拒绝" value="rejected" />
                  <el-option label="失败" value="failed" />
                  <el-option label="已关闭" value="closed" />
                </el-select>
                <el-button type="primary" @click="fetchRecords">搜索</el-button>
              </div>
            </div>
          </template>

          <el-table :data="records" v-loading="recordsLoading" stripe>
            <el-table-column prop="orderNo" label="订单号" width="175" show-overflow-tooltip />
            <el-table-column label="租户" min-width="120">
              <template #default="{ row }">{{ row.tenantName || row.tenantId }}</template>
            </el-table-column>
            <el-table-column label="模式" width="95" align="center">
              <template #default="{ row }">
                <el-tag :type="row.mode === 'agent' ? 'warning' : 'success'" size="small" effect="plain">
                  {{ row.mode === 'agent' ? '代办' : '自助' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="90" align="center">
              <template #default="{ row }">
                <span>{{ row.transferType === 'resigned' ? '离职' : '在职' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="原跟进 → 接替人" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.handoverName || row.handoverUserid }} → {{ row.takeoverName || row.takeoverUserid }}
              </template>
            </el-table-column>
            <el-table-column label="客户数" width="95" align="center">
              <template #default="{ row }">
                <span v-if="row.successCount > 0" style="color: #67c23a; font-weight: 600">{{ row.successCount }}</span>
                <span v-else>{{ row.customerCount }}</span>
                <span style="color: #909399"> / {{ row.customerCount }}</span>
              </template>
            </el-table-column>
            <el-table-column label="批次" width="65" align="center">
              <template #default="{ row }">{{ row.batchCount || '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="115" align="center">
              <template #default="{ row }">
                <el-tooltip v-if="row.counts" :content="countsTip(row.counts)" placement="top">
                  <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
                </el-tooltip>
                <el-tag v-else :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作人" width="100">
              <template #default="{ row }">{{ row.operatorName || '-' }}</template>
            </el-table-column>
            <el-table-column label="发起时间" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="135" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewRecord(row)">明细</el-button>
                <el-button v-if="row.status === 'submitted'" link type="success" size="small"
                  @click="syncRecord(row)">同步</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pager">
            <el-pagination v-model:current-page="recordQuery.page" v-model:page-size="recordQuery.pageSize"
              :total="recordTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
              @size-change="fetchRecords" @current-change="fetchRecords" />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ==================== Tab 4 权益台账 ==================== -->
      <el-tab-pane label="权益台账" name="permissions">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>自助套餐权益台账</span>
              <div class="header-actions">
                <el-input v-model="permQuery.keyword" placeholder="租户ID/套餐" clearable style="width: 200px"
                  @keyup.enter="fetchPermissions" @clear="fetchPermissions" />
                <el-button type="primary" @click="fetchPermissions">搜索</el-button>
                <el-button type="success" @click="openGrantDialog">手动开通</el-button>
              </div>
            </div>
          </template>

          <el-table :data="permissions" v-loading="permsLoading" stripe>
            <el-table-column prop="tenantName" label="租户" min-width="150">
              <template #default="{ row }">
                <div class="cell-two-line">
                  <span class="strong">{{ row.tenantName || '-' }}</span>
                  <span class="sub">{{ row.tenantId }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="套餐" width="150">
              <template #default="{ row }">{{ row.planName || planLabel(row.planId) }}</template>
            </el-table-column>
            <el-table-column label="开始时间" width="165">
              <template #default="{ row }">{{ formatDate(row.startDate) }}</template>
            </el-table-column>
            <el-table-column label="到期时间" width="190">
              <template #default="{ row }">
                <span :style="{ color: remainDays(row.endDate) <= 7 ? '#e6a23c' : '' }">{{ formatDate(row.endDate) }}</span>
                <span v-if="remainDays(row.endDate) >= 0" style="font-size: 12px; color: #909399; margin-left: 6px">
                  余{{ remainDays(row.endDate) }}天
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="remainDays(row.endDate) >= 0 ? 'success' : 'danger'" size="small">
                  {{ remainDays(row.endDate) >= 0 ? '生效中' : '已过期' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="关联订单" min-width="170" show-overflow-tooltip>
              <template #default="{ row }">{{ row.orderNo || '-' }}</template>
            </el-table-column>
          </el-table>
          <div class="pager">
            <el-pagination v-model:current-page="permQuery.page" v-model:page-size="permQuery.pageSize"
              :total="permTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
              @size-change="fetchPermissions" @current-change="fetchPermissions" />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- ==================== 执行转粉弹窗 ==================== -->
    <el-dialog v-model="execVisible" :title="execTitle" width="880px" destroy-on-close :close-on-click-modal="false">
      <!-- 基本信息 -->
      <div class="exec-meta">
        <template v-if="execSource === 'order'">
          <el-descriptions :column="3" size="small" border>
            <el-descriptions-item label="工单号">{{ execOrder.orderNo }}</el-descriptions-item>
            <el-descriptions-item label="租户">{{ execOrder.tenantName || execOrder.tenantId }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ execOrder.transferType === 'resigned' ? '离职转接' : '在职转接' }}</el-descriptions-item>
          </el-descriptions>
        </template>
        <el-form label-width="86px" style="margin-top: 12px">
          <el-form-item label="企微配置" required>
            <el-select v-model="execForm.configId" placeholder="选择企微应用配置" style="width: 300px" :loading="execMetaLoading">
              <el-option v-for="c in execConfigs" :key="c.id"
                :label="`${c.name}（${c.corpId}）${c.thirdParty ? ' · 第三方' : ''}`" :value="c.id" />
            </el-select>
            <el-tag v-if="execOrder?.orderNo" type="warning" size="small" effect="plain" style="margin-left: 10px">关联工单执行</el-tag>
          </el-form-item>
          <el-form-item label="转接类型" required>
            <el-radio-group v-model="execForm.transferType" @change="onExecTypeChange">
              <el-radio-button value="resigned">离职转接</el-radio-button>
              <el-radio-button value="active">在职转接</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 三栏选择 -->
      <div class="exec-layout" v-if="execForm.configId">
        <!-- 左：原跟进成员 -->
        <div class="exec-panel">
          <div class="panel-title">
            {{ execForm.transferType === 'resigned' ? '离职待分配号' : '原跟进成员' }}
            <span class="panel-count">{{ handoverList.length }}</span>
          </div>
          <el-scrollbar height="300px" v-loading="handoverLoading">
            <div v-for="u in handoverList" :key="u.userid" class="pick-item"
              :class="{ active: execForm.handoverUserid === u.userid }" @click="selectHandover(u)">
              <span class="pick-name">{{ u.name }}</span>
              <span v-if="execForm.transferType === 'resigned'" class="pick-meta">{{ u.customerCount }} 客户</span>
            </div>
            <el-empty v-if="handoverList.length === 0 && !handoverLoading" description="无数据" :image-size="48" />
          </el-scrollbar>
        </div>

        <!-- 中：客户多选 -->
        <div class="exec-panel panel-wide">
          <div class="panel-title">
            名下客户
            <span class="panel-count">{{ execCustomers.length }}</span>
            <div class="panel-actions">
              <el-checkbox :model-value="allSelected" :indeterminate="partSelected"
                :disabled="execCustomers.length === 0" @change="toggleAllCustomers">全选</el-checkbox>
            </div>
          </div>
          <el-scrollbar height="300px" v-loading="customersLoading">
            <el-checkbox-group v-model="execForm.selectedCustomers">
              <div v-for="c in execCustomers" :key="c" class="pick-item checkbox-line">
                <el-checkbox :value="c">
                  <span class="mono">{{ c }}</span>
                </el-checkbox>
              </div>
            </el-checkbox-group>
            <el-empty v-if="execCustomers.length === 0 && !customersLoading"
              :description="execForm.handoverUserid ? '该成员名下无可转接客户' : '请先选择左侧成员'" :image-size="48" />
          </el-scrollbar>
        </div>

        <!-- 右：接替人 -->
        <div class="exec-panel">
          <div class="panel-title">接替成员</div>
          <el-scrollbar height="300px" v-loading="takeoverLoading">
            <div v-for="u in takeoverList" :key="u.userid" class="pick-item"
              :class="{ active: execForm.takeoverUserid === u.userid }" @click="execForm.takeoverUserid = u.userid">
              <span class="pick-name">{{ u.name }}</span>
            </div>
            <el-empty v-if="takeoverList.length === 0 && !takeoverLoading" description="无数据" :image-size="48" />
          </el-scrollbar>
        </div>
      </div>
      <el-empty v-else description="请先选择企微配置与转接类型" :image-size="60" />

      <!-- 底部：欢迎语 + 提交 -->
      <div class="exec-footer">
        <el-input v-if="execForm.transferType === 'active'" v-model="execForm.welcomeMsg" type="textarea"
          :rows="2" maxlength="200" show-word-limit placeholder="转接欢迎语（可选，仅在职转接支持，发送给客户）" style="max-width: 520px" />
        <div class="footer-right">
          <span class="picked-summary">
            已选 <b class="hl-num">{{ execForm.selectedCustomers.length }}</b> 个客户，
            将自动分 <b class="hl-num">{{ Math.ceil(execForm.selectedCustomers.length / 100) || 0 }}</b> 批调用（每批≤100）
          </span>
          <el-button type="primary" :disabled="!canSubmit" :loading="submitting" @click="submitExecute">
            确认发起转接
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 记录明细弹窗 -->
    <el-dialog v-model="detailVisible" title="转接明细" width="700px">
      <template v-if="detailData">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单号">{{ detailData.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(detailData.status)" size="small">{{ statusLabel(detailData.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="租户">{{ detailData.tenantId }}</el-descriptions-item>
          <el-descriptions-item label="模式">{{ detailData.mode === 'agent' ? '服务商代办' : '自助套餐' }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ detailData.transferType === 'resigned' ? '离职转接' : '在职转接' }}</el-descriptions-item>
          <el-descriptions-item label="批次">{{ detailData.batchCount }} 批</el-descriptions-item>
          <el-descriptions-item label="原跟进人">{{ detailData.handoverName || detailData.handoverUserid }}</el-descriptions-item>
          <el-descriptions-item label="接替人">{{ detailData.takeoverName || detailData.takeoverUserid }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detailCounts" class="count-badges">
          <el-tag type="success" size="small">接替完毕 {{ detailCounts.success || 0 }}</el-tag>
          <el-tag type="primary" size="small">等待接替 {{ detailCounts.waiting || 0 }}</el-tag>
          <el-tag type="danger" size="small">客户拒绝 {{ detailCounts.rejected || 0 }}</el-tag>
          <el-tag type="warning" size="small">好友上限 {{ detailCounts.limit || 0 }}</el-tag>
        </div>
        <el-table :data="detailItems" size="small" max-height="340" style="margin-top: 10px">
          <el-table-column prop="external_userid" label="客户 external_userid" min-width="260" show-overflow-tooltip />
          <el-table-column label="接替状态" width="150" align="center">
            <template #default="{ row }">
              <el-tag :type="itemStatusType(row.status)" size="small">{{ itemStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="接替时间" width="160">
            <template #default="{ row }">
              <span v-if="row.takeover_time">{{ formatUnix(row.takeover_time) }}</span>
              <span v-else-if="row.status === 'waiting'" style="color: #409eff">24 小时内自动接替</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 手动开通权益弹窗 ==================== -->
    <el-dialog v-model="grantVisible" title="手动开通自助权益" width="520px" destroy-on-close :close-on-click-modal="false">
      <el-form :model="grantForm" label-width="90px">
        <el-form-item label="租户" required>
          <el-select v-model="grantForm.tenantId" filterable placeholder="选择租户" style="width: 100%">
            <el-option v-for="t in tenantOptions" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开通时长" required>
          <el-radio-group v-model="grantForm.preset">
            <el-radio-button label="1">月卡</el-radio-button>
            <el-radio-button label="3">季卡</el-radio-button>
            <el-radio-button label="12">年卡</el-radio-button>
            <el-radio-button label="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="grantForm.preset === 'custom'" label="月数" required>
          <el-input-number v-model="grantForm.customMonths" :min="1" :max="120" style="width: 160px" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px">1-120 个月</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="grantForm.remark" type="textarea" :rows="2" maxlength="100" show-word-limit
            placeholder="赠送原因/关联沟通记录（仅记入操作日志）" />
        </el-form-item>
        <el-alert type="info" :closable="false" show-icon
          title="开通后立即生效：写入权益台账并解锁该租户「客户转粉」菜单；租户已有未过期权益时在原到期时间上叠加。" />
      </el-form>
      <template #footer>
        <el-button @click="grantVisible = false">取消</el-button>
        <el-button type="primary" :loading="grantSubmitting" @click="submitGrant">确认开通</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getConvertAgentOrders, rejectConvertAgentOrder,
  getConvertTenantConfigs, getConvertTenantFollowers, getConvertTenantCustomers,
  convertFanExecute,
  getConvertRecords, getConvertRecordDetail, syncConvertRecord,
  getConvertPermissions, grantConvertPermission
} from '@/api/wecomManagement'
import request from '@/api/request'

// ==================== 状态字典 ====================
const STATUS_MAP: Record<string, { label: string; type: string }> = {
  pending: { label: '待支付', type: 'warning' },
  paid: { label: '已支付·待执行', type: 'primary' },
  submitted: { label: '已发起', type: 'info' },
  partial: { label: '部分成功', type: 'warning' },
  success: { label: '全部成功', type: 'success' },
  rejected: { label: '有客户拒绝', type: 'danger' },
  failed: { label: '失败', type: 'danger' },
  closed: { label: '已关闭', type: 'info' }
}
const statusLabel = (s: string) => STATUS_MAP[s]?.label || s || '-'
const statusType = (s: string) => (STATUS_MAP[s]?.type || 'info') as any

const ITEM_STATUS_MAP: Record<string, { label: string; type: string }> = {
  success: { label: '接替完毕', type: 'success' },
  waiting: { label: '等待接替', type: 'primary' },
  rejected: { label: '客户拒绝', type: 'danger' },
  limit: { label: '好友上限', type: 'warning' }
}
const itemStatusLabel = (s: string) => ITEM_STATUS_MAP[s]?.label || s
const itemStatusType = (s: string) => (ITEM_STATUS_MAP[s]?.type || 'info') as any

const TRANSFER_TYPE_LABEL: Record<string, string> = { active: '在职转接', resigned: '离职转接' }
const PLAN_LABEL: Record<string, string> = { monthly: '月卡', quarterly: '季卡', yearly: '年卡' }
const planLabel = (id: string) => PLAN_LABEL[id] || id

// ==================== 工具 ====================
const formatDate = (d: any) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
const formatUnix = (ts?: number) => (ts ? new Date(ts * 1000).toLocaleString('zh-CN') : '-')

/** 工单计费展示 */
const billingLabel = (row: any) => {
  const p = row.priceSnapshot
  if (!p) return ''
  if (row.billingMode === 'per_account') return `按号 ¥${p.unitPrice}/个 × ${p.accountCount ?? '?'} 号`
  if (row.billingMode === 'per_tier') return `阶梯「${p.tierName || ''}」¥${p.price}`
  if (row.billingMode === 'self_plan') return `${p.planName || ''} ¥${p.price}`
  return ''
}

const remainDays = (end: string | Date) => {
  if (!end) return -9999
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000)
}

// ==================== Tab1 工单 ====================
const activeTab = ref('orders')
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const orderTotal = ref(0)
const orderQuery = reactive({ keyword: '', status: '', page: 1, pageSize: 20 })

const fetchOrders = async () => {
  ordersLoading.value = true
  try {
    const res: any = await getConvertAgentOrders({
      keyword: orderQuery.keyword || undefined,
      status: orderQuery.status || undefined,
      page: orderQuery.page,
      pageSize: orderQuery.pageSize
    })
    if (res?.data) {
      orders.value = res.data.list || []
      orderTotal.value = res.data.total || 0
    }
  } finally {
    ordersLoading.value = false
  }
}

const rejectOrder = (row: any) => {
  ElMessageBox.prompt(
    `确定拒绝工单「${row.orderNo}」（${row.customerCount} 个客户）？\n拒绝前请先线下与租户沟通并处理退款。`,
    '拒绝工单',
    { confirmButtonText: '确认拒绝', cancelButtonText: '返回', inputPlaceholder: '拒绝原因（写入工单备注）', type: 'warning' }
  ).then(async ({ value }: { value: string }) => {
    try {
      await rejectConvertAgentOrder(row.orderNo, { reason: value })
      ElMessage.success('工单已拒绝并关闭')
      fetchOrders()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }).catch(() => {})
}

// ==================== Tab2 直接代转 ====================
const tenantOptions = ref<any[]>([])
const direct = reactive({ tenantId: '', configId: '', configs: [] as any[], configsLoading: false })

const searchTenants = async (kw?: string) => {
  try {
    const res: any = await request.get('/announcements/tenants')
    let list: any[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
    if (kw) list = list.filter(t => (t.name || '').includes(kw) || String(t.id).includes(kw))
    tenantOptions.value = list.map(t => ({ id: t.id, name: t.name }))
  } catch { tenantOptions.value = [] }
}

const onDirectTenantChange = async () => {
  direct.configId = ''
  direct.configs = []
  if (!direct.tenantId) return
  direct.configsLoading = true
  try {
    const res: any = await getConvertTenantConfigs(direct.tenantId)
    direct.configs = res?.data || []
    // 仅一个可用配置时自动选中并直接进入执行弹窗
    if (direct.configs.length === 1) {
      direct.configId = direct.configs[0].id
      openExecDialog()
    }
  } finally {
    direct.configsLoading = false
  }
}

// ==================== 执行弹窗（工单 / 直转共用） ====================
const execVisible = ref(false)
const execSource = ref<'direct' | 'order'>('direct')
const execOrder = ref<any>({})
const execConfigs = ref<any[]>([])
const execMetaLoading = ref(false)
const submitting = ref(false)

const execForm = reactive({
  transferType: 'resigned',
  configId: '',
  handoverUserid: '',
  takeoverUserid: '',
  welcomeMsg: '',
  selectedCustomers: [] as string[]
})

const execTitle = computed(() =>
  execSource.value === 'order'
    ? `执行转粉工单 · ${execOrder.value.orderNo}`
    : '代执行客户转粉'
)

const canSubmit = computed(() =>
  !!execForm.configId && !!execForm.handoverUserid && !!execForm.takeoverUserid && execForm.selectedCustomers.length > 0
)

/** 打开弹窗（直转入口：从 Tab2 进入；工单入口：预填租户/类型） */
const openExecDialog = async () => {
  execVisible.value = true
  resetExecSelection()
  execMetaLoading.value = true
  try {
    const tid = execSource.value === 'order' ? execOrder.value.tenantId : direct.tenantId
    const res: any = await getConvertTenantConfigs(tid)
    execConfigs.value = res?.data || []
    if (execConfigs.value.length === 1) execForm.configId = execConfigs.value[0].id
  } finally {
    execMetaLoading.value = false
  }
}

const openExecFromOrder = async (row: any) => {
  execSource.value = 'order'
  execOrder.value = row
  execForm.transferType = row.transferType || 'resigned'
  execForm.configId = ''
  await openExecDialog()
  loadHandoverList()
}

const resetExecSelection = () => {
  execForm.handoverUserid = ''
  execForm.takeoverUserid = ''
  execForm.welcomeMsg = ''
  execForm.selectedCustomers = []
  handoverList.value = []
  execCustomers.value = []
}

const onExecTypeChange = () => {
  resetExecSelection()
  if (execForm.configId) loadHandoverList()
}

// ---- 左栏：原跟进成员 ----
interface FollowerItem { userid: string; name: string; customerCount: number; dimissionTime?: number }
const handoverList = ref<FollowerItem[]>([])
const handoverLoading = ref(false)

const loadHandoverList = async () => {
  const cid = execForm.configId
  if (!cid) return
  handoverLoading.value = true
  try {
    const res: any = await getConvertTenantFollowers({ configId: cid, type: execForm.transferType })
    handoverList.value = res?.data || []
  } catch (e: any) {
    ElMessage.error(e?.message || '获取成员失败')
  } finally {
    handoverLoading.value = false
  }
}

watch(() => execForm.configId, (cid) => {
  resetExecSelection()
  onlineMembers.value = []
  if (cid) loadHandoverList()
})

// ---- 右栏：接替人候选（复用 followers）----
const takeoverList = computed<FollowerItem[]>(() => {
  let list = handoverList.value
  if (execForm.transferType === 'active') {
    // 在职转接待选人为其余成员；禁用已选为原跟进人的成员由提交校验兜底
    list = list.filter(u => u.userid !== execForm.handoverUserid)
  } else {
    // 离职场景：接替人必须是在职成员，拉取同配置通讯录
    return onlineMembers.value.filter(u => u.userid !== execForm.handoverUserid)
  }
  return list
})
const onlineMembers = ref<FollowerItem[]>([])
const takeoverLoading = ref(false)

const ensureOnlineMembers = async () => {
  if (onlineMembers.value.length > 0) return
  takeoverLoading.value = true
  try {
    const res: any = await getConvertTenantFollowers({ configId: execForm.configId, type: 'active' })
    onlineMembers.value = res?.data || []
  } finally {
    takeoverLoading.value = false
  }
}

const selectHandover = async (u: FollowerItem) => {
  execForm.handoverUserid = u.userid
  execForm.selectedCustomers = []
  await loadCustomerList(u.userid)
  if (execForm.transferType === 'resigned') await ensureOnlineMembers()
}

// ---- 中栏：客户清单 ----
const execCustomers = ref<string[]>([])
const customersLoading = ref(false)

const loadCustomerList = async (userid: string) => {
  customersLoading.value = true
  try {
    const res: any = await getConvertTenantCustomers({
      configId: execForm.configId, userid, type: execForm.transferType
    })
    execCustomers.value = res?.data?.externalUserids || []
  } catch (e: any) {
    execCustomers.value = []
    ElMessage.error(e?.message || '获取客户失败')
  } finally {
    customersLoading.value = false
  }
}

const allSelected = computed(() =>
  execCustomers.value.length > 0 && execForm.selectedCustomers.length === execCustomers.value.length
)
const partSelected = computed(() =>
  execForm.selectedCustomers.length > 0 && execForm.selectedCustomers.length < execCustomers.value.length
)

const toggleAllCustomers = (val: any) => {
  execForm.selectedCustomers = val ? [...execCustomers.value] : []
}

// ---- 提交 ----
const submitExecute = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const body: any = {
      tenantId: execSource.value === 'order' ? execOrder.value.tenantId : direct.tenantId,
      configId: execForm.configId,
      transferType: execForm.transferType,
      handoverUserid: execForm.handoverUserid,
      takeoverUserid: execForm.takeoverUserid,
      externalUserids: execForm.selectedCustomers,
      transferSuccessMsg: execForm.welcomeMsg || undefined
    }
    if (execSource.value === 'order') body.orderNo = execOrder.value.orderNo
    const res: any = await convertFanExecute(body)
    ElMessageBox.alert(res?.data?.message || '转接已发起', '执行结果', { confirmButtonText: '查看记录', type: 'success' })
      .then(() => {
        execVisible.value = false
        activeTab.value = 'records'
        fetchRecords()
      })
      .catch(() => {})
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '执行失败')
  } finally {
    submitting.value = false
  }
}

// ==================== Tab3 转接记录 ====================
const records = ref<any[]>([])
const recordsLoading = ref(false)
const recordTotal = ref(0)
const recordQuery = reactive({ keyword: '', mode: '', status: '', page: 1, pageSize: 20 })

const recordStats = computed(() => [
  { label: '转接订单总数', value: recordTotal.value, color: '#409eff' },
  { label: '成功接替客户', value: sampleStats.value.success, color: '#07c160' },
  { label: '等待接替中', value: sampleStats.value.waiting, color: '#409eff' },
  { label: '客户拒绝 / 上限', value: sampleStats.value.rejected + sampleStats.value.limit, color: '#f56c6c' }
])
const sampleStats = ref({ success: 0, waiting: 0, rejected: 0, limit: 0 })

const countsTip = (counts: any) =>
  `完毕 ${counts.success || 0} / 等待 ${counts.waiting || 0} / 拒绝 ${counts.rejected || 0} / 上限 ${counts.limit || 0}`

const fetchRecords = async () => {
  recordsLoading.value = true
  try {
    const res: any = await getConvertRecords({
      keyword: recordQuery.keyword || undefined,
      mode: recordQuery.mode || undefined,
      status: recordQuery.status || undefined,
      page: recordQuery.page,
      pageSize: recordQuery.pageSize
    })
    if (res?.data) {
      records.value = res.data.list || []
      recordTotal.value = res.data.total || 0
    }
    // 静默取一批近记录用于统计卡
    const s: any = await getConvertRecords({ page: 1, pageSize: 500 })
    const agg = { success: 0, waiting: 0, rejected: 0, limit: 0 }
    for (const r of s?.data?.list || []) {
      if (r.counts) {
        agg.success += r.counts.success || 0
        agg.waiting += r.counts.waiting || 0
        agg.rejected += r.counts.rejected || 0
        agg.limit += r.counts.limit || 0
      }
    }
    sampleStats.value = agg
  } finally {
    recordsLoading.value = false
  }
}

const viewRecord = async (row: any) => {
  try {
    const res: any = await getConvertRecordDetail(row.orderNo)
    detailData.value = res?.data
    detailVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '获取明细失败')
  }
}

const detailVisible = ref(false)
const detailData = ref<any>(null)
const detailCounts = computed(() => detailData.value?.resultDetail?.counts || null)
const detailItems = computed(() => {
  const items = detailData.value?.resultDetail?.items
  return Array.isArray(items) ? items.sort((a: any, b: any) => (a.status || '').localeCompare(b.status || '')) : []
})

const syncRecord = async (row: any) => {
  try {
    const res: any = await syncConvertRecord(row.orderNo)
    ElMessage.success(res?.data?.changed ? '同步完成，结果已更新' : '已是最新结果')
    fetchRecords()
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  }
}

// ==================== Tab4 权益台账 ====================
const permissions = ref<any[]>([])
const permsLoading = ref(false)
const permTotal = ref(0)
const permQuery = reactive({ keyword: '', page: 1, pageSize: 20 })

const fetchPermissions = async () => {
  permsLoading.value = true
  try {
    const res: any = await getConvertPermissions({
      keyword: permQuery.keyword || undefined,
      page: permQuery.page,
      pageSize: permQuery.pageSize
    })
    if (res?.data) {
      permissions.value = res.data.list || []
      permTotal.value = res.data.total || 0
    }
  } finally {
    permsLoading.value = false
  }
}

// 手动开通权益
const grantVisible = ref(false)
const grantSubmitting = ref(false)
const grantForm = reactive({ tenantId: '', preset: '1', customMonths: 1, remark: '' })

const openGrantDialog = () => {
  grantForm.tenantId = ''
  grantForm.preset = '1'
  grantForm.customMonths = 1
  grantForm.remark = ''
  if (tenantOptions.value.length === 0) searchTenants()
  grantVisible.value = true
}

const submitGrant = async () => {
  if (!grantForm.tenantId) { ElMessage.warning('请选择租户'); return }
  const months = grantForm.preset === 'custom' ? grantForm.customMonths : parseInt(grantForm.preset)
  if (!months || months <= 0) { ElMessage.warning('请填写有效月数'); return }
  grantSubmitting.value = true
  try {
    const planNames: Record<string, string> = { '1': '月卡(手动开通)', '3': '季卡(手动开通)', '12': '年卡(手动开通)', custom: '自定义时长(手动开通)' }
    await grantConvertPermission({
      tenantId: grantForm.tenantId,
      planId: grantForm.preset === 'custom' ? 'custom' : `manual_${grantForm.preset}m`,
      planName: planNames[grantForm.preset] || '手动开通',
      cycleMonths: months,
      remark: grantForm.remark || undefined
    })
    ElMessage.success('开通成功，租户菜单已解锁')
    grantVisible.value = false
    permQuery.page = 1
    fetchPermissions()
  } finally {
    grantSubmitting.value = false
  }
}

// ==================== 初始化 ====================
onMounted(async () => {
  fetchOrders()
  searchTenants()
})
</script>

<style scoped>
.page-container { padding: 20px; }
.convert-tabs :deep(.el-tabs__header) { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }

.stat-card { text-align: center; }
.stat-num { font-size: 24px; font-weight: bold; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }

.cell-two-line { line-height: 1.4; }
.cell-two-line .strong { display: block; font-weight: 500; }
.cell-two-line .sub { font-size: 12px; color: #909399; }

/* ---------- 执行弹窗 ---------- */
.exec-layout { display: flex; gap: 12px; margin-top: 14px; }
.exec-panel {
  flex: 1;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
}
.exec-panel.panel-wide { flex: 1.6; }
.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  font-size: 13px;
  font-weight: 600;
}
.panel-actions { margin-left: auto; }
.panel-count {
  font-weight: normal;
  color: #909399;
  font-size: 12px;
}
.pick-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
  font-size: 13px;
}
.pick-item:hover { background: var(--el-fill-color-light); }
.pick-item.active { background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: 500; }
.pick-item.checkbox-line { justify-content: flex-start; padding-top: 4px; padding-bottom: 4px; }
.pick-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-meta { font-size: 12px; color: #909399; margin-left: 8px; flex-shrink: 0; }
.mono { font-family: Consolas, Monaco, monospace; font-size: 12px; }

.exec-footer {
  margin-top: 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.footer-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.picked-summary { font-size: 13px; color: #606266; }
.hl-num { color: var(--el-color-primary); font-size: 15px; }

.count-badges { display: flex; gap: 10px; margin-top: 12px; }
</style>
