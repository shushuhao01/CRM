<template>
  <div class="pricing-page">
    <div class="pricing-header">
      <div class="header-left">
        <h2 class="page-title">套餐与定价</h2>
        <p class="page-desc">管理企微服务的套餐方案、定价策略和计费规则，配置保存后将同步到CRM会员中心</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadConfig" :loading="loading">
          <el-icon><Refresh /></el-icon> 重新加载
        </el-button>
        <el-button v-permission="'wecom-management:pricing:edit'" type="primary" @click="handleSaveAll" :loading="saving">
          <el-icon><Check /></el-icon> 保存所有配置
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="pricing-tabs" v-loading="loading">

      <!-- ========== Tab1: 企微套餐 ========== -->
      <el-tab-pane label="企微套餐" name="wecom">
        <div class="tab-intro">
          <div class="intro-text">
            <h3>企微服务套餐</h3>
            <p>定义不同版本的企微CRM服务套餐，租户授权企微后需购买对应套餐才能使用企微管理功能</p>
          </div>
          <el-button v-permission="'wecom-management:pricing:edit'" type="primary" @click="addWecomPackage"><el-icon><Plus /></el-icon> 添加套餐</el-button>
        </div>
        <div class="package-cards" v-if="wecomPackages.length">
          <div
            v-for="(pkg, idx) in wecomPackages" :key="idx"
            class="package-card"
            :class="{ 'package-recommended': pkg.recommended, 'package-disabled': !pkg.enabled }"
          >
            <div class="pkg-badge" v-if="pkg.recommended">推荐</div>
            <div class="pkg-header">
              <el-input v-model="pkg.name" class="pkg-name-input" placeholder="套餐名称" />
              <el-switch v-model="pkg.enabled" size="small" active-text="启用" inactive-text="停用" />
            </div>
            <div class="pkg-price">
              <span class="price-symbol">¥</span>
              <el-input-number v-model="pkg.yearlyPrice" :min="0" :controls="false" class="price-input" />
              <span class="price-unit">/年</span>
            </div>
            <div v-if="pkg.monthlyPrice !== undefined" class="pkg-monthly">
              ≈ ¥{{ Math.round(pkg.yearlyPrice / 12) }}/月
            </div>
            <el-divider style="margin: 12px 0" />
            <div class="pkg-features">
              <div class="feature-row">
                <span class="feature-label">企微数量</span>
                <el-input-number v-model="pkg.wecomQuota" :min="1" :max="999" size="small" style="width: 100px" />
              </div>
              <div class="feature-row">
                <span class="feature-label">会话存档</span>
                <el-select v-model="pkg.archiveIncluded" size="small" style="width: 120px">
                  <el-option label="不包含" value="none" />
                  <el-option label="5人额度" value="5" />
                  <el-option label="20人额度" value="20" />
                  <el-option label="50人额度" value="50" />
                </el-select>
              </div>
              <div class="feature-row">
                <span class="feature-label">AI额度</span>
                <el-input-number v-model="pkg.aiQuotaIncluded" :min="0" :step="100" size="small" style="width: 100px" />
                <span class="feature-hint">次/月</span>
              </div>
              <el-divider style="margin: 8px 0" />
              <div class="feature-section-title" style="display: flex; align-items: center; justify-content: space-between">
                <span>菜单权限控制</span>
                <span>
                  <el-button type="primary" link size="small" @click="toggleAllMenuPerms(pkg, true)">全选</el-button>
                  <el-button type="info" link size="small" @click="toggleAllMenuPerms(pkg, false)">取消全选</el-button>
                </span>
              </div>
              <div class="menu-feature-grid">
                <el-checkbox v-model="pkg.menuAddressBook" size="small">通讯录</el-checkbox>
                <el-checkbox v-model="pkg.menuCustomer" size="small">企微客户</el-checkbox>
                <el-checkbox v-model="pkg.menuCustomerGroup" size="small">客户群</el-checkbox>
                <el-checkbox v-model="pkg.menuAcquisition" size="small">获客助手</el-checkbox>
                <el-checkbox v-model="pkg.menuContactWay" size="small">活码管理</el-checkbox>
                <el-checkbox v-model="pkg.menuChatArchive" size="small">会话存档</el-checkbox>
                <el-checkbox v-model="pkg.menuAiAssistant" size="small">AI助手</el-checkbox>
                <el-checkbox v-model="pkg.menuCustomerService" size="small">微信客服</el-checkbox>
                <el-checkbox v-model="pkg.menuSidebar" size="small">侧边栏</el-checkbox>
                <el-checkbox v-model="pkg.menuPayment" size="small">对外收款</el-checkbox>
              </div>
              <div class="feature-row" style="margin-top: 8px">
                <span class="feature-label">推荐标签</span>
                <el-switch v-model="pkg.recommended" size="small" />
              </div>
            </div>
            <el-input v-model="pkg.description" type="textarea" :rows="2" placeholder="套餐描述（展示给客户）" style="margin-top: 12px" />
            <div class="pkg-sort">
              <span class="feature-label">排序</span>
              <el-input-number v-model="pkg.sortOrder" :min="0" size="small" style="width: 80px" />
            </div>
            <div class="pkg-actions">
              <el-button v-permission="'wecom-management:pricing:edit'" type="danger" text size="small" @click="wecomPackages.splice(idx, 1)">
                <el-icon><Delete /></el-icon> 删除套餐
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无套餐，点击右上方添加" />
      </el-tab-pane>

      <!-- ========== Tab2: 会话存档定价 ========== -->
      <el-tab-pane label="会话存档定价" name="archive">
        <div class="tab-intro">
          <div class="intro-text">
            <h3>会话存档定价</h3>
            <p>配置会话存档的购买模式、服务费和代购价格。保存后自动同步到CRM和会员中心</p>
          </div>
          <el-button v-permission="'wecom-management:pricing:edit'" type="primary" @click="addArchiveTier"><el-icon><Plus /></el-icon> 添加档位</el-button>
        </div>

        <!-- 全局购买模式配置 -->
        <div class="archive-global-config">
          <div class="agc-section">
            <h4>购买模式</h4>
            <p class="agc-desc">控制客户在CRM和会员中心可选择的购买方式</p>
            <el-radio-group v-model="archiveGlobalConfig.purchaseMode" class="purchase-mode-radio">
              <el-radio label="proxy_only" border>
                <div class="radio-content">
                  <strong>仅代购</strong>
                  <span>客户只能通过平台代购企微席位（捆绑销售，包含官方席位+平台服务费）</span>
                </div>
              </el-radio>
              <el-radio label="both" border>
                <div class="radio-content">
                  <strong>代购 + 自购服务费</strong>
                  <span>客户可选择：① 平台代购（一站式）② 自行在企微购买席位后仅付平台服务费</span>
                </div>
              </el-radio>
            </el-radio-group>
          </div>

          <div class="agc-section" v-if="archiveGlobalConfig.purchaseMode === 'both'">
            <h4>自购模式 — 每席位服务费</h4>
            <p class="agc-desc">客户自行在企微官方购买席位后，按每席位每年支付给平台的服务费</p>
            <div class="agc-service-fee">
              <div class="agc-fee-row">
                <span class="agc-fee-label">服务费单价</span>
                <div class="agc-fee-input">
                  <el-input-number v-model="archiveGlobalConfig.seatServiceFee" :min="0" :max="99999" :precision="2" :step="10" />
                  <span class="agc-fee-unit">元 / 人 / 年</span>
                </div>
              </div>
              <div class="agc-fee-example" v-if="archiveGlobalConfig.seatServiceFee > 0">
                示例：客户自购 10 人席位 → 服务费 = 10 × ¥{{ archiveGlobalConfig.seatServiceFee }} = <strong>¥{{ (10 * archiveGlobalConfig.seatServiceFee).toFixed(2) }}/年</strong>
              </div>
            </div>
          </div>

          <div class="agc-section">
            <h4>代购模式 — 阶梯定价档位</h4>
            <p class="agc-desc">平台代购时的售价（包含官方席位费+平台服务费）。按人数区间设定，套餐只是预设优惠，客户也可自选任意人数</p>
          </div>
        </div>

        <div class="archive-tiers" v-if="archivePricing.length">
          <div v-for="(tier, idx) in archivePricing" :key="idx" class="archive-tier-card">
            <div class="tier-header">
              <div class="tier-number">{{ idx + 1 }}</div>
              <el-input v-model="tier.tierLabel" placeholder="如: 1-5人" style="width: 120px; font-weight: 600" />
              <el-button v-permission="'wecom-management:pricing:edit'" type="danger" text size="small" @click="archivePricing.splice(idx, 1)" class="tier-delete">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="tier-body">
              <div class="tier-field">
                <label>最大人数</label>
                <el-input-number v-model="tier.maxMembers" :min="1" size="small" style="width: 100%" />
              </div>
              <div class="tier-field">
                <label>官方参考价</label>
                <el-input-number v-model="tier.officialPrice" :min="0" size="small" style="width: 100%" />
                <span class="field-unit">元/人/年</span>
              </div>
              <div class="tier-field">
                <label>代购售价</label>
                <el-input-number v-model="tier.salePrice" :min="0" size="small" style="width: 100%" />
                <span class="field-unit">元/人/年</span>
              </div>
              <div class="tier-field">
                <label>采购成本</label>
                <el-input-number v-model="tier.costPrice" :min="0" size="small" style="width: 100%" />
                <span class="field-unit">元/人/年</span>
              </div>
            </div>
            <div class="tier-footer">
              <div class="tier-stat">
                <span class="stat-label">利润率</span>
                <span class="stat-value" :class="computeProfitRate(tier) > 30 ? 'profit-good' : 'profit-warn'">
                  {{ computeProfitRate(tier) }}%
                </span>
              </div>
              <div class="tier-stat">
                <span class="stat-label">单人利润</span>
                <span class="stat-value">¥{{ tier.salePrice && tier.costPrice ? (tier.salePrice - tier.costPrice) : 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无定价档位" />
        <el-alert type="info" :closable="false" style="margin-top: 16px">
          <template #title>说明</template>
          <ul style="margin: 4px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.8">
            <li><strong>代购模式</strong>：客户下单后平台统一向企微官方购买席位并开通，售价包含官方费用+平台服务费</li>
            <li><strong>自购服务费模式</strong>：客户自行在企微后台购买席位，仅向平台支付服务费（按席位×服务费单价计算）</li>
            <li>套餐是预设的优惠人数包，客户也可自定义任意人数购买</li>
            <li>保存后会自动同步定价到CRM会员中心，客户可直接在线购买</li>
          </ul>
        </el-alert>
      </el-tab-pane>

      <!-- ========== Tab3: AI额度定价 ========== -->
      <el-tab-pane label="AI额度定价" name="ai">
        <div class="tab-intro">
          <div class="intro-text">
            <h3>AI调用额度套餐</h3>
            <p>配置AI额度套餐，保存后自动同步到CRM/会员中心的AI助手购买页面。计费方式在「AI额度管理 > 计费配置」统一管理。</p>
          </div>
          <el-button v-permission="'wecom-management:pricing:edit'" type="primary" @click="addAiPackage"><el-icon><Plus /></el-icon> 添加套餐</el-button>
        </div>
        <el-alert type="info" :closable="false" style="margin-bottom: 12px" show-icon>
          当前计费模式：<strong>{{ quotaUnit === 'tokens' ? '按Token消耗' : '按调用次数' }}</strong>。
          套餐中的额度单位将以此模式为准，如需调整计费模式请前往「AI额度管理 > 计费配置」。
        </el-alert>
        <div class="ai-packages" v-if="aiPackages.length">
          <div v-for="(pkg, idx) in aiPackages" :key="idx" class="ai-pkg-card" :class="{ 'ai-recommended': pkg.recommended }">
            <div class="ai-pkg-badge" v-if="pkg.recommended">热门</div>
            <div class="ai-pkg-header">
              <el-input v-model="pkg.name" placeholder="套餐名称" style="width: 140px; font-weight: 600" />
              <el-button v-permission="'wecom-management:pricing:edit'" type="danger" text size="small" @click="aiPackages.splice(idx, 1)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="ai-pkg-price">
              <template v-if="pkg.price > 0">
                <span class="price-symbol">¥</span>
                <el-input-number v-model="pkg.price" :min="0" :controls="false" class="price-input-sm" />
              </template>
              <span v-else class="free-tag">免费</span>
            </div>
            <div v-if="pkg.price === 0" class="ai-free-once">
              <el-checkbox v-model="pkg.freeTrialOnce" size="small">每个租户仅可领取一次</el-checkbox>
            </div>
            <div class="ai-pkg-quota">
              <el-input-number v-model="pkg.calls" :min="0" :step="100" size="small" style="width: 120px" />
              <span class="quota-unit">{{ quotaUnit === 'tokens' ? 'Tokens' : '次调用' }}</span>
            </div>
            <div class="ai-pkg-unit-price" v-if="pkg.calls > 0 && pkg.price > 0">
              ≈ ¥{{ (pkg.price / pkg.calls * 1000).toFixed(2) }}/千次
            </div>
            <div class="ai-pkg-fields">
              <div class="ai-field">
                <label>套餐ID</label>
                <el-input v-model="pkg.id" size="small" placeholder="唯一标识" />
              </div>
              <div class="ai-field">
                <label>有效期</label>
                <el-select v-model="pkg.validity" size="small" style="width: 100%">
                  <el-option label="永久有效" value="forever" />
                  <el-option label="30天" value="30" />
                  <el-option label="90天" value="90" />
                  <el-option label="365天" value="365" />
                </el-select>
              </div>
              <div class="ai-field">
                <label>推荐</label>
                <el-switch v-model="pkg.recommended" size="small" />
              </div>
            </div>
            <el-input v-model="pkg.description" type="textarea" :rows="2" placeholder="套餐描述" style="margin-top: 8px" />
          </div>
        </div>
        <el-empty v-else description="暂无AI套餐" />
        <el-alert type="success" :closable="false" style="margin-top: 16px" show-icon>
          <template #title>同步说明</template>
          AI套餐保存后将自动同步到CRM会员中心的AI助手价格页面，租户可直接在会员中心购买AI额度。
        </el-alert>
      </el-tab-pane>

      <!-- ========== Tab4: 支付与计费 ========== -->
      <el-tab-pane label="支付与计费" name="payment">
        <div class="tab-intro">
          <div class="intro-text">
            <h3>支付与计费设置</h3>
            <p>配置AI额度计费方式和可用的支付渠道</p>
          </div>
        </div>
        <div class="settings-sections">
          <div class="settings-card">
            <h4>AI额度计费方式</h4>
            <el-radio-group v-model="quotaUnit" class="billing-radio">
              <el-radio label="calls" border>
                <div class="radio-content">
                  <strong>按调用次数</strong>
                  <span>每次AI调用消耗1次额度，简单易懂</span>
                </div>
              </el-radio>
              <el-radio label="tokens" border>
                <div class="radio-content">
                  <strong>按Token消耗</strong>
                  <span>按实际Token用量计算，更精确计费</span>
                </div>
              </el-radio>
            </el-radio-group>
          </div>
          <div class="settings-card">
            <h4>支付方式</h4>
            <div class="payment-methods">
              <div class="payment-method" :class="{ active: paymentMethods.includes('wechat') }" @click="togglePayment('wechat')">
                <el-checkbox :model-value="paymentMethods.includes('wechat')" style="pointer-events: none" />
                <div class="method-info">
                  <strong>微信支付</strong>
                  <span>支持微信扫码、小程序支付</span>
                </div>
              </div>
              <div class="payment-method" :class="{ active: paymentMethods.includes('alipay') }" @click="togglePayment('alipay')">
                <el-checkbox :model-value="paymentMethods.includes('alipay')" style="pointer-events: none" />
                <div class="method-info">
                  <strong>支付宝</strong>
                  <span>支持支付宝扫码支付</span>
                </div>
              </div>
              <div class="payment-method" :class="{ active: paymentMethods.includes('transfer') }" @click="togglePayment('transfer')">
                <el-checkbox :model-value="paymentMethods.includes('transfer')" style="pointer-events: none" />
                <div class="method-info">
                  <strong>对公转账</strong>
                  <span>线下对公账户银行转账</span>
                </div>
              </div>
            </div>
            <el-alert v-if="!paymentMethods.length" type="warning" :closable="false" description="未启用任何支付方式，用户将无法购买付费套餐" show-icon style="margin-top: 12px" />
          </div>
        </div>
      </el-tab-pane>

      <!-- ========== Tab5: 试用与折扣 ========== -->
      <el-tab-pane label="试用与折扣" name="trial">
        <div class="tab-intro">
          <div class="intro-text">
            <h3>试用政策与折扣优惠</h3>
            <p>试用期为新租户体验全功能的临时授权，不与基础免费套餐冲突。折扣优惠对所有付费套餐（企微/会话存档/AI/获客助手）统一生效</p>
          </div>
        </div>

        <div class="trial-discount-layout">
          <!-- 左侧: 免费试用 -->
          <div class="td-card td-trial">
            <div class="td-card-header">
              <div class="td-card-icon" style="background: linear-gradient(135deg, #36d1dc, #5b86e5)">
                <span>试</span>
              </div>
              <div class="td-card-title">
                <h4>免费试用</h4>
                <p>新注册租户可免费体验全功能</p>
              </div>
              <el-switch v-model="trialConfig.enabled" active-text="开启" inactive-text="关闭" />
            </div>
            <transition name="fade">
              <div v-if="trialConfig.enabled" class="td-card-body">
                <div class="td-field-row">
                  <div class="td-field">
                    <span class="td-field-label">试用天数</span>
                    <div class="td-field-input">
                      <el-input-number v-model="trialConfig.trialDays" :min="1" :max="90" size="small" style="width: 100px" />
                      <span class="td-unit">天</span>
                    </div>
                  </div>
                  <div class="td-field">
                    <span class="td-field-label">功能范围</span>
                    <el-radio-group v-model="trialConfig.trialScope" size="small">
                      <el-radio-button label="basic">基础功能</el-radio-button>
                      <el-radio-button label="full">全部功能</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>
                <div class="td-field-row">
                  <div class="td-field">
                    <span class="td-field-label">试用AI额度</span>
                    <div class="td-field-input">
                      <el-input-number v-model="trialConfig.trialAiQuota" :min="0" :max="10000" size="small" style="width: 100px" />
                      <span class="td-unit">次</span>
                    </div>
                  </div>
                  <div class="td-field">
                    <span class="td-field-label">试用存档人数</span>
                    <div class="td-field-input">
                      <el-input-number v-model="trialConfig.trialArchiveMembers" :min="0" :max="50" size="small" style="width: 100px" />
                      <span class="td-unit">人</span>
                    </div>
                  </div>
                </div>
                <div class="td-field" style="margin-top: 12px">
                  <span class="td-field-label">到期提醒</span>
                  <el-checkbox-group v-model="trialConfig.remindDays" size="small">
                    <el-checkbox-button :label="7">7天前</el-checkbox-button>
                    <el-checkbox-button :label="3">3天前</el-checkbox-button>
                    <el-checkbox-button :label="1">1天前</el-checkbox-button>
                  </el-checkbox-group>
                </div>
                <el-alert type="info" :closable="false" style="margin-top: 12px" show-icon>
                  试用期与免费基础套餐不冲突：基础套餐为永久免费的功能子集，试用期为限时体验高级功能。试用到期后自动降级为基础套餐。
                </el-alert>
              </div>
            </transition>
          </div>

          <!-- 右侧: 折扣优惠 -->
          <div class="td-card td-discount">
            <div class="td-card-header">
              <div class="td-card-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
                <span>惠</span>
              </div>
              <div class="td-card-title">
                <h4>折扣优惠</h4>
                <p>以下折扣对所有付费套餐统一生效</p>
              </div>
            </div>
            <div class="td-card-body">
              <div class="discount-scope-tags">
                <el-tag type="primary" size="small" effect="plain">企微套餐</el-tag>
                <el-tag type="success" size="small" effect="plain">会话存档</el-tag>
                <el-tag type="warning" size="small" effect="plain">AI额度</el-tag>
                <el-tag size="small" effect="plain" color="#e6fffb" style="color: #13c2c2; border-color: #87e8de">获客助手</el-tag>
              </div>

              <div class="discount-cards">
                <div class="dc-item">
                  <div class="dc-left">
                    <div class="dc-badge" style="background: linear-gradient(135deg, #667eea, #764ba2)">年付</div>
                    <div class="dc-text">
                      <strong>年付折扣</strong>
                      <span>年付相对月付总价打折</span>
                    </div>
                  </div>
                  <div class="dc-right">
                    <el-input-number v-model="trialConfig.yearlyDiscount" :min="50" :max="100" size="small" style="width: 90px" />
                    <span class="dc-suffix">%</span>
                  </div>
                </div>

                <div class="dc-item">
                  <div class="dc-left">
                    <div class="dc-badge" style="background: linear-gradient(135deg, #f093fb, #f5576c)">首购</div>
                    <div class="dc-text">
                      <strong>首购优惠</strong>
                      <span>新客户首次购买立减</span>
                    </div>
                  </div>
                  <div class="dc-right">
                    <span class="dc-prefix">-</span>
                    <el-input-number v-model="trialConfig.firstPurchaseDiscount" :min="0" size="small" style="width: 90px" />
                    <span class="dc-suffix">元</span>
                  </div>
                </div>

                <div class="dc-item">
                  <div class="dc-left">
                    <div class="dc-badge" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">续费</div>
                    <div class="dc-text">
                      <strong>续费折扣</strong>
                      <span>老客户续费享优惠</span>
                    </div>
                  </div>
                  <div class="dc-right">
                    <el-input-number v-model="trialConfig.renewalDiscount" :min="50" :max="100" size="small" style="width: 90px" />
                    <span class="dc-suffix">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ========== Tab6: 获客助手定价 ========== -->
      <el-tab-pane label="获客助手定价" name="acquisition">
        <div class="tab-intro">
          <div class="intro-text">
            <h3>获客助手管理服务定价</h3>
            <p>企业在企微官方购买获客助手后，如需通过我们的CRM平台管理获客助手（数据分析、渠道管理、转化追踪等），需额外付费订阅</p>
          </div>
          <el-button v-permission="'wecom-management:pricing:edit'" type="primary" @click="addAcquisitionTier"><el-icon><Plus /></el-icon> 添加方案</el-button>
        </div>

        <el-alert type="warning" :closable="false" style="margin-bottom: 16px" show-icon>
          <template #title>定价逻辑说明</template>
          获客助手的基础使用量由企业自行在企微官方购买。本定价为「通过CRM平台管理获客助手」的增值服务费用，
          包含：渠道活码管理、获客数据看板、转化漏斗分析、客户画像标签等高级功能。
        </el-alert>

        <div class="acquisition-tiers" v-if="acquisitionPricing.length">
          <div v-for="(tier, idx) in acquisitionPricing" :key="idx" class="acq-card" :class="{ 'acq-recommended': tier.recommended }">
            <div class="acq-badge" v-if="tier.recommended">推荐</div>
            <div class="acq-header">
              <el-input v-model="tier.name" placeholder="方案名称" style="width: 140px; font-weight: 600" />
              <el-button v-permission="'wecom-management:pricing:edit'" type="danger" text size="small" @click="acquisitionPricing.splice(idx, 1)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="acq-price">
              <template v-if="tier.price > 0">
                <span class="price-symbol">¥</span>
                <el-input-number v-model="tier.price" :min="0" :controls="false" class="price-input-sm" />
                <span class="price-unit">/{{ tier.billingCycle || '月' }}</span>
              </template>
              <span v-else class="free-tag">免费</span>
            </div>
            <div class="acq-fields">
              <div class="acq-field">
                <label>计费周期</label>
                <el-select v-model="tier.billingCycle" size="small" style="width: 100%">
                  <el-option label="月付" value="月" />
                  <el-option label="季付" value="季" />
                  <el-option label="年付" value="年" />
                </el-select>
              </div>
              <div class="acq-field">
                <label>渠道活码数</label>
                <el-input-number v-model="tier.maxChannels" :min="0" size="small" style="width: 100%" />
                <span class="field-hint">0=无限制</span>
              </div>
              <div class="acq-field">
                <label>数据看板</label>
                <el-switch v-model="tier.dashboardEnabled" size="small" />
              </div>
              <div class="acq-field">
                <label>转化漏斗</label>
                <el-switch v-model="tier.funnelEnabled" size="small" />
              </div>
              <div class="acq-field">
                <label>客户画像</label>
                <el-switch v-model="tier.profileEnabled" size="small" />
              </div>
              <div class="acq-field">
                <label>推荐标签</label>
                <el-switch v-model="tier.recommended" size="small" />
              </div>
            </div>
            <el-input v-model="tier.description" type="textarea" :rows="2" placeholder="方案描述" style="margin-top: 8px" />
          </div>
        </div>
        <el-empty v-else description="暂无获客助手定价方案" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Check, Refresh } from '@element-plus/icons-vue'
import { getPricingConfig, savePricingConfig } from '@/api/wecomManagement'

const activeTab = ref('wecom')
const saving = ref(false)
const loading = ref(false)

const wecomPackages = ref<any[]>([])
const archivePricing = ref<any[]>([])
const archiveGlobalConfig = ref<any>({
  purchaseMode: 'proxy_only',
  seatServiceFee: 50,
})
const aiPackages = ref<any[]>([])
const acquisitionPricing = ref<any[]>([])
const paymentMethods = ref<string[]>(['wechat', 'alipay'])
const quotaUnit = ref<string>('calls')
const trialConfig = ref<any>({
  enabled: true, trialDays: 7, trialScope: 'basic', trialAiQuota: 100, trialArchiveMembers: 2,
  remindDays: [7, 3, 1], yearlyDiscount: 85, firstPurchaseDiscount: 0, renewalDiscount: 90
})

const menuPermKeys = [
  'menuAddressBook', 'menuCustomer', 'menuCustomerGroup', 'menuAcquisition',
  'menuContactWay', 'menuChatArchive', 'menuAiAssistant', 'menuCustomerService',
  'menuSidebar', 'menuPayment'
]
const toggleAllMenuPerms = (pkg: any, val: boolean) => {
  menuPermKeys.forEach(k => { pkg[k] = val })
}

const addWecomPackage = () => {
  wecomPackages.value.push({
    name: '', wecomQuota: 1, yearlyPrice: 0,
    description: '', enabled: true, recommended: false, sortOrder: wecomPackages.value.length,
    archiveIncluded: 'none', aiQuotaIncluded: 0,
    menuAddressBook: true, menuCustomer: true, menuCustomerGroup: false,
    menuAcquisition: false, menuContactWay: false, menuChatArchive: false,
    menuAiAssistant: false, menuCustomerService: false, menuSidebar: false, menuPayment: false
  })
}

const addArchiveTier = () => {
  archivePricing.value.push({
    tierLabel: '', maxMembers: 5, officialPrice: 300, salePrice: 150, costPrice: 100, profitRate: 33,
  })
}

const addAiPackage = () => {
  const idx = aiPackages.value.length + 1
  aiPackages.value.push({
    id: 'pkg_' + idx, name: '新套餐', calls: 1000, price: 99,
    description: '', validity: 'forever', recommended: false
  })
}

const addAcquisitionTier = () => {
  acquisitionPricing.value.push({
    name: '新方案', price: 0, billingCycle: '月',
    maxChannels: 10, dashboardEnabled: false, funnelEnabled: false,
    profileEnabled: false, recommended: false, description: ''
  })
}

const togglePayment = (method: string) => {
  const idx = paymentMethods.value.indexOf(method)
  if (idx >= 0) paymentMethods.value.splice(idx, 1)
  else paymentMethods.value.push(method)
}

const computeProfitRate = (row: any) => {
  if (!row.salePrice || !row.costPrice) return 0
  return Math.round((row.salePrice - row.costPrice) / row.salePrice * 100)
}

const loadConfig = async () => {
  loading.value = true
  try {
    const res: any = await getPricingConfig()
    const data = res?.data || res
    if (data) {
      if (data.wecomPackages) wecomPackages.value = data.wecomPackages
      if (data.archivePricing) archivePricing.value = data.archivePricing
      if (data.archiveGlobalConfig) archiveGlobalConfig.value = { ...archiveGlobalConfig.value, ...data.archiveGlobalConfig }
      if (data.aiPackages) aiPackages.value = data.aiPackages
      if (data.acquisitionPricing) acquisitionPricing.value = data.acquisitionPricing
      if (data.paymentMethods) paymentMethods.value = data.paymentMethods
      if (data.quotaUnit) quotaUnit.value = data.quotaUnit
      if (data.trialConfig) trialConfig.value = { ...trialConfig.value, ...data.trialConfig }
    }
  } catch (e: any) {
    console.warn('加载定价配置失败:', e)
  }
  loading.value = false
}

const handleSaveAll = async () => {
  saving.value = true
  try {
    archivePricing.value.forEach(r => { r.profitRate = computeProfitRate(r) })
    await savePricingConfig({
      wecomPackages: wecomPackages.value,
      archivePricing: archivePricing.value,
      archiveGlobalConfig: archiveGlobalConfig.value,
      aiPackages: aiPackages.value,
      acquisitionPricing: acquisitionPricing.value,
      paymentMethods: paymentMethods.value,
      quotaUnit: quotaUnit.value,
      trialConfig: trialConfig.value,
    })
    ElMessage.success('定价配置已保存，已同步到CRM会员中心')
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  saving.value = false
}

onMounted(loadConfig)
</script>

<style scoped>
.pricing-page {
  padding: 0;
}
.pricing-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 24px 24px 0;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #1d2129;
}
.page-desc {
  font-size: 13px;
  color: #86909c;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.pricing-tabs {
  padding: 0 24px 24px;
}
.pricing-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}
.pricing-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
}

/* Tab intro */
.tab-intro {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0f5ff 0%, #e8f4f8 100%);
  border-radius: 8px;
  border: 1px solid #d6e4ff;
}
.tab-intro h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px;
  color: #1d2129;
}
.tab-intro p {
  font-size: 13px;
  color: #86909c;
  margin: 0;
}

/* ========== 企微套餐卡片 ========== */
.package-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.package-card {
  position: relative;
  border: 2px solid #e5e6eb;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  transition: all 0.3s;
}
.package-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.12);
}
.package-recommended {
  border-color: #409eff;
  background: linear-gradient(180deg, #f0f7ff 0%, #fff 40%);
}
.package-disabled {
  opacity: 0.6;
}
.pkg-badge {
  position: absolute;
  top: -1px;
  right: 20px;
  background: linear-gradient(135deg, #409eff, #1677ff);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 12px 4px;
  border-radius: 0 0 8px 8px;
}
.pkg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.pkg-name-input {
  width: 160px;
  font-weight: 600;
}
.pkg-name-input :deep(.el-input__inner) {
  font-size: 16px;
  font-weight: 600;
}
.pkg-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 2px;
}
.price-symbol {
  font-size: 18px;
  font-weight: 600;
  color: #f5222d;
}
.price-input {
  width: 100px;
}
.price-input :deep(.el-input__inner) {
  font-size: 28px;
  font-weight: 700;
  color: #f5222d;
  padding: 0;
}
.price-unit {
  font-size: 13px;
  color: #86909c;
}
.pkg-monthly {
  font-size: 12px;
  color: #86909c;
}
.pkg-features {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.feature-label {
  font-size: 13px;
  color: #4e5969;
  min-width: 70px;
  flex-shrink: 0;
}
.feature-hint {
  font-size: 11px;
  color: #c0c4cc;
}
.pkg-sort {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.pkg-actions {
  margin-top: 12px;
  text-align: right;
}

/* ========== 会话存档全局配置 ========== */
.archive-global-config {
  margin-bottom: 20px;
  border: 1px solid #e5e6eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.agc-section {
  padding: 18px 24px;
  border-bottom: 1px solid #f0f0f0;
}
.agc-section:last-child { border-bottom: none; }
.agc-section h4 { font-size: 14px; font-weight: 600; color: #1d2129; margin: 0 0 4px; }
.agc-desc { font-size: 12px; color: #86909c; margin: 0 0 12px; }
.purchase-mode-radio { display: flex; gap: 12px; }
.purchase-mode-radio :deep(.el-radio) { padding: 14px 18px; height: auto; border-radius: 8px; margin-right: 0; flex: 1; }
.purchase-mode-radio :deep(.el-radio.is-bordered.is-checked) { border-color: #409eff; background: #f0f7ff; }
.agc-service-fee {
  background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 16px;
}
.agc-fee-row { display: flex; align-items: center; gap: 12px; }
.agc-fee-label { font-size: 14px; font-weight: 500; color: #303133; min-width: 80px; }
.agc-fee-input { display: flex; align-items: center; gap: 8px; }
.agc-fee-unit { font-size: 13px; color: #606266; }
.agc-fee-example { margin-top: 10px; font-size: 12px; color: #8c6d1f; line-height: 1.6; }

/* ========== 会话存档卡片 ========== */
.archive-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.archive-tier-card {
  border: 2px solid #e5e6eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: all 0.3s;
}
.archive-tier-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.12);
}
.tier-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f0f5ff, #e8ecf4);
  border-bottom: 1px solid #e5e6eb;
}
.tier-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.tier-delete {
  margin-left: auto;
}
.tier-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tier-field label {
  display: block;
  font-size: 12px;
  color: #86909c;
  margin-bottom: 4px;
}
.field-unit {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 2px;
  display: block;
}
.tier-footer {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}
.tier-stat {
  text-align: center;
}
.stat-label {
  display: block;
  font-size: 11px;
  color: #86909c;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
}
.profit-good { color: #00b42a !important; }
.profit-warn { color: #ff7d00 !important; }

/* ========== AI套餐卡片 ========== */
.ai-packages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.ai-pkg-card {
  position: relative;
  border: 2px solid #e5e6eb;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  transition: all 0.3s;
}
.ai-pkg-card:hover {
  border-color: #722ed1;
  box-shadow: 0 4px 16px rgba(114, 46, 209, 0.12);
}
.ai-recommended {
  border-color: #722ed1;
  background: linear-gradient(180deg, #f9f0ff 0%, #fff 40%);
}
.ai-pkg-badge {
  position: absolute;
  top: -1px;
  right: 20px;
  background: linear-gradient(135deg, #722ed1, #eb2f96);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 12px 4px;
  border-radius: 0 0 8px 8px;
}
.ai-pkg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ai-pkg-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 6px;
}
.price-input-sm {
  width: 80px;
}
.price-input-sm :deep(.el-input__inner) {
  font-size: 24px;
  font-weight: 700;
  color: #f5222d;
  padding: 0;
}
.free-tag {
  font-size: 22px;
  font-weight: 700;
  color: #00b42a;
}
.ai-pkg-quota {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.quota-unit {
  font-size: 13px;
  color: #86909c;
}
.ai-pkg-unit-price {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 12px;
}
.ai-pkg-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-field label {
  display: block;
  font-size: 12px;
  color: #86909c;
  margin-bottom: 2px;
}

/* ========== 支付与计费 ========== */
.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.settings-card {
  border: 1px solid #e5e6eb;
  border-radius: 12px;
  padding: 20px 24px;
  background: #fff;
}
.settings-card h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #1d2129;
}
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-title-row h4 {
  margin: 0;
}
.billing-radio {
  display: flex;
  gap: 16px;
}
.billing-radio :deep(.el-radio) {
  padding: 16px 20px;
  height: auto;
  border-radius: 8px;
  margin-right: 0;
}
.billing-radio :deep(.el-radio.is-bordered.is-checked) {
  border-color: #409eff;
  background: #f0f7ff;
}
.radio-content {
  display: flex;
  flex-direction: column;
  margin-left: 4px;
}
.radio-content strong {
  font-size: 14px;
}
.radio-content span {
  font-size: 12px;
  color: #86909c;
  margin-top: 2px;
}
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.payment-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border: 2px solid #e5e6eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.payment-method:hover {
  border-color: #409eff;
}
.payment-method.active {
  border-color: #409eff;
  background: #f0f7ff;
}
.method-info {
  display: flex;
  flex-direction: column;
}
.method-info strong {
  font-size: 14px;
  color: #1d2129;
}
.method-info span {
  font-size: 12px;
  color: #86909c;
}

/* ========== (old trial/discount styles removed, replaced by td-* classes) ========== */

/* ========== 获客助手卡片 ========== */
.acquisition-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.acq-card {
  position: relative;
  border: 2px solid #e5e6eb;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  transition: all 0.3s;
}
.acq-card:hover {
  border-color: #13c2c2;
  box-shadow: 0 4px 16px rgba(19, 194, 194, 0.12);
}
.acq-recommended {
  border-color: #13c2c2;
  background: linear-gradient(180deg, #e6fffb 0%, #fff 40%);
}
.acq-badge {
  position: absolute;
  top: -1px;
  right: 20px;
  background: linear-gradient(135deg, #13c2c2, #36cfc9);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 12px 4px;
  border-radius: 0 0 8px 8px;
}
.acq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.acq-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 12px;
}
.acq-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.acq-field label {
  display: block;
  font-size: 12px;
  color: #86909c;
  margin-bottom: 2px;
}
.field-hint {
  font-size: 11px;
  color: #c0c4cc;
}

/* ========== Transition ========== */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, max-height 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* ========== Menu feature grid ========== */
.feature-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #86909c;
  margin-bottom: 6px;
}
.menu-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 4px;
}

/* ========== AI free once ========== */
.ai-free-once {
  margin: 4px 0 8px;
  padding: 6px 10px;
  background: #fff7e6;
  border-radius: 6px;
  border: 1px dashed #ffc53d;
}

/* ========== Trial & Discount redesign ========== */
.trial-discount-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 1200px) {
  .trial-discount-layout { grid-template-columns: 1fr; }
}
.td-card {
  border: 1px solid #e5e6eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.td-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}
.td-card-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.td-card-icon span {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}
.td-card-title {
  flex: 1;
}
.td-card-title h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: #1d2129;
}
.td-card-title p {
  font-size: 12px;
  color: #86909c;
  margin: 2px 0 0;
}
.td-card-body {
  padding: 20px;
}
.td-field-row {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
}
.td-field {
  flex: 1;
}
.td-field-label {
  display: block;
  font-size: 13px;
  color: #4e5969;
  font-weight: 500;
  margin-bottom: 6px;
}
.td-field-input {
  display: flex;
  align-items: center;
  gap: 6px;
}
.td-unit {
  font-size: 13px;
  color: #86909c;
}

/* Discount scope tags */
.discount-scope-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.discount-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  background: #fafbfc;
  transition: all 0.2s;
}
.dc-item:hover {
  border-color: #d6e4ff;
  background: #f7f9ff;
}
.dc-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dc-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dc-text {
  display: flex;
  flex-direction: column;
}
.dc-text strong {
  font-size: 14px;
  color: #1d2129;
}
.dc-text span {
  font-size: 11px;
  color: #86909c;
}
.dc-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dc-prefix, .dc-suffix {
  font-size: 13px;
  color: #4e5969;
  font-weight: 500;
}
</style>
