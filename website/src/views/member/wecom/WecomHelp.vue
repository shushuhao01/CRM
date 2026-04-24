<template>
  <div class="wecom-help">
    <!-- FAQ -->
    <div class="help-section">
      <h3 class="section-title">❓ 常见问题</h3>
      <div class="faq-list">
        <div v-for="(faq, i) in faqs" :key="i" class="faq-item" @click="toggleFaq(i)">
          <div class="faq-question">
            <span>{{ faq.q }}</span>
            <span class="faq-arrow">{{ faq.open ? '▲' : '▼' }}</span>
          </div>
          <div v-if="faq.open" class="faq-answer">{{ faq.a }}</div>
        </div>
      </div>
    </div>

    <!-- 文档链接 -->
    <div class="help-section">
      <h3 class="section-title">📚 使用文档</h3>
      <div class="doc-grid">
        <a v-for="doc in docs" :key="doc.title" href="javascript:void(0)" class="doc-card" :class="{ disabled: !doc.ready }" @click="handleDocClick(doc)">
          <span class="doc-icon">{{ doc.icon }}</span>
          <div>
            <div class="doc-title">{{ doc.title }} <span v-if="!doc.ready" class="coming-soon">即将上线</span></div>
            <div class="doc-desc">{{ doc.desc }}</div>
          </div>
        </a>
      </div>
    </div>

    <!-- 联系客服 -->
    <div class="help-section">
      <h3 class="section-title">💬 联系我们</h3>
      <div class="contact-grid">
        <div class="contact-card">
          <div class="contact-icon">📧</div>
          <div class="contact-label">邮箱</div>
          <div class="contact-value">support@yunke-crm.com</div>
        </div>
        <div class="contact-card">
          <div class="contact-icon">📱</div>
          <div class="contact-label">企业微信</div>
          <div class="contact-value">扫码添加专属客服</div>
        </div>
        <div class="contact-card">
          <div class="contact-icon">🕐</div>
          <div class="contact-label">工作时间</div>
          <div class="contact-value">周一至周五 9:00-18:00</div>
        </div>
      </div>
    </div>

    <!-- 版本信息 -->
    <div class="help-section">
      <h3 class="section-title">ℹ️ 版本信息</h3>
      <div class="version-info">
        <div class="version-row"><span>企微模块版本</span><span>V4.0</span></div>
        <div class="version-row"><span>最近更新</span><span>2026-04-15</span></div>
        <div class="version-row"><span>支持功能</span><span>14项核心功能</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const faqs = reactive([
  { q: '如何绑定企业微信？', a: '在"开通授权"Tab中，使用企业微信管理员扫描二维码即可完成授权绑定。推荐使用扫码授权方式，30秒即可完成。', open: false },
  { q: '会话存档如何收费？', a: '会话存档为企微官方收费功能，我们提供阶梯定价：1-5人 ¥160/人/年，6-20人 ¥150/人/年，21-50人 ¥140/人/年，51-200人 ¥120/人/年。具体请在"套餐与配额"Tab中查看。', open: false },
  { q: 'AI助手额度如何计算？', a: 'AI助手按调用次数计费：体验包100次(免费)，基础包1000次(¥99)，标准包5000次(¥399)，专业包10000次(¥699)。每次AI分析（质检、标签、回复建议等）消耗1次额度。', open: false },
  { q: '获客助手有什么限制？', a: '基础版获客助手免费使用，包含创建获客链接、查看添加客户等基础功能。高级版支持完整数据画像、转化漏斗、留存分析等，需额外付费。', open: false },
  { q: '可以同时绑定多个企业微信吗？', a: '基础版支持绑定1个企微，企业版支持3个，旗舰版支持10个。在"套餐与配额"Tab中可升级套餐。', open: false },
  { q: '如何升级或续费套餐？', a: '在"续费与增购"Tab中可以对现有套餐进行续费，也可以增购会话存档席位或AI调用额度。', open: false },
  { q: '数据安全如何保障？', a: '所有数据均使用AES-256加密存储，API Key加密保存，调用日志脱敏处理。企业数据完全隔离，符合企业级安全标准。', open: false },
  { q: '服务商授权和自建应用有什么区别？', a: '服务商授权（扫码安装）更简单快捷，适合大多数企业；自建应用需要在企微后台手动创建应用并配置参数，适合有技术团队的企业或需要更高自定义需求的场景。', open: false },
])

const docs = [
  { icon: '🚀', title: '快速开始', desc: '5分钟完成企微绑定', url: '', ready: false },
  { icon: '📖', title: '功能手册', desc: '详细功能使用说明', url: '', ready: false },
  { icon: '🤖', title: 'AI助手指南', desc: 'AI质检/标签/话术配置', url: '', ready: false },
  { icon: '📊', title: '获客助手教程', desc: '获客链接/数据分析', url: '', ready: false },
  { icon: '💬', title: '会话存档配置', desc: '存档开通/质检/搜索', url: '', ready: false },
  { icon: '🔧', title: 'API开发文档', desc: '开放接口说明', url: '', ready: false },
]

const toggleFaq = (index: number) => {
  faqs[index].open = !faqs[index].open
}

const handleDocClick = (doc: any) => {
  if (doc.ready && doc.url) {
    window.open(doc.url, '_blank')
  }
}
</script>

<style scoped>
.wecom-help { max-width: 800px; }

.help-section { margin-bottom: 32px; }
.section-title { font-size: 17px; font-weight: 600; color: #1d2129; margin-bottom: 14px; }

/* FAQ */
.faq-list { display: flex; flex-direction: column; gap: 8px; }
.faq-item {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 10px;
  overflow: hidden; cursor: pointer; transition: box-shadow 0.2s;
}
.faq-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.faq-question {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; font-size: 14px; font-weight: 500; color: #303133;
}
.faq-arrow { font-size: 12px; color: #c0c4cc; }
.faq-answer {
  padding: 0 16px 14px; font-size: 13px; color: #606266; line-height: 1.8;
  border-top: 1px solid #f0f0f0; padding-top: 12px; margin-top: -2px;
}

/* Docs */
.doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.doc-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; background: #fff; border: 1px solid #e4e7ed;
  border-radius: 10px; text-decoration: none; transition: all 0.2s;
}
.doc-card:hover { border-color: #07c160; box-shadow: 0 2px 8px rgba(7,193,96,0.1); }
.doc-card.disabled { opacity: 0.6; cursor: default; }
.doc-card.disabled:hover { border-color: #e4e7ed; box-shadow: none; }
.coming-soon { font-size: 10px; color: #e6a23c; background: #fdf6ec; padding: 1px 6px; border-radius: 4px; margin-left: 4px; font-weight: 400; }
.doc-icon { font-size: 28px; }
.doc-title { font-size: 14px; font-weight: 600; color: #303133; }
.doc-desc { font-size: 12px; color: #909399; margin-top: 2px; }

/* Contact */
.contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.contact-card {
  text-align: center; padding: 20px 16px; background: #fff;
  border: 1px solid #e4e7ed; border-radius: 10px;
}
.contact-icon { font-size: 32px; margin-bottom: 8px; }
.contact-label { font-size: 13px; color: #909399; margin-bottom: 4px; }
.contact-value { font-size: 14px; font-weight: 500; color: #303133; }

/* Version */
.version-info {
  background: #f5f7fa; border-radius: 10px; padding: 16px;
}
.version-row {
  display: flex; justify-content: space-between; padding: 8px 0;
  font-size: 14px; color: #606266; border-bottom: 1px solid #e4e7ed;
}
.version-row:last-child { border-bottom: none; }
.version-row span:last-child { font-weight: 600; color: #303133; }

@media (max-width: 600px) {
  .contact-grid { grid-template-columns: 1fr; }
  .doc-grid { grid-template-columns: 1fr; }
}
</style>

