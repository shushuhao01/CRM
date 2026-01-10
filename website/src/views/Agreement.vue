<template>
  <div class="agreement-page">
    <section class="page-hero">
      <div class="container">
        <h1>{{ pageTitle }}</h1>
        <p>最后更新：2025年1月</p>
      </div>
    </section>

    <section class="agreement-content">
      <div class="container">
        <div class="content-wrapper" v-html="content"></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const type = computed(() => route.params.type as string)

const pageTitle = computed(() => {
  return type.value === 'service' ? '服务协议' : '隐私政策'
})

const serviceContent = `
<h2>一、服务条款的确认和接纳</h2>
<p>欢迎使用云客CRM服务。在使用本服务之前，请您仔细阅读本服务协议（以下简称"本协议"）的全部内容。</p>
<p>您通过网络页面点击确认或以其他方式选择接受本协议，即表示您与云客CRM已达成协议并同意接受本协议的全部约定内容。</p>

<h2>二、服务内容</h2>
<p>云客CRM向用户提供客户关系管理相关的软件服务，包括但不限于：</p>
<ul>
  <li>客户信息管理</li>
  <li>订单管理</li>
  <li>业绩统计分析</li>
  <li>物流跟踪</li>
  <li>电销外呼</li>
  <li>系统管理</li>
</ul>

<h2>三、用户注册</h2>
<p>用户在使用本服务前需要注册一个账号。用户应当提供真实、准确、完整的注册信息，并及时更新。</p>
<p>用户应妥善保管账号和密码，因用户原因导致的账号安全问题，由用户自行承担责任。</p>

<h2>四、用户行为规范</h2>
<p>用户在使用本服务时，应遵守以下规范：</p>
<ul>
  <li>遵守国家法律法规</li>
  <li>不得利用本服务从事违法活动</li>
  <li>不得侵犯他人合法权益</li>
  <li>不得干扰本服务的正常运行</li>
</ul>

<h2>五、知识产权</h2>
<p>云客CRM的所有内容，包括但不限于文字、图片、软件、音频、视频等，均受知识产权法律保护。</p>
<p>未经授权，用户不得复制、修改、传播或以其他方式使用上述内容。</p>

<h2>六、服务变更与终止</h2>
<p>云客CRM有权根据业务发展需要，变更、中断或终止部分或全部服务。</p>
<p>如服务变更或终止，云客CRM将提前通知用户，并妥善处理用户数据。</p>

<h2>七、免责声明</h2>
<p>因不可抗力、系统维护、网络故障等原因导致的服务中断，云客CRM不承担责任。</p>
<p>用户因使用本服务产生的数据丢失、业务损失等，云客CRM不承担责任。</p>

<h2>八、协议修改</h2>
<p>云客CRM有权根据需要修改本协议，修改后的协议将在网站公布。</p>
<p>用户继续使用本服务，即视为接受修改后的协议。</p>

<h2>九、联系方式</h2>
<p>如您对本协议有任何疑问，请通过以下方式联系我们：</p>
<p>客服邮箱：xianhuquwang@163.com</p>
<p>客服电话：135-7072-7364</p>
`

const privacyContent = `
<h2>一、信息收集</h2>
<p>我们收集的信息类型包括：</p>
<ul>
  <li><strong>账户信息</strong>：注册时提供的姓名、手机号、邮箱等</li>
  <li><strong>业务数据</strong>：您在使用服务过程中产生的客户、订单等数据</li>
  <li><strong>设备信息</strong>：设备型号、操作系统、IP地址等</li>
  <li><strong>日志信息</strong>：访问时间、操作记录等</li>
</ul>

<h2>二、信息使用</h2>
<p>我们使用收集的信息用于：</p>
<ul>
  <li>提供、维护和改进我们的服务</li>
  <li>处理您的请求和交易</li>
  <li>发送服务通知和更新</li>
  <li>保障账户和系统安全</li>
  <li>进行数据分析以改进服务</li>
</ul>

<h2>三、信息保护</h2>
<p>我们采取以下措施保护您的信息：</p>
<ul>
  <li>数据传输加密（SSL/TLS）</li>
  <li>数据存储加密</li>
  <li>访问权限控制</li>
  <li>定期安全审计</li>
  <li>员工保密培训</li>
</ul>

<h2>四、信息共享</h2>
<p>我们不会向第三方出售您的个人信息。在以下情况下，我们可能会共享您的信息：</p>
<ul>
  <li>获得您的明确同意</li>
  <li>法律法规要求</li>
  <li>与关联公司共享以提供服务</li>
  <li>与服务提供商共享以完成服务</li>
</ul>

<h2>五、Cookie使用</h2>
<p>我们使用Cookie和类似技术来：</p>
<ul>
  <li>记住您的登录状态</li>
  <li>分析服务使用情况</li>
  <li>提供个性化体验</li>
</ul>
<p>您可以通过浏览器设置管理Cookie。</p>

<h2>六、数据保留</h2>
<p>我们会在提供服务所需的期限内保留您的信息。账户注销后，我们会在合理期限内删除您的个人信息。</p>

<h2>七、您的权利</h2>
<p>您对您的个人信息享有以下权利：</p>
<ul>
  <li>访问和获取您的信息</li>
  <li>更正不准确的信息</li>
  <li>删除您的信息</li>
  <li>撤回同意</li>
  <li>注销账户</li>
</ul>

<h2>八、未成年人保护</h2>
<p>我们的服务面向企业用户，不面向未成年人。如果我们发现收集了未成年人的信息，将及时删除。</p>

<h2>九、政策更新</h2>
<p>我们可能会更新本隐私政策。更新后的政策将在网站公布，重大变更会通过邮件或站内通知告知您。</p>

<h2>十、联系我们</h2>
<p>如您对本隐私政策有任何疑问，请联系我们：</p>
<p>隐私保护邮箱：xianhuquwang@163.com</p>
<p>客服电话：135-7072-7364</p>
`

const content = computed(() => {
  return type.value === 'service' ? serviceContent : privacyContent
})
</script>

<style lang="scss" scoped>
.agreement-page {
  padding-top: 80px;
}

.page-hero {
  padding: 60px 0;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, white 100%);

  h1 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    color: var(--text-muted);
  }
}

.agreement-content {
  padding: 60px 0 100px;
}

.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 48px;
  box-shadow: var(--shadow-sm);
  line-height: 1.8;
  color: var(--text-secondary);

  :deep(h2) {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 32px 0 16px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(p) {
    margin-bottom: 16px;
  }

  :deep(ul) {
    margin-bottom: 16px;
    padding-left: 24px;

    li {
      margin-bottom: 8px;
    }
  }

  :deep(strong) {
    color: var(--text-primary);
  }
}
</style>
