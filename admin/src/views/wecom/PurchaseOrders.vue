<template>
  <div class="po-page">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="page-title">
          <span>会话存档代购管理</span>
          <span class="page-subtitle">管理租户代购订单、配置采购成本与供应商信息</span>
        </div>
      </template>

    <!-- ===== 统计卡片 ===== -->
    <div class="stats-row">
      <div class="stat-card s-pending">
        <div class="s-icon">⏳</div>
        <div class="s-body"><div class="s-val">{{ stats.pending }}</div><div class="s-lbl">待履约</div></div>
      </div>
      <div class="stat-card s-done">
        <div class="s-icon">✅</div>
        <div class="s-body"><div class="s-val">{{ stats.fulfilled }}</div><div class="s-lbl">已履约</div></div>
      </div>
      <div class="stat-card s-fail">
        <div class="s-icon">❌</div>
        <div class="s-body"><div class="s-val">{{ stats.failed }}</div><div class="s-lbl">失败/退款</div></div>
      </div>
      <div class="stat-card s-cost">
        <div class="s-icon">📦</div>
        <div class="s-body"><div class="s-val">¥{{ (stats.monthCost || 0).toLocaleString() }}</div><div class="s-lbl">本月采购额</div></div>
      </div>
      <div class="stat-card s-rev">
        <div class="s-icon">💰</div>
        <div class="s-body"><div class="s-val">¥{{ (stats.totalRevenue || 0).toLocaleString() }}</div><div class="s-lbl">累计收入</div></div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="main-tabs">

      <!-- ===== Tab1: 代购订单 ===== -->
      <el-tab-pane label="代购订单" name="orders">
        <div class="toolbar">
          <div class="tl">
            <el-select v-model="filter.status" placeholder="全部状态" clearable style="width:130px" @change="doSearch">
              <el-option label="待支付" value="pending_payment" />
              <el-option label="待履约" value="pending_fulfillment" />
              <el-option label="已生效" value="active" />
              <el-option label="已退款" value="refunded" />
              <el-option label="失败" value="failed" />
            </el-select>
            <el-select v-model="filter.type" placeholder="套餐类型" clearable style="width:120px" @change="doSearch">
              <el-option label="企微套餐" value="wecom" />
              <el-option label="会话存档" value="archive" />
              <el-option label="获客助手" value="acquisition" />
              <el-option label="AI助手" value="ai" />
            </el-select>
            <el-input v-model="filter.keyword" placeholder="搜索订单号/租户" clearable style="width:200px" @keyup.enter="doSearch" />
            <el-button type="primary" @click="doSearch" :loading="loading">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </div>
          <el-button type="success" plain @click="fetchOrders">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>

        <el-table :data="orders" v-loading="loading" stripe border style="width:100%">
          <el-table-column type="index" width="50" align="center" />
          <el-table-column label="订单号 / 时间" min-width="170">
            <template #default="{ row }">
              <div class="cell-main">{{ row.orderNo || row.id || '-' }}</div>
              <div class="cell-sub">{{ fmtDate(row.createdAt) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="租户" min-width="130">
            <template #default="{ row }">
              <div class="cell-main">{{ row.tenantName || row.tenantId || '-' }}</div>
              <div class="cell-sub" v-if="row.tenantId">{{ row.tenantId.substring(0, 8) }}…</div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="105" align="center">
            <template #default="{ row }">
              <el-tag :type="typeColor(row.type)" size="small" effect="light">{{ typeText(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="套餐 / 人数" min-width="140">
            <template #default="{ row }">
              <div class="cell-main">{{ row.packageName || '-' }}</div>
              <div class="cell-sub" v-if="row.userCount || row.maxMembers">{{ row.userCount || row.maxMembers }} 人</div>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="95" align="right">
            <template #default="{ row }">
              <span v-if="!row.amount || +row.amount === 0" class="free-tag">免费</span>
              <span v-else class="price-tag">¥{{ Number(row.amount).toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column label="利润" width="95" align="right">
            <template #default="{ row }">
              <span v-if="row.costPrice && row.amount"
                :class="(+row.amount - +row.costPrice) >= 0 ? 'profit-pos' : 'profit-neg'">
                ¥{{ (+row.amount - +row.costPrice).toLocaleString() }}
              </span>
              <span v-else class="cell-sub">—</span>
            </template>
          </el-table-column>
          <el-table-column label="支付" width="85" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain" type="info">{{ payText(row.payType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="95" align="center">
            <template #default="{ row }">
              <el-tag :type="statusColor(row.status, row.fulfillmentStatus)" size="small" effect="light">
                {{ statusText(row.status, row.fulfillmentStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="履约时间" width="145">
            <template #default="{ row }">
              <span v-if="row.fulfilledAt" class="cell-sub">{{ fmtDate(row.fulfilledAt) }}</span>
              <span v-else class="cell-sub">—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="165" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.fulfillmentStatus === 'pending' || row.status === 'pending_fulfillment'"
                v-permission="'wecom-management:orders:edit'" type="success" link size="small" @click="openFulfillDlg(row)">履约</el-button>
              <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
              <el-button
                v-if="row.fulfillmentStatus === 'fulfilled' || row.status === 'active'"
                v-permission="'wecom-management:orders:edit'" type="danger" link size="small" @click="doRefund(row)">退款</el-button>
              <el-button
                v-if="row.status === 'pending_payment'"
                v-permission="'wecom-management:orders:edit'" type="warning" link size="small" @click="confirmPaid(row)">确认收款</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager-wrap">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchOrders"
            @current-change="fetchOrders"
          />
        </div>
      </el-tab-pane>

      <!-- ===== Tab2: 采购成本 ===== -->
      <el-tab-pane label="采购成本配置" name="cost">
        <div class="cfg-section" v-loading="costLoading">

          <!-- 说明 Banner -->
          <el-alert type="warning" :closable="false" class="cost-banner" show-icon>
            <template #title>
              <strong>这里配置的是「我方向企微官方的采购成本」，与租户购买套餐的售价无关</strong>
            </template>
            <div class="banner-body">
              企微官方会话存档分 <b>服务版（¥900/人/年）</b> 和 <b>企业版（¥1800/人/年）</b>，
              作为渠道商我们可享受企微给予的渠道激励折扣。
              此处配置折扣比例，用于系统自动核算每笔代购订单的<b>成本与利润</b>，不影响租户看到的售价（售价在「套餐与定价」中维护）。
            </div>
          </el-alert>

          <el-row :gutter="20" style="margin-top:16px">
            <!-- 左侧：基础价格配置 -->
            <el-col :xs="24" :sm="24" :md="10" :lg="9">
              <el-card shadow="never" class="inner-card">
                <template #header>
                  <div class="ic-head">
                    <span>企微官方基准价 &amp; 渠道折扣</span>
                    <el-tooltip content="来自企微官网公开定价及渠道激励协议" placement="top">
                      <el-icon style="margin-left:4px;color:#909399;cursor:help"><InfoFilled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-form label-position="right" label-width="150px" class="cost-form">
                  <el-form-item>
                    <template #label>
                      <span class="form-lbl">服务版官方价</span>
                    </template>
                    <div class="form-input-wrap">
                      <el-input-number
                        v-model="costConfig.serviceBasePrice"
                        :min="0" :precision="0" :step="100"
                        style="width:140px"
                        controls-position="right"
                      />
                      <span class="unit-text">元 / 人 / 年</span>
                    </div>
                  </el-form-item>
                  <el-form-item>
                    <template #label>
                      <span class="form-lbl">企业版官方价</span>
                    </template>
                    <div class="form-input-wrap">
                      <el-input-number
                        v-model="costConfig.enterpriseBasePrice"
                        :min="0" :precision="0" :step="100"
                        style="width:140px"
                        controls-position="right"
                      />
                      <span class="unit-text">元 / 人 / 年</span>
                    </div>
                  </el-form-item>
                  <el-divider style="margin:10px 0" />
                  <el-form-item>
                    <template #label>
                      <span class="form-lbl">渠道激励折扣</span>
                    </template>
                    <div class="form-input-wrap">
                      <el-input-number
                        v-model="costConfig.channelDiscount"
                        :min="0.01" :max="1" :step="0.05" :precision="2"
                        style="width:120px"
                        controls-position="right"
                      />
                      <span class="unit-text">
                        即官方价的 <b style="color:#e6a23c">{{ Math.round((costConfig.channelDiscount || 0.9) * 100) }}%</b>
                      </span>
                    </div>
                    <div class="form-hint">
                      企微给渠道商的激励，非租户折扣。
                      默认折后：服务版 <b class="price-tag">¥{{ Math.round((costConfig.serviceBasePrice || 900) * (costConfig.channelDiscount || 0.9)) }}</b>，
                      企业版 <b class="price-tag">¥{{ Math.round((costConfig.enterpriseBasePrice || 1800) * (costConfig.channelDiscount || 0.9)) }}</b>
                    </div>
                  </el-form-item>
                  <el-divider style="margin:10px 0" />
                  <el-form-item>
                    <template #label><span class="form-lbl">备注说明</span></template>
                    <el-input
                      v-model="costConfig.notes"
                      type="textarea" :rows="3"
                      placeholder="如：折扣协议有效期、联系人等"
                      style="width:100%"
                    />
                  </el-form-item>
                </el-form>
              </el-card>
            </el-col>

            <!-- 右侧：人数阶梯 -->
            <el-col :xs="24" :sm="24" :md="14" :lg="15">
              <el-card shadow="never" class="inner-card">
                <template #header>
                  <div class="ic-head-row">
                    <div>
                      <span class="ic-head">人数阶梯折扣</span>
                      <span class="ic-head-sub">企微官方针对不同采购人数给予的阶梯优化折扣，优先级高于默认渠道折扣</span>
                    </div>
                    <el-button v-permission="'wecom-management:orders:edit'" type="primary" plain size="small" @click="addTier">+ 添加阶梯</el-button>
                  </div>
                </template>

                <el-table
                  :data="costConfig.tiers || []"
                  size="default"
                  border
                  style="width:100%"
                  table-layout="auto"
                >
                  <el-table-column label="阶梯标签" min-width="100">
                    <template #default="{ row }">
                      <el-input v-model="row.label" placeholder="如 1-20人" />
                    </template>
                  </el-table-column>
                  <el-table-column label="最小人数" min-width="110" align="center">
                    <template #default="{ row }">
                      <el-input-number v-model="row.minUsers" :min="1" style="width:90px" controls-position="right" />
                    </template>
                  </el-table-column>
                  <el-table-column label="最大人数" min-width="110" align="center">
                    <template #default="{ row }">
                      <el-input-number v-model="row.maxUsers" :min="row.minUsers" style="width:90px" controls-position="right" />
                    </template>
                  </el-table-column>
                  <el-table-column label="采购折扣" min-width="110" align="center">
                    <template #default="{ row }">
                      <el-input-number
                        v-model="row.discount" :min="0.01" :max="1" :step="0.05" :precision="2"
                        style="width:90px" controls-position="right"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="服务版折后价" min-width="120" align="right">
                    <template #default="{ row }">
                      <div class="tier-price">
                        <span class="price-tag">¥{{ Math.round((costConfig.serviceBasePrice || 900) * (row.discount || 1)) }}</span>
                        <span class="tier-pct">{{ Math.round((row.discount || 1) * 100) }}%</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="企业版折后价" min-width="120" align="right">
                    <template #default="{ row }">
                      <div class="tier-price">
                        <span class="price-tag">¥{{ Math.round((costConfig.enterpriseBasePrice || 1800) * (row.discount || 1)) }}</span>
                        <span class="tier-pct">{{ Math.round((row.discount || 1) * 100) }}%</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column width="60" align="center" fixed="right">
                    <template #default="{ $index }">
                      <el-button v-permission="'wecom-management:orders:edit'" type="danger" link @click="removeTier($index)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="tier-tip">
                  <el-icon><InfoFilled /></el-icon>
                  人数阶梯折扣仅影响成本核算，系统根据订单实际人数自动匹配对应阶梯计算采购成本。
                </div>
              </el-card>
            </el-col>
          </el-row>

          <div class="cfg-footer">
            <el-button v-permission="'wecom-management:orders:edit'" type="primary" size="large" @click="saveCost" :loading="savingCost">保存采购成本配置</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== Tab3: 供应商配置 ===== -->
      <el-tab-pane label="供应商配置" name="supplier">
        <div class="cfg-section" v-loading="supplierLoading">
          <div class="cfg-header">
            <h3>企微服务商配置</h3>
            <p>配置企微服务商信息用于自动代购下单。未完成服务商应用开发前请先使用手动履约。</p>
          </div>
          <el-row :gutter="24">
            <el-col :span="12">
              <el-card shadow="never" class="inner-card">
                <template #header><div class="ic-head">服务商应用凭证</div></template>
                <div class="frow">
                  <label>服务商 CorpID</label>
                  <el-input v-model="supplierConfig.providerCorpId" placeholder="ww开头的服务商企业ID" style="width:260px" />
                </div>
                <div class="frow">
                  <label>服务商 Secret</label>
                  <el-input v-model="supplierConfig.providerSecret" type="password" show-password placeholder="服务商应用Secret" style="width:260px" />
                </div>
                <div class="frow">
                  <label>代购 API 地址</label>
                  <el-input v-model="supplierConfig.orderApiUrl" placeholder="留空使用企微官方默认接口" style="width:260px" />
                </div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="never" class="inner-card">
                <template #header><div class="ic-head">自动履约设置</div></template>
                <div class="frow">
                  <label>自动履约</label>
                  <el-switch v-model="supplierConfig.autoFulfillEnabled" active-text="开启" inactive-text="关闭" />
                </div>
                <div class="frow">
                  <label>预充值余额（元）</label>
                  <el-input-number v-model="supplierConfig.prechargeBalance" :min="0" :precision="2" style="width:150px" />
                </div>
                <div class="frow">
                  <label>通知邮箱</label>
                  <el-input v-model="supplierConfig.notifyEmail" placeholder="履约结果通知邮箱" style="width:230px" />
                </div>
                <div class="frow">
                  <label>Webhook 通知</label>
                  <el-input v-model="supplierConfig.notifyWebhook" placeholder="https://..." style="width:230px" />
                </div>
              </el-card>
            </el-col>
          </el-row>
          <el-alert type="info" :closable="false" style="margin-top:16px">
            <template #title><strong>如何配置企微服务商代购</strong></template>
            <div style="margin-top:8px;line-height:2">
              <b>当前阶段（推荐手动履约）：</b>
              客户支付 → 收到待履约通知 → 登录企微服务商后台手动下单 → 在订单列表标记"履约"完成，系统自动激活租户权限。
              <br>
              <b>自动履约：</b>
              在 <a href="https://open.work.weixin.qq.com/" target="_blank" style="color:#409eff">企微开放平台</a>
              创建服务商应用，填写凭证并开启自动履约开关后即可。
            </div>
          </el-alert>
          <div class="cfg-footer">
            <el-button v-permission="'wecom-management:orders:edit'" type="primary" size="large" @click="saveSupplier" :loading="savingSupplier">保存供应商配置</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== Tab4: 自动履约 ===== -->
      <el-tab-pane label="自动履约" name="auto">
        <div class="cfg-section">
          <el-result
            :icon="supplierConfig.autoFulfillEnabled ? 'success' : 'warning'"
            :title="supplierConfig.autoFulfillEnabled ? '自动履约已开启' : '自动履约未启用'"
            :sub-title="supplierConfig.autoFulfillEnabled
              ? '客户成功支付后系统将自动调用企微服务商 API 完成代购下单和席位激活'
              : '请在「供应商配置」完成服务商应用配置并开启自动履约'"
          >
            <template #extra>
              <el-button type="primary" @click="activeTab = 'supplier'">前往供应商配置</el-button>
            </template>
          </el-result>
        </div>
      </el-tab-pane>

    </el-tabs>

    <!-- ===== 履约弹窗 ===== -->
    <el-dialog v-model="showFulfillDlg" title="订单履约" width="520px" destroy-on-close>
      <div v-if="fulfillTarget">
        <el-descriptions :column="2" border size="small" style="margin-bottom:16px">
          <el-descriptions-item label="订单号">{{ fulfillTarget.orderNo || fulfillTarget.id }}</el-descriptions-item>
          <el-descriptions-item label="租户">{{ fulfillTarget.tenantName }}</el-descriptions-item>
          <el-descriptions-item label="套餐">{{ fulfillTarget.packageName }}</el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ fulfillTarget.amount }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-width="90px">
          <el-form-item label="履约方式">
            <el-radio-group v-model="fulfillMethod">
              <el-radio value="manual">手动（标记完成）</el-radio>
              <el-radio value="auto" :disabled="!supplierConfig.autoFulfillEnabled">自动（调用API）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="fulfillMethod === 'manual'" label="备注说明">
            <el-input v-model="fulfillNote" type="textarea" :rows="2" placeholder="如：已在企微服务商后台手动下单完成" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showFulfillDlg = false">取消</el-button>
        <el-button v-permission="'wecom-management:orders:edit'" type="primary" @click="doFulfill" :loading="fulfilling">确认履约</el-button>
      </template>
    </el-dialog>

    <!-- ===== 详情弹窗 ===== -->
    <el-dialog v-model="showDetailDlg" title="订单详情" width="520px">
      <el-descriptions v-if="detailRow" :column="2" border>
        <el-descriptions-item label="订单号" :span="2">{{ detailRow.orderNo || detailRow.id }}</el-descriptions-item>
        <el-descriptions-item label="租户">{{ detailRow.tenantName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeText(detailRow.type) }}</el-descriptions-item>
        <el-descriptions-item label="套餐">{{ detailRow.packageName }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ detailRow.userCount || detailRow.maxMembers || '-' }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ detailRow.amount }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ payText(detailRow.payType) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusText(detailRow.status, detailRow.fulfillmentStatus) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ fmtDate(detailRow.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="履约时间">{{ fmtDate(detailRow.fulfilledAt) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || detailRow.fulfillNote || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, InfoFilled, Delete } from '@element-plus/icons-vue'
import {
  getPurchaseOrders, fulfillPurchaseOrder, refundPurchaseOrder,
  getPurchaseCostConfig, savePurchaseCostConfig,
  getSupplierConfig, saveSupplierConfig
} from '@/api/wecomManagement'

const activeTab = ref('orders')
const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filter = ref({ status: '', keyword: '', type: '' })
const stats = ref({ pending: 0, fulfilled: 0, failed: 0, monthCost: 0, totalRevenue: 0 })

const showFulfillDlg = ref(false)
const fulfillTarget = ref<any>(null)
const fulfillMethod = ref('manual')
const fulfillNote = ref('')
const fulfilling = ref(false)

const showDetailDlg = ref(false)
const detailRow = ref<any>(null)

const costLoading = ref(false)
const savingCost = ref(false)
const costConfig = ref<any>({
  serviceBasePrice: 900,       // 企微服务版官方价（元/人/年）
  enterpriseBasePrice: 1800,   // 企微企业版官方价（元/人/年）
  channelDiscount: 0.90,       // 渠道激励折扣（企微给渠道商，非租户折扣）
  tiers: [
    { minUsers: 1,   maxUsers: 20,   discount: 0.90, label: '1-20人' },
    { minUsers: 21,  maxUsers: 50,   discount: 0.88, label: '21-50人' },
    { minUsers: 51,  maxUsers: 200,  discount: 0.85, label: '51-200人' },
    { minUsers: 201, maxUsers: 9999, discount: 0.80, label: '201人以上' }
  ],
  notes: ''
})

const supplierLoading = ref(false)
const savingSupplier = ref(false)
const supplierConfig = ref<any>({
  providerCorpId: '', providerSecret: '', orderApiUrl: '',
  autoFulfillEnabled: false, prechargeBalance: 0, notifyEmail: '', notifyWebhook: ''
})

const typeText = (t: string) =>
  ({ wecom: '企微套餐', archive: '会话存档', acquisition: '获客助手', ai: 'AI助手' }[t] || t || '未知')
const typeColor = (t: string): any =>
  ({ wecom: 'primary', archive: 'warning', acquisition: 'success', ai: '' }[t] || 'info')
const payText = (t: string) =>
  ({ wechat: '微信', alipay: '支付宝', bank: '银行转账', free: '免费' }[t] || t || '-')
const statusText = (status: string, fs?: string) => {
  if (fs === 'fulfilled') return '已履约'
  if (fs === 'refunded' || status === 'refunded') return '已退款'
  if (fs === 'failed' || status === 'failed') return '失败'
  if (status === 'pending_payment') return '待支付'
  if (status === 'pending_fulfillment' || fs === 'pending') return '待履约'
  if (status === 'free' || status === 'active') return '已生效'
  if (status === 'paid') return '已支付'
  return status || '-'
}
const statusColor = (status: string, fs?: string): any => {
  if (fs === 'fulfilled' || status === 'active' || status === 'free' || status === 'paid') return 'success'
  if (status === 'pending_payment') return 'warning'
  if (status === 'failed' || fs === 'failed') return 'danger'
  if (status === 'refunded' || fs === 'refunded') return 'info'
  return ''
}
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

const fetchOrders = async () => {
  loading.value = true
  try {
    const res: any = await getPurchaseOrders({
      status: filter.value.status || undefined,
      keyword: filter.value.keyword || undefined,
      type: filter.value.type || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    const data = res?.data || res || {}
    const list = Array.isArray(data) ? data : (data.list || [])
    orders.value = list
    total.value = data.total || list.length
    if (data.stats) Object.assign(stats.value, data.stats)
    else {
      stats.value.pending = list.filter((o: any) => o.fulfillmentStatus === 'pending' || o.status === 'pending_fulfillment').length
      stats.value.fulfilled = list.filter((o: any) => o.fulfillmentStatus === 'fulfilled' || o.status === 'active').length
      stats.value.failed = list.filter((o: any) => o.fulfillmentStatus === 'failed' || o.status === 'failed').length
    }
  } catch { orders.value = [] }
  loading.value = false
}

const doSearch = () => { page.value = 1; fetchOrders() }
const resetFilter = () => { filter.value = { status: '', keyword: '', type: '' }; doSearch() }

const openFulfillDlg = (row: any) => {
  fulfillTarget.value = row; fulfillMethod.value = 'manual'; fulfillNote.value = ''; showFulfillDlg.value = true
}

const doFulfill = async () => {
  if (!fulfillTarget.value) return
  fulfilling.value = true
  try {
    await fulfillPurchaseOrder(fulfillTarget.value.id, {
      method: fulfillMethod.value, note: fulfillNote.value, tenantId: fulfillTarget.value.tenantId
    })
    ElMessage.success('履约成功，租户权限已激活')
    showFulfillDlg.value = false
    fetchOrders()
  } catch (e: any) { ElMessage.error(e?.message || '履约失败') }
  fulfilling.value = false
}

const showDetail = (row: any) => { detailRow.value = row; showDetailDlg.value = true }

const doRefund = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定退款订单 "${row.orderNo || row.id}"？`, '退款确认', { type: 'warning' })
    await refundPurchaseOrder(row.id, { tenantId: row.tenantId, reason: '管理员操作退款' })
    ElMessage.success('已退款')
    fetchOrders()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.message || '退款失败') }
}

const confirmPaid = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确认已收款并开始履约？`, '确认收款')
    await fulfillPurchaseOrder(row.id, { method: 'manual', note: '管理员确认收款', tenantId: row.tenantId })
    ElMessage.success('已确认收款，进入履约流程')
    fetchOrders()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.message || '操作失败') }
}

const addTier = () => {
  const tiers: any[] = costConfig.value.tiers || []
  const last = tiers[tiers.length - 1]
  tiers.push({ minUsers: (last?.maxUsers || 0) + 1, maxUsers: (last?.maxUsers || 0) + 100, discount: 0.65, label: '' })
  costConfig.value.tiers = [...tiers]
}
const removeTier = (idx: number) => { costConfig.value.tiers.splice(idx, 1) }

const fetchCostConfig = async () => {
  costLoading.value = true
  try {
    const res: any = await getPurchaseCostConfig()
    const data = res?.data || res
    if (data && typeof data === 'object') Object.assign(costConfig.value, data)
  } catch { /* use defaults */ }
  costLoading.value = false
}

const saveCost = async () => {
  savingCost.value = true
  try {
    await savePurchaseCostConfig(costConfig.value)
    ElMessage.success('采购成本配置已保存')
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingCost.value = false
}

const fetchSupplierConfig = async () => {
  supplierLoading.value = true
  try {
    const res: any = await getSupplierConfig()
    const data = res?.data || res
    if (data && typeof data === 'object') Object.assign(supplierConfig.value, data)
  } catch { /* use defaults */ }
  supplierLoading.value = false
}

const saveSupplier = async () => {
  savingSupplier.value = true
  try {
    await saveSupplierConfig(supplierConfig.value)
    ElMessage.success('供应商配置已保存')
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingSupplier.value = false
}

onMounted(() => { fetchOrders(); fetchCostConfig(); fetchSupplierConfig() })
</script>

<style scoped>
/* ===== 页面容器 ===== */
.po-page { padding: 0; }

.page-card { border-radius: 12px; }
.page-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px 12px 0 0;
  padding: 16px 20px;
}
.page-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.page-title span:first-child {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
.page-subtitle {
  font-size: 12px;
  color: rgba(255,255,255,0.75);
}

/* ===== 统计卡片行 ===== */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.stat-card {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
  border: 1px solid #f0f0f0;
  transition: box-shadow 0.2s, transform 0.2s;
}
.stat-card:hover {
  box-shadow: 0 4px 14px rgba(0,0,0,.1);
  transform: translateY(-1px);
}
.s-icon { font-size: 24px; flex-shrink: 0; line-height: 1; }
.s-val { font-size: 18px; font-weight: 700; color: #1d2129; line-height: 1.2; }
.s-lbl { font-size: 11px; color: #86909c; margin-top: 3px; }
.s-pending { border-left: 4px solid #e6a23c; background: linear-gradient(to right, #fffbe6, #fff); }
.s-done    { border-left: 4px solid #67c23a; background: linear-gradient(to right, #f0f9eb, #fff); }
.s-fail    { border-left: 4px solid #f56c6c; background: linear-gradient(to right, #fef0f0, #fff); }
.s-cost    { border-left: 4px solid #409eff; background: linear-gradient(to right, #ecf5ff, #fff); }
.s-rev     { border-left: 4px solid #722ed1; background: linear-gradient(to right, #f4edff, #fff); }

/* ===== Tabs ===== */
.main-tabs :deep(.el-tabs__header) {
  margin: 0 0 16px 0;
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 8px;
}
.tl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ===== 表格辅助样式 ===== */
.cell-main { font-size: 13px; font-weight: 500; color: #1d2129; }
.cell-sub  { font-size: 11px; color: #86909c; margin-top: 2px; }
.free-tag  { color: #00b42a; font-weight: 700; }
.price-tag { color: #f5222d; font-weight: 700; }
.profit-pos { color: #67c23a; font-weight: 700; }
.profit-neg { color: #f56c6c; font-weight: 700; }

/* ===== 分页 ===== */
.pager-wrap { margin-top: 14px; display: flex; justify-content: flex-end; }

/* ===== 配置区域 ===== */
.cfg-section { padding: 4px 0 8px; }
.cfg-header { margin-bottom: 18px; }
.cfg-header h3 { margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1d2129; }
.cfg-header p { margin: 0; color: #86909c; font-size: 13px; line-height: 1.6; }
.cfg-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed #e5e6eb;
  display: flex;
  gap: 10px;
}

/* ===== 内部卡片 ===== */
.inner-card {
  margin-bottom: 0;
  border-radius: 8px;
  overflow: hidden;
}
.inner-card :deep(.el-card__header) {
  padding: 10px 14px;
  background: #f7f8fa;
  border-bottom: 1px solid #ebeef5;
}
.ic-head {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.ic-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ===== 表单行 ===== */
.frow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}
.frow label {
  min-width: 130px;
  font-size: 13px;
  color: #4e5969;
  padding-top: 6px;
  flex-shrink: 0;
  text-align: right;
}
.hint { font-size: 12px; color: #86909c; padding-top: 6px; white-space: nowrap; }

/* ===== 采购成本配置专用样式 ===== */
.cost-banner { margin-bottom: 4px; }
.cost-banner .banner-body { margin-top: 6px; font-size: 13px; color: #606266; line-height: 1.8; }

.cost-form { padding: 4px 0; }
.cost-form .el-form-item { margin-bottom: 18px; }
.form-lbl { font-size: 13px; color: #4e5969; }
.form-input-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.unit-text { font-size: 12px; color: #86909c; white-space: nowrap; }
.form-hint { font-size: 12px; color: #86909c; line-height: 1.7; margin-top: 4px; width: 100%; }

.ic-head-sub { font-size: 12px; color: #86909c; margin-left: 8px; font-weight: 400; }

.tier-price { display: flex; align-items: baseline; gap: 4px; justify-content: flex-end; }
.tier-pct { font-size: 11px; color: #86909c; }

.tier-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  color: #86909c;
  line-height: 1.6;
}
.tier-tip .el-icon { flex-shrink: 0; margin-top: 2px; color: #409eff; }
</style>

