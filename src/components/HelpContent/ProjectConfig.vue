<template>
  <div class="help-content">
    <h1>配置说明</h1>
    <section>
      <h2>基础设置</h2>
      <p>在"系统管理 → 系统设置 → 基础设置"中配置：</p>
      <ul>
        <li><strong>系统名称</strong>：显示在浏览器标题和登录页</li>
        <li><strong>系统Logo</strong>：显示在侧边栏顶部</li>
        <li><strong>登录页背景</strong>：登录页面的背景图片</li>
        <li><strong>版权信息</strong>：页面底部的版权文字</li>
      </ul>
    </section>
    <section>
      <h2>订单设置</h2>
      <ul>
        <li><strong>订单流转模式</strong>：自动流转或手动提审</li>
        <li><strong>流转延迟时间</strong>：自动流转的等待时间（分钟）</li>
        <li><strong>订单号前缀</strong>：订单号的前缀字符</li>
        <li><strong>自定义字段</strong>：配置订单的自定义字段</li>
      </ul>
    </section>
    <section>
      <h2>物流设置</h2>
      <ul>
        <li><strong>默认物流公司</strong>：发货时的默认选择</li>
        <li><strong>发件人信息</strong>：默认发件人姓名、电话、地址</li>
        <li><strong>物流API</strong>：物流查询接口配置</li>
      </ul>
    </section>
    <section>
      <h2>通知设置</h2>
      <ul>
        <li><strong>超时提醒</strong>：审核超时、发货超时等提醒配置</li>
        <li><strong>通知渠道</strong>：企业微信、钉钉、邮件等渠道配置</li>
        <li><strong>消息清理</strong>：历史消息自动清理配置</li>
      </ul>
    </section>
    <section>
      <h2>短信设置</h2>
      <ul>
        <li><strong>短信服务商</strong>：阿里云、腾讯云等</li>
        <li><strong>短信签名</strong>：短信签名配置</li>
        <li><strong>短信模板</strong>：各类短信模板管理</li>
      </ul>
    </section>
  </div>
</template>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
</style>
