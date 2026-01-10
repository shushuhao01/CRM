<template>
  <div class="about-page">
    <section class="page-hero">
      <div class="container">
        <h1>关于<span class="gradient-text">云客</span></h1>
        <p>让销售管理更简单，助力企业高效增长</p>
      </div>
    </section>

    <section class="about-intro">
      <div class="container">
        <div class="intro-content">
          <h2>我们的使命</h2>
          <p>云客CRM致力于为企业提供简单、高效、智能的销售管理解决方案。我们相信，好的工具应该让工作变得更简单，而不是更复杂。</p>
          <p>自成立以来，我们已服务超过10,000家企业客户，帮助他们提升销售效率、优化客户管理、实现业绩增长。</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">10,000+</span>
            <span class="stat-label">企业客户</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">500万+</span>
            <span class="stat-label">管理客户数</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">99.9%</span>
            <span class="stat-label">系统稳定性</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">7×24</span>
            <span class="stat-label">技术支持</span>
          </div>
        </div>
      </div>
    </section>

    <section class="values-section">
      <div class="container">
        <h2>我们的价值观</h2>
        <div class="values-grid">
          <div class="value-card">
            <div class="value-icon">🎯</div>
            <h3>客户至上</h3>
            <p>客户的成功就是我们的成功，我们始终以客户需求为导向。</p>
          </div>
          <div class="value-card">
            <div class="value-icon">💡</div>
            <h3>持续创新</h3>
            <p>不断探索新技术，持续优化产品，为客户创造更大价值。</p>
          </div>
          <div class="value-card">
            <div class="value-icon">🤝</div>
            <h3>诚信务实</h3>
            <p>言出必行，脚踏实地，用实际行动赢得客户信任。</p>
          </div>
          <div class="value-card">
            <div class="value-icon">🚀</div>
            <h3>追求卓越</h3>
            <p>精益求精，追求极致，打造行业领先的产品和服务。</p>
          </div>
        </div>
      </div>
    </section>

    <section class="contact-section">
      <div class="container">
        <h2>联系我们</h2>
        <div class="contact-grid">
          <div class="contact-card">
            <div class="contact-icon">📧</div>
            <h3>商务合作</h3>
            <a href="mailto:xianhuquwang@163.com">xianhuquwang@163.com</a>
          </div>
          <div class="contact-card">
            <div class="contact-icon">🛠️</div>
            <h3>技术支持</h3>
            <a href="mailto:xianhuquwang@163.com">xianhuquwang@163.com</a>
          </div>
          <div class="contact-card">
            <div class="contact-icon">📞</div>
            <h3>客服热线</h3>
            <a href="tel:13570727364">135-7072-7364</a>
          </div>
          <div class="contact-card">
            <div class="contact-icon">📍</div>
            <h3>公司地址</h3>
            <p>广州市黄埔区南翔一路68号</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.about-page {
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

.about-intro {
  padding: 80px 0;
}

.intro-content {
  max-width: 800px;
  margin: 0 auto 60px;
  text-align: center;

  h2 {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 24px;
  }

  p {
    font-size: 17px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 16px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
}

.stat-card {
  text-align: center;
  padding: 40px 20px;
  background: var(--bg-light);
  border-radius: var(--radius-lg);

  .stat-number {
    display: block;
    font-size: 42px;
    font-weight: 800;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 15px;
    color: var(--text-muted);
  }
}

.values-section {
  padding: 80px 0;
  background: var(--bg-light);

  h2 {
    text-align: center;
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 50px;
  }
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
}

.value-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 36px;
  text-align: center;
  box-shadow: var(--shadow);

  .value-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }

  h3 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.7;
  }
}

.contact-section {
  padding: 80px 0;

  h2 {
    text-align: center;
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 50px;
  }
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
}

.contact-card {
  text-align: center;
  padding: 36px;
  background: var(--bg-light);
  border-radius: var(--radius-lg);

  .contact-icon {
    font-size: 36px;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
  }

  a {
    font-size: 14px;
    color: var(--primary);

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: 1024px) {
  .stats-grid,
  .values-grid,
  .contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid,
  .values-grid,
  .contact-grid {
    grid-template-columns: 1fr;
  }

  .page-hero h1 {
    font-size: 36px;
  }
}
</style>
