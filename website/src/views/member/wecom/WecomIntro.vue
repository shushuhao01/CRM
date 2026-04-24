<template>
  <div class="wecom-intro">
    <!-- 顶部介绍横幅 -->
    <div class="intro-banner">
      <div class="banner-icon">🏢</div>
      <div class="banner-text">
        <h3>企业微信 × 云客CRM</h3>
        <p>深度集成企业微信，打通客户管理全链路，提升团队协作与客户服务效率</p>
      </div>
    </div>

    <!-- 核心能力模块 -->
    <div class="section-title">🚀 核心能力</div>
    <div class="feature-grid">
      <div v-for="feature in coreFeatures" :key="feature.title" class="feature-card">
        <div class="feature-icon">{{ feature.icon }}</div>
        <h4>{{ feature.title }}</h4>
        <p>{{ feature.desc }}</p>
        <div v-if="feature.tag" class="feature-tag" :class="feature.tagType">{{ feature.tag }}</div>
      </div>
    </div>

    <!-- 增值服务说明 -->
    <div class="section-title">💎 增值服务 — 会话存档</div>
    <div class="vas-section">
      <div class="vas-intro">
        <p>会话存档是企业微信官方提供的合规审计功能。开通后，员工与客户的聊天记录将被安全存档，支持全文搜索、敏感词检测和质检分析。</p>
      </div>

      <div class="vas-features">
        <div v-for="item in vasFeatures" :key="item.title" class="vas-item">
          <span class="vas-icon">{{ item.icon }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>

      <!-- 定价预览 - 可折叠 -->
      <div v-if="tierPricing.length > 0" class="pricing-preview">
        <div class="pricing-note">
          <p>⚠️ 企微会话存档接口为官方收费功能，以下为云客平台服务费</p>
        </div>
        <div class="tier-collapse">
          <div class="tier-toggle" @click="showTier = !showTier">
            <span>📊 查看阶梯定价</span>
            <span class="tier-arrow">{{ showTier ? '收起 ▲' : '展开 ▼' }}</span>
          </div>
          <div v-if="showTier" class="tier-table">
            <div class="tier-row tier-header"><span>人数范围</span><span>单价（元/人/年）</span></div>
            <div v-for="(tier, i) in tierPricing" :key="i" class="tier-row">
              <span>{{ tier.min }} ~ {{ tier.max >= 999999 ? '不限' : tier.max }} 人</span>
              <span class="tier-price">¥{{ tier.price }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 增值服务: AI助手 -->
    <div class="section-title">🤖 增值服务 — AI助手</div>
    <div class="vas-section ai-section">
      <div class="vas-intro">
        <p>基于大语言模型的智能助手，为企微运营提供AI赋能。自动会话质检评分、智能客户标签、跟进建议推荐、话术库智能改写等。</p>
      </div>
      <div class="vas-features">
        <div v-for="item in aiFeatures" :key="item.title" class="vas-item">
          <span class="vas-icon">{{ item.icon }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>
      <div class="pricing-note ai-note">
        <p>💡 AI助手按调用次数计费，{{ aiPricingSummary }}</p>
      </div>
    </div>

    <!-- 增值服务: 获客助手高级 -->
    <div class="section-title">📈 增值服务 — 获客助手(高级)</div>
    <div class="vas-section">
      <div class="vas-intro">
        <p>在基础获客能力之上，解锁完整数据画像、转化漏斗分析、客户留存分析、成员排行榜等高级分析功能。</p>
      </div>
      <div class="vas-features">
        <div v-for="item in acquisitionFeatures" :key="item.title" class="vas-item">
          <span class="vas-icon">{{ item.icon }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 企微套餐 -->
    <div class="section-title">📦 企微套餐(绑定配额)</div>
    <div class="package-section">
      <div class="package-grid">
        <div v-for="pkg in wecomPackages" :key="pkg.name" class="package-card" :class="{ recommended: pkg.recommended }">
          <div v-if="pkg.recommended" class="package-badge">推荐</div>
          <div class="package-name">{{ pkg.name }}</div>
          <div class="package-price">{{ pkg.price }}</div>
          <div class="package-quota">{{ pkg.quota }}</div>
          <div class="package-desc">{{ pkg.desc }}</div>
        </div>
      </div>
    </div>

    <!-- 使用步骤 -->
    <div class="section-title">📖 接入流程</div>
    <div class="steps-section">
      <div v-for="(step, index) in steps" :key="index" class="step-item">
        <div class="step-num">{{ index + 1 }}</div>
        <div class="step-content">
          <h4>{{ step.title }}</h4>
          <p>{{ step.desc }}</p>
        </div>
      </div>
    </div>

    <!-- 底部引导 -->
    <div class="bottom-guide">
      <p>准备好开始了吗？前往「开通授权」标签页完成企业微信绑定。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ wecomData?: any }>()

const tierPricing = ref<any[]>([])
const showTier = ref(false)

watch(() => props.wecomData?.vasConfig?.tierPricing, (val) => {
  if (Array.isArray(val) && val.length > 0) tierPricing.value = val
}, { immediate: true })

const aiPricingSummary = computed(() => {
  const packages = props.wecomData?.vasConfig?.aiPricing
  if (Array.isArray(packages) && packages.length > 0) {
    return packages.map((p: any) => `${p.name || ''}${p.calls || p.quota || ''}次(${p.price > 0 ? '¥' + p.price : '免费'})`).join(' · ')
  }
  return '具体套餐价格请前往「套餐与配额」标签页查看或详询客服'
})

const coreFeatures = [
  { icon: '👥', title: '通讯录同步', desc: '自动同步企微部门和成员信息，与CRM用户一一对应绑定', tag: '基础', tagType: 'basic' },
  { icon: '🤝', title: '客户管理', desc: '企微外部联系人自动同步为CRM客户，统一标签、画像、跟进', tag: '基础', tagType: 'basic' },
  { icon: '👨‍👩‍👧‍👦', title: '客户群管理', desc: '管理企微客户群，支持群发、欢迎语、群统计分析', tag: '基础', tagType: 'basic' },
  { icon: '📱', title: '侧边栏应用', desc: '在企微聊天窗口侧边栏直接查看CRM客户详情、订单、物流', tag: '基础', tagType: 'basic' },
  { icon: '🎯', title: '获客助手', desc: '创建获客链接，配置加粉权重，渠道分析追踪转化效果', tag: '基础', tagType: 'basic' },
  { icon: '🔗', title: '活码管理', desc: '创建企微活码，支持渠道分流、自动标签、欢迎语配置', tag: '基础', tagType: 'basic' },
  { icon: '🎧', title: '微信客服', desc: '微信客服消息同步，快捷回复库，数据统计与满意度分析', tag: '基础', tagType: 'basic' },
  { icon: '💰', title: '对外收款', desc: '企微内直接发起收款，绑定微信支付，订单自动关联客户', tag: '基础', tagType: 'basic' },
  { icon: '🔐', title: '企微授权配置', desc: '支持服务商扫码和自建应用双模式接入，多企微管理', tag: '基础', tagType: 'basic' },
  { icon: '💬', title: '会话存档', desc: '聊天记录安全存档，全文搜索，多类型消息气泡展示', tag: '增值', tagType: 'vas' },
  { icon: '🔍', title: '质检与合规', desc: '敏感词自动检测，质检规则配置，合规审计报告', tag: '增值', tagType: 'vas' },
  { icon: '🤖', title: 'AI助手', desc: 'AI质检评分、智能标签、话术推荐、知识库问答', tag: '增值', tagType: 'ai' }
]

const aiFeatures = [
  { icon: '📊', title: 'AI会话质检', desc: '自动分析会话质量，多维度评分，生成质检报告' },
  { icon: '🏷️', title: '智能标签', desc: 'AI自动识别客户意向，基于会话内容智能打标签' },
  { icon: '💡', title: '跟进建议', desc: '根据客户画像和会话历史，AI生成跟进策略建议' },
  { icon: '📝', title: '话术推荐', desc: '智能话术库，AI根据场景推荐最佳回复话术' },
  { icon: '📚', title: '知识库问答', desc: '上传产品文档/FAQ自动构建知识库，AI智能回答' },
  { icon: '⚡', title: '语义敏感检测', desc: 'AI语义理解检测隐晦违规内容，超越关键词匹配' },
]

const acquisitionFeatures = [
  { icon: '👤', title: '完整数据画像', desc: '客户来源、浏览轨迹、互动行为全方位画像' },
  { icon: '📊', title: '转化漏斗分析', desc: '点击-添加-转化全链路漏斗，定位流失环节' },
  { icon: '📈', title: '留存分析', desc: '客户留存率趋势，区分渠道/时段的留存差异' },
  { icon: '🏆', title: '成员排行榜', desc: '按添加量/转化率等维度，考核成员获客绩效' },
]

const defaultWecomPackages = [
  { name: '基础版', price: '免费(含CRM)', quota: '1个企微', desc: '适合单体企业', recommended: false },
  { name: '企业版', price: '详询客服', quota: '3个企微', desc: '适合集团/多品牌', recommended: true },
  { name: '旗舰版', price: '详询客服', quota: '10个企微', desc: '适合大型集团', recommended: false },
]

const wecomPackages = computed(() => {
  const pkgs = props.wecomData?.wecomPackages
  if (Array.isArray(pkgs) && pkgs.length > 0) return pkgs
  return defaultWecomPackages
})

const vasFeatures = [
  { icon: '📝', title: '完整聊天记录', desc: '自动拉取并存档员工与客户的所有聊天消息，支持文本、图片、文件、语音等类型' },
  { icon: '🔎', title: '全文搜索', desc: '按关键词、时间范围、成员等条件快速搜索定位历史消息' },
  { icon: '⚠️', title: '敏感词检测', desc: '自定义敏感词库，自动检测命中记录并告警通知，保障企业合规' },
  { icon: '✅', title: '会话质检', desc: '配置质检规则（响应时长/消息数/关键词/情绪），生成质检评分报告' },
  { icon: '🔒', title: '可见性控制', desc: '管理员可设置成员查看范围：仅自己/本部门/全部，保障数据安全' },
  { icon: '💺', title: '席位管控', desc: '按购买席位数管理存档成员，灵活增购，精确控制成本' }
]

const steps = [
  { title: '绑定企业微信', desc: '使用企微管理员扫码授权（推荐），或在CRM中手动配置自建应用接入' },
  { title: '同步通讯录', desc: '自动同步企微部门和成员信息，与CRM用户绑定' },
  { title: '同步客户', desc: '自动导入企微外部联系人和客户群' },
  { title: '开通增值服务（可选）', desc: '购买会话存档、AI助手等增值服务，解锁更多高级功能' }
]

</script>

<style scoped>
.wecom-intro { max-width: 100%; }

.intro-banner {
  display: flex; align-items: center; gap: 20px;
  background: linear-gradient(135deg, #07c160 0%, #06ae56 100%);
  border-radius: 12px; padding: 28px 32px; color: #fff; margin-bottom: 28px;
}
.banner-icon { font-size: 48px; }
.banner-text h3 { margin: 0 0 8px; font-size: 22px; font-weight: 700; }
.banner-text p { margin: 0; font-size: 15px; opacity: 0.9; line-height: 1.6; }

.section-title { font-size: 18px; font-weight: 600; color: #1d2129; margin: 28px 0 16px; }

.feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.feature-card {
  position: relative; background: #fff; border: 1px solid #e4e7ed;
  border-radius: 10px; padding: 20px 16px; transition: all 0.25s;
}
.feature-card:hover { border-color: #07c160; box-shadow: 0 4px 16px rgba(7,193,96,0.1); transform: translateY(-2px); }
.feature-icon { font-size: 28px; margin-bottom: 10px; }
.feature-card h4 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #303133; }
.feature-card p { margin: 0; font-size: 13px; color: #909399; line-height: 1.5; }
.feature-tag {
  position: absolute; top: 8px; right: 8px; font-size: 10px;
  padding: 1px 6px; border-radius: 4px; font-weight: 600;
}
.feature-tag.basic { background: #e6f7ef; color: #07c160; }
.feature-tag.vas { background: #fdf6ec; color: #e6a23c; }
.feature-tag.ai { background: #f3f0ff; color: #7C3AED; }

.vas-section { background: #fff; border: 1px solid #e4e7ed; border-radius: 12px; padding: 24px; margin-bottom: 8px; }
.vas-section.ai-section { border-color: #ddd6fe; }
.ai-note { background: #f5f3ff; border: 1px solid #ddd6fe; }
.ai-note p { color: #7C3AED; }
.vas-intro p { color: #606266; font-size: 14px; line-height: 1.8; margin: 0 0 16px; }

.vas-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.vas-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px; background: #f9fafb; border-radius: 8px;
}
.vas-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.vas-item strong { font-size: 14px; color: #303133; display: block; margin-bottom: 2px; }
.vas-item p { margin: 0; font-size: 12px; color: #909399; line-height: 1.5; }

.pricing-note { background: #fdf6ec; border: 1px solid #faecd8; border-radius: 8px; padding: 8px 14px; margin-bottom: 10px; }
.pricing-note p { margin: 0; font-size: 12px; color: #e6a23c; line-height: 1.5; }

.tier-collapse { }
.tier-toggle {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #f5f7fa; border-radius: 8px;
  cursor: pointer; font-size: 13px; color: #606266; font-weight: 500;
  transition: background 0.2s;
}
.tier-toggle:hover { background: #ebeef5; }
.tier-arrow { font-size: 12px; color: #909399; }
.tier-table { border: 1px solid #e4e7ed; border-radius: 0 0 8px 8px; overflow: hidden; margin-top: -1px; }
.tier-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; }
.tier-header { background: #fafafa; font-weight: 600; color: #606266; }
.tier-row:not(.tier-header) { border-top: 1px solid #f0f0f0; }
.tier-price { color: #07c160; font-weight: 600; }

.steps-section { display: flex; flex-direction: column; gap: 12px; }
.step-item {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 16px; background: #fff; border: 1px solid #e4e7ed; border-radius: 10px;
}
.step-num {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 14px; background: #07c160; color: #fff; flex-shrink: 0;
}
.step-content h4 { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #303133; }
.step-content p { margin: 0; font-size: 13px; color: #909399; line-height: 1.6; }

.bottom-guide {
  text-align: center; padding: 20px; margin-top: 24px;
  background: #f0faf4; border-radius: 10px;
}
.bottom-guide p { margin: 0; color: #07c160; font-size: 14px; font-weight: 500; }

/* Package section */
.package-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.package-card {
  position: relative; text-align: center; background: #fff;
  border: 1px solid #e4e7ed; border-radius: 12px; padding: 24px 16px;
  transition: all 0.25s;
}
.package-card:hover { border-color: #07c160; box-shadow: 0 4px 16px rgba(7,193,96,0.1); }
.package-card.recommended { border-color: #07c160; border-width: 2px; }
.package-badge {
  position: absolute; top: -1px; right: 16px;
  background: #07c160; color: #fff; font-size: 11px; font-weight: 700;
  padding: 2px 10px; border-radius: 0 0 6px 6px;
}
.package-name { font-size: 18px; font-weight: 700; color: #303133; margin-bottom: 8px; }
.package-price { font-size: 16px; font-weight: 600; color: #07c160; margin-bottom: 4px; }
.package-quota { font-size: 14px; color: #606266; margin-bottom: 8px; }
.package-desc { font-size: 12px; color: #909399; }

@media (max-width: 768px) {
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .vas-features { grid-template-columns: 1fr; }
  .intro-banner { flex-direction: column; text-align: center; }
}
@media (max-width: 500px) {
  .feature-grid { grid-template-columns: 1fr; }
}
</style>

