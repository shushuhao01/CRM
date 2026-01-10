<template>
  <div class="solutions-page">
    <section class="page-hero">
      <div class="container">
        <h1>行业<span class="gradient-text">解决方案</span></h1>
        <p>针对不同行业特点，提供专业的CRM解决方案</p>
      </div>
    </section>

    <section class="solutions-list">
      <div class="container">
        <div class="solution-card">
          <div class="solution-icon">📞</div>
          <div class="solution-content">
            <h3>电销行业</h3>
            <p>专为电话销售团队打造，集成云呼叫中心，支持一键外呼、通话录音、智能质检，配合客户管理和业绩统计，全面提升电销效率。</p>
            <ul>
              <li>一键外呼，效率提升50%</li>
              <li>通话录音，质检有据可查</li>
              <li>来电弹屏，客户信息同步</li>
              <li>话术库管理，新人快速上手</li>
            </ul>
          </div>
        </div>

        <div class="solution-card">
          <div class="solution-icon">🛒</div>
          <div class="solution-content">
            <h3>电商行业</h3>
            <p>从订单管理到物流跟踪，覆盖电商销售全流程。支持批量发货、多快递对接、异常件预警，提升客户满意度。</p>
            <ul>
              <li>订单全流程管理</li>
              <li>多快递公司对接</li>
              <li>物流异常自动预警</li>
              <li>客户评价管理</li>
            </ul>
          </div>
        </div>

        <div class="solution-card">
          <div class="solution-icon">🏢</div>
          <div class="solution-content">
            <h3>B2B企业</h3>
            <p>适合企业级销售团队，支持复杂的客户跟进流程、多级审批、合同管理，帮助企业建立标准化的销售流程。</p>
            <ul>
              <li>客户分级管理</li>
              <li>销售漏斗分析</li>
              <li>合同审批流程</li>
              <li>团队协作共享</li>
            </ul>
          </div>
        </div>

        <div class="solution-card">
          <div class="solution-icon">🎓</div>
          <div class="solution-content">
            <h3>教育培训</h3>
            <p>针对教育培训机构的招生管理需求，从线索获取到成交转化，全程跟踪学员信息，提升招生转化率。</p>
            <ul>
              <li>线索来源追踪</li>
              <li>试听课程管理</li>
              <li>学员跟进提醒</li>
              <li>招生业绩统计</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <h2>找到适合您的解决方案</h2>
        <p>联系我们，获取专属行业方案</p>
        <div class="cta-actions">
          <a :href="wechatServiceUrl" target="_blank" class="btn btn-white btn-lg">免费试用</a>
          <a :href="wechatServiceUrl" target="_blank" class="btn btn-outline-white btn-lg">联系销售</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const wechatServiceUrl = 'https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25'
</script>

<style lang="scss" scoped>
.solutions-page {
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
  }
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.solutions-list {
  padding: 60px 0 100px;
}

.solution-card {
  display: flex;
  gap: 40px;
  padding: 48px;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  margin-bottom: 30px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
}

.solution-icon {
  font-size: 64px;
  flex-shrink: 0;
}

.solution-content {
  h3 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  > p {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 20px;
  }

  ul {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    list-style: none;

    li {
      padding-left: 24px;
      position: relative;
      color: var(--text-secondary);
      font-size: 14px;

      &::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: var(--success);
        font-weight: bold;
      }
    }
  }
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

.cta-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.btn-outline-white {
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: white;
  background: transparent;
  padding: 14px 32px;
  border-radius: var(--radius);
  font-weight: 600;

  &:hover {
    background: white;
    color: var(--primary);
  }
}

@media (max-width: 768px) {
  .solution-card {
    flex-direction: column;
    text-align: center;
  }

  .solution-content ul {
    grid-template-columns: 1fr;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
