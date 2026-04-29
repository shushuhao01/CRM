<template>
  <div class="register-page">
    <div class="register-container">
      <!-- 左侧信息 -->
      <div class="register-info">
        <div class="info-content">
          <h1>开启智能销售之旅</h1>
          <p>注册即可免费试用7天，体验全部功能</p>

          <div class="benefits">
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>7天免费试用</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>无需信用卡</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>随时取消</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>专业客服支持</span>
            </div>
          </div>

          <div class="testimonial">
            <p>"使用云客CRM后，我们团队的销售效率提升了50%，强烈推荐！"</p>
            <div class="testimonial-author">
              <span class="author-name">— 张总监</span>
              <span class="author-company">某电商公司</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单 -->
      <div class="register-form-wrapper">
        <div class="form-header">
          <h2>创建账号</h2>
          <p>已有账号？<router-link to="/member/login">登录会员中心</router-link><template v-if="crmUrl"> 或 <a :href="crmUrl">登录CRM</a></template></p>
        </div>

        <!-- 步骤指示器 -->
        <div class="steps">
          <div class="step" :class="{ active: step >= 1, done: step > 1 }">
            <span class="step-num">1</span>
            <span class="step-text">选择套餐</span>
          </div>
          <div class="step-line" :class="{ active: step > 1 }"></div>
          <div class="step" :class="{ active: step >= 2, done: step > 2 }">
            <span class="step-num">2</span>
            <span class="step-text">填写信息</span>
          </div>
          <div class="step-line" :class="{ active: step > 2 }"></div>
          <div class="step" :class="{ active: step >= 3 }">
            <span class="step-num">3</span>
            <span class="step-text">{{ selectedPlan === 'FREE_TRIAL' ? (form.autoRenew ? '签约授权' : '完成注册') : (subscriptionChecked && currentPkgSubscriptionEnabled ? '签约支付' : '完成支付') }}</span>
          </div>
        </div>

        <!-- 已选套餐提示 -->
        <div class="selected-plan-banner" :class="{ free: selectedPlan === 'FREE_TRIAL' }">
          <span class="banner-icon">{{ selectedPlan === 'FREE_TRIAL' ? '🎁' : '📦' }}</span>
          <span class="banner-text">
            已选择：<strong>{{ getPlanName(selectedPlan) }}</strong>
            <template v-if="selectedPlan !== 'FREE_TRIAL' && planType === 'saas'">
              （{{ billingCycle === 'yearly' ? '年付' : '月付' }}）- ¥{{ getPlanPrice(selectedPlan) }}
              <template v-if="billingCycle === 'yearly'">
                <span class="save-tag">省¥{{ getSaveAmount(selectedPlan) }}</span>
              </template>
              <template v-if="currentPkgSubscriptionEnabled && subscriptionChecked && selectedPlan !== 'FREE_TRIAL'">
               <span class="sub-tag-banner"><svg class="sub-tag-banner-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> 订阅¥{{ billingCycle === 'yearly' ? subscriptionYearlyPrice.toLocaleString() + '/年' : subscriptionPrice + '/月' }}</span>
              </template>
            </template>
            <template v-else-if="selectedPlan !== 'FREE_TRIAL' && planType === 'private'">
              （{{ privateBillingMode === 'annual' ? '年度授权' : '永久买断' }}）- ¥{{ getPlanPrice(selectedPlan) }}{{ privateBillingMode === 'annual' ? '/年' : '' }}
              <template v-if="privateBillingMode === 'annual'">
                <span class="save-tag">省¥{{ getPrivateAnnualSaving(selectedPlan).toLocaleString() }}</span>
              </template>
            </template>
            <template v-else-if="selectedPlan !== 'FREE_TRIAL'"> - ¥{{ getPlanPrice(selectedPlan) }}</template>
            <template v-if="selectedPlan === 'FREE_TRIAL' && form.autoRenew">
              <span class="sub-tag-banner"><svg class="sub-tag-banner-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> 到期自动续费</span>
            </template>
          </span>
          <button v-if="step > 2" class="change-btn" @click="step = 1">更换套餐</button>
        </div>

        <!-- 步骤1：选择套餐 -->
        <div v-if="step === 1" class="form-step">
          <div class="plan-selector">
            <div class="plan-type-toggle">
              <button :class="{ active: planType === 'saas' }" @click="planType = 'saas'">
                ☁️ SaaS云端版
              </button>
              <button :class="{ active: planType === 'private' }" @click="planType = 'private'">
                🏢 私有部署版
              </button>
            </div>

            <div v-if="planType === 'saas'" class="plans-grid">
              <div v-for="pkg in saasPlanCards" :key="pkg.code"
                class="plan-card" :class="{ selected: selectedPlan === pkg.code, 'free-trial': pkg.is_trial }"
                @click="selectedPlan = pkg.code">
                <div v-if="pkg.is_trial" class="plan-badge free">免费</div>
                <div v-else-if="pkg.is_recommended" class="plan-badge">推荐</div>
                <h4>{{ pkg.name }}</h4>
                <p class="plan-price" :class="{ free: pkg.is_trial }">
                  <template v-if="pkg.is_trial">¥0</template>
                  <template v-else>¥{{ Number(pkg.price) }}<span>/月</span></template>
                </p>
                <p class="plan-desc">
                  <template v-if="pkg.user_limit_mode === 'both'">
                    {{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }}用户 / {{ pkg.max_online_seats }}席位
                    <span class="mode-badge">可选</span>
                  </template>
                  <template v-else-if="pkg.user_limit_mode === 'online'">
                    {{ pkg.max_online_seats }}席位 · {{ pkg.max_storage_gb }}GB存储
                  </template>
                  <template v-else>
                    {{ pkg.max_users >= 99999 ? '不限用户' : pkg.max_users + '用户' }} · {{ pkg.max_storage_gb }}GB存储
                  </template>
                </p>
              </div>
            </div>

            <!-- 月付/年付切换（仅SaaS套餐且非免费试用时显示） -->
            <div v-if="planType === 'saas' && selectedPlan !== 'FREE_TRIAL'" class="billing-toggle">
              <div class="billing-options">
                <label class="billing-option" :class="{ active: billingCycle === 'monthly' }">
                  <input type="radio" v-model="billingCycle" value="monthly" />
                  <span class="option-content">
                    <span class="option-title">月付</span>
                    <span class="option-price">¥{{ getMonthlyPrice(selectedPlan) }}/月</span>
                  </span>
                </label>
                <label class="billing-option" :class="{ active: billingCycle === 'yearly' }">
                  <input type="radio" v-model="billingCycle" value="yearly" />
                  <span class="option-content">
                    <span class="option-title">
                      年付
                      <span class="discount-badge">{{ getYearlyBadgeText(selectedPlan) }}</span>
                    </span>
                    <span class="option-price">
                      ¥{{ getYearlyPrice(selectedPlan) }}/年
                      <span class="original-price">¥{{ getYearlyOriginalPrice(selectedPlan) }}</span>
                    </span>
                    <span class="option-save">相当于¥{{ getYearlyMonthlyPrice(selectedPlan) }}/月，省¥{{ getSaveAmount(selectedPlan) }}</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- 用户限制模式选择（仅双模式套餐显示，必须二选一） -->
            <div v-if="needsModeSelection && planType === 'saas' && !currentPkg?.is_trial" class="billing-toggle" style="margin-top: 12px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 500; color: #303133;">选择用户限制模式 <span style="color:#e6a23c;font-size:12px;">（必选）</span></p>
              <div class="billing-options">
                <label class="billing-option" :class="{ active: selectedUserLimitMode === 'total' }">
                  <input type="radio" v-model="selectedUserLimitMode" value="total" />
                  <span class="option-content">
                    <span class="option-title">👥 限注册用户数</span>
                    <span class="option-price">最多 {{ currentPkg?.max_users >= 99999 ? '不限' : currentPkg?.max_users }} 个注册用户</span>
                    <span class="option-save">按总注册用户数限制，不限同时在线</span>
                  </span>
                </label>
                <label class="billing-option" :class="{ active: selectedUserLimitMode === 'online' }">
                  <input type="radio" v-model="selectedUserLimitMode" value="online" />
                  <span class="option-content">
                    <span class="option-title">🟢 限在线席位</span>
                    <span class="option-price">最多 {{ currentPkg?.max_online_seats }} 人同时在线</span>
                    <span class="option-save">按同时在线人数限制，不限注册用户数</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- 订阅自动续费选项（仅SaaS付费套餐支持订阅时显示） -->
            <div v-if="planType === 'saas' && selectedPlan !== 'FREE_TRIAL' && currentPkgSubscriptionEnabled" class="subscription-auto-renew">
              <label class="subscription-check-wrapper" :class="{ checked: subscriptionChecked }">
                <input type="checkbox" v-model="subscriptionChecked" />
                <span class="subscription-checkbox-indicator">
                  <svg v-if="subscriptionChecked" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span class="subscription-check-body">
                  <span class="subscription-check-header">
                    <svg class="subscription-check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    <span class="subscription-check-title">到期自动续费</span>
                    <span class="subscription-rec">推荐</span>
                  </span>
                  <span class="subscription-check-detail">
                    <template v-if="billingCycle === 'monthly'">
                      <template v-if="currentPkgSubscriptionDiscountRate > 0">
                        订阅价 <strong class="sub-hl-price">¥{{ subscriptionPrice }}/月</strong>
                        <span class="sub-off-label">省{{ currentPkgSubscriptionDiscountRate }}%</span>
                        <span class="sub-orig-price">原价 ¥{{ getMonthlyPrice(selectedPlan) }}/月</span>
                      </template>
                      <template v-else>
                        ¥{{ getMonthlyPrice(selectedPlan) }}/月 · 到期按月自动扣款
                      </template>
                    </template>
                    <template v-else>
                      <template v-if="currentPkgSubscriptionDiscountRate > 0">
                        订阅价 <strong class="sub-hl-price">¥{{ subscriptionYearlyPrice.toLocaleString() }}/年</strong>
                        <span class="sub-off-label">再省{{ currentPkgSubscriptionDiscountRate }}%</span>
                        <span class="sub-orig-price">年付价 ¥{{ getYearlyPrice(selectedPlan).toLocaleString() }}/年</span>
                      </template>
                      <template v-else>
                        ¥{{ getYearlyPrice(selectedPlan).toLocaleString() }}/年 · 到期按年自动扣款
                      </template>
                    </template>
                  </span>
                  <span class="subscription-check-benefits" v-if="currentPkgSubscriptionDiscountRate > 0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    订阅自动续费再省 <strong>¥{{ subscriptionSaving }}</strong>{{ billingCycle === 'yearly' ? '/年' : '/月' }}，不间断服务 · 随时可取消
                  </span>
                  <span class="subscription-check-benefits" v-else>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    不间断服务，避免忘记续费 · 随时可在会员中心取消
                  </span>
                </span>
              </label>
            </div>

            <div v-if="planType === 'private'" class="plans-grid plans-grid-3">
              <div v-for="pkg in privatePlanCards" :key="pkg.code"
                class="plan-card" :class="{ selected: selectedPlan === pkg.code }"
                @click="selectedPlan = pkg.code">
                <div v-if="pkg.is_recommended" class="plan-badge">推荐</div>
                <h4>{{ pkg.name }}</h4>
                <p class="plan-price">¥{{ getPrivateDisplayPrice(pkg.code) }}<span v-if="privateBillingMode === 'annual'">/年</span></p>
                <p class="plan-desc">{{ pkg.max_users >= 99999 ? '不限用户' : pkg.max_users + '用户' }} · {{ privateBillingMode === 'annual' ? '年度授权' : '永久授权' }}</p>
              </div>
            </div>

            <!-- 私有部署: 年度授权/永久买断切换 -->
            <div v-if="planType === 'private' && hasPrivateAnnualPricing" class="billing-toggle">
              <div class="billing-options">
                <label class="billing-option" :class="{ active: privateBillingMode === 'annual' }">
                  <input type="radio" v-model="privateBillingMode" value="annual" />
                  <span class="option-content">
                    <span class="option-title">
                      📅 年度授权
                      <span class="discount-badge">约{{ getPrivateAnnualDiscount(selectedPlan) }}折</span>
                    </span>
                    <span class="option-price">
                      ¥{{ getPrivateAnnualPrice(selectedPlan).toLocaleString() }}/年
                    </span>
                    <span class="option-save">首年省 ¥{{ getPrivateAnnualSaving(selectedPlan).toLocaleString() }}，到期可续费</span>
                  </span>
                </label>
                <label class="billing-option" :class="{ active: privateBillingMode === 'perpetual' }">
                  <input type="radio" v-model="privateBillingMode" value="perpetual" />
                  <span class="option-content">
                    <span class="option-title">💎 永久买断</span>
                    <span class="option-price">
                      ¥{{ getPrivatePerpetualPrice(selectedPlan).toLocaleString() }}
                    </span>
                    <span class="option-save">一次付费，终身使用</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
          <button class="btn btn-primary btn-block" @click="step = 2">下一步</button>
        </div>

        <!-- 步骤2：填写信息 -->
        <div v-if="step === 2" class="form-step">
          <form @submit.prevent="handleSubmitInfo">
            <div class="form-group">
              <label>企业名称 <span class="required">*</span></label>
              <input type="text" v-model="form.companyName" placeholder="请输入企业名称" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>联系人 <span class="required">*</span></label>
                <input type="text" v-model="form.contactName" placeholder="请输入联系人姓名" required />
              </div>
              <div class="form-group">
                <label>手机号 <span class="required">*</span></label>
                <input type="tel" v-model="form.phone" placeholder="请输入手机号" required />
              </div>
            </div>
            <div class="form-group">
              <label>验证码 <span class="required">*</span></label>
              <div class="code-input">
                <input type="text" v-model="form.code" placeholder="请输入验证码" required />
                <button type="button" class="code-btn" :disabled="countdown > 0" @click="sendCode">
                  {{ countdown > 0 ? `${countdown}s后重发` : '获取验证码' }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>邮箱 <span class="recommended">（推荐填写）</span></label>
              <input type="email" v-model="form.email" placeholder="请输入邮箱地址" />
              <p class="field-hint">📧 填写邮箱可接收账号开通通知、到期提醒等重要信息</p>
            </div>
            <div class="form-group">
              <label>会员中心密码 <span class="recommended">（选填）</span></label>
              <input type="password" v-model="form.password" placeholder="不填写则使用初始密码 Aa123456" minlength="6" />
              <p class="field-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 2px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                用于登录会员中心管理订阅、查看账单。不填写将使用初始密码 <strong>Aa123456</strong>，建议登录后修改
              </p>
            </div>
            <!-- 免费试用：到期自动续费选项（仅当有支持订阅的套餐时显示） -->
            <div v-if="selectedPlan === 'FREE_TRIAL' && renewablePlans.length > 0" class="auto-renew-section">
              <label class="checkbox-label auto-renew-label">
                <input type="checkbox" v-model="form.autoRenew" />
                <span class="renew-text">
                  <svg class="renew-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  试用到期后自动续费
                  <span class="renew-highlight">（推荐，试用期内可随时取消）</span>
                </span>
              </label>
              <div v-if="form.autoRenew" class="auto-renew-options">
                <p class="renew-desc">试用到期自动续费套餐：</p>
                <div class="renew-plan-options">
                  <label v-for="pkg in renewablePlans" :key="pkg.code"
                    class="renew-plan-option" :class="{ selected: form.autoRenewPackage === pkg.code }">
                    <input type="radio" v-model="form.autoRenewPackage" :value="pkg.code" />
                    <div class="plan-main">
                      <span class="plan-name">{{ pkg.name }}</span>
                      <span class="plan-benefits">
                        {{ pkg.max_users }}用户 · {{ pkg.max_storage_gb }}GB存储
                        <span v-if="pkg.features && pkg.features.length > 0" class="features-trigger" @mouseenter="hoveredPkg = pkg.code" @mouseleave="hoveredPkg = ''">
                          · 更多 ▾
                          <div v-if="hoveredPkg === pkg.code" class="features-tooltip">
                            <div v-for="(f, i) in pkg.features" :key="i" class="feature-item">✓ {{ f }}</div>
                          </div>
                        </span>
                      </span>
                    </div>
                    <span class="plan-price">
                      {{ pkg.subscription_enabled && pkg.subscription_discount_rate > 0
                        ? '¥' + (pkg.price * (1 - pkg.subscription_discount_rate / 100)).toFixed(0) + '/月'
                        : '¥' + pkg.price + '/月' }}
                    </span>
                    <span v-if="pkg.subscription_enabled && pkg.subscription_discount_rate > 0" class="sub-tag">订阅优惠</span>
                  </label>
                </div>
                <p class="renew-tip">⚠ 试用期内可在会员中心取消，不取消则到期自动扣费</p>
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.agree" required />
                <span>我已阅读并同意 <router-link to="/agreement/service" target="_blank">《服务协议》</router-link> 和 <router-link to="/agreement/privacy" target="_blank">《隐私政策》</router-link></span>
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-outline" @click="step = 1">上一步</button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                {{ submitting ? '提交中...' : '下一步' }}
              </button>
            </div>
          </form>
        </div>

        <!-- 步骤3：签约/支付 -->
        <div v-if="step === 3" class="form-step">

          <!-- ===== 签约模式（免费试用+自动续费） ===== -->
          <div v-if="signingMode" class="signing-section">
            <!-- 注册成功提示 -->
            <div class="register-success-banner">
              <div class="success-icon">✅</div>
              <div class="success-content">
                <h3>账号已创建成功！</h3>
                <div class="success-details">
                  <div class="detail-item">
                    <span class="detail-label">租户编码</span>
                    <span class="detail-value">{{ registeredTenant?.tenantCode }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">授权码</span>
                    <span class="detail-value license-key">{{ registeredTenant?.licenseKey }}</span>
                  </div>
                  <div v-if="registeredTenant?.adminUsername" class="detail-item">
                    <span class="detail-label">管理员账号</span>
                    <span class="detail-value">{{ registeredTenant.adminUsername }}</span>
                  </div>
                  <div v-if="registeredTenant?.memberPasswordIsDefault" class="detail-item">
                    <span class="detail-label">会员中心密码</span>
                    <span class="detail-value" style="color: #e6a23c;">初始密码：Aa123456（请登录后修改）</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 签约区域 -->
            <div class="signing-area">
              <div class="signing-header">
                <h3>🔄 {{ isTrialSigning ? '设置自动续费签约' : '订阅签约' }}</h3>
                <p v-if="isTrialSigning">完成签约后，7天试用到期将自动续费为「{{ signingTargetPkgName }}」套餐（¥{{ signingTargetPkgPrice }}/月）</p>
                <p v-else>完成签约授权后，系统将自动为您开通「{{ signingTargetPkgName }}」套餐（¥{{ signingTargetPkgPrice }}/{{ billingCycle === 'yearly' ? '年' : '月' }}），首期立即扣款</p>
              </div>

              <!-- 未开始签约 - 选择渠道 -->
              <div v-if="signingStatus === 'idle'">
                <p class="channel-label">请选择签约渠道：</p>
                <div class="payment-options">
                  <label v-if="signingTargetPkgChannels !== 'alipay'" class="payment-option" :class="{ selected: signingChannel === 'wechat' }">
                    <input type="radio" v-model="signingChannel" value="wechat" />
                    <span class="payment-icon wechat">💚</span>
                    <span>微信委托代扣</span>
                  </label>
                  <label v-if="signingTargetPkgChannels !== 'wechat'" class="payment-option" :class="{ selected: signingChannel === 'alipay' }">
                    <input type="radio" v-model="signingChannel" value="alipay" />
                    <span class="payment-icon alipay">💙</span>
                    <span>支付宝周期扣款</span>
                  </label>
                </div>

                <div class="signing-notice">
                  <p>📋 签约说明：</p>
                  <ul v-if="isTrialSigning">
                    <li>签约后不会立即扣费，仅在7天试用期结束后自动扣款</li>
                    <li>试用期内可随时在会员中心取消自动续费</li>
                    <li>首次扣款金额：¥{{ signingTargetPkgPrice }}/月</li>
                  </ul>
                  <ul v-else>
                    <li>签约后首期立即扣款，之后每{{ billingCycle === 'yearly' ? '年' : '月' }}自动续费</li>
                    <li>可随时在会员中心取消自动续费</li>
                    <li>每期扣款金额：¥{{ signingTargetPkgPrice }}/{{ billingCycle === 'yearly' ? '年' : '月' }}</li>
                  </ul>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-primary btn-block" @click="handleStartSigning" :disabled="signingLoading">
                    {{ signingLoading ? '发起签约中...' : '开始签约' }}
                  </button>
                </div>
                <p v-if="isTrialSigning" class="skip-signing-link" @click="skipTrialSigning">
                  跳过签约，直接开始7天试用 →
                </p>
              </div>

              <!-- 等待签约完成 - 显示二维码 -->
              <div v-else-if="signingStatus === 'waiting'">
                <div class="qr-header">
                  <span class="pay-type-icon" :class="signingChannel">
                    {{ signingChannel === 'wechat' ? '💚' : '💙' }}
                  </span>
                  <span>{{ signingChannel === 'wechat' ? '微信' : '支付宝' }}签约授权</span>
                </div>

                <div class="qr-code-wrapper">
                  <div v-if="signingUrl && signingQrDataUrl" class="qr-code">
                    <img :src="signingQrDataUrl" alt="签约二维码" />
                  </div>
                  <div v-else class="qr-error">
                    <span>⚠️</span>
                    <p>二维码加载失败</p>
                    <p class="error-tip">请检查支付配置或联系客服</p>
                  </div>
                  <p class="qr-tip">请使用{{ signingChannel === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成签约授权</p>
                </div>

                <div class="payment-status">
                  <span class="loading-spinner"></span>
                  <span>正在等待签约结果...</span>
                </div>

                <div class="form-actions">
                  <button v-if="!isTrialSigning" type="button" class="btn btn-outline" @click="cancelSigning">取消签约</button>
                  <button v-if="isTrialSigning" type="button" class="btn btn-outline" @click="skipTrialSigning">跳过签约</button>
                  <button type="button" class="btn btn-primary" @click="checkSigningManually">我已完成签约</button>
                </div>
              </div>

              <!-- 签约成功 -->
              <div v-else-if="signingStatus === 'success'">
                <div class="signing-success-info">
                  <div class="success-check">🎉</div>
                  <h4>签约成功！</h4>
                  <p v-if="isTrialSigning">自动续费已设置，7天试用期结束后将自动续费为「{{ signingTargetPkgName }}」套餐。</p>
                  <p v-else>订阅已开通，「{{ signingTargetPkgName }}」套餐首期将自动扣款。</p>
                  <p class="success-sub">可随时在会员中心取消自动续费。</p>
                </div>

                <div class="form-actions" style="justify-content: center;">
                  <button type="button" class="btn btn-primary" @click="goToSuccess">🚀 开始使用</button>
                </div>
              </div>

              <!-- 签约取消/失败 → 正常付费（仅付费套餐） -->
              <div v-else-if="signingStatus === 'paying'">
                <div class="signing-failed-notice">
                  <span class="notice-icon">⚠️</span>
                  <div class="notice-content">
                    <h4>签约未完成</h4>
                    <p>您取消了订阅签约，请通过以下方式完成套餐购买</p>
                  </div>
                </div>

                <div class="order-summary compact">
                  <div class="order-item">
                    <span class="item-label">套餐</span>
                    <span class="item-value">{{ signingTargetPkgName }}</span>
                  </div>
                  <div class="order-item">
                    <span class="item-label">计费周期</span>
                    <span class="item-value">{{ billingCycle === 'yearly' ? '年付' : '月付' }}</span>
                  </div>
                  <div class="order-item total">
                    <span class="item-label">应付金额</span>
                    <span class="item-value price">¥{{ getPlanPrice(selectedPlan) }}</span>
                  </div>
                </div>

                <div class="payment-methods">
                  <h4>选择支付方式</h4>
                  <div class="payment-options">
                    <label v-if="enabledPayMethods.wechat" class="payment-option" :class="{ selected: paymentMethod === 'wechat' }">
                      <input type="radio" v-model="paymentMethod" value="wechat" />
                      <span>微信支付</span>
                    </label>
                    <label v-if="enabledPayMethods.alipay" class="payment-option" :class="{ selected: paymentMethod === 'alipay' }">
                      <input type="radio" v-model="paymentMethod" value="alipay" />
                      <span>支付宝</span>
                    </label>
                    <label v-if="enabledPayMethods.bank" class="payment-option" :class="{ selected: paymentMethod === 'bank' }">
                      <input type="radio" v-model="paymentMethod" value="bank" />
                      <span>对公转账</span>
                    </label>
                  </div>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-primary btn-block" @click="handleSkipSigningPayment" :disabled="creatingPayment">
                    {{ creatingPayment ? '创建订单中...' : '确认支付' }}
                  </button>
                </div>
              </div>

              <!-- 签约取消后 → 等待付费结果 -->
              <div v-else-if="signingStatus === 'pay-waiting'">
                <!-- 对公转账 -->
                <template v-if="paymentMethod === 'bank'">
                  <div class="qr-header">
                    <span class="pay-type-icon bank">🏦</span>
                    <span>对公转账</span>
                  </div>

                  <!-- 转账金额 - 突出显示 -->
                  <div class="bank-amount-highlight">
                    <div class="amount-label">应转账金额</div>
                    <div class="amount-value">¥{{ getPlanPrice(selectedPlan) }}</div>
                    <div class="amount-tip">请务必按此金额转账，以便快速核对</div>
                  </div>

                  <!-- 银行账户信息卡片 -->
                  <div class="bank-info-card">
                    <div class="bank-card-header">
                      <span class="card-title">收款账户信息</span>
                      <button type="button" class="btn-copy-bank" @click="copyBankInfo" :class="{ copied: bankInfoCopied }">
                        <svg v-if="!bankInfoCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>{{ bankInfoCopied ? '已复制' : '一键复制' }}</span>
                      </button>
                    </div>

                    <div class="bank-info-grid">
                      <div class="bank-info-row" v-if="bankConfig.accountName">
                        <div class="info-label">账户名称</div>
                        <div class="info-value highlight">{{ bankConfig.accountName }}</div>
                      </div>
                      <div class="bank-info-row" v-if="bankConfig.accountNo">
                        <div class="info-label">银行账号</div>
                        <div class="info-value account-number">{{ bankConfig.accountNo }}</div>
                      </div>
                      <div class="bank-info-row" v-if="bankConfig.bankName">
                        <div class="info-label">开户银行</div>
                        <div class="info-value">{{ bankConfig.bankName }}</div>
                      </div>
                      <div class="bank-info-row" v-if="bankConfig.bankBranch">
                        <div class="info-label">开户支行</div>
                        <div class="info-value">{{ bankConfig.bankBranch }}</div>
                      </div>
                    </div>

                    <div class="bank-remark" v-if="bankConfig.remark">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      <span>{{ bankConfig.remark }}</span>
                    </div>
                  </div>

                  <!-- 订单号提示 -->
                  <div class="order-number-notice" v-if="paymentOrder">
                    <div class="notice-icon">💡</div>
                    <div class="notice-content">
                      <div class="notice-title">转账备注请填写订单号</div>
                      <div class="order-number">{{ paymentOrder.orderNo }}</div>
                      <div class="notice-desc">填写订单号可加快到账确认速度</div>
                    </div>
                  </div>

                  <!-- 转账须知 -->
                  <div class="bank-notice-steps">
                    <div class="notice-step">
                      <span class="step-num">1</span>
                      <span class="step-text">使用网银或手机银行向以上账户转账</span>
                    </div>
                    <div class="notice-step">
                      <span class="step-num">2</span>
                      <span class="step-text">转账备注中填写订单号，便于快速核对</span>
                    </div>
                    <div class="notice-step">
                      <span class="step-num">3</span>
                      <span class="step-text">转账完成后点击"我已完成转账"按钮</span>
                    </div>
                    <div class="notice-step">
                      <span class="step-num">4</span>
                      <span class="step-text">工作人员将在1-2个工作日内确认并激活账号</span>
                    </div>
                  </div>

                  <div class="form-actions">
                    <button type="button" class="btn btn-outline" @click="handleCancelSkipPayment">取消订单</button>
                    <button type="button" class="btn btn-primary" @click="handleSkipSigningBankDone">我已完成转账</button>
                  </div>
                </template>

                <!-- 微信/支付宝扫码支付 -->
                <template v-else>
                <div class="qr-header">
                  <span class="pay-type-icon" :class="paymentMethod">
                    {{ paymentMethod === 'wechat' ? '💚' : '💙' }}
                  </span>
                  <span>{{ paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫码支付</span>
                </div>

                <div class="qr-amount">
                  <span class="amount-label">支付金额</span>
                  <span class="amount-value">¥{{ getPlanPrice(selectedPlan) }}</span>
                </div>

                <div class="qr-code-wrapper">
                  <div v-if="paymentOrder && paymentQrDataUrl" class="qr-code">
                    <img :src="paymentQrDataUrl" alt="支付二维码" />
                  </div>
                  <div v-else class="qr-error">
                    <span>⚠️</span>
                    <p>二维码加载失败</p>
                    <p class="error-tip">请检查支付配置或联系客服</p>
                  </div>
                  <p class="qr-tip">请使用{{ paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付</p>
                </div>

                <div class="order-info" v-if="paymentOrder">
                  <span>订单号：{{ paymentOrder.orderNo }}</span>
                  <span class="expire-tip" :class="{ urgent: expireCountdown <= 60 }">
                    {{ expireCountdown > 0 ? `${Math.floor(expireCountdown / 60)}分${(expireCountdown % 60).toString().padStart(2, '0')}秒后自动跳转会员中心` : '即将跳转...' }}
                  </span>
                </div>

                <div class="payment-status" v-if="checkingPayment">
                  <span class="loading-spinner"></span>
                  <span>正在等待支付结果...</span>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="handleCancelSkipPayment">取消支付</button>
                  <button type="button" class="btn btn-primary" @click="handleCheckSkipPayment">我已完成支付</button>
                </div>
                </template>
              </div>

              <!-- 签约取消后 → 付费成功 -->
              <div v-else-if="signingStatus === 'pay-success'">
                <div class="signing-success-info">
                  <div class="success-check">🎉</div>
                  <h4>支付成功！</h4>
                  <p>您已成功购买「{{ signingTargetPkgName }}」套餐</p>
                </div>

                <div class="register-success-banner" style="margin-top: 12px;">
                  <div class="success-icon">📋</div>
                  <div class="success-content">
                    <h3>您的授权信息</h3>
                    <div class="success-details">
                      <div class="detail-item">
                        <span class="detail-label">租户编码</span>
                        <span class="detail-value">{{ registeredTenant?.tenantCode }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">授权码</span>
                        <span class="detail-value license-key">{{ registeredTenant?.licenseKey }}</span>
                      </div>
                      <div v-if="registeredTenant?.adminUsername" class="detail-item">
                        <span class="detail-label">管理员账号</span>
                        <span class="detail-value">{{ registeredTenant.adminUsername }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-actions" style="justify-content: center; gap: 12px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-primary" @click="goToSuccess">🚀 开始使用</button>
                  <router-link to="/member/dashboard" class="btn btn-outline">👤 进入会员中心</router-link>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== 支付模式（付费套餐） ===== -->
          <template v-else>
          <!-- 未创建支付订单时显示订单确认 -->
          <div v-if="!paymentOrder" class="order-summary">
            <h3>订单确认</h3>
            <div class="order-item">
              <span class="item-label">套餐</span>
              <span class="item-value">{{ getPlanName(selectedPlan) }}</span>
            </div>
            <div v-if="planType === 'saas' && selectedPlan !== 'FREE_TRIAL'" class="order-item">
              <span class="item-label">计费周期</span>
              <span class="item-value">
                {{ billingCycle === 'yearly' ? '年付（12个月）' : '月付' }}
                <span v-if="billingCycle === 'yearly'" class="gift-tag">🎁 {{ getYearlyBadgeText(selectedPlan) }}</span>
              </span>
            </div>
            <div v-if="planType === 'private'" class="order-item">
              <span class="item-label">授权方式</span>
              <span class="item-value">
                {{ privateBillingMode === 'annual' ? '年度授权（1年）' : '永久买断' }}
                <span v-if="privateBillingMode === 'annual'" class="gift-tag">🎉 约{{ getPrivateAnnualDiscount(selectedPlan) }}折</span>
              </span>
            </div>
            <div class="order-item">
              <span class="item-label">企业名称</span>
              <span class="item-value">{{ form.companyName }}</span>
            </div>
            <div class="order-item">
              <span class="item-label">联系人</span>
              <span class="item-value">{{ form.contactName }}</span>
            </div>
            <div v-if="billingCycle === 'yearly' && planType === 'saas' && selectedPlan !== 'FREE_TRIAL'" class="order-item discount">
              <span class="item-label">原价</span>
              <span class="item-value original">¥{{ getYearlyOriginalPrice(selectedPlan).toLocaleString() }}</span>
            </div>
            <div v-if="privateBillingMode === 'annual' && planType === 'private'" class="order-item discount">
              <span class="item-label">永久买断价</span>
              <span class="item-value original">¥{{ getPrivatePerpetualPrice(selectedPlan).toLocaleString() }}</span>
            </div>
            <div class="order-item total">
              <span class="item-label">应付金额</span>
              <span class="item-value price">
                <template v-if="payMode === 'subscription' && currentPkgSubscriptionEnabled">
                  ¥{{ billingCycle === 'yearly' ? subscriptionYearlyPrice.toLocaleString() + '/年' : subscriptionPrice + '/月' }}
                </template>
                <template v-else>
                  ¥{{ getPlanPrice(selectedPlan) }}
                </template>
                <span v-if="payMode === 'subscription' && currentPkgSubscriptionDiscountRate > 0" class="sub-discount-tag">
                  订阅{{ (10 - currentPkgSubscriptionDiscountRate / 10).toFixed(1) }}折
                </span>
              </span>
            </div>

            <div class="payment-methods">
              <!-- 订阅/正常支付切换（仅当套餐支持订阅时显示） -->
              <div v-if="currentPkgSubscriptionEnabled && planType === 'saas' && selectedPlan !== 'FREE_TRIAL'" class="pay-mode-toggle">
                <h4>支付模式</h4>
                <div class="pay-mode-options">
                  <label class="pay-mode-option" :class="{ active: payMode === 'subscription' }">
                    <input type="radio" v-model="payMode" value="subscription" />
                    <span class="mode-content">
                      <span class="mode-title">🔄 订阅付费 <span class="rec-tag">推荐</span></span>
                      <span class="mode-price">¥{{ billingCycle === 'yearly' ? subscriptionYearlyPrice.toLocaleString() + '/年' : subscriptionPrice + '/月' }}</span>
                      <span v-if="currentPkgSubscriptionDiscountRate > 0" class="mode-save">
                        省{{ currentPkgSubscriptionDiscountRate }}% · 自动续费更省心
                      </span>
                      <span v-else class="mode-save">到期自动扣款，不用担心中断</span>
                    </span>
                  </label>
                  <label class="pay-mode-option" :class="{ active: payMode === 'normal' }">
                    <input type="radio" v-model="payMode" value="normal" />
                    <span class="mode-content">
                      <span class="mode-title">💳 正常支付</span>
                      <span class="mode-price">¥{{ getPlanPrice(selectedPlan) }}</span>
                      <span class="mode-desc">一次性支付，到期需手动续费</span>
                    </span>
                  </label>
                </div>
              </div>

              <h4>选择支付方式</h4>
              <div class="payment-options">
                <!-- 订阅模式只显示支持的渠道 -->
                <template v-if="payMode === 'subscription' && currentPkgSubscriptionEnabled">
                  <label v-if="currentPkgSubscriptionChannels !== 'alipay'" class="payment-option" :class="{ selected: paymentMethod === 'wechat' }">
                    <input type="radio" v-model="paymentMethod" value="wechat" />
                    <span>微信委托代扣</span>
                  </label>
                  <label v-if="currentPkgSubscriptionChannels !== 'wechat'" class="payment-option" :class="{ selected: paymentMethod === 'alipay' }">
                    <input type="radio" v-model="paymentMethod" value="alipay" />
                    <span>支付宝周期扣款</span>
                  </label>
                </template>
                <!-- 正常支付显示全部方式 -->
                <template v-else>
                <label v-if="enabledPayMethods.wechat" class="payment-option" :class="{ selected: paymentMethod === 'wechat' }">
                  <input type="radio" v-model="paymentMethod" value="wechat" />
                  <span>微信支付</span>
                </label>
                <label v-if="enabledPayMethods.alipay" class="payment-option" :class="{ selected: paymentMethod === 'alipay' }">
                  <input type="radio" v-model="paymentMethod" value="alipay" />
                  <span>支付宝</span>
                </label>
                <label v-if="enabledPayMethods.bank" class="payment-option" :class="{ selected: paymentMethod === 'bank' }">
                  <input type="radio" v-model="paymentMethod" value="bank" />
                  <span>对公转账</span>
                </label>
                </template>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-outline" @click="step = 2">上一步</button>
              <button type="button" class="btn btn-primary" @click="handleCreatePayment" :disabled="creatingPayment">
                {{ creatingPayment ? '创建订单中...' : (payMode === 'subscription' && currentPkgSubscriptionEnabled ? '确认签约并支付' : '确认支付') }}
              </button>
            </div>
            <p class="skip-payment-link" @click="handlePayLater">
              稍后支付，前往会员中心 →
            </p>
          </div>

          <!-- 已创建支付订单，显示二维码或银行信息 -->
          <div v-else class="payment-qrcode">
            <!-- 对公转账 - 显示银行账户信息 -->
            <template v-if="paymentMethod === 'bank'">
              <div class="qr-header">
                <span class="pay-type-icon bank">🏦</span>
                <span>对公转账</span>
              </div>

              <!-- 转账金额 - 突出显示 -->
              <div class="bank-amount-highlight">
                <div class="amount-label">应转账金额</div>
                <div class="amount-value">¥{{ getPlanPrice(selectedPlan) }}</div>
                <div class="amount-tip">请务必按此金额转账，以便快速核对</div>
              </div>

              <!-- 银行账户信息卡片 -->
              <div class="bank-info-card">
                <div class="bank-card-header">
                  <span class="card-title">收款账户信息</span>
                  <button type="button" class="btn-copy-bank" @click="copyBankInfo" :class="{ copied: bankInfoCopied }">
                    <svg v-if="!bankInfoCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>{{ bankInfoCopied ? '已复制' : '一键复制' }}</span>
                  </button>
                </div>

                <div class="bank-info-grid">
                  <div class="bank-info-row" v-if="bankConfig.accountName">
                    <div class="info-label">账户名称</div>
                    <div class="info-value highlight">{{ bankConfig.accountName }}</div>
                  </div>
                  <div class="bank-info-row" v-if="bankConfig.accountNo">
                    <div class="info-label">银行账号</div>
                    <div class="info-value account-number">{{ bankConfig.accountNo }}</div>
                  </div>
                  <div class="bank-info-row" v-if="bankConfig.bankName">
                    <div class="info-label">开户银行</div>
                    <div class="info-value">{{ bankConfig.bankName }}</div>
                  </div>
                  <div class="bank-info-row" v-if="bankConfig.bankBranch">
                    <div class="info-label">开户支行</div>
                    <div class="info-value">{{ bankConfig.bankBranch }}</div>
                  </div>
                </div>

                <div class="bank-remark" v-if="bankConfig.remark">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>{{ bankConfig.remark }}</span>
                </div>
              </div>

              <!-- 订单号提示 -->
              <div class="order-number-notice" v-if="paymentOrder">
                <div class="notice-icon">💡</div>
                <div class="notice-content">
                  <div class="notice-title">转账备注请填写订单号</div>
                  <div class="order-number">{{ paymentOrder.orderNo }}</div>
                  <div class="notice-desc">填写订单号可加快到账确认速度</div>
                </div>
              </div>

              <!-- 转账须知 -->
              <div class="bank-notice-steps">
                <div class="notice-step">
                  <span class="step-num">1</span>
                  <span class="step-text">使用网银或手机银行向以上账户转账</span>
                </div>
                <div class="notice-step">
                  <span class="step-num">2</span>
                  <span class="step-text">转账备注中填写订单号，便于快速核对</span>
                </div>
                <div class="notice-step">
                  <span class="step-num">3</span>
                  <span class="step-text">转账完成后点击"我已完成转账"按钮</span>
                </div>
                <div class="notice-step">
                  <span class="step-num">4</span>
                  <span class="step-text">工作人员将在1-2个工作日内确认并激活账号</span>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-outline" @click="handleCancelPayment">取消订单</button>
                <button type="button" class="btn btn-primary" @click="handleBankTransferDone">
                  我已完成转账
                </button>
              </div>
            </template>

            <!-- 微信/支付宝 - 显示二维码 -->
            <template v-else>
              <div class="qr-header">
                <span class="pay-type-icon" :class="paymentMethod">
                  {{ paymentMethod === 'wechat' ? '💚' : '💙' }}
                </span>
                <span>{{ paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫码支付</span>
              </div>

            <div class="qr-amount">
              <span class="amount-label">支付金额</span>
              <span class="amount-value">¥{{ getPlanPrice(selectedPlan) }}</span>
            </div>

            <div class="qr-code-wrapper">
              <div v-if="paymentQrDataUrl" class="qr-code">
                    <img :src="paymentQrDataUrl || ''" alt="支付二维码" />
              </div>
              <div v-else class="qr-error">
                <span>⚠️</span>
                <p>二维码加载失败</p>
                <p class="error-tip">请检查支付配置或联系客服</p>
              </div>
              <p class="qr-tip">请使用{{ paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付</p>
            </div>

            <div class="order-info" v-if="paymentOrder">
              <span>订单号：{{ paymentOrder.orderNo }}</span>
              <span class="expire-tip">{{ expireCountdown > 0 ? `${Math.floor(expireCountdown / 60)}分${expireCountdown % 60}秒后过期` : '订单已过期' }}</span>
            </div>

            <div class="payment-status" v-if="checkingPayment">
              <span class="loading-spinner"></span>
              <span>正在等待支付结果...</span>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-outline" @click="handleCancelPayment">取消支付</button>
              <button type="button" class="btn btn-primary" @click="handleCheckPayment">
                我已完成支付
              </button>
            </div>
            <p class="skip-payment-link" @click="handlePayLater">
              稍后支付，前往会员中心 →
            </p>
            </template>
          </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPackages as fetchPackages, getYearlyPromoText, type Package } from '@/api/packages'
import { getWebsiteConfig } from '@/api/website-config'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const API_BASE = '/api/v1'
const route = useRoute()
const router = useRouter()
const crmUrl = ref('') // 动态CRM系统地址

const step = ref(1)
const planType = ref<'saas' | 'private'>('saas')
const billingCycle = ref<'monthly' | 'yearly'>('monthly')
const selectedPlan = ref('FREE_TRIAL')
const paymentMethod = ref('wechat')
const payMode = ref<'subscription' | 'normal'>('subscription')
const hoveredPkg = ref('')
const subscriptionChecked = ref(true)
const privateBillingMode = ref<'perpetual' | 'annual'>('perpetual')
const selectedUserLimitMode = ref<'total' | 'online'>('total')
const countdown = ref(0)
const _paying = ref(false)
const submitting = ref(false)
const creatingPayment = ref(false)
const checkingPayment = ref(false)
const expireCountdown = ref(0)
const registeredTenant = ref<any>(null)

// 支付订单信息
const paymentOrder = ref<{
  orderId: string
  orderNo: string
  qrCode: string
  payUrl: string
} | null>(null)
const paymentQrDataUrl = ref('')

watch(paymentOrder, async (order) => {
  if (!order) { paymentQrDataUrl.value = ''; return }
  const content = order.payUrl || order.qrCode
  paymentQrDataUrl.value = content ? await generateQRCodeDataUrl(content) : ''
})

// 对公转账银行信息
const bankConfig = reactive({
  bankName: '',
  accountName: '',
  accountNo: '',
  bankBranch: '',
  remark: ''
})

// 银行信息复制状态
const bankInfoCopied = ref(false)

// 可用的支付方式（从后端配置加载）
const enabledPayMethods = reactive({ wechat: true, alipay: true, bank: false })

let paymentCheckTimer: any = null
let expireTimer: any = null
let signingCheckTimer: any = null

// 签约模式状态（免费试用+自动续费）
const signingMode = ref(false)
const signingChannel = ref<'wechat' | 'alipay'>('wechat')
const signingSubscription = ref<any>(null)
const signingUrl = ref('')
const signingQrDataUrl = ref('')
const signingLoading = ref(false)

watch(signingUrl, async (url) => {
  signingQrDataUrl.value = url ? await generateQRCodeDataUrl(url) : ''
})

const signingStatus = ref<'idle' | 'waiting' | 'success' | 'paying' | 'pay-waiting' | 'pay-success'>('idle')

// 套餐数据（从API加载）
const packagesData = ref<Package[]>([])

// 签约模式下目标套餐是否免费试用
const isTrialSigning = computed(() => selectedPlan.value === 'FREE_TRIAL')

// 签约模式下目标套餐code
const signingTargetPkgCode = computed(() => {
  if (selectedPlan.value === 'FREE_TRIAL' || getPackageByPlan(selectedPlan.value)?.is_trial) return form.autoRenewPackage
  return planCodeMap[selectedPlan.value] || selectedPlan.value
})

// 签约模式下目标套餐数据
const signingTargetPkg = computed(() => {
  return packagesData.value.find(p => p.code === signingTargetPkgCode.value)
})

// 签约模式下目标套餐名称
const signingTargetPkgName = computed(() => signingTargetPkg.value?.name || '')

// 签约模式下目标套餐价格（含订阅折扣）
const signingTargetPkgPrice = computed(() => {
  const pkg = signingTargetPkg.value
  if (!pkg) return '—'
  if (pkg.subscription_enabled && pkg.subscription_discount_rate > 0) {
    return (Number(pkg.price) * (1 - Number(pkg.subscription_discount_rate) / 100)).toFixed(0)
  }
  return Number(pkg.price).toString()
})

// 签约模式下目标套餐支持的签约渠道（'wechat' | 'alipay' | 'all'）
const signingTargetPkgChannels = computed(() => signingTargetPkg.value?.subscription_channels || 'all')

// 🔑 当套餐渠道配置变化时，自动修正签约渠道默认值
watch(signingTargetPkgChannels, (channels) => {
  if (channels === 'wechat') signingChannel.value = 'wechat'
  else if (channels === 'alipay') signingChannel.value = 'alipay'
})

// 签约模式下目标套餐原价（不含订阅折扣）
const signingTargetPkgFullPrice = computed(() => {
  const pkg = signingTargetPkg.value
  if (!pkg) return '—'
  return Number(pkg.price).toString()
})

const form = reactive({
  companyName: '',
  contactName: '',
  phone: '',
  code: '',
  email: '',
  password: '',
  autoRenew: true,
  autoRenewPackage: 'SAAS_BASIC',
  agree: false
})

// 套餐代码映射（兼容旧别名 → 实际code，同时支持直接code）
const planCodeMap: Record<string, string> = {
  'FREE_TRIAL': 'FREE_TRIAL',
  'basic': 'SAAS_BASIC',
  'pro': 'SAAS_PRO',
  'enterprise': 'SAAS_ENTERPRISE',
  'private-standard': 'PRIVATE_STANDARD',
  'private-pro': 'PRIVATE_PRO',
  'private-enterprise': 'PRIVATE_ENTERPRISE'
}

// 动态套餐列表
const saasPlanCards = computed(() => {
  return packagesData.value
    .filter(p => p.type === 'saas')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
})

const privatePlanCards = computed(() => {
  return packagesData.value
    .filter(p => p.type === 'private')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
})

// 当前选中套餐是否需要选择限制模式（双模式套餐）
const currentPkgLimitMode = computed(() => currentPkg.value?.user_limit_mode || 'total')
const needsModeSelection = computed(() => currentPkgLimitMode.value === 'both')

onMounted(async () => {
  // 加载套餐数据
  try {
    packagesData.value = await fetchPackages()
    // 自动选中第一个SaaS套餐（免费试用优先）
    const trial = packagesData.value.find(p => p.type === 'saas' && p.is_trial)
    if (trial) {
      selectedPlan.value = trial.code
    } else if (packagesData.value.length > 0) {
      const firstSaas = packagesData.value.find(p => p.type === 'saas')
      if (firstSaas) selectedPlan.value = firstSaas.code
    }
  } catch (e) {
    console.error('加载套餐数据失败:', e)
  }

  // 加载动态CRM地址
  try {
    const wsConfig = await getWebsiteConfig()
    if (wsConfig.crmUrl) crmUrl.value = wsConfig.crmUrl
  } catch { /* 静默 */ }

  // 加载可用支付方式
  try {
    const pmRes = await fetch(`${API_BASE}/public/payment/methods`)
    const pmData = await pmRes.json()
    if (pmData.code === 0 && pmData.data) {
      Object.assign(enabledPayMethods, pmData.data)
    }
    // 🔑 兜底：如果所有支付方式都未启用，至少启用微信支付
    if (!enabledPayMethods.wechat && !enabledPayMethods.alipay && !enabledPayMethods.bank) {
      enabledPayMethods.wechat = true
    }
  } catch { /* 静默 */ }

  // 预加载对公转账银行信息（如果已启用）
  if (enabledPayMethods.bank) {
    try {
      const bankRes = await fetch(`${API_BASE}/public/payment/bank-info`)
      const bankData = await bankRes.json()
      if (bankData.code === 0 && bankData.data) {
        Object.assign(bankConfig, bankData.data)
      }
    } catch { /* 静默 */ }
  }

  const plan = route.query.plan as string
  if (plan) {
    if (plan === 'FREE_TRIAL') {
      selectedPlan.value = 'FREE_TRIAL'
      planType.value = 'saas'
    } else if (plan.startsWith('SAAS_')) {
      selectedPlan.value = plan.replace('SAAS_', '').toLowerCase()
      planType.value = 'saas'
    } else if (plan.startsWith('PRIVATE_')) {
      selectedPlan.value = 'private-' + plan.replace('PRIVATE_', '').toLowerCase()
      planType.value = 'private'
    } else {
      selectedPlan.value = plan
      if (plan.startsWith('private')) {
        planType.value = 'private'
      }
    }
  }

  // 读取计费方式参数（从Pricing页面传入）
  const billing = route.query.billing as string
  if (billing === 'annual') {
    privateBillingMode.value = 'annual'
  } else if (billing === 'perpetual') {
    privateBillingMode.value = 'perpetual'
  }
})

onUnmounted(() => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
  if (signingCheckTimer) clearInterval(signingCheckTimer)
})

const sendCode = async () => {
  if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) {
    alert('请输入正确的手机号')
    return
  }

  try {
    const res = await fetch(`${API_BASE}/public/register/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.phone })
    })
    const data = await res.json()
    if (data.code === 0) {
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      alert(data.message || '发送失败')
    }
  } catch (error) {
    alert('发送验证码失败，请稍后重试')
  }
}

const getPlanName = (plan: string) => {
  const pkg = getPackageByPlan(plan)
  if (pkg) {
    const prefix = pkg.type === 'saas' ? 'SaaS云端版' : '私有部署版'
    return `${prefix} - ${pkg.name}`
  }
  // 兜底硬编码
  const names: Record<string, string> = {
    FREE_TRIAL: '7天免费试用',
    basic: 'SaaS云端版 - 基础版',
    pro: 'SaaS云端版 - 专业版',
    enterprise: 'SaaS云端版 - 企业版',
    'private-standard': '私有部署版 - 标准版',
    'private-pro': '私有部署版 - 专业版',
    'private-enterprise': '私有部署版 - 企业版'
  }
  return names[plan] || plan
}

// 月付价格（兜底硬编码，优先用API数据）
const fallbackPrices: Record<string, number> = {
  basic: 99,
  pro: 299,
  enterprise: 599
}

// 根据plan代码获取套餐数据（优先直接匹配code，其次通过别名映射）
const getPackageByPlan = (plan: string): Package | undefined => {
  // 先尝试直接匹配package code
  const direct = packagesData.value.find(p => p.code === plan)
  if (direct) return direct
  // 兜底：通过旧别名映射
  const mappedCode = planCodeMap[plan]
  if (mappedCode) return packagesData.value.find(p => p.code === mappedCode)
  return undefined
}

// 是否有私有套餐配置了年度价格
const hasPrivateAnnualPricing = computed(() => {
  return packagesData.value.some(p => p.type === 'private' && p.yearly_price && Number(p.yearly_price) > 0)
})

// 获取私有套餐永久买断价（优先API数据，兜底硬编码）
const getPrivatePerpetualPrice = (plan: string): number => {
  const pkg = getPackageByPlan(plan)
  if (pkg) return Number(pkg.price)
  const fallback: Record<string, number> = {
    'private-standard': 9800,
    'private-pro': 19800,
    'private-enterprise': 39800
  }
  return fallback[plan] || 0
}

// 获取私有套餐年度授权价
const getPrivateAnnualPrice = (plan: string): number => {
  const pkg = getPackageByPlan(plan)
  if (pkg && pkg.yearly_price && Number(pkg.yearly_price) > 0) {
    return Number(pkg.yearly_price)
  }
  return 0
}

// 获取私有套餐年度折扣（对比永久价格，例如"3.8"折）
const getPrivateAnnualDiscount = (plan: string): string => {
  const annual = getPrivateAnnualPrice(plan)
  const perpetual = getPrivatePerpetualPrice(plan)
  if (!annual || !perpetual) return '—'
  return ((annual / perpetual) * 10).toFixed(1)
}

// 获取私有套餐年度节省金额
const getPrivateAnnualSaving = (plan: string): number => {
  return getPrivatePerpetualPrice(plan) - getPrivateAnnualPrice(plan)
}

// 获取私有套餐展示价格（根据计费模式）
const getPrivateDisplayPrice = (plan: string): string => {
  if (privateBillingMode.value === 'annual') {
    const annual = getPrivateAnnualPrice(plan)
    if (annual > 0) return annual.toLocaleString()
  }
  return getPrivatePerpetualPrice(plan).toLocaleString()
}

// 当前选中套餐的订阅信息
const currentPkg = computed(() => getPackageByPlan(selectedPlan.value))
const currentPkgSubscriptionEnabled = computed(() => Boolean(currentPkg.value?.subscription_enabled))
const currentPkgSubscriptionChannels = computed(() => currentPkg.value?.subscription_channels || 'all')
const currentPkgSubscriptionDiscountRate = computed(() => Number(currentPkg.value?.subscription_discount_rate) || 0)
const subscriptionPrice = computed(() => {
  const monthly = getMonthlyPrice(selectedPlan.value)
  if (currentPkgSubscriptionDiscountRate.value > 0) {
    return (monthly * (1 - currentPkgSubscriptionDiscountRate.value / 100)).toFixed(0)
  }
  return monthly.toString()
})

// 年付订阅价格（年付优惠 + 订阅折扣叠加）
const subscriptionYearlyPrice = computed(() => {
  const yearly = getYearlyPrice(selectedPlan.value)
  if (currentPkgSubscriptionDiscountRate.value > 0) {
    return Math.round(yearly * (1 - currentPkgSubscriptionDiscountRate.value / 100))
  }
  return yearly
})

// 订阅自动续费额外节省金额（相对于不订阅的价格）
const subscriptionSaving = computed(() => {
  if (billingCycle.value === 'yearly') {
    return getYearlyPrice(selectedPlan.value) - subscriptionYearlyPrice.value
  }
  return getMonthlyPrice(selectedPlan.value) - Number(subscriptionPrice.value)
})

// 订阅勾选状态 → 同步支付模式
watch(subscriptionChecked, (val) => {
  payMode.value = val ? 'subscription' : 'normal'
})

// 套餐订阅支持状态变化时（切换套餐），自动重置订阅勾选
watch(currentPkgSubscriptionEnabled, (enabled) => {
  subscriptionChecked.value = enabled
  payMode.value = enabled ? 'subscription' : 'normal'
})

// 免费试用到期可续费的套餐列表
const renewablePlans = computed(() => {
  return packagesData.value.filter(p => p.type === 'saas' && !p.is_trial && Number(p.price) > 0 && p.subscription_enabled)
})

const getMonthlyPrice = (plan: string) => {
  const pkg = getPackageByPlan(plan)
  if (pkg) return Number(pkg.price)
  return fallbackPrices[plan] || 0
}

// 年付价格（使用后端配置的优惠策略）
const getYearlyPrice = (plan: string) => {
  const pkg = getPackageByPlan(plan)
  const monthly = getMonthlyPrice(plan)
  if (pkg) {
    if (pkg.yearly_price && Number(pkg.yearly_price) > 0) return Math.round(Number(pkg.yearly_price))
    if (pkg.yearly_bonus_months > 0) return monthly * (12 - pkg.yearly_bonus_months)
    if (pkg.yearly_discount_rate > 0) return Math.round(monthly * 12 * (1 - pkg.yearly_discount_rate / 100))
  }
  return monthly * 10 // 兜底：送2个月
}

// 年付原价（12个月）
const getYearlyOriginalPrice = (plan: string) => {
  const monthly = getMonthlyPrice(plan)
  return monthly * 12
}

// 年付折算月价
const getYearlyMonthlyPrice = (plan: string) => {
  const yearly = getYearlyPrice(plan)
  return Math.round(yearly / 12)
}

// 年付节省金额
const getSaveAmount = (plan: string) => {
  const monthly = getMonthlyPrice(plan)
  return monthly * 12 - getYearlyPrice(plan)
}

// 年付优惠描述文案（动态）
const getYearlyBadgeText = (plan: string) => {
  const pkg = getPackageByPlan(plan)
  if (pkg) return getYearlyPromoText(pkg)
  return '送2个月'
}

const getPlanPrice = (plan: string) => {
  // 免费试用
  const pkg = getPackageByPlan(plan)
  if (pkg?.is_trial) return '0'
  if (plan === 'FREE_TRIAL') return '0'

  // 私有部署版 - 根据计费模式返回对应价格
  const isPrivatePlan = pkg?.type === 'private' || plan.startsWith('private-')
  if (isPrivatePlan) {
    if (privateBillingMode.value === 'annual') {
      const annual = getPrivateAnnualPrice(plan)
      if (annual > 0) return annual.toLocaleString()
    }
    return getPrivatePerpetualPrice(plan).toLocaleString()
  }

  // SaaS套餐
  if (billingCycle.value === 'yearly') {
    return getYearlyPrice(plan).toLocaleString()
  }
  return getMonthlyPrice(plan).toString()
}

// 提交注册
const handleSubmitInfo = async () => {
  if (!form.agree) {
    alert('请阅读并同意服务协议')
    return
  }

  submitting.value = true
  try {
    const packageCode = planCodeMap[selectedPlan.value] || selectedPlan.value
    // 确定用户限制模式
    const userLimitMode = needsModeSelection.value
      ? selectedUserLimitMode.value
      : (currentPkgLimitMode.value === 'online' ? 'online' : 'total')
    const res = await fetch(`${API_BASE}/public/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: form.companyName,
        contactName: form.contactName,
        phone: form.phone,
        code: form.code,
        email: form.email,
        password: form.password || undefined,
        autoRenew: selectedPlan.value === 'FREE_TRIAL' ? form.autoRenew : undefined,
        autoRenewPackage: selectedPlan.value === 'FREE_TRIAL' && form.autoRenew ? form.autoRenewPackage : undefined,
        packageCode,
        userLimitMode
      })
    })
    const data = await res.json()

    if (data.code === 0) {
      registeredTenant.value = data.data

      // 注册成功后保存会员token（如果后端返回了），让未付费用户也能登录会员中心
      if (data.data.memberToken) {
        localStorage.setItem('member_token', data.data.memberToken)
      }

      // 免费套餐
      if (selectedPlan.value === 'FREE_TRIAL' || getPlanPrice(selectedPlan.value) === '0') {
        // 勾选了自动续费 → 进入签约步骤（不可跳过）
        if (form.autoRenew && form.autoRenewPackage) {
          signingMode.value = true
          signingStatus.value = 'idle'
          step.value = 3
        } else {
          // 未勾选自动续费 → 直接跳转成功页
          router.push({
            path: '/pay-success',
            query: {
              plan: selectedPlan.value,
              type: planType.value,
              tenantCode: data.data.tenantCode,
              licenseKey: data.data.licenseKey,
              adminUsername: data.data.adminUsername || '',
              adminPassword: data.data.adminPassword || '',
              memberPwdDefault: data.data.memberPasswordIsDefault ? '1' : '0'
            }
          })
        }
      } else {
        // 付费套餐：如果勾选了订阅，先走签约流程
        if (subscriptionChecked.value && currentPkgSubscriptionEnabled.value && planType.value === 'saas') {
          signingMode.value = true
          signingStatus.value = 'idle'
        }
        step.value = 3
      }
    } else {
      alert(data.message || '注册失败')
    }
  } catch (error) {
    alert('注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

// 创建支付订单
const handleCreatePayment = async () => {
  // 如果在步骤3切换到订阅模式但signingMode为false，重新进入签约流程
  if (payMode.value === 'subscription' && currentPkgSubscriptionEnabled.value && !signingMode.value) {
    signingMode.value = true
    signingStatus.value = 'idle'
    return
  }

  creatingPayment.value = true
  try {
    const packageCode = planCodeMap[selectedPlan.value] || selectedPlan.value
    const amount = parseFloat(getPlanPrice(selectedPlan.value).replace(',', ''))

    const res = await fetch(`${API_BASE}/public/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: packageCode,
        packageName: getPlanName(selectedPlan.value),
        amount,
        payType: paymentMethod.value,
        billingCycle: planType.value === 'saas' ? billingCycle.value : (privateBillingMode.value === 'annual' ? 'yearly' : 'once'),
        tenantId: registeredTenant.value?.tenantId,
        tenantName: form.companyName,
        contactName: form.contactName,
        contactPhone: form.phone,
        contactEmail: form.email,
        userLimitMode: needsModeSelection.value
          ? selectedUserLimitMode.value
          : (currentPkgLimitMode.value === 'online' ? 'online' : 'total')
      })
    })
    const data = await res.json()

    if (data.code === 0) {
      paymentOrder.value = data.data

      // 对公转账 - 填充银行信息
      if (data.data.bankInfo) {
        Object.assign(bankConfig, data.data.bankInfo)
      }

      startPaymentCheck()
      startExpireCountdown()
    } else {
      alert(data.message || '创建支付订单失败')
    }
  } catch (error) {
    alert('创建支付订单失败')
  } finally {
    creatingPayment.value = false
  }
}

// 开始轮询支付状态
const startPaymentCheck = () => {
  checkingPayment.value = true
  paymentCheckTimer = setInterval(async () => {
    if (!paymentOrder.value) return

    try {
      const res = await fetch(`${API_BASE}/public/payment/query/${paymentOrder.value.orderNo}`)
      const data = await res.json()

      if (data.code === 0 && data.data.status === 'paid') {
        clearInterval(paymentCheckTimer)
        clearInterval(expireTimer)
        checkingPayment.value = false

        // 签约模式下跳过签约的付费 → 展示授权信息
        if (signingMode.value) {
          if (data.data.tenantCode) registeredTenant.value.tenantCode = data.data.tenantCode
          if (data.data.licenseKey) registeredTenant.value.licenseKey = data.data.licenseKey
          signingStatus.value = 'pay-success'
        } else {
          // 正常付费流程 → 跳转成功页
          router.push({
            path: '/pay-success',
            query: {
              plan: selectedPlan.value,
              type: planType.value,
              tenantCode: data.data.tenantCode,
              licenseKey: data.data.licenseKey,
              adminUsername: data.data.adminUsername || '',
              adminPassword: data.data.adminPassword || '',
              memberPwdDefault: '1'
            }
          })
        }
      }
    } catch (error) {
      console.error('查询支付状态失败:', error)
    }
  }, 3000) // 每3秒查询一次
}

// 开始过期倒计时
const startExpireCountdown = () => {
  // 签约模式下取消签约后的正常付费：3分钟倒计时；其他场景：30分钟
  expireCountdown.value = signingMode.value ? 3 * 60 : 30 * 60
  expireTimer = setInterval(() => {
    expireCountdown.value--
    if (expireCountdown.value <= 0) {
      clearInterval(expireTimer)
      clearInterval(paymentCheckTimer)
      checkingPayment.value = false
      if (signingMode.value) {
        // 签约模式下超时 → 跳转会员中心（未付费状态）
        paymentOrder.value = null
        router.push('/member/dashboard')
      } else {
        alert('订单已过期，请重新创建')
        paymentOrder.value = null
      }
    }
  }, 1000)
}

// 手动检查支付状态
const handleCheckPayment = async () => {
  if (!paymentOrder.value) return

  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${paymentOrder.value.orderNo}`)
    const data = await res.json()

    if (data.code === 0) {
      if (data.data.status === 'paid') {
        clearInterval(paymentCheckTimer)
        clearInterval(expireTimer)

        // 从API获取授权码
        router.push({
          path: '/pay-success',
          query: {
            plan: selectedPlan.value,
            type: planType.value,
            tenantCode: data.data.tenantCode,
            licenseKey: data.data.licenseKey,
            adminUsername: data.data.adminUsername || '',
            adminPassword: data.data.adminPassword || '',
            memberPwdDefault: '1'
          }
        })
      } else if (data.data.status === 'processing') {
        alert('支付已成功，授权码正在生成中，请稍等几秒后重试')
      } else {
        alert('暂未收到支付结果，请稍后再试或联系客服')
      }
    }
  } catch (error) {
    alert('查询失败，请稍后再试')
  }
}

// 对公转账 - 已完成转账
const handleBankTransferDone = () => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
  checkingPayment.value = false
  // 提示用户等待管理员确认
  router.push({
    path: '/pay-success',
    query: {
      plan: selectedPlan.value,
      type: planType.value,
      payType: 'bank',
      orderNo: paymentOrder.value?.orderNo || ''
    }
  })
}

// 复制银行信息
const copyBankInfo = async () => {
  const bankInfo = `账户名称：${bankConfig.accountName}
银行账号：${bankConfig.accountNo}
开户银行：${bankConfig.bankName}
开户支行：${bankConfig.bankBranch}
${bankConfig.remark ? '备注：' + bankConfig.remark : ''}`

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(bankInfo)
    } else {
      // 降级方案：使用传统方法
      const textarea = document.createElement('textarea')
      textarea.value = bankInfo
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    bankInfoCopied.value = true
    setTimeout(() => {
      bankInfoCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    alert('复制失败，请手动复制')
  }
}

// 取消支付
const handleCancelPayment = () => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
  checkingPayment.value = false
  paymentOrder.value = null
}

// 稍后支付，跳转会员中心
const handlePayLater = () => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
  checkingPayment.value = false
  paymentOrder.value = null
  router.push('/member/dashboard')
}


// ==================== 签约相关（免费试用+自动续费） ====================

// 获取自动续费套餐名称
const getAutoRenewPkgName = () => {
  const pkg = packagesData.value.find(p => p.code === form.autoRenewPackage)
  return pkg?.name || form.autoRenewPackage
}

// 获取自动续费套餐月价
const getAutoRenewPkgPrice = () => {
  const pkg = packagesData.value.find(p => p.code === form.autoRenewPackage)
  if (!pkg) return '—'
  if (pkg.subscription_enabled && pkg.subscription_discount_rate > 0) {
    return (Number(pkg.price) * (1 - Number(pkg.subscription_discount_rate) / 100)).toFixed(0)
  }
  return Number(pkg.price).toString()
}

// 发起签约
const handleStartSigning = async () => {
  signingLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/public/register/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: registeredTenant.value?.tenantId,
        packageCode: signingTargetPkgCode.value,
        channel: signingChannel.value,
        billingCycle: isTrialSigning.value ? 'monthly' : billingCycle.value
      })
    })
    const data = await res.json()
    if (data.code === 0 && data.data) {
      signingSubscription.value = data.data
      signingUrl.value = data.data.signUrl || ''
      signingStatus.value = 'waiting'

      // 如果是redirect类型（支付宝），打开新窗口
      if (data.data.signType === 'redirect' && signingUrl.value) {
        window.open(signingUrl.value, '_blank')
      }

      startSigningCheck()
    } else {
      alert(data.message || '发起签约失败')
    }
  } catch {
    alert('发起签约失败，请稍后重试')
  } finally {
    signingLoading.value = false
  }
}

// 开始轮询签约状态
const startSigningCheck = () => {
  if (signingCheckTimer) clearInterval(signingCheckTimer)
  signingCheckTimer = setInterval(async () => {
    if (!signingSubscription.value?.subscriptionId) return
    try {
      const res = await fetch(`${API_BASE}/public/register/subscribe-status/${signingSubscription.value.subscriptionId}`)
      const data = await res.json()
      if (data.code === 0 && data.data?.status === 'active') {
        clearInterval(signingCheckTimer)
        signingStatus.value = 'success'
      }
    } catch {
      // 忽略轮询错误
    }
  }, 3000)
}

// 手动检查签约状态
const checkSigningManually = async () => {
  if (!signingSubscription.value?.subscriptionId) return
  try {
    const res = await fetch(`${API_BASE}/public/register/subscribe-status/${signingSubscription.value.subscriptionId}`)
    const data = await res.json()
    if (data.code === 0 && data.data?.status === 'active') {
      if (signingCheckTimer) clearInterval(signingCheckTimer)
      signingStatus.value = 'success'
    } else {
      alert('暂未收到签约结果，请确认是否已完成签约授权')
    }
  } catch {
    alert('查询签约状态失败，请稍后再试')
  }
}

// 取消签约（仅付费套餐可用），转为正常付费流程
const cancelSigning = () => {
  if (signingCheckTimer) clearInterval(signingCheckTimer)
  signingStatus.value = 'paying'
  paymentMethod.value = 'wechat'
}

// 免费试用跳过签约，直接开始7天试用
const skipTrialSigning = () => {
  if (!confirm('确认跳过签约？\n\n跳过后将直接开始7天免费试用。\n⚠ 试用到期后如不续费，服务将自动停止。\n\n您可以之后在会员中心随时设置自动续费。')) {
    return
  }
  if (signingCheckTimer) clearInterval(signingCheckTimer)
  router.push({
    path: '/pay-success',
    query: {
      plan: 'FREE_TRIAL',
      type: 'saas',
      tenantCode: registeredTenant.value?.tenantCode,
      licenseKey: registeredTenant.value?.licenseKey,
      adminUsername: registeredTenant.value?.adminUsername || '',
      adminPassword: registeredTenant.value?.adminPassword || ''
    }
  })
}

// 获取自动续费套餐原价（不含订阅折扣）
const getAutoRenewPkgFullPrice = () => {
  const pkg = packagesData.value.find(p => p.code === form.autoRenewPackage)
  if (!pkg) return '—'
  return Number(pkg.price).toString()
}

// 签约取消后发起正常付费（付费套餐）
const handleSkipSigningPayment = async () => {
  creatingPayment.value = true
  try {
    const pkg = signingTargetPkg.value
    if (!pkg) {
      alert('套餐信息加载失败，请刷新重试')
      return
    }

    // 计算实际支付金额（付费套餐根据计费周期）
    let amount = Number(pkg.price)
    let cycle = 'monthly'
    if (!isTrialSigning.value && billingCycle.value === 'yearly') {
      amount = getYearlyPrice(selectedPlan.value)
      cycle = 'yearly'
    }

    const res = await fetch(`${API_BASE}/public/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: signingTargetPkgCode.value,
        packageName: pkg.name || signingTargetPkgName.value,
        amount,
        payType: paymentMethod.value,
        billingCycle: cycle,
        tenantId: registeredTenant.value?.tenantId,
        tenantName: form.companyName,
        contactName: form.contactName,
        contactPhone: form.phone,
        contactEmail: form.email
      })
    })
    const data = await res.json()

    if (data.code === 0) {
      paymentOrder.value = data.data

      // 填充银行信息（如有）
      if (data.data.bankInfo) {
        Object.assign(bankConfig, data.data.bankInfo)
      }

      signingStatus.value = 'pay-waiting'
      // 对公转账不需要轮询和倒计时
      if (paymentMethod.value !== 'bank') {
        startPaymentCheck()
        startExpireCountdown()
      }
    } else {
      alert(data.message || '创建支付订单失败')
    }
  } catch {
    alert('创建支付订单失败，请稍后重试')
  } finally {
    creatingPayment.value = false
  }
}

// 取消签约取消后的付费
const handleCancelSkipPayment = () => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
  checkingPayment.value = false
  paymentOrder.value = null
  // 跳转会员中心（未付费状态）
  router.push('/member/dashboard')
}

// 手动检查跳过签约付费状态
const handleCheckSkipPayment = async () => {
  if (!paymentOrder.value) return

  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${paymentOrder.value.orderNo}`)
    const data = await res.json()

    if (data.code === 0) {
      if (data.data.status === 'paid') {
        if (paymentCheckTimer) clearInterval(paymentCheckTimer)
        if (expireTimer) clearInterval(expireTimer)
        checkingPayment.value = false

        // 更新租户授权信息（后端可能在支付成功后升级套餐）
        if (data.data.tenantCode) registeredTenant.value.tenantCode = data.data.tenantCode
        if (data.data.licenseKey) registeredTenant.value.licenseKey = data.data.licenseKey

        signingStatus.value = 'pay-success'
      } else if (data.data.status === 'processing') {
        alert('支付已成功，授权码正在生成中，请稍等几秒后重试')
      } else {
        alert('暂未收到支付结果，请稍后再试或联系客服')
      }
    }
  } catch {
    alert('查询失败，请稍后再试')
  }
}

// 签约取消后对公转账 - 已完成转账
const handleSkipSigningBankDone = () => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
  checkingPayment.value = false
  router.push({
    path: '/pay-success',
    query: {
      plan: selectedPlan.value,
      type: planType.value,
      payType: 'bank',
      orderNo: paymentOrder.value?.orderNo || '',
      tenantCode: registeredTenant.value?.tenantCode,
      licenseKey: registeredTenant.value?.licenseKey
    }
  })
}

// 跳转成功页
const goToSuccess = () => {
  // 如果是付费成功（签约取消后付费），使用签约目标套餐的plan key
  const planForSuccess = signingStatus.value === 'pay-success' && isTrialSigning.value
    ? autoRenewPlanKey.value
    : selectedPlan.value

  router.push({
    path: '/pay-success',
    query: {
      plan: planForSuccess,
      type: planType.value,
      tenantCode: registeredTenant.value?.tenantCode,
      licenseKey: registeredTenant.value?.licenseKey,
      adminUsername: registeredTenant.value?.adminUsername || '',
      adminPassword: registeredTenant.value?.adminPassword || ''
    }
  })
}

// 自动续费套餐代码 → 前端plan key的映射
const autoRenewPlanKey = computed(() => {
  const reverseMap: Record<string, string> = {
    'SAAS_BASIC': 'basic',
    'SAAS_PRO': 'pro',
    'SAAS_ENTERPRISE': 'enterprise'
  }
  return reverseMap[form.autoRenewPackage] || form.autoRenewPackage
})
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: 90px 24px 40px;
}

.register-container {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 50px;
  align-items: start;
}

.register-info {
  position: sticky;
  top: 110px;
}

.info-content {
  h1 {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  > p {
    font-size: 15px;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
}

.benefits {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);

  .benefit-icon {
    color: var(--success);
    font-weight: bold;
  }
}

.testimonial {
  background: white;
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);

  p {
    font-size: 14px;
    color: var(--text-secondary);
    font-style: italic;
    line-height: 1.6;
    margin-bottom: 12px;
  }
}

.testimonial-author {
  .author-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 14px;
  }

  .author-company {
    color: var(--text-muted);
    font-size: 13px;
    margin-left: 6px;
  }
}

.register-form-wrapper {
  background: white;
  border-radius: var(--radius-xl);
  padding: 28px 36px;
  box-shadow: var(--shadow-lg);
}

.form-header {
  text-align: center;
  margin-bottom: 16px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  p {
    color: var(--text-muted);
    font-size: 14px;

    a {
      color: var(--primary);
      font-weight: 500;
    }
  }
}

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;

  .step-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--border);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }

  .step-text {
    font-size: 13px;
    color: var(--text-muted);
  }

  &.active {
    .step-num {
      background: var(--primary);
      color: white;
    }
    .step-text {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  &.done .step-num {
    background: var(--success);
    color: white;
  }
}

.step-line {
  width: 36px;
  height: 2px;
  background: var(--border);
  margin: 0 10px;

  &.active {
    background: var(--primary);
  }
}

.selected-plan-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius);
  margin-bottom: 16px;

  &.free {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
    border-color: rgba(16, 185, 129, 0.2);

    .banner-text strong {
      color: var(--success);
    }
  }

  .banner-icon {
    font-size: 18px;
  }

  .banner-text {
    font-size: 13px;
    color: var(--text-secondary);

    strong {
      color: var(--primary);
      font-weight: 600;
    }
  }

  .change-btn {
    padding: 3px 10px;
    font-size: 11px;
    color: var(--primary);
    background: white;
    border: 1px solid var(--primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--primary);
      color: white;
    }
  }
}

.plan-type-toggle {
  display: flex;
  background: var(--bg-light);
  border-radius: var(--radius);
  padding: 4px;
  margin-bottom: 16px;
  border: 2px solid var(--border);

  button {
    flex: 1;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: 6px;
    transition: all 0.3s ease;
    position: relative;

    &.active {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    &:not(.active):hover {
      background: rgba(99, 102, 241, 0.1);
      color: var(--primary);
    }
  }
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;

  &.plans-grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}

.billing-toggle {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius);
}

.billing-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.billing-option {
  display: block;
  padding: 12px;
  background: white;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.3s ease;

  input {
    display: none;
  }

  &:hover {
    border-color: var(--primary-light);
  }

  &.active {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.05);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .option-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .discount-badge {
    display: inline-block;
    padding: 2px 6px;
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    color: white;
    font-size: 10px;
    font-weight: 600;
    border-radius: 8px;
  }

  .option-price {
    font-size: 16px;
    font-weight: 700;
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .original-price {
    font-size: 13px;
    font-weight: normal;
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .option-save {
    font-size: 12px;
    color: var(--success);
    font-weight: 500;
  }
}

.plan-card {
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: var(--primary-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }

  &.selected {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.08);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 12px rgba(99, 102, 241, 0.15);
    transform: translateY(-2px);

    &::after {
      content: '✓';
      position: absolute;
      top: 6px;
      left: 6px;
      width: 18px;
      height: 18px;
      background: var(--primary);
      color: white;
      border-radius: 50%;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &.free-trial {
    // 未选中时和其他套餐一样
    border-color: var(--border);
    background: white;

    &:hover {
      border-color: var(--primary-light);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    }

    &.selected {
      // 选中时使用淡绿色
      border-color: var(--success);
      background: rgba(16, 185, 129, 0.08);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2), 0 4px 12px rgba(16, 185, 129, 0.15);

      &::after {
        background: var(--success);
      }
    }
  }

  h4 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .plan-price {
    font-size: 22px;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 4px;
    white-space: nowrap;

    &.free {
      color: var(--success);
    }

    span {
      font-size: 13px;
      font-weight: normal;
      color: var(--text-muted);
    }
  }

  .plan-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;

    .mode-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
      background: #fff3e0;
      color: #e6a23c;
      font-weight: 500;
      margin-left: 4px;
      vertical-align: middle;
    }
  }

  .plan-badge {
    position: absolute;
    top: -8px;
    right: 8px;
    background: var(--primary);
    color: white;
    padding: 3px 8px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;

    &.free {
      background: var(--success);
    }
  }
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 6px;

    .required {
      color: var(--danger);
    }

    .recommended {
      color: #e6a23c;
      font-weight: 400;
      font-size: 12px;
    }
  }

  .field-hint {
    margin: 6px 0 0 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }

  input[type='text'],
  input[type='tel'],
  input[type='email'],
  input[type='password'] {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 14px;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.code-input {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
  }

  .code-btn {
    padding: 11px 18px;
    background: var(--bg-light);
    color: var(--primary);
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;

    &:disabled {
      color: var(--text-muted);
    }
  }
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;

  input {
    margin-top: 2px;
  }

  span {
    font-size: 13px;
    color: var(--text-secondary);

    a {
      color: var(--primary);
    }
  }
}

.form-actions {
  display: flex;
  gap: 14px;
  margin-top: 24px;

  .btn {
    flex: 1;
    padding: 11px 18px;
    font-size: 14px;
  }
}

.btn-block {
  width: 100%;
  padding: 12px 18px;
  font-size: 14px;
}

.order-summary {
  background: var(--bg-light);
  border-radius: var(--radius);
  padding: 18px 20px;
  margin-bottom: 18px;

  h3 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
}

.order-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;

  .item-label {
    color: var(--text-muted);
  }

  .item-value {
    color: var(--text-primary);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .gift-tag {
    font-size: 11px;
    color: var(--warning);
  }

  &.discount {
    .original {
      color: var(--text-muted);
      text-decoration: line-through;
      font-weight: normal;
    }
  }

  &.total {
    border-top: 1px solid var(--border);
    margin-top: 10px;
    padding-top: 12px;

    .price {
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
    }
  }
}

.save-tag {
  display: inline-block;
  padding: 2px 5px;
  background: var(--success);
  color: white;
  font-size: 10px;
  font-weight: 500;
  border-radius: 4px;
  margin-left: 4px;
}

.payment-methods {
  h4 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.payment-options {
  display: flex;
  gap: 12px;
}

.payment-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;

  input {
    display: none;
  }

  .payment-icon {
    font-size: 20px;
  }

  &.selected {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.05);
  }
}

/* 支付二维码样式 */
.payment-qrcode {
  text-align: center;
}

/* 对公转账金额突出显示 */
.bank-amount-highlight {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;

  .amount-label {
    font-size: 14px;
    color: #0369a1;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .amount-value {
    font-size: 36px;
    font-weight: 700;
    color: #0284c7;
    line-height: 1.2;
    margin-bottom: 6px;
  }

  .amount-tip {
    font-size: 12px;
    color: #0369a1;
  }
}

/* 银行信息卡片 */
.bank-info-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.bank-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f3f4f6;

  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }
}

.btn-copy-bank {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  &.copied {
    background: #dcfce7;
    border-color: #86efac;
    color: #166534;
  }
}

.bank-info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bank-info-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 16px;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
  word-break: break-all;

  &.highlight {
    color: #0284c7;
    font-weight: 600;
    font-size: 15px;
  }

  &.account-number {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 16px;
    font-weight: 600;
    color: #dc2626;
    letter-spacing: 1px;
  }
}

.bank-remark {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    stroke: #f59e0b;
  }
}

/* 订单号提示 */
.order-number-notice {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  margin-bottom: 20px;

  .notice-icon {
    font-size: 24px;
    flex-shrink: 0;
    line-height: 1;
  }

  .notice-content {
    flex: 1;
  }

  .notice-title {
    font-size: 14px;
    font-weight: 600;
    color: #92400e;
    margin-bottom: 8px;
  }

  .order-number {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 16px;
    font-weight: 700;
    color: #b45309;
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
    display: inline-block;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }

  .notice-desc {
    font-size: 12px;
    color: #a16207;
  }
}

/* 转账须知步骤 */
.bank-notice-steps {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.notice-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  font-size: 13px;
  color: #166534;
  line-height: 1.6;

  &:not(:last-child) {
    border-bottom: 1px solid #dcfce7;
  }

  .step-num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #16a34a;
    color: white;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
  }

  .step-text {
    flex: 1;
    padding-top: 2px;
  }
}

.qr-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;

  .pay-type-icon {
    font-size: 24px;
  }
}

.qr-amount {
  margin-bottom: 16px;

  .amount-label {
    font-size: 13px;
    color: var(--text-muted);
    display: block;
    margin-bottom: 4px;
  }

  .amount-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--primary);
  }
}

.qr-code-wrapper {
  margin-bottom: 16px;
}

.qr-code {
  display: inline-block;
  padding: 12px;
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);

  img {
    width: 160px;
    height: 160px;
    display: block;
  }
}

.qr-error {
  display: inline-block;
  padding: 16px;
  background: #fff3f3;
  border-radius: var(--radius);
  border: 1px solid #ffccc7;

  span {
    font-size: 36px;
    display: block;
    text-align: center;
    margin-bottom: 8px;
  }

  p {
    margin: 0;
    text-align: center;
    font-size: 14px;
    color: #cf1322;
    font-weight: 500;
  }

  .error-tip {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
    font-weight: 400;
  }
}

.qr-mock {
  display: inline-block;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius);

  .mock-qr {
    width: 160px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--border);
    border-radius: var(--radius);

    span {
      font-size: 36px;
      margin-bottom: 8px;
    }

    p {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }

    .mock-tip {
      font-size: 11px;
      margin-top: 6px;
    }
  }
}

.qr-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 12px;
}

.order-info {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-light);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;

  .expire-tip {
    color: #d97706;
    font-weight: 500;
  }
}

.payment-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: var(--radius);
  color: var(--primary);
  font-size: 13px;
  margin-bottom: 16px;

  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(99, 102, 241, 0.3);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .register-container {
    grid-template-columns: 1fr;
    max-width: 600px;
  }

  .register-info {
    position: static;
  }

  .plans-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);

    &.plans-grid-3 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .billing-options {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .register-page {
    padding: 70px 16px 30px;
  }

  .register-form-wrapper {
    padding: 24px 20px;
  }

  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .payment-options {
    flex-direction: column;
  }
}

// 自动续费区块
.auto-renew-section {
  margin-top: 4px;
  padding: 14px 16px;
  background: #f0fdf4;
  border-radius: 10px;
  border: 1px solid #bbf7d0;
}

.auto-renew-label {
  .renew-text {
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }
  .renew-icon {
    color: #16a34a;
    flex-shrink: 0;
  }
  .renew-highlight {
    font-size: 12px;
    color: #16a34a;
    font-weight: 400;
  }
}

.auto-renew-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #dcfce7;
}

.renew-desc {
  font-size: 13px;
  color: #475569;
  margin: 0 0 8px;
}

.renew-plan-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.renew-plan-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;

  input { display: none; }

  &.selected {
    border-color: #6366f1;
    background: #f8f7ff;
  }

  .plan-main {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .plan-name { font-weight: 500; color: #1e293b; white-space: nowrap; }
  .plan-benefits {
    font-size: 11px;
    color: #64748b;
  }
  .features-trigger {
    position: relative;
    color: #6366f1;
    cursor: help;
    white-space: nowrap;
  }
  .features-tooltip {
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    background: #1e293b;
    color: #f1f5f9;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    line-height: 1.8;
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0,0,0,.2);
    pointer-events: none;
    .feature-item { color: #e2e8f0; }
  }
  .plan-price { color: #6366f1; font-weight: 600; white-space: nowrap; }
  .sub-tag {
    font-size: 10px;
    padding: 1px 6px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 8px;
    white-space: nowrap;
  }
}

.renew-tip {
  font-size: 12px;
  color: #d97706;
  margin: 10px 0 0;
}

.sub-tag-banner {
  margin-left: 8px;
  font-size: 11px;
  padding: 2px 8px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  vertical-align: middle;

  .sub-tag-banner-icon {
    flex-shrink: 0;
  }
}

// 支付模式切换
.pay-mode-toggle {
  margin-bottom: 20px;

  h4 {
    font-size: 14px;
    color: var(--text-primary);
    margin: 0 0 10px;
  }
}

.pay-mode-options {
  display: flex;
  gap: 12px;
}

.pay-mode-option {
  flex: 1;
  display: block;
  padding: 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  input { display: none; }

  &.active {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.04);
  }

  .mode-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mode-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .rec-tag {
    font-size: 10px;
    padding: 1px 6px;
    background: #ef4444;
    color: white;
    border-radius: 8px;
    font-weight: 400;
  }

  .mode-price {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary);
  }

  .mode-save {
    font-size: 12px;
    color: #16a34a;
  }

  .mode-desc {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.sub-discount-tag {
  font-size: 11px;
  padding: 1px 8px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 10px;
  margin-left: 6px;
  font-weight: 500;
}

// ==================== 订阅自动续费选项（步骤1） ====================
.subscription-auto-renew {
  margin-bottom: 16px;
}

.subscription-check-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.3s ease;

  input { display: none; }

  &:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
  }

  // 未勾选：灰色淡化
  .subscription-check-body { opacity: 0.55; transition: opacity 0.3s ease; }
  .subscription-check-title { color: #94a3b8; transition: color 0.3s ease; }
  .subscription-check-svg { color: #94a3b8; transition: color 0.3s ease; }
  .subscription-rec { opacity: 0.5; transition: opacity 0.3s ease; }
  .subscription-check-detail { color: #94a3b8; }
  .subscription-check-benefits { color: #94a3b8; }

  // 勾选：鲜活绿色
  &.checked {
    border-color: #16a34a;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);

    &:hover {
      border-color: #15803d;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    }

    .subscription-check-body { opacity: 1; }
    .subscription-check-title { color: var(--text-primary); }
    .subscription-check-svg { color: #16a34a; }
    .subscription-rec { opacity: 1; }
    .subscription-check-detail { color: var(--text-secondary); }
    .subscription-check-benefits { color: #16a34a; }
  }
}

// 勾选框指示器
.subscription-checkbox-indicator {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #cbd5e1;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  transition: all 0.2s ease;

  .checked & {
    background: #16a34a;
    border-color: #16a34a;
  }
}

.subscription-check-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.subscription-check-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.subscription-check-svg {
  flex-shrink: 0;
}

.subscription-check-title {
  font-size: 14px;
  font-weight: 600;
}

.subscription-rec {
  font-size: 10px;
  padding: 1px 6px;
  background: #ef4444;
  color: white;
  border-radius: 8px;
  font-weight: 500;
}

.subscription-check-detail {
  font-size: 13px;

  .sub-hl-price {
    color: #16a34a;
    font-weight: 700;
    font-size: 15px;
  }

  .sub-off-label {
    display: inline-block;
    padding: 1px 6px;
    background: #dcfce7;
    color: #16a34a;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    margin-left: 4px;
  }

  .sub-orig-price {
    color: var(--text-muted);
    text-decoration: line-through;
    font-size: 12px;
    margin-left: 4px;
  }
}

.subscription-check-benefits {
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  svg { flex-shrink: 0; }
  strong { font-weight: 700; }
}

// ==================== 签约流程样式 ====================
.signing-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.register-success-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #bbf7d0;
  border-radius: 12px;

  .success-icon {
    font-size: 28px;
    flex-shrink: 0;
    line-height: 1;
  }

  .success-content {
    flex: 1;

    h3 {
      font-size: 16px;
      font-weight: 600;
      color: #166534;
      margin: 0 0 10px 0;
    }
  }

  .success-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .detail-label {
    color: #6b7280;
    min-width: 70px;
  }

  .detail-value {
    color: #1e293b;
    font-weight: 500;

    &.license-key {
      font-family: 'Consolas', 'Monaco', monospace;
      color: #6366f1;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
  }
}

.signing-area {
  background: var(--bg-light);
  border-radius: 12px;
  padding: 20px 24px;
  border: 1px solid var(--border);
}

.signing-header {
  margin-bottom: 16px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 6px;
  }

  p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }
}

.channel-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 10px;
}

.signing-notice {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.12);

  p {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 6px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.signing-success-info {
  text-align: center;
  padding: 24px 16px;

  .success-check {
    font-size: 48px;
    margin-bottom: 12px;
  }

  h4 {
    font-size: 18px;
    font-weight: 600;
    color: #166534;
    margin: 0 0 10px;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 4px;
  }

  .success-sub {
    font-size: 12px;
    color: var(--text-muted);
  }
}

// 跳过签约正常付费 - 紧凑版订单摘要
.signing-area .order-summary.compact {
  background: white;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.signing-area .payment-methods {
  margin-bottom: 16px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 10px;
    color: var(--text-primary);
  }
}

// 跳过签约链接
.skip-signing-link {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin: 12px 0 0;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
    text-decoration: underline;
  }
}

.skip-payment-link {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin: 12px 0 0;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
    text-decoration: underline;
  }
}

// 签约取消后对公转账银行信息
.signing-area .bank-info {
  background: white;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.signing-area .bank-info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
}

.signing-area .bank-label {
  color: var(--text-muted);
  min-width: 70px;
}

.signing-area .bank-value {
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;

  &.monospace {
    font-family: 'Consolas', 'Monaco', monospace;
    letter-spacing: 1px;
  }
}

.signing-area .bank-info-remark {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;

  p {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
  }
}

.signing-area .bank-notice {
  padding: 12px 16px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  margin-bottom: 16px;

  p {
    font-size: 13px;
    color: #166534;
    margin: 0 0 4px;
    &:last-child { margin-bottom: 0; }
  }
}


// 签约未完成提示
.signing-failed-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  margin-bottom: 16px;

  .notice-icon {
    font-size: 24px;
    flex-shrink: 0;
    line-height: 1;
  }

  .notice-content {
    flex: 1;

    h4 {
      font-size: 15px;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 4px;
    }

    p {
      font-size: 13px;
      color: #a16207;
      margin: 0;
    }
  }
}

// 倒计时紧急样式
.expire-tip.urgent {
  color: #dc2626 !important;
  font-weight: 600;
  animation: pulse-urgent 1s ease-in-out infinite;
}

@keyframes pulse-urgent {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
