<template>
  <div class="features-page">
    <section class="page-hero">
      <div class="container">
        <h1>强大的<span class="gradient-text">功能特性</span></h1>
        <p>一站式销售管理解决方案，覆盖客户管理全流程，集成企微管理、虚拟商品、AI智能助手</p>
      </div>
    </section>

    <section class="features-detail">
      <div class="container">
        <div class="feature-block" v-for="(feat, idx) in features" :key="feat.title" :class="{ reverse: idx % 2 !== 0 }">
          <div class="feature-content">
            <span class="feature-tag">{{ feat.tag }}</span>
            <h2>{{ feat.title }}</h2>
            <p>{{ feat.desc }}</p>
            <ul>
              <li v-for="item in feat.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="feature-illustration">
            <div class="illustration-card" :class="feat.colorClass">
              <div class="illust-icon" v-html="feat.icon"></div>
              <div class="illust-lines">
                <span v-for="n in 4" :key="n" :style="{ width: (90 - n * 15) + '%' }"></span>
              </div>
              <div class="illust-badge">{{ feat.badge }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <h2>立即体验全部功能</h2>
        <p>7天免费试用，无需信用卡</p>
        <router-link to="/register?plan=FREE_TRIAL" class="btn btn-white btn-lg">免费试用</router-link>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const features = [
  {
    tag: '核心功能',
    title: '客户管理',
    desc: '360°客户视图，完整记录客户全生命周期信息，智能客户分级，精准营销触达。',
    items: ['客户信息全景展示，一目了然', '智能客户分配，公平高效', '跟进提醒自动化，不遗漏商机', '客户标签管理，精准分类', '客户分组标签，精细化管理'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    badge: 'CRM',
    colorClass: 'color-blue'
  },
  {
    tag: '核心功能',
    title: '订单管理',
    desc: '从下单到发货全流程管理，支持多状态流转、订单审核、批量操作。',
    items: ['订单全流程追踪，状态实时更新', '多级审核机制，风险可控', '批量发货处理，效率翻倍', '退换货管理，售后无忧', '订单数据分析，洞察趋势'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    badge: 'ORDER',
    colorClass: 'color-green'
  },
  {
    tag: '数据分析',
    title: '业绩分析',
    desc: '实时业绩看板，多维度数据分析，个人/团队业绩排名，助力科学决策。',
    items: ['实时业绩统计，数据透明', '团队排名对比，激发斗志', '趋势分析图表，预测未来', '自动报表生成，省时省力', '多维度数据钻取，深度洞察'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    badge: 'DATA',
    colorClass: 'color-purple'
  },
  {
    tag: '增值功能',
    title: '物流跟踪',
    desc: '对接主流快递公司，实时物流轨迹查询，异常件自动预警。',
    items: ['多快递公司对接，一键查询', '实时轨迹更新，全程可视', '异常件智能预警，及时处理', '签收自动确认，闭环管理'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    badge: 'TRACK',
    colorClass: 'color-orange'
  },
  {
    tag: '增值功能',
    title: '电销外呼',
    desc: '集成云呼叫中心，一键外呼、通话录音、智能质检，提升电销效率。',
    items: ['一键拨号外呼，效率提升', '通话录音存储，质检有据', '来电弹屏提醒，信息同步', '通话数据统计，绩效考核'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    badge: 'CALL',
    colorClass: 'color-pink'
  },
  {
    tag: '企业连接',
    title: '企业微信管理',
    desc: '深度对接企业微信，打通CRM与企微客户资产，实现全渠道客户运营与精准营销。获客助手智能分配线索，会话存档合规监控，AI质检自动评分。',
    items: ['企微通讯录同步，员工一键绑定', '客户群管理，群发消息与入群欢迎语', '获客助手智能链接分配，渠道活码创建', '会话存档与敏感词监控，合规质检', '对外收款与收款码管理，财务闭环', 'AI质检与智能客服，效率翻倍'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    badge: 'WECOM',
    colorClass: 'color-wecom'
  },
  {
    tag: '增值功能',
    title: '虚拟商品管理',
    desc: '支持卡密、网盘资源等虚拟商品的完整生命周期管理，自动发货与客户自助领取。',
    items: ['卡密库存批量导入与自动核销', '网盘资源链接管理，安全分发', '订单自动匹配发货，零人工干预', '客户自助领取页面，体验友好', '邮件自动通知，确保及时送达'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    badge: 'VIRTUAL',
    colorClass: 'color-teal'
  },
  {
    tag: '智能化',
    title: 'AI智能助手',
    desc: '集成AI大模型能力，为企微客服提供智能回复、会话质检与知识库检索，全面提升服务质量。',
    items: ['AI智能回复建议，秒级响应客户', 'AI会话质检策略，自动评分分析', '企业知识库管理，AI精准问答', '多模型接入配置，灵活选择', '话术库管理与侧边栏快捷引用'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>',
    badge: 'AI',
    colorClass: 'color-ai'
  },
  {
    tag: '增值功能',
    title: '短信营销管理',
    desc: '完整的短信营销与通知体系，支持模板管理、额度购买、自动发送规则与数据分析。',
    items: ['短信模板创建与四阶段审核管理', '短信额度套餐灵活购买，按需使用', '自动发送规则配置，智能触达客户', '发送记录与数据统计分析，效果可视'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    badge: 'SMS',
    colorClass: 'color-amber'
  },
  {
    tag: '系统管理',
    title: '系统设置',
    desc: '灵活的权限配置，角色管理、部门架构、操作日志，保障数据安全。',
    items: ['角色权限精细化管理', '部门组织架构配置', '操作日志审计追踪', '数据备份与恢复', '系统参数灵活配置'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    badge: 'SYS',
    colorClass: 'color-gray'
  }
]
</script>

<style lang="scss" scoped>
.features-page {
  padding-top: 80px;
}

.page-hero {
  padding: 80px 0;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, white 100%);

  h1 {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  p {
    font-size: 18px;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.features-detail {
  padding: 60px 0;
}

.feature-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  padding: 60px 0;

  &.reverse {
    direction: rtl;
    > * { direction: ltr; }
  }
}

.feature-content {
  .feature-tag {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  > p {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 24px;
  }

  ul {
    list-style: none;
    li {
      padding: 8px 0;
      padding-left: 28px;
      position: relative;
      color: var(--text-secondary);
      &::before {
        content: '\2713';
        position: absolute;
        left: 0;
        color: var(--success);
        font-weight: bold;
      }
    }
  }
}

.feature-illustration {
  display: flex;
  justify-content: center;
}

.illustration-card {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.12);
  }

  &.color-blue { background: linear-gradient(135deg, #eef2ff, #c7d2fe); }
  &.color-green { background: linear-gradient(135deg, #ecfdf5, #a7f3d0); }
  &.color-purple { background: linear-gradient(135deg, #f5f3ff, #ddd6fe); }
  &.color-orange { background: linear-gradient(135deg, #fffbeb, #fde68a); }
  &.color-pink { background: linear-gradient(135deg, #fdf2f8, #fbcfe8); }
  &.color-wecom { background: linear-gradient(135deg, #eff6ff, #bfdbfe); }
  &.color-teal { background: linear-gradient(135deg, #f0fdfa, #99f6e4); }
  &.color-ai { background: linear-gradient(135deg, #faf5ff, #e9d5ff); }
  &.color-amber { background: linear-gradient(135deg, #fffbeb, #fcd34d); }
  &.color-gray { background: linear-gradient(135deg, #f8fafc, #cbd5e1); }
}

.illust-icon {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

  svg {
    width: 40px;
    height: 40px;
    color: var(--primary);
  }
}

.color-green .illust-icon svg { color: #10b981; }
.color-purple .illust-icon svg { color: #8b5cf6; }
.color-orange .illust-icon svg { color: #f59e0b; }
.color-pink .illust-icon svg { color: #ec4899; }
.color-wecom .illust-icon svg { color: #3b82f6; }
.color-teal .illust-icon svg { color: #14b8a6; }
.color-ai .illust-icon svg { color: #a855f7; }
.color-amber .illust-icon svg { color: #d97706; }
.color-gray .illust-icon svg { color: #64748b; }

.illust-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  span {
    height: 8px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 4px;
  }
}

.illust-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--primary);
}

.cta-section {
  padding: 100px 0;
  background: var(--gradient-hero);
  text-align: center;
  color: white;

  h2 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  p {
    font-size: 18px;
    opacity: 0.9;
    margin-bottom: 32px;
  }
}

@media (max-width: 1024px) {
  .feature-block {
    grid-template-columns: 1fr;
    gap: 40px;
    &.reverse { direction: ltr; }
  }

  .page-hero h1 { font-size: 36px; }
}
</style>
