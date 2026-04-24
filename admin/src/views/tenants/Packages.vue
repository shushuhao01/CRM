<template>
  <div class="page-container">
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>套餐管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增套餐
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="loadPackages">
        <el-tab-pane label="SaaS云端版" name="saas" />
        <el-tab-pane label="私有部署版" name="private" />
      </el-tabs>

      <div v-loading="loading" class="package-grid">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="package-card"
          :class="{ recommended: pkg.is_recommended, trial: pkg.is_trial, disabled: !pkg.status }"
        >
          <div v-if="pkg.is_recommended" class="recommend-badge">推荐</div>
          <div v-if="pkg.is_trial" class="trial-badge">免费试用</div>
          <div v-if="!pkg.status" class="disabled-badge">已禁用</div>

          <div class="package-header">
            <h3>{{ pkg.name }}</h3>
            <div class="price">
              <span v-if="pkg.price === 0" class="amount free">免费</span>
              <span v-else class="amount">¥{{ pkg.price.toLocaleString() }}</span>
              <span class="unit">/{{ getBillingText(pkg.billing_cycle) }}</span>
            </div>
            <!-- SaaS年付优惠信息 -->
            <div v-if="pkg.price > 0 && pkg.billing_cycle === 'monthly' && hasYearlyPromo(pkg)" class="yearly-promo-info">
              <el-tag type="warning" size="small" effect="dark" round>
                {{ getYearlyPromoLabel(pkg) }}
              </el-tag>
              <span class="yearly-price-text">年付 ¥{{ getYearlyTotalPrice(pkg) }}</span>
            </div>
            <!-- 私有部署年度授权价 -->
            <div v-if="pkg.type === 'private' && pkg.yearly_price && Number(pkg.yearly_price) > 0" class="private-annual-info">
              <div class="private-annual-tag">
                <span class="annual-label">年度授权</span>
                <span class="annual-price">{{ Number(pkg.yearly_price).toLocaleString() }}/年</span>
              </div>
              <span class="private-annual-saving">首年省 {{ (Number(pkg.price) - Number(pkg.yearly_price)).toLocaleString() }}</span>
            </div>
            <!-- 订阅模式标签 -->
            <div v-if="pkg.subscription_enabled" class="subscription-info">
              <el-tag type="success" size="small" effect="dark" round>
                🔄 支持订阅{{ pkg.subscription_discount_rate > 0 ? `(${(10 - pkg.subscription_discount_rate / 10).toFixed(1)}折)` : '' }}
              </el-tag>
              <span class="subscription-channels-text">
                {{ pkg.subscription_billing_cycle === 'monthly' ? '按月' : pkg.subscription_billing_cycle === 'yearly' ? '按年' : '按月/年' }}
                ·
                {{ pkg.subscription_channels === 'wechat' ? '微信代扣' : pkg.subscription_channels === 'alipay' ? '支付宝扣款' : '微信/支付宝' }}
              </span>
            </div>
          </div>

          <div class="package-info">
            <div class="info-item" v-if="pkg.user_limit_mode === 'both'">
              <el-icon><User /></el-icon>
              <span>{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }} 用户</span>
              <el-tag size="small" type="warning" style="margin-left:4px">限注</el-tag>
              <span style="margin-left:8px">{{ pkg.max_online_seats }} 席位</span>
              <el-tag size="small" type="success" style="margin-left:4px">限在</el-tag>
            </div>
            <div class="info-item" v-else-if="pkg.user_limit_mode === 'online'">
              <el-icon><User /></el-icon>
              <span>{{ pkg.max_online_seats }} 在线席位</span>
              <el-tag size="small" type="success" style="margin-left:4px">限在</el-tag>
            </div>
            <div class="info-item" v-else>
              <el-icon><User /></el-icon>
              <span>{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }} 用户</span>
              <el-tag size="small" type="warning" style="margin-left:4px">限注</el-tag>
            </div>
            <div class="info-item" v-if="pkg.max_storage_gb > 0">
              <el-icon><Files /></el-icon>
              <span>{{ pkg.max_storage_gb }}GB 存储</span>
            </div>
          </div>

          <div class="package-features">
            <div v-for="f in pkg.features" :key="f" class="feature-item">
              <el-icon><Check /></el-icon>{{ f }}
            </div>
          </div>

          <div class="package-modules" v-if="pkg.modules?.length">
            <div class="modules-label">
              授权模块
              <el-tag size="small" type="info" style="margin-left: 6px;">{{ pkg.modules.length }}/{{ crmModuleOptions.length }}</el-tag>
            </div>
            <div class="modules-tags">
              <el-tag v-for="mid in pkg.modules" :key="mid" size="small" type="info" effect="plain">
                {{ getModuleName(mid) }}
              </el-tag>
            </div>
          </div>
          <div class="package-modules" v-else>
            <div class="modules-label">
              授权模块 <el-tag size="small" type="warning" style="margin-left: 6px;">未配置</el-tag>
            </div>
          </div>

          <div class="package-meta">
            <el-tag size="small" :type="pkg.is_visible ? 'success' : 'info'">
              {{ pkg.is_visible ? '官网显示' : '官网隐藏' }}
            </el-tag>
            <span class="sort-order">排序: {{ pkg.sort_order }}</span>
          </div>

          <div class="package-actions">
            <el-button type="primary" text @click="handleEdit(pkg)">编辑</el-button>
            <el-button :type="pkg.status ? 'warning' : 'success'" text @click="handleToggleStatus(pkg)">
              {{ pkg.status ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" text @click="handleDelete(pkg)">删除</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingId ? '编辑套餐' : '新增套餐'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="form.name" placeholder="如：基础版" />
        </el-form-item>
        <el-form-item label="套餐代码" prop="code">
          <el-input v-model="form.code" placeholder="如：SAAS_BASIC" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="套餐类型" prop="type">
          <el-select v-model="form.type" :disabled="!!editingId">
            <el-option label="SaaS云端版" value="saas" />
            <el-option label="私有部署版" value="private" />
          </el-select>
        </el-form-item>
        <el-form-item label="套餐描述">
          <el-input v-model="form.description" type="textarea" rows="2" :placeholder="form.type === 'saas' ? '如：适合小型团队起步' : '如：适合中型企业私有化部署'" />
        </el-form-item>

        <!-- ==================== SaaS 云端版特有配置 ==================== -->
        <template v-if="form.type === 'saas'">
          <el-divider content-position="left">💰 SaaS 定价配置</el-divider>
          <el-form-item label="月付价格" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 180px" />
            <span style="margin-left: 8px; color: #909399;">元/月</span>
          </el-form-item>
          <el-form-item label="计费周期">
            <el-select v-model="form.billing_cycle" style="width: 180px">
              <el-option label="月付" value="monthly" />
              <el-option label="年付" value="yearly" />
            </el-select>
          </el-form-item>

          <!-- 年付优惠配置（仅月付套餐且价格>0时显示） -->
          <div v-if="form.billing_cycle === 'monthly' && form.price > 0" class="yearly-promo-section">
            <el-divider content-position="left">🎁 年付优惠配置</el-divider>
            <el-form-item label="优惠方式">
              <el-radio-group v-model="yearlyPromoType" size="small">
                <el-radio-button label="none">不设置</el-radio-button>
                <el-radio-button label="bonus">赠送月数</el-radio-button>
                <el-radio-button label="discount">折扣优惠</el-radio-button>
                <el-radio-button label="fixed">固定年价</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="yearlyPromoType === 'bonus'" label="赠送月数">
              <el-input-number v-model="form.yearly_bonus_months" :min="1" :max="6" />
              <span style="margin-left: 8px; color: #909399;">个月（年付即送，相当于付{{ 12 - form.yearly_bonus_months }}个月价格）</span>
            </el-form-item>
            <el-form-item v-if="yearlyPromoType === 'discount'" label="折扣比例">
              <el-input-number v-model="form.yearly_discount_rate" :min="1" :max="50" :precision="1" />
              <span style="margin-left: 8px; color: #909399;">%（如20即8折，16.7即约8.3折）</span>
            </el-form-item>
            <el-form-item v-if="yearlyPromoType === 'fixed'" label="年付总价">
              <el-input-number v-model="form.yearly_price" :min="0" :precision="2" style="width: 180px" />
              <span style="margin-left: 8px; color: #909399;">元/年</span>
            </el-form-item>
            <!-- 年付价格预览 -->
            <el-form-item v-if="yearlyPromoType !== 'none'" label="价格预览">
              <div class="price-preview">
                <div class="preview-row">
                  <span class="label">月付价格</span>
                  <span>¥{{ form.price }}/月</span>
                </div>
                <div class="preview-row">
                  <span class="label">年付原价</span>
                  <span class="original">¥{{ (form.price * 12).toFixed(2) }}</span>
                </div>
                <div class="preview-row highlight">
                  <span class="label">年付实付</span>
                  <strong>¥{{ computedYearlyTotal.toFixed(2) }}</strong>
                  <span class="saving">省 ¥{{ computedYearlySaving.toFixed(2) }}</span>
                </div>
                <div class="preview-row">
                  <span class="label">折算月价</span>
                  <span>¥{{ computedYearlyMonthly.toFixed(2) }}/月</span>
                </div>
                <div v-if="yearlyPromoType === 'bonus'" class="preview-row tip">
                  官网显示：🎁 年付送{{ form.yearly_bonus_months }}个月 = {{ 12 + form.yearly_bonus_months }}个月有效期
                </div>
                <div v-if="yearlyPromoType === 'discount'" class="preview-row tip">
                  官网显示：🏷️ 年付{{ (10 - form.yearly_discount_rate / 10).toFixed(1) }}折优惠
                </div>
              </div>
            </el-form-item>
          </div>

          <el-divider content-position="left">📦 SaaS 资源配置</el-divider>
          <el-form-item label="有效期">
            <el-input-number v-model="form.duration_days" :min="1" style="width: 150px" />
            <span style="margin-left: 8px; color: #909399;">天（月付套餐通常30天）</span>
          </el-form-item>
          <el-form-item label="用户限制模式">
            <el-radio-group v-model="form.user_limit_mode" size="small">
              <el-radio-button label="total">仅限注册用户数</el-radio-button>
              <el-radio-button label="online">仅限在线席位</el-radio-button>
              <el-radio-button label="both">双模式（租户自选）</el-radio-button>
            </el-radio-group>
            <div style="margin-top: 4px; color: #909399; font-size: 12px;">
              <template v-if="form.user_limit_mode === 'online'">按同时在线人数限制，注册用户不限</template>
              <template v-else-if="form.user_limit_mode === 'both'">同时配置两种限制数量，租户购买后可自行选择限制方式</template>
              <template v-else>按总注册用户数限制</template>
            </div>
          </el-form-item>
          <el-form-item v-if="form.user_limit_mode === 'total' || form.user_limit_mode === 'both'" label="用户数上限">
            <el-input-number v-model="form.max_users" :min="1" style="width: 150px" />
            <span style="margin-left: 8px; color: #909399;">个用户{{ form.user_limit_mode === 'both' ? '（选择限注册时生效）' : '' }}</span>
          </el-form-item>
          <el-form-item v-if="form.user_limit_mode === 'online' || form.user_limit_mode === 'both'" label="在线席位数">
            <el-input-number v-model="form.max_online_seats" :min="1" style="width: 150px" />
            <span style="margin-left: 8px; color: #909399;">个同时在线用户{{ form.user_limit_mode === 'both' ? '（选择限在线时生效）' : '' }}</span>
          </el-form-item>
          <el-form-item label="存储空间">
            <el-input-number v-model="form.max_storage_gb" :min="0" style="width: 150px" />
            <span style="margin-left: 8px; color: #909399;">GB</span>
          </el-form-item>
        </template>

        <!-- ==================== 私有部署版特有配置 ==================== -->
        <template v-if="form.type === 'private'">
          <el-divider content-position="left">💰 私有部署定价</el-divider>
          <el-form-item label="永久买断价" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 180px" />
            <span style="margin-left: 8px; color: #909399;">元（一次性买断，永久授权）</span>
          </el-form-item>
          <el-form-item label="年度授权价">
            <el-input-number v-model="form.yearly_price" :min="0" :precision="2" style="width: 180px" :placeholder="'不填则不提供年度版'" />
            <span style="margin-left: 8px; color: #909399;">元/年（不填则不提供年度版）</span>
          </el-form-item>
          <!-- 双价格预览 -->
          <el-form-item v-if="form.price > 0 && form.yearly_price && form.yearly_price > 0" label="价格预览">
            <div class="price-preview">
              <div class="preview-row">
                <span class="label">永久买断</span>
                <strong>¥{{ form.price.toFixed(2) }}</strong>
                <span style="color: #909399; font-size: 12px;">（一次性）</span>
              </div>
              <div class="preview-row">
                <span class="label">年度授权</span>
                <strong>¥{{ (form.yearly_price as number).toFixed(2) }}</strong>
                <span style="color: #909399; font-size: 12px;">/ 年</span>
              </div>
              <div class="preview-row highlight">
                <span class="label">年度折算</span>
                <span>约{{ (((form.yearly_price as number) / form.price) * 10).toFixed(1) }}折（对比永久价）</span>
                <span class="saving">首年省 ¥{{ (form.price - (form.yearly_price as number)).toFixed(0) }}</span>
              </div>
              <div class="preview-row tip">
                💡 约 {{ Math.ceil(form.price / (form.yearly_price as number)) }} 年后年度累计超过永久买断价，适合先试用再决定
              </div>
            </div>
          </el-form-item>
          <el-divider content-position="left">🏢 私有部署资源</el-divider>
          <el-form-item label="用户限制模式">
            <el-radio-group v-model="form.user_limit_mode" size="small">
              <el-radio-button label="total">仅限注册用户数</el-radio-button>
              <el-radio-button label="online">仅限在线席位</el-radio-button>
              <el-radio-button label="both">双模式（客户自选）</el-radio-button>
            </el-radio-group>
            <div style="margin-top: 4px; color: #909399; font-size: 12px;">
              <template v-if="form.user_limit_mode === 'online'">按同时在线人数限制，注册用户不限</template>
              <template v-else-if="form.user_limit_mode === 'both'">同时配置两种限制，客户可自行切换</template>
              <template v-else>按总注册用户数限制</template>
            </div>
          </el-form-item>
          <el-form-item v-if="form.user_limit_mode === 'total' || form.user_limit_mode === 'both'" label="授权用户数">
            <el-input-number v-model="form.max_users" :min="1" :max="99999" style="width: 150px" />
            <el-checkbox v-model="unlimitedUsers" style="margin-left: 12px;" @change="onUnlimitedUsersChange">不限用户</el-checkbox>
          </el-form-item>
          <el-form-item v-if="form.user_limit_mode === 'online' || form.user_limit_mode === 'both'" label="在线席位数">
            <el-input-number v-model="form.max_online_seats" :min="1" style="width: 150px" />
            <span style="margin-left: 8px; color: #909399;">个席位{{ form.user_limit_mode === 'both' ? '（选择限在线时生效）' : '' }}</span>
          </el-form-item>
          <el-form-item label="存储空间">
            <el-input-number v-model="form.max_storage_gb" :min="0" style="width: 150px" />
            <span style="margin-left: 8px; color: #909399;">GB（私有部署通常不限）</span>
          </el-form-item>
        </template>

        <!-- ==================== 订阅付费配置（SaaS套餐始终显示） ==================== -->
        <div v-if="form.type === 'saas'" class="subscription-section">
          <el-divider content-position="left">🔄 订阅付费配置</el-divider>
          <!-- 不满足条件时的提示 -->
          <div v-if="form.is_trial || form.price <= 0" style="padding: 8px 12px;">
            <el-alert
              :title="form.is_trial ? '试用套餐不支持订阅模式' : '请先设置月付价格（大于0）后可开启订阅'"
              type="info" :closable="false" show-icon />
          </div>
          <!-- 满足条件时的订阅配置 -->
          <template v-else>
            <el-form-item label="支持订阅">
              <el-switch v-model="form.subscription_enabled" active-text="开启" inactive-text="关闭" />
              <span style="margin-left: 12px; color: #909399; font-size: 12px;">开启后官网支付时默认推荐订阅模式</span>
            </el-form-item>
            <template v-if="form.subscription_enabled">
              <el-form-item label="订阅周期">
                <el-radio-group v-model="form.subscription_billing_cycle" size="small">
                  <el-radio-button label="monthly">按月订阅</el-radio-button>
                  <el-radio-button label="yearly">按年订阅</el-radio-button>
                  <el-radio-button label="both">按月+按年</el-radio-button>
                </el-radio-group>
                <span style="margin-left: 8px; color: #909399; font-size: 12px;">用户可选的订阅计费周期</span>
              </el-form-item>
              <el-form-item label="订阅渠道">
                <el-radio-group v-model="form.subscription_channels" size="small">
                  <el-radio-button label="all">全部支持</el-radio-button>
                  <el-radio-button label="wechat">仅微信代扣</el-radio-button>
                  <el-radio-button label="alipay">仅支付宝扣款</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="订阅优惠">
                <el-input-number v-model="form.subscription_discount_rate" :min="0" :max="50" :precision="1" style="width: 140px" />
                <span style="margin-left: 8px; color: #909399;">%（如10表示9折，0表示无优惠）</span>
              </el-form-item>
              <!-- 订阅价格预览 -->
              <el-form-item label="价格预览">
                <div class="price-preview">
                  <div class="preview-row">
                    <span class="label">正常月付价</span>
                    <span>¥{{ form.price }}/月</span>
                  </div>
                  <div class="preview-row highlight">
                    <span class="label">订阅月价</span>
                    <strong>¥{{ computedSubscriptionPrice.toFixed(2) }}/月</strong>
                    <span v-if="form.subscription_discount_rate > 0" class="saving">
                      省 ¥{{ (form.price - computedSubscriptionPrice).toFixed(2) }}/月
                    </span>
                  </div>
                  <div v-if="form.subscription_billing_cycle !== 'monthly'" class="preview-row highlight">
                    <span class="label">订阅年价</span>
                    <strong>¥{{ (computedSubscriptionPrice * 12).toFixed(2) }}/年</strong>
                    <span v-if="form.subscription_discount_rate > 0" class="saving">
                      年省 ¥{{ ((form.price - computedSubscriptionPrice) * 12).toFixed(2) }}
                    </span>
                  </div>
                  <div class="preview-row">
                    <span class="label">订阅周期</span>
                    <span>{{ form.subscription_billing_cycle === 'monthly' ? '仅按月' : form.subscription_billing_cycle === 'yearly' ? '仅按年' : '按月 + 按年' }}</span>
                  </div>
                  <div class="preview-row tip">
                    官网显示：推荐订阅付费，{{ form.subscription_discount_rate > 0 ? `享${(10 - form.subscription_discount_rate / 10).toFixed(1)}折优惠` : '自动续费省心省力' }}
                  </div>
                  <div class="preview-row tip">
                    订阅渠道：{{ form.subscription_channels === 'wechat' ? '💚 微信委托代扣' : form.subscription_channels === 'alipay' ? '💙 支付宝周期扣款' : '💚 微信代扣 + 💙 支付宝扣款' }}
                  </div>
                </div>
              </el-form-item>
            </template>
          </template>
        </div>

        <!-- ==================== 通用配置 ==================== -->
        <el-divider content-position="left">📋 授权模块</el-divider>
        <el-form-item label="CRM模块">
          <div class="modules-check-group">
            <div class="modules-toolbar">
              <el-button size="small" link type="primary" @click="selectAllModules">全选</el-button>
              <el-button size="small" link @click="deselectAllModules">全不选</el-button>
            </div>
            <el-checkbox-group v-model="form.modules">
              <el-checkbox v-for="m in crmModuleOptions" :key="m.value" :value="m.value">{{ m.label }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </el-form-item>
        <el-divider content-position="left">功能特性</el-divider>
        <el-form-item label="功能特性">
          <div v-for="(_f, i) in form.features" :key="i" class="feature-input">
            <el-input v-model="form.features[i]" placeholder="输入功能特性" />
            <el-button type="danger" link @click="form.features.splice(i, 1)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button type="primary" link @click="form.features.push('')">
            <el-icon><Plus /></el-icon>添加特性
          </el-button>
        </el-form-item>
        <el-form-item label="选项">
          <el-checkbox v-model="form.is_trial" v-if="form.type === 'saas'">试用套餐</el-checkbox>
          <el-checkbox v-model="form.is_recommended">推荐套餐</el-checkbox>
          <el-checkbox v-model="form.is_visible">官网显示</el-checkbox>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, User, Files, Check, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { getPackages, createPackage, updatePackage, deletePackage, type Package } from '@/api/packages'

const activeTab = ref('saas')
const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const packages = ref<Package[]>([])
const yearlyPromoType = ref<'none' | 'bonus' | 'discount' | 'fixed'>('none')
const unlimitedUsers = ref(false)

const crmModuleOptions = [
  { value: 'dashboard', label: '数据看板' },
  { value: 'customer', label: '客户管理' },
  { value: 'order', label: '订单管理' },
  { value: 'service-management', label: '服务管理' },
  { value: 'performance', label: '业绩统计' },
  { value: 'logistics', label: '物流管理' },
  { value: 'service', label: '售后管理' },
  { value: 'data', label: '资料管理' },
  { value: 'finance', label: '财务管理' },
  { value: 'product', label: '商品管理' },
  { value: 'wecom', label: '企微管理' },
  { value: 'system', label: '系统管理' }
]

const getModuleName = (id: string) => {
  return crmModuleOptions.find(m => m.value === id)?.label || id
}

const selectAllModules = () => { form.modules = crmModuleOptions.map(m => m.value) }
const deselectAllModules = () => { form.modules = [] }

const form = reactive({
  name: '',
  code: '',
  type: 'saas' as 'saas' | 'private',
  description: '',
  price: 0,
  billing_cycle: 'monthly' as 'monthly' | 'yearly' | 'once',
  yearly_discount_rate: 0,
  yearly_bonus_months: 0,
  yearly_price: 0 as number | null,
  subscription_enabled: false,
  subscription_channels: 'all' as 'wechat' | 'alipay' | 'all',
  subscription_billing_cycle: 'monthly' as 'monthly' | 'yearly' | 'both',
  subscription_discount_rate: 0,
  duration_days: 30,
  max_users: 10,
  max_storage_gb: 5,
  user_limit_mode: 'total' as 'total' | 'online' | 'both',
  max_online_seats: 0,
  modules: [] as string[],
  features: [''] as string[],
  is_trial: false,
  is_recommended: false,
  is_visible: true,
  sort_order: 0,
  status: true
})

// 不限用户切换
const onUnlimitedUsersChange = (val: boolean | string | number) => {
  if (val) form.max_users = 99999
  else form.max_users = 50
}


// 套餐类型切换时，自动设置合理的默认值
watch(() => form.type, (val) => {
  if (!editingId.value) {
    if (val === 'private') {
      form.billing_cycle = 'once'
      form.duration_days = 36500
      form.max_users = 50
      form.max_storage_gb = 0
      form.yearly_discount_rate = 0
      form.yearly_bonus_months = 0
      form.yearly_price = null
      yearlyPromoType.value = 'none'
    } else {
      form.billing_cycle = 'monthly'
      form.duration_days = 30
      form.max_users = 10
      form.max_storage_gb = 5
    }
  }
})

// 年付优惠类型切换时，清理不相关的字段
watch(yearlyPromoType, (val) => {
  if (val === 'none') {
    form.yearly_discount_rate = 0
    form.yearly_bonus_months = 0
    form.yearly_price = null
  } else if (val === 'bonus') {
    form.yearly_discount_rate = 0
    form.yearly_price = null
    if (!form.yearly_bonus_months) form.yearly_bonus_months = 2
  } else if (val === 'discount') {
    form.yearly_bonus_months = 0
    form.yearly_price = null
    if (!form.yearly_discount_rate) form.yearly_discount_rate = 16.67
  } else if (val === 'fixed') {
    form.yearly_discount_rate = 0
    form.yearly_bonus_months = 0
    if (!form.yearly_price) form.yearly_price = Math.round(form.price * 10)
  }
})

// 年付计算属性 - 用于表单中的价格预览
const computedYearlyTotal = computed(() => {
  if (yearlyPromoType.value === 'bonus') {
    return form.price * (12 - form.yearly_bonus_months)
  } else if (yearlyPromoType.value === 'discount') {
    return form.price * 12 * (1 - form.yearly_discount_rate / 100)
  } else if (yearlyPromoType.value === 'fixed' && form.yearly_price) {
    return form.yearly_price
  }
  return form.price * 12
})

const computedYearlySaving = computed(() => {
  return form.price * 12 - computedYearlyTotal.value
})

const computedYearlyMonthly = computed(() => {
  return computedYearlyTotal.value / 12
})

// 订阅价格计算
const computedSubscriptionPrice = computed(() => {
  if (form.subscription_discount_rate > 0) {
    return form.price * (1 - form.subscription_discount_rate / 100)
  }
  return form.price
})

// 卡片展示辅助方法
const hasYearlyPromo = (pkg: Package) => {
  return (pkg.yearly_bonus_months > 0) || (pkg.yearly_discount_rate > 0) || (pkg.yearly_price && Number(pkg.yearly_price) > 0)
}

const getYearlyPromoLabel = (pkg: Package) => {
  if (pkg.yearly_bonus_months > 0) return `年付送${pkg.yearly_bonus_months}个月`
  if (pkg.yearly_discount_rate > 0) {
    const discount = (10 - pkg.yearly_discount_rate / 10).toFixed(1)
    return `年付${discount}折`
  }
  if (pkg.yearly_price && Number(pkg.yearly_price) > 0) {
    const saving = Number(pkg.price) * 12 - Number(pkg.yearly_price)
    return `年付省¥${Math.round(saving)}`
  }
  return ''
}

const getYearlyTotalPrice = (pkg: Package) => {
  if (pkg.yearly_price && Number(pkg.yearly_price) > 0) return Math.round(Number(pkg.yearly_price))
  if (pkg.yearly_bonus_months > 0) return Math.round(Number(pkg.price) * (12 - pkg.yearly_bonus_months))
  if (pkg.yearly_discount_rate > 0) return Math.round(Number(pkg.price) * 12 * (1 - pkg.yearly_discount_rate / 100))
  return Math.round(Number(pkg.price) * 12)
}

const rules: FormRules = {
  name: [{ required: true, message: '请输入套餐名称' }],
  code: [{ required: true, message: '请输入套餐代码' }],
  type: [{ required: true, message: '请选择套餐类型' }],
  price: [{ required: true, message: '请输入价格' }]
}

const getBillingText = (cycle: string) => {
  const map: Record<string, string> = {
    monthly: '月',
    yearly: '年',
    once: '永久'
  }
  return map[cycle] || cycle
}

const loadPackages = async () => {
  loading.value = true
  try {
    const res = await getPackages({ type: activeTab.value })
    packages.value = res.data || []
  } catch (error) {
    console.error('加载套餐失败:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  const isPrivate = activeTab.value === 'private'
  Object.assign(form, {
    name: '', code: '', type: activeTab.value, description: '',
    price: 0, billing_cycle: isPrivate ? 'once' : 'monthly',
    yearly_discount_rate: 0, yearly_bonus_months: 0, yearly_price: null,
    subscription_enabled: false, subscription_channels: 'all', subscription_billing_cycle: 'monthly', subscription_discount_rate: 0,
    user_limit_mode: 'total', max_online_seats: 0,
    duration_days: isPrivate ? 36500 : 30,
    max_users: isPrivate ? 50 : 10, max_storage_gb: isPrivate ? 0 : 5,
    modules: [],
    features: [''],
    is_trial: false, is_recommended: false, is_visible: true,
    sort_order: 0, status: true
  })
  yearlyPromoType.value = 'none'
  unlimitedUsers.value = false
}

const handleAdd = () => {
  editingId.value = null
  resetForm()
  showDialog.value = true
}

const handleEdit = (pkg: Package) => {
  editingId.value = pkg.id
  Object.assign(form, {
    ...pkg,
    yearly_discount_rate: Number(pkg.yearly_discount_rate) || 0,
    yearly_bonus_months: Number(pkg.yearly_bonus_months) || 0,
    yearly_price: pkg.yearly_price ? Number(pkg.yearly_price) : null,
    subscription_enabled: Boolean(pkg.subscription_enabled),
    subscription_channels: pkg.subscription_channels || 'all',
    subscription_billing_cycle: pkg.subscription_billing_cycle || 'monthly',
    subscription_discount_rate: Number(pkg.subscription_discount_rate) || 0,
    user_limit_mode: pkg.user_limit_mode || 'total',
    max_online_seats: Number(pkg.max_online_seats) || 0,
    modules: pkg.modules?.length ? [...pkg.modules] : [],
    features: pkg.features?.length ? [...pkg.features] : ['']
  })
  // 回填不限用户
  unlimitedUsers.value = pkg.max_users >= 99999
  // 自动识别年付优惠类型
  if (pkg.yearly_bonus_months > 0) {
    yearlyPromoType.value = 'bonus'
  } else if (pkg.yearly_discount_rate > 0) {
    yearlyPromoType.value = 'discount'
  } else if (pkg.yearly_price && Number(pkg.yearly_price) > 0) {
    yearlyPromoType.value = 'fixed'
  } else {
    yearlyPromoType.value = 'none'
  }
  showDialog.value = true
}

const handleToggleStatus = async (pkg: Package) => {
  try {
    await updatePackage(pkg.id, { ...pkg, status: !pkg.status })
    ElMessage.success(pkg.status ? '已禁用' : '已启用')
    loadPackages()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (pkg: Package) => {
  try {
    await ElMessageBox.confirm(`确定删除套餐"${pkg.name}"？`, '提示', { type: 'warning' })
    await deletePackage(pkg.id)
    ElMessage.success('删除成功')
    loadPackages()
  } catch (error) {
    // 取消删除
  }
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const data = {
      ...form,
      features: form.features.filter(f => f.trim())
    }
    if (editingId.value) {
      await updatePackage(editingId.value, data)
    } else {
      await createPackage(data)
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    loadPackages()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadPackages()
})
</script>

<style scoped>
.yearly-promo-info {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.yearly-price-text {
  font-size: 13px;
  color: #e6a23c;
  font-weight: 500;
}
.private-annual-info {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.private-annual-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 16px;
  font-size: 13px;
}
.private-annual-tag .annual-label {
  color: #b45309;
  font-weight: 500;
}
.private-annual-tag .annual-price {
  color: #d97706;
  font-weight: 700;
}
.private-annual-saving {
  font-size: 12px;
  color: #16a34a;
  font-weight: 600;
}
.yearly-promo-section {
  background: #fdf6ec;
  border-radius: 8px;
  padding: 12px 8px 4px;
  margin-bottom: 8px;
}
.yearly-promo-section :deep(.el-divider__text) {
  color: #e6a23c;
  font-weight: 600;
  font-size: 13px;
}
.price-preview {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.8;
}
.price-preview .preview-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-preview .preview-row .label {
  color: #64748b;
  min-width: 60px;
}
.price-preview .preview-row.highlight {
  color: #0369a1;
  font-size: 14px;
}
.price-preview .preview-row .original {
  text-decoration: line-through;
  color: #94a3b8;
}
.price-preview .preview-row .saving {
  background: #dcfce7;
  color: #16a34a;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.price-preview .preview-row.tip {
  color: #d97706;
  font-size: 12px;
  margin-top: 4px;
}
.feature-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.subscription-info {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.subscription-channels-text {
  font-size: 12px;
  color: #67c23a;
  font-weight: 500;
}
.subscription-section {
  background: #f0fdf4;
  border-radius: 8px;
  padding: 12px 8px 4px;
  margin-bottom: 8px;
}
.subscription-section :deep(.el-divider__text) {
  color: #16a34a;
  font-weight: 600;
  font-size: 13px;
}
.package-modules {
  margin: 8px 0;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}
.modules-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
}
.modules-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.modules-check-group {
  width: 100%;
}
.modules-toolbar {
  margin-bottom: 6px;
}
</style>

