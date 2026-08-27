<template>
  <div class="wecom-customer-convert">
    <!-- ==================== 服务说明卡（常显） ==================== -->
    <el-card shadow="never" class="hero-card">
      <div class="hero-body">
        <div class="hero-left">
          <div class="hero-icon">🤝</div>
          <div>
            <h3 class="hero-title">
              客户转粉服务
              <template v-if="perm.purchased && !perm.expired">
                <el-tag type="success" size="small" effect="dark" style="margin-left: 8px">自助权益生效中</el-tag>
              </template>
              <template v-else-if="perm.purchased && perm.expired">
                <el-tag type="info" size="small" effect="plain" style="margin-left: 8px">套餐已过期</el-tag>
              </template>
            </h3>
            <div class="hero-desc">成员离职或岗位调整时，将其名下客户批量转接给接替成员，客户资源不流失</div>
          </div>
        </div>
        <div class="hero-rules">
          <span class="rule-tag">⚡ 单次 ≤100 个官方限制 · 系统自动分批</span>
          <span class="rule-tag">✅ 发起后 24 小时自动完成接替</span>
          <span class="rule-tag">🔁 在职继承：同一客户 90 天内最多 2 次</span>
          <span class="rule-tag">♾️ 离职分配：不限次数，可转已注销账号客户</span>
        </div>
      </div>
      <div v-if="perm.purchased && !perm.expired && perm.plan" class="plan-active-bar">
        当前自助权益：<b>{{ perm.plan.planName || planLabel(perm.plan.planId) }}</b>
        ，有效期至 <b style="color:#07c160">{{ formatDate(perm.plan.endDate) }}</b>（续费时长自动叠加）
      </div>
    </el-card>

    <!-- ==================== 未购买态：购买区 ==================== -->
    <template v-if="serviceReady">
      <!-- 功能关闭 -->
      <el-card v-if="status.pricing?.enabled === false" shadow="never" style="margin-top: 16px">
        <el-empty description="转粉服务暂未开放，请联系服务商" :image-size="80" />
      </el-card>

      <!-- 已购有效 → 操作区；未购买/过期 → 购买区 -->
      <template v-else>
        <!-- ========== 自助操作区（已购生效） ========== -->
        <el-card v-if="selfActive" shadow="never" class="section-card">
          <template #header>
            <WecomHeader tab-name="customer-convert">
              自助转粉
              <template #actions>
                <el-radio-group v-model="op.transferType" @change="onOpTypeChange">
                  <el-radio-button value="resigned">离职转接</el-radio-button>
                  <el-radio-button value="active">在职转接</el-radio-button>
                </el-radio-group>
              </template>
            </WecomHeader>
          </template>

          <div class="op-layout" v-loading="op.loading">
            <!-- 左：原跟进成员 -->
            <div class="op-panel">
              <div class="panel-title">
                {{ op.transferType === 'resigned' ? '离职待分配号' : '原跟进成员' }}
                <span class="panel-count" v-if="op.handoverList.length">{{ op.handoverList.length }} 人</span>
                <div class="panel-actions" v-if="op.transferType === 'active'">
                  <el-input v-model="op.handoverKeyword" placeholder="搜索成员" size="small" clearable style="width: 120px" />
                </div>
              </div>
              <el-scrollbar height="320px">
                <template v-if="op.transferType === 'resigned'">
                  <div v-for="g in op.handoverList" :key="g.handoverUserid" class="pick-item"
                    :class="{ active: op.handoverUserid === g.handoverUserid }" @click="selectHandover(g.handoverUserid, g.customers.length)">
                    <span class="pick-name mono">{{ g.handoverUserid }}</span>
                    <span class="pick-meta">
                      {{ g.customers.length }} 客户
                      <i v-if="g.dimissionTime" style="margin-left: 6px; font-style: normal">{{ formatDate(formatUnix(g.dimissionTime)) }} 离职</i>
                    </span>
                  </div>
                  <el-empty v-if="!op.handoverList.length && !op.loading" description="暂无离职待分配客户" :image-size="48" />
                </template>
                <template v-else>
                  <div v-for="u in filteredFollowers" :key="u.userid" class="pick-item"
                    :class="{ active: op.handoverUserid === u.userid }" @click="selectHandover(u.userid, 0)">
                    <span class="pick-name">{{ u.name || u.userid }}</span>
                    <span class="pick-meta mono" style="font-size: 11px">{{ u.userid }}</span>
                  </div>
                  <el-empty v-if="!filteredFollowers.length && !op.loading" description="未找到成员" :image-size="48" />
                </template>
              </el-scrollbar>
            </div>

            <!-- 中：客户多选 -->
            <div class="op-panel panel-wide">
              <div class="panel-title">
                名下客户
                <span class="panel-count">{{ op.customers.length }}</span>
                <div class="panel-actions">
                  <el-checkbox :model-value="allSelected" :indeterminate="partSelected"
                    :disabled="!op.customers.length" @change="toggleAllCustomers">全选</el-checkbox>
                </div>
              </div>
              <el-scrollbar height="320px" v-loading="op.customersLoading">
                <div class="customer-filter" v-if="op.customers.length > 20">
                  <el-input v-model="op.customerKeyword" placeholder="搜索 external_userid" size="small" clearable />
                </div>
                <el-checkbox-group v-model="op.selectedCustomers">
                  <div v-for="c in filteredCustomers" :key="c" class="pick-item checkbox-line">
                    <el-checkbox :value="c"><span class="mono">{{ c }}</span></el-checkbox>
                  </div>
                </el-checkbox-group>
                <el-empty v-if="!op.customers.length && !op.loading"
                  :description="op.handoverUserid ? '该成员名下无可转接客户' : '请先在左侧选择成员'" :image-size="48" />
              </el-scrollbar>
            </div>

            <!-- 右：接替人 -->
            <div class="op-panel">
              <div class="panel-title">接替成员</div>
              <el-scrollbar height="320px" v-loading="op.takeoverLoading">
                <div v-for="u in takeoverCandidates" :key="u.userid" class="pick-item"
                  :class="{ active: op.takeoverUserid === u.userid }" @click="op.takeoverUserid = u.userid">
                  <span class="pick-name">{{ u.name || u.userid }}</span>
                  <span class="pick-meta mono" style="font-size: 11px">{{ u.userid }}</span>
                </div>
                <el-empty v-if="!takeoverCandidates.length && !op.takeoverLoading" description="暂无候选成员" :image-size="48" />
              </el-scrollbar>
            </div>
          </div>

          <el-alert type="warning" :closable="false" show-icon style="margin-top: 14px"
            title="接替人需在企业微信应用可见范围内且完成实名验证，否则该客户将无法发起转接（状态4=好友上限表示接替方客户达到上限）。" />

          <div class="submit-bar">
            <el-input v-if="op.transferType === 'active'" v-model="op.welcomeMsg" type="textarea" :rows="2"
              maxlength="200" show-word-limit placeholder="转接欢迎语（可选）：客户同意接替后发送，如「您好，我是新接手的同事小李，后续由我为您服务～」"
              style="max-width: 560px" />
            <div class="submit-right">
              <span class="picked-summary">
                已选 <b class="hl-num">{{ op.selectedCustomers.length }}</b> 个客户，
                将自动分 <b class="hl-num">{{ batchCount }}</b> 批调用官方接口（每批≤100）
              </span>
              <el-button type="primary" size="large" :disabled="!canExecute" :loading="op.executing" @click="handleExecute">
                立即转接
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- ========== 购买区（未购买 / 已过期） ========== -->
        <el-row v-else :gutter="16" style="margin-top: 16px">
          <!-- 左卡：服务商代办 -->
          <el-col :xs="24" :md="13">
            <el-card shadow="never" class="buy-card h-full">
              <template #header><span class="card-title">方式一 · 服务商代办（我们帮您转）</span></template>

              <div v-if="hasAgentMode" class="agent-body">
                <el-form label-width="82px" label-position="left">
                  <el-form-item label="计费方式">
                    <el-radio-group v-model="buy.agentBillingMode">
                      <el-radio-button v-if="pricing.agent?.perAccount" value="per_account">按离职号计费</el-radio-button>
                      <el-radio-button v-if="pricing.agent?.perTier" value="per_tier">按客户数阶梯</el-radio-button>
                    </el-radio-group>
                  </el-form-item>

                  <!-- 按号：选原跟进号 -->
                  <template v-if="buy.agentBillingMode === 'per_account'">
                    <el-form-item :label="'转粉号码'">
                      <div class="account-pick" v-loading="buy.poolLoading">
                        <el-scrollbar max-height="200px" class="account-list">
                          <el-checkbox-group v-model="buy.selectedAccounts">
                            <div v-for="g in accountPool" :key="g.handoverUserid" class="pick-item checkbox-line">
                              <el-checkbox :value="g.handoverUserid">
                                <span class="mono">{{ g.handoverUserid }}</span>
                                <span class="pick-meta" style="margin-left: 8px">{{ g.customers.length }} 个客户</span>
                              </el-checkbox>
                            </div>
                          </el-checkbox-group>
                          <el-empty v-if="!accountPool.length && !buy.poolLoading" description="当前没有离职待分配客户" :image-size="40" />
                        </el-scrollbar>
                      </div>
                    </el-form-item>
                    <div class="mode-note">{{ pricing.agent?.perAccount?.note }}</div>
                  </template>

                  <!-- 按阶梯：数量 -->
                  <template v-else>
                    <el-form-item label="转接类型">
                      <el-radio-group v-model="buy.agentTransferType">
                        <el-radio value="resigned">离职客户分配</el-radio>
                        <el-radio value="active">在职客户调整</el-radio>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item label="客户数量">
                      <el-input-number v-model="buy.tierCustomerCount" :min="1" :max="100000" step-strictly style="width: 180px" />
                      <span style="margin-left: 10px; font-size: 12px">个</span>
                    </el-form-item>
                    <div class="tier-hint">
                      <template v-for="(t, i) in pricing.agent?.perTier?.tiers || []" :key="t.id">
                        <span class="tier-chip" :class="{ active: matchedTierId === t.id }">
                          {{ t.minCount }}{{ t.maxCount >= 999999 ? '+' : '-' + t.maxCount }} 人 ¥{{ t.price }}
                        </span>
                        <i v-if="i < (pricing.agent.perTier.tiers.length - 1)" style="color:#dcdfe6; margin: 0 2px">|</i>
                      </template>
                    </div>
                  </template>

                  <el-form-item label="备注">
                    <el-input v-model="buy.agentRemark" type="textarea" :rows="2" maxlength="500"
                      placeholder="补充诉求，如：全部转给销售部李四（6003）" />
                  </el-form-item>

                  <el-form-item label="支付方式">
                    <el-radio-group v-model="buy.payType">
                      <el-radio-button value="wechat">微信支付</el-radio-button>
                      <el-radio-button value="alipay">支付宝</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                </el-form>

                <div class="pay-summary">
                  <div class="summary-left">
                    <div class="amount-label">应付金额</div>
                    <div class="amount-num">¥{{ agentTotal }}</div>
                    <div class="amount-desc">{{ agentAmountDesc }}</div>
                  </div>
                  <el-button type="primary" size="large" :loading="buy.submitting" :disabled="agentTotal <= 0" @click="submitAgentOrder">
                    提交工单并支付
                  </el-button>
                </div>
                <div class="buy-tip">付款成功后服务商将在 1 个工作日内执行转接，进度可在下方记录中查看</div>
              </div>
              <el-empty v-else description="代办模式暂未开放，可选择右侧自助套餐" :image-size="60" />
            </el-card>
          </el-col>

          <!-- 右卡：自助套餐 -->
          <el-col :xs="24" :md="11">
            <el-card shadow="never" class="buy-card h-full">
              <template #header><span class="card-title">方式二 · 自助套餐（期内任意转）</span></template>
              <div class="plan-grid">
                <div v-for="p in selfPlans" :key="p.id" class="plan-card"
                  :class="{ recommended: p.recommended }" @click="choosePlan(p)">
                  <div v-if="p.recommended" class="plan-badge">限时推荐</div>
                  <div class="plan-name">{{ p.name }}</div>
                  <div class="plan-price"><span class="rmb">¥</span>{{ p.price }}</div>
                  <div class="plan-cycle">{{ cycleUnit(p.cycle) }}</div>
                  <div class="plan-desc">{{ p.description }}</div>
                  <el-button :type="p.recommended ? 'primary' : 'default'" round style="width: 100%">立即开通</el-button>
                </div>
              </div>
              <div class="buy-tip" style="text-align:center">
                开通后即可在本页自行批量转接，期内不限次数；到期后续费时长自动叠加
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </template>

    <!-- 定价加载失败兜底 -->
    <el-card v-if="!serviceReady" shadow="never" style="margin-top: 16px">
      <el-skeleton :rows="4" animated />
    </el-card>

    <!-- ==================== 记录区（常显） ==================== -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <WecomHeader tab-name="customer-convert">
          我的转粉记录
          <template #actions>
            <el-select v-model="rec.status" placeholder="状态" clearable style="width: 130px" @change="fetchOrders">
              <el-option label="全部" value="" />
              <el-option label="待支付" value="pending" />
              <el-option label="已支付·待处理" value="paid" />
              <el-option label="已发起" value="submitted" />
              <el-option label="部分成功" value="partial" />
              <el-option label="全部成功" value="success" />
              <el-option label="有客户拒绝" value="rejected" />
              <el-option label="已关闭" value="closed" />
            </el-select>
            <el-button icon="Refresh" circle size="small" @click="fetchOrders" />
          </template>
        </WecomHeader>
      </template>

      <el-table :data="orders" v-loading="ordersLoading" stripe size="default">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-box">
              <div v-if="row.priceSnapshot" class="expand-section">
                <div class="expand-label">计费明细</div>
                <span v-if="row.billingMode === 'per_account'">按号 ¥{{ row.priceSnapshot.unitPrice }}/个 × {{ row.priceSnapshot.accountCount }} 号</span>
                <span v-else-if="row.billingMode === 'per_tier'">{{ row.priceSnapshot.tierName }}（¥{{ row.priceSnapshot.price }}）</span>
                <span v-else-if="row.billingMode === 'self_plan'">{{ row.priceSnapshot.planName }}</span>
              </div>
              <div v-if="row.counts" class="expand-section">
                <div class="expand-label">接替结果</div>
                <el-tag type="success" size="small">完毕 {{ row.counts.success || 0 }}</el-tag>
                <el-tag type="primary" size="small">等待 {{ row.counts.waiting || 0 }}</el-tag>
                <el-tag type="danger" size="small">拒绝 {{ row.counts.rejected || 0 }}</el-tag>
                <el-tag type="warning" size="small">好友上限 {{ row.counts.limit || 0 }}</el-tag>
              </div>
              <div v-if="row.agentRemark" class="expand-section"><div class="expand-label">我的备注</div>{{ row.agentRemark }}</div>
              <div v-if="row.adminRemark" class="expand-section"><div class="expand-label">服务商备注</div>{{ row.adminRemark }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="单号" width="175" show-overflow-tooltip />
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.transferType === 'resigned' ? 'danger' : 'primary'" size="small" effect="plain">
              {{ row.transferType === 'resigned' ? '离职转接' : '在职转接' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="模式" width="85" align="center">
          <template #default="{ row }">
            <span>{{ row.mode === 'agent' ? '代办' : '自助' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="跟进人" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.handoverName || row.handoverUserid || '-' }}</template>
        </el-table-column>
        <el-table-column label="客户数" width="95" align="center">
          <template #default="{ row }">
            <span v-if="row.successCount > 0" style="color: #67c23a; font-weight: 600">{{ row.successCount }}</span>
            <span v-else>-</span>
            <span style="color: #909399">/{{ row.customerCount || row.priceSnapshot?.accountCount || '?' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="125" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.status === 'pending' && row.payStatus !== undefined && row.payStatus !== 'paid'"
              content="未支付，超过24小时未支付可能失效" placement="top">
              <el-tag type="warning" size="small">待支付</el-tag>
            </el-tooltip>
            <el-tag v-else :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewOrder(row)">明细</el-button>
            <el-popconfirm v-if="row.status === 'pending'" title="撤销后工单将关闭，确定？" @confirm="cancelOrder(row)">
              <template #reference>
                <el-button link type="danger" size="small">撤销</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination v-model:current-page="rec.page" v-model:page-size="rec.pageSize" :total="rec.total"
          :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchOrders" @current-change="fetchOrders" />
      </div>
    </el-card>

    <!-- ==================== 支付二维码弹窗 ==================== -->
    <el-dialog v-model="pay.visible" title="扫码支付" width="420px" :close-on-click-modal="false" @closed="stopPolling">
      <div v-if="!pay.paid" class="pay-box">
        <div class="pay-name">{{ pay.packageName }}</div>
        <div class="pay-amount">¥{{ pay.amount }}</div>
        <el-image v-if="pay.qrCode" :src="pay.qrCode" style="width: 190px; height: 190px" fit="contain">
          <template #error>
            <div class="qr-fallback">二维码加载失败<br />请截图保存订单号联系客服</div>
          </template>
        </el-image>
        <div class="pay-order mono">订单号 {{ pay.orderNo }}</div>
        <div class="pay-polling">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在等待支付结果（约3秒检测一次）…
        </div>
      </div>
      <el-result v-else icon="success" :title="paySuccessTitle" sub-title="">
        <template #extra>
          <el-button type="primary" @click="onPayDoneRefresh">{{ payDoneBtnText }}</el-button>
        </template>
      </el-result>
    </el-dialog>

    <!-- 订单明细弹窗 -->
    <el-dialog v-model="detailVisible" title="转接明细" width="680px">
      <template v-if="detailData">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="单号">{{ detailData.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(detailData.status)" size="small">{{ statusLabel(detailData.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="原跟进人">{{ detailData.handoverName || detailData.handoverUserid || '-' }}</el-descriptions-item>
          <el-descriptions-item label="接替人">{{ detailData.takeoverName || detailData.takeoverUserid || '-' }}</el-descriptions-item>
          <el-descriptions-item label="批次">{{ detailData.batchCount || '-' }} 批</el-descriptions-item>
          <el-descriptions-item label="最近同步">{{ formatDate(detailData.lastSyncAt) }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detailCounts" class="count-badges">
          <el-tag type="success" size="small">接替完毕 {{ detailCounts.success || 0 }}</el-tag>
          <el-tag type="primary" size="small">等待接替 {{ detailCounts.waiting || 0 }}</el-tag>
          <el-tag type="danger" size="small">客户拒绝 {{ detailCounts.rejected || 0 }}</el-tag>
          <el-tag type="warning" size="small">好友上限 {{ detailCounts.limit || 0 }}</el-tag>
        </div>
        <el-table :data="detailItems" size="small" max-height="320" style="margin-top: 10px">
          <el-table-column prop="external_userid" label="客户 external_userid" min-width="240" show-overflow-tooltip>
            <template #default="{ row }"><span class="mono">{{ row.external_userid }}</span></template>
          </el-table-column>
          <el-table-column label="接替状态" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="itemStatusType(row.status)" size="small">{{ itemStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="165">
            <template #default="{ row }">
              <span v-if="row.takeover_time">{{ formatDate(row.takeover_time * 1000) }}</span>
              <span v-else-if="row.status === 'waiting'" style="color: #409eff; font-size: 12px">24 小时内自动接替</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!detailItems.length" description="尚未发起或暂无逐客户数据" :image-size="48" />
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'CustomerConvert' })
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import WecomHeader from './components/WecomHeader.vue'
import {
  getConvertStatus, getConvertUnassignedList, getConvertFollowers, getConvertMemberCustomers,
  createConvertAgentOrder, purchaseConvertPlan, executeConvertFan,
  getConvertOrders, getConvertOrderDetail, cancelConvertOrder
} from '@/api/wecom'

// ==================== 字典 ====================
const STATUS_MAP: Record<string, { label: string; type: string }> = {
  pending: { label: '待支付', type: 'warning' },
  paid: { label: '已支付·待处理', type: 'primary' },
  submitted: { label: '已发起', type: 'info' },
  partial: { label: '部分成功', type: 'warning' },
  success: { label: '全部成功', type: 'success' },
  rejected: { label: '有客户拒绝', type: 'danger' },
  failed: { label: '失败', type: 'danger' },
  closed: { label: '已关闭', type: 'info' }
}
const statusLabel = (s: string) => STATUS_MAP[s]?.label || s || '-'
const statusType = (s: string) => (STATUS_MAP[s]?.type || 'info') as any

const ITEM_MAP: Record<string, { label: string; type: string }> = {
  success: { label: '接替完毕', type: 'success' },
  waiting: { label: '等待接替', type: 'primary' },
  rejected: { label: '客户拒绝', type: 'danger' },
  limit: { label: '好友上限', type: 'warning' }
}
const itemStatusLabel = (s: string) => ITEM_MAP[s]?.label || s
const itemStatusType = (s: string) => (ITEM_MAP[s]?.type || 'info') as any

const PLAN_LABEL: Record<string, string> = { monthly: '月卡', quarterly: '季卡', yearly: '年卡' }
const planLabel = (id?: string) => PLAN_LABEL[id || ''] || id || '-'
const cycleUnit = (cycle: string) => ({ monthly: '/ 月卡30天', quarterly: '/ 季卡90天', yearly: '/ 年卡365天' }[cycle] || '')

const formatDate = (d: any) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
const formatUnix = (ts?: number) => (ts ? ts * 1000 : 0)

// ==================== 状态加载 ====================
const loading = ref(true)
const status = ref<any>({})
const perm = computed<any>(() => ({
  purchased: !!status.value?.purchased,
  expired: !!status.value?.expired,
  plan: status.value?.plan
}))
const pricing = computed<any>(() => status.value?.pricing || {})
const serviceReady = computed(() => Object.keys(status.value).length > 0)
const selfActive = computed(() => perm.value.purchased && !perm.value.expired)
const hasAgentMode = computed(() =>
  pricing.value.enabled !== false && !!(pricing.value.agent?.perAccount || pricing.value.agent?.perTier)
)
const selfPlans = computed<any[]>(() =>
  pricing.value.enabled === false ? [] : (pricing.value.selfPlans || [])
)

const fetchStatus = async () => {
  try {
    const res: any = await getConvertStatus()
    if (res) status.value = res
  } catch { /* 保持默认 */ }
}

// ==================== 代办购买表单 ====================
interface AccountGroup { handoverUserid: string; customers: string[]; dimissionTime: number }

const buy = reactive({
  agentBillingMode: '',
  agentTransferType: 'resigned',
  selectedAccounts: [] as string[],
  tierCustomerCount: 100,
  agentRemark: '',
  payType: 'wechat',
  poolLoading: false,
  submitting: false
})
const accountPool = ref<AccountGroup[]>([])
const tierOptions = computed<any[]>(() => pricing.value.agent?.perTier?.tiers || [])

/** 进入购买区时初始化默认计费模式 */
watch(hasAgentMode, (v) => {
  if (!v) return
  if (!buy.agentBillingMode) {
    buy.agentBillingMode = pricing.value.agent?.perAccount ? 'per_account' : 'per_tier'
  }
}, { immediate: true })

/** 按号模式需要待分配池 */
watch([() => buy.agentBillingMode, selfActive], async ([mode]) => {
  if (mode === 'per_account' && !selfActive.value && accountPool.value.length === 0) {
    buy.poolLoading = true
    try {
      const res: any = await getConvertUnassignedList()
      accountPool.value = res?.data?.groups || []
    } catch (e: any) {
      ElMessage.warning(e?.message || '获取待分配列表失败')
    } finally {
      buy.poolLoading = false
    }
  }
}, { immediate: true })

const matchedTier = computed(() =>
  tierOptions.value.find(t => buy.tierCustomerCount >= t.minCount && buy.tierCustomerCount <= t.maxCount)
)
const matchedTierId = computed(() => matchedTier.value?.id || '')
const agentSelectedAccountsInfo = computed(() => {
  const map = new Map(accountPool.value.map(g => [g.handoverUserid, g]))
  return buy.selectedAccounts.map(id => map.get(id)).filter(Boolean) as AccountGroup[]
})
const agentTotal = computed(() => {
  if (buy.agentBillingMode === 'per_account') {
    const n = buy.selectedAccounts.length
    if (!n) return 0
    if (n < (pricing.value.agent?.perAccount?.minAccounts || 1)) return 0
    return Math.round((pricing.value.agent?.perAccount?.unitPrice || 0) * n * 100) / 100
  }
  return matchedTier.value?.price || 0
})
const agentAmountDesc = computed(() => {
  if (buy.agentBillingMode === 'per_account') {
    if (buy.selectedAccounts.length < (pricing.value.agent?.perAccount?.minAccounts || 1)) {
      return `按号计费起转 ${pricing.value.agent?.perAccount?.minAccounts || 1} 个号`
    }
    return `${buy.selectedAccounts.length} 个号 × ¥${pricing.value.agent?.perAccount?.unitPrice}`
  }
  if (matchedTier.value) return `命中「${matchedTier.value.name}」一口价`
  return '请输入客户数量以匹配档位'
})

const submitAgentOrder = async () => {
  if (agentTotal.value <= 0) return
  // 组装备注附上所选账号清单（服务商代执行依据）
  let remark = buy.agentRemark
  if (buy.agentBillingMode === 'per_account' && agentSelectedAccountsInfo.value.length) {
    const list = agentSelectedAccountsInfo.value
      .map(g => `${g.handoverUserid}(${g.customers.length})`).join('、')
    remark = `[转粉号码] ${list}` + (remark ? `\n${remark}` : '')
  }
  buy.submitting = true
  try {
    const res: any = await createConvertAgentOrder({
      billingMode: buy.agentBillingMode as 'per_account' | 'per_tier',
      accountCount: buy.agentBillingMode === 'per_account' ? buy.selectedAccounts.length : undefined,
      customerCount: buy.agentBillingMode === 'per_tier' ? buy.tierCustomerCount : undefined,
      handoverUserid: buy.agentBillingMode === 'per_account' && agentSelectedAccountsInfo.value.length
        ? agentSelectedAccountsInfo.value[0].handoverUserid : undefined,
      transferType: buy.agentTransferType as 'active' | 'resigned',
      agentRemark: remark,
      payType: buy.payType
    })
    openPayDialog(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '提交工单失败')
  } finally {
    buy.submitting = false
  }
}

// ==================== 自助套餐购买 ====================
const choosePlan = async (plan: any) => {
  try {
    await ElMessageBox.confirm(
      `开通「${plan.name}」¥${plan.price}（${plan.description || '期内任意转'}），确认前往支付？`,
      '开通自助套餐',
      { confirmButtonText: '去支付', cancelButtonText: '再想想', type: 'info' }
    )
  } catch { return }
  try {
    const res: any = await purchaseConvertPlan({ planId: plan.id, payType: 'wechat' })
    openPayDialog(res, true)
  } catch (e: any) {
    ElMessage.error(e?.message || '下单失败')
  }
}

// ==================== 支付弹窗与轮询 ====================
const pay = reactive({ visible: false, paid: false, orderNo: '', amount: 0, packageName: '', qrCode: '', isPlan: false })
let pollTimer: ReturnType<typeof setInterval> | null = null

const openPayDialog = (data: any, isPlan = false) => {
  if (!data?.orderNo) {
    ElMessage.error('创建订单失败，请稍后重试')
    return
  }
  Object.assign(pay, {
    visible: true, paid: false, orderNo: data.orderNo,
    amount: data.amount, packageName: data.packageName, qrCode: data.qrCode || '', isPlan
  })
  startPolling()
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const res: any = await getConvertOrderDetail(pay.orderNo)
      const paid = res?.payStatus === 'paid' || res?.status === 'paid' || res?.status === 'submitted'
      if (paid && !pay.paid) {
        pay.paid = true
        stopPolling()
      }
    } catch { /* 静默轮询 */ }
  }, 3000)
  setTimeout(stopPolling, 5 * 60 * 1000)
}
const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

const paySuccessTitle = computed(() =>
  pay.isPlan ? '🎉 开通成功！自助转粉已解锁' : '🎉 支付成功！工单已提交'
)
const payDoneBtnText = computed(() => (pay.isPlan ? '开始使用' : '知道了'))

const onPayDoneRefresh = async () => {
  pay.visible = false
  if (pay.isPlan) {
    await fetchStatus()
    window.dispatchEvent(new CustomEvent('wecom-package-changed'))
  } else {
    fetchOrders()
  }
}

// ==================== 自助操作区 ====================
interface FollowerItem { userid: string; name: string; available?: boolean }

const op = reactive({
  transferType: 'resigned',
  handoverList: [] as Array<{ handoverUserid: string; customers: string[]; dimissionTime: number }>,
  followers: [] as FollowerItem[],
  handoverUserid: '',
  takeoverUserid: '',
  welcomeMsg: '',
  customers: [] as string[],
  selectedCustomers: [] as string[],
  customerKeyword: '',
  handoverKeyword: '',
  loading: false,
  customersLoading: false,
  takeoverLoading: false,
  executing: false
})

const batchCount = computed(() => Math.ceil(op.selectedCustomers.length / 100) || 0)
const canExecute = computed(() => !!op.handoverUserid && !!op.takeoverUserid && op.selectedCustomers.length > 0)

const filteredFollowers = computed(() => {
  const kw = op.handoverKeyword.trim()
  if (!kw) return op.followers
  return op.followers.filter(u => (u.name || '').includes(kw) || u.userid.includes(kw))
})
const filteredCustomers = computed(() => {
  const kw = op.customerKeyword.trim()
  if (!kw) return op.customers
  return op.customers.filter(c => c.includes(kw))
})
const allSelected = computed(() =>
  op.customers.length > 0 && op.selectedCustomers.length === op.customers.length
)
const partSelected = computed(() =>
  op.selectedCustomers.length > 0 && op.selectedCustomers.length < op.customers.length
)
const toggleAllCustomers = (val: any) => {
  op.selectedCustomers = val ? [...op.customers] : []
}
const takeoverCandidates = computed(() =>
  op.followers.filter(u => u.userid !== op.handoverUserid)
)

const loadOpData = async () => {
  op.loading = true
  try {
    if (op.transferType === 'resigned') {
      const res: any = await getConvertUnassignedList()
      op.handoverList = res?.data?.groups || []
    } else {
      const res: any = await getConvertFollowers()
      op.followers = res?.data || []
    }
  } catch (e: any) {
    ElMessage.warning(e?.message || '获取数据失败')
  } finally {
    op.loading = false
  }
}

const ensureTakeoverList = async () => {
  if (op.followers.length > 0 || op.takeoverLoading) return
  op.takeoverLoading = true
  try {
    const res: any = await getConvertFollowers()
    op.followers = res?.data || []
  } finally {
    op.takeoverLoading = false
  }
}

const selectHandover = async (userid: string, _count: number) => {
  op.handoverUserid = userid
  op.selectedCustomers = []
  op.customersLoading = true
  try {
    const res: any = await getConvertMemberCustomers({ userid, type: op.transferType as any })
    op.customers = res?.data?.externalUserids || []
  } catch (e: any) {
    op.customers = []
    ElMessage.warning(e?.message || '获取客户列表失败')
  } finally {
    op.customersLoading = false
  }
  if (op.transferType === 'resigned') await ensureTakeoverList()
}

const onOpTypeChange = () => {
  op.handoverUserid = ''
  op.takeoverUserid = ''
  op.welcomeMsg = ''
  op.selectedCustomers = []
  op.customers = []
  op.followers = []
  loadOpData()
}

const handleExecute = async () => {
  if (!canExecute.value) return
  const ok = await ElMessageBox.confirm(
    `确认为 ${op.selectedCustomers.length} 个客户发起${op.transferType === 'resigned' ? '离职' : '在职'}转接？\n在职转接受官方 90 天内同客户最多 2 次限制，请谨慎勾选。`,
    '发起转接',
    { confirmButtonText: '确认转接', cancelButtonText: '取消', type: 'warning' }
  ).then(() => true).catch(() => false)
  if (!ok) return

  op.executing = true
  try {
    const handoverFollower = op.followers.find(u => u.userid === op.handoverUserid)
    const takeoverFollower = op.followers.find(u => u.userid === op.takeoverUserid)
    const res: any = await executeConvertFan({
      transferType: op.transferType as 'active' | 'resigned',
      handoverUserid: op.handoverUserid,
      handoverName: handoverFollower?.name,
      takeoverUserid: op.takeoverUserid,
      takeoverName: takeoverFollower?.name,
      externalUserids: op.selectedCustomers,
      transferSuccessMsg: op.transferType === 'active' ? (op.welcomeMsg || undefined) : undefined
    })
    stopPolling()
    ElMessageBox.alert(
      `${res?.message || '转接申请已发起'}。\n可在「我的转粉记录」查看逐客户接替状态。`,
      '发起成功',
      { confirmButtonText: '好的', type: 'success' }
    ).catch(() => {})
    // 重置选择并刷新记录
    op.selectedCustomers = []
    op.customers = []
    op.handoverUserid = ''
    fetchOrders()
    if (op.transferType === 'resigned') loadOpData()
  } catch (e: any) {
    ElMessage.error(e?.message || '转接发起失败')
  } finally {
    op.executing = false
  }
}

// ==================== 我的记录 ====================
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const rec = reactive({ status: '', page: 1, pageSize: 10, total: 0 })

const fetchOrders = async () => {
  ordersLoading.value = true
  try {
    const res: any = await getConvertOrders({
      status: rec.status || undefined, page: rec.page, pageSize: rec.pageSize
    })
    if (res?.data) {
      orders.value = res.data.list || []
      rec.total = res.data.total || 0
      // 补充支付状态标签（前5条 pending 的简单查询）
      for (const o of orders.value.filter(x => x.status === 'pending').slice(0, 5)) {
        getConvertOrderDetail(o.orderNo).then((d: any) => { o.payStatus = d?.payStatus || '' }).catch(() => {})
      }
    }
  } finally {
    ordersLoading.value = false
  }
}

const cancelOrder = async (row: any) => {
  try {
    await cancelConvertOrder(row.orderNo)
    ElMessage.success('工单已撤销')
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '撤销失败')
  }
}

const viewOrder = async (row: any) => {
  try {
    const res: any = await getConvertOrderDetail(row.orderNo)
    detailData.value = res
    detailVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '获取明细失败')
  }
}
const detailVisible = ref(false)
const detailData = ref<any>(null)
const detailCounts = computed(() => detailData.value?.resultDetail?.counts || null)
const detailItems = computed<any[]>(() => {
  const items = detailData.value?.resultDetail?.items
  return Array.isArray(items) ? items.slice().sort((a: any, b: any) => (a.status || '').localeCompare(b.status || '')) : []
})

// ==================== 初始化 ====================
onMounted(async () => {
  await fetchStatus()
  fetchOrders()
  if (selfActive.value) loadOpData()
})
onUnmounted(stopPolling)
</script>

<style scoped lang="scss">
.wecom-customer-convert {
  .section-card { margin-top: 16px; }
  .mono { font-family: Consolas, Monaco, monospace; font-size: 12px; }

  /* ---------- Hero ---------- */
  .hero-card { overflow: hidden; }
  .hero-body {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .hero-left { display: flex; align-items: center; gap: 16px; }
  .hero-icon {
    width: 56px; height: 56px; border-radius: 14px;
    background: linear-gradient(135deg, #409eff 0%, #7c4dff 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; color: #fff;
  }
  .hero-title { font-size: 18px; font-weight: 700; margin: 0; color: #303133; display:flex; align-items:center; }
  .hero-desc { font-size: 13px; color: #909399; margin-top: 4px; }
  .hero-rules { display: flex; flex-direction: column; gap: 8px; justify-content: center; }
  .rule-tag {
    font-size: 12px; color: #606266;
    background: #f4f7fa; border-radius: 6px; padding: 4px 10px;
    line-height: 1.4;
  }
  .plan-active-bar {
    margin-top: 14px; padding: 10px 14px;
    background: #f0faf4; border: 1px solid #d3f0dd; border-radius: 8px;
    font-size: 13px; color: #4e5969;
  }

  /* ---------- 购买区 ---------- */
  .h-full { height: 100%; }
  .card-title { font-weight: 600; color: #303133; }
  .buy-card :deep(.el-card__body) { padding-bottom: 18px; }

  .mode-note, .buy-tip { font-size: 12px; color: #909399; margin: 6px 0 0 82px; line-height: 1.6; }
  .buy-tip { margin: 14px 0 0; text-align: left; }
  .tier-hint { margin-left: 82px; font-size: 12px; color: #606266; line-height: 2; }
  .tier-chip {
    display: inline-block; padding: 2px 10px; border-radius: 12px;
    background: #f4f7fa; margin-right: 4px; transition: all .2s;
    &.active { background: #409eff; color: #fff; font-weight: 600; }
  }
  .account-pick { width: 100%; }
  .account-list { border: 1px solid var(--el-border-color-lighter); border-radius: 6px; }

  .pay-summary {
    margin-top: 18px; padding: 14px 18px;
    background: linear-gradient(135deg, #f7f9fc, #f0f6ff);
    border: 1px solid #dbe7ff; border-radius: 10px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .amount-label { font-size: 12px; color: #86909c; }
  .amount-num { font-size: 26px; font-weight: 800; color: #f5222d; line-height: 1.2; }
  .amount-desc { font-size: 12px; color: #86909c; }

  /* 套餐卡片 */
  .plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .plan-card {
    position: relative;
    border: 2px solid #e5e6eb; border-radius: 12px; padding: 18px 14px;
    text-align: center; cursor: pointer; transition: all .25s; background: #fff;
    &:hover { border-color: #409eff; transform: translateY(-3px); box-shadow: 0 6px 18px rgba(64,158,255,.15); }
    &.recommended { border-color: #409eff; background: linear-gradient(180deg, #f0f7ff 0%, #fff 45%); }
  }
  .plan-badge {
    position: absolute; top: -1px; right: -1px;
    background: linear-gradient(135deg,#409eff,#1677ff);
    color: #fff; font-size: 11px; font-weight: 600;
    padding: 2px 10px; border-radius: 0 10px 0 10px;
  }
  .plan-name { font-size: 15px; font-weight: 700; color: #303133; }
  .plan-price { margin-top: 6px; font-size: 26px; font-weight: 800; color: #07c160; .rmb{font-size:14px;} }
  .plan-cycle { font-size: 12px; color: #909399; margin-top: 2px; }
  .plan-desc { font-size: 12px; color: #86909c; margin: 10px 0 14px; min-height: 34px; line-height: 1.5; }

  /* ---------- 自助操作 ---------- */
  .op-layout { display: flex; gap: 12px; min-height: 360px; }
  .op-panel {
    flex: 1; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; overflow: hidden;
  }
  .panel-wide { flex: 1.7; }
  .panel-title {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; background: var(--el-fill-color-light);
    font-size: 13px; font-weight: 600; color: #4e5969;
  }
  .panel-actions { margin-left: auto; }
  .panel-count { font-weight: normal; color: #909399; font-size: 12px; }
  .customer-filter { padding: 8px 12px 0; }
  .pick-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; cursor: pointer; transition: background-color .15s; font-size: 13px;
    &:hover { background: var(--el-fill-color-light); }
    &.active { background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: 500; }
    &.checkbox-line { justify-content: flex-start; padding-top: 5px; padding-bottom: 5px; }
  }
  .pick-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pick-meta { font-size: 12px; color: #909399; flex-shrink: 0; }

  .submit-bar {
    margin-top: 16px; display: flex; align-items: flex-end;
    justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .submit-right { display: flex; align-items: center; gap: 16px; margin-left: auto; }
  .picked-summary { font-size: 13px; color: #606266; }
  .hl-num { color: var(--el-color-primary); font-size: 16px; }

  /* ---------- 记录 ---------- */
  .pager { margin-top: 14px; display: flex; justify-content: flex-end; }
  .expand-box { padding: 8px 24px 12px; display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: #606266; }
  .expand-section { line-height: 1.9; }
  .expand-label { color: #909399; margin-bottom: 2px; }
  .count-badges { display: flex; gap: 10px; margin-top: 12px; }

  /* ---------- 支付弹窗 ---------- */
  .pay-box { text-align: center; padding: 4px 0; }
  .pay-name { color: #606266; font-size: 13px; }
  .pay-amount { font-size: 32px; font-weight: 800; color: #f5222d; margin: 8px 0; }
  .qr-fallback { padding: 46px 8px; color: #909399; font-size: 12px; line-height: 1.8; }
  .pay-order { margin-top: 8px; color: #909399; font-size: 12px; }
  .pay-polling { margin-top: 10px; color: #909399; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; }

  @media (max-width: 900px) {
    .op-layout { flex-direction: column; }
    .panel-wide { flex: 1; }
  }
}
</style>
