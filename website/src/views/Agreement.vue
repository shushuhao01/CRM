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
  switch (type.value) {
    case 'service': return '服务协议'
    case 'privacy': return '隐私政策'
    case 'auto-renew': return '自动续费服务协议'
    default: return '服务协议'
  }
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

const autoRenewContent = `
<h2>一、服务说明</h2>
<p>本协议是您（以下简称"用户"）与广州仙狐网络科技有限公司（以下简称"我们"或"云客CRM"）之间关于自动续费服务的协议。</p>
<p>自动续费服务是指用户授权我们在其订阅的服务到期前，通过用户绑定的微信支付或支付宝账户自动扣款以延续服务的功能。</p>

<h2>二、服务开通</h2>
<p>用户在开通自动续费服务时，需满足以下条件：</p>
<ul>
  <li>已注册并登录云客CRM会员中心</li>
  <li>已选择需要订阅的套餐方案</li>
  <li>已阅读并同意本协议</li>
  <li>已完成微信支付或支付宝的委托代扣签约授权</li>
</ul>
<p>用户开通自动续费服务后，即视为授权我们在每个计费周期到期时，从用户绑定的支付账户中自动扣除下一周期的服务费用。</p>

<h2>三、扣费规则</h2>
<p><strong>3.1 扣费周期</strong></p>
<p>根据用户选择的计费方式，扣费周期分为：</p>
<ul>
  <li><strong>按月付费</strong>：每月自动扣款一次，扣款金额为所选套餐的月费</li>
  <li><strong>按年付费</strong>：每年自动扣款一次，扣款金额为所选套餐的年费（可享年付优惠）</li>
</ul>

<p><strong>3.2 扣费时间</strong></p>
<p>系统将在当前计费周期到期当日自动发起扣款。如扣款失败，系统将在之后的1-3天内进行重试。</p>

<p><strong>3.3 扣费金额</strong></p>
<p>扣费金额以用户开通自动续费时选择的套餐价格为准。如套餐价格发生调整，我们将提前通知用户，用户可选择继续订阅或取消自动续费。</p>

<p><strong>3.4 扣费失败处理</strong></p>
<ul>
  <li>如因账户余额不足、支付账户异常等原因导致扣款失败，系统将自动重试（最多3次）</li>
  <li>连续3次扣款失败后，自动续费服务将暂停，用户需手动续费或重新开通自动续费</li>
  <li>扣款失败期间，如服务已到期，相关功能可能受到限制</li>
</ul>

<h2>四、取消自动续费</h2>
<p>用户可随时取消自动续费服务，取消方式如下：</p>
<ul>
  <li><strong>方式一</strong>：登录云客CRM会员中心 → 进入「订阅管理」页面 → 点击「取消订阅」按钮</li>
  <li><strong>方式二</strong>：在微信中进入「我」→「服务」→「钱包」→「支付设置」→「自动续费」，找到云客CRM并关闭</li>
  <li><strong>方式三</strong>：在支付宝中进入「我的」→「设置」→「支付设置」→「免密支付/自动扣款」，找到云客CRM并关闭</li>
</ul>
<p><strong>取消生效规则：</strong></p>
<ul>
  <li>取消自动续费后，当前已支付的计费周期内服务仍然有效，不会立即中断</li>
  <li>当前计费周期结束后，服务将不再自动续期</li>
  <li>取消自动续费不涉及退款，已扣除的费用不予退还</li>
</ul>

<h2>五、服务内容与权益</h2>
<p>自动续费期间，用户享有所选套餐包含的全部服务权益，包括但不限于：</p>
<ul>
  <li>客户管理、订单管理、业绩分析等核心功能</li>
  <li>套餐对应的用户数量和存储空间</li>
  <li>系统持续更新和功能升级</li>
  <li>在线客服支持</li>
</ul>
<p>具体权益内容以用户所选套餐的说明为准，详见 <a href="/pricing">价格方案</a> 页面。</p>

<h2>六、价格调整</h2>
<p>如因业务调整需要变更套餐价格，我们将：</p>
<ul>
  <li>提前30天通过站内通知、短信或邮件告知用户</li>
  <li>新价格将在下一个计费周期生效</li>
  <li>用户如不接受新价格，可在价格生效前取消自动续费</li>
</ul>

<h2>七、退款政策</h2>
<ul>
  <li>自动续费扣款成功后，原则上不予退款</li>
  <li>如因系统错误导致重复扣款，我们将在核实后5个工作日内原路退回多扣金额</li>
  <li>如有特殊情况需要退款，请联系客服处理</li>
</ul>

<h2>八、用户责任</h2>
<ul>
  <li>用户应确保绑定的支付账户状态正常、余额充足</li>
  <li>用户应妥善保管账户信息，因账户被盗等原因产生的损失由用户自行承担</li>
  <li>用户变更支付账户时，应及时更新自动续费绑定信息</li>
</ul>

<h2>九、协议变更</h2>
<p>我们有权根据业务需要修改本协议内容。修改后的协议将在云客CRM官网公布，并通过适当方式通知用户。</p>
<p>用户在协议修改后继续使用自动续费服务的，视为接受修改后的协议。</p>

<h2>十、争议解决</h2>
<p>因本协议引起的或与本协议有关的争议，双方应友好协商解决。协商不成的，任何一方均可向广州仙狐网络科技有限公司所在地有管辖权的人民法院提起诉讼。</p>

<h2>十一、联系方式</h2>
<p>如您对本协议或自动续费服务有任何疑问，请通过以下方式联系我们：</p>
<ul>
  <li>客服邮箱：xianhuquwang@163.com</li>
  <li>客服电话：135-7072-7364</li>
  <li>会员中心：登录后通过在线客服咨询</li>
</ul>
<p style="margin-top: 40px; color: #666; font-size: 13px;">广州仙狐网络科技有限公司<br/>本协议自2025年1月1日起生效</p>
`

const content = computed(() => {
  switch (type.value) {
    case 'service': return serviceContent
    case 'privacy': return privacyContent
    case 'auto-renew': return autoRenewContent
    default: return serviceContent
  }
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
