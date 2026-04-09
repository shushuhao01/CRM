<template>
  <div class="help-content">
    <h1>物流API配置指南</h1>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px">
      <template #title>本指南帮助您完成物流API的申请、配置与对接，实现电子面单打印、自动获取单号和物流跟踪等功能。</template>
    </el-alert>

    <section>
      <h2>一、整体流程概览</h2>
      <p>电子面单发货的完整流程如下：</p>
      <div class="flow-steps">
        <div class="flow-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>注册开放平台账号</h4>
            <p>在物流公司或第三方聚合平台注册开发者账号</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>申请API权限</h4>
            <p>开通电子面单、物流跟踪等API接口权限</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>签订合同/充值</h4>
            <p>与快递公司签订电子面单合同或在聚合平台充值</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>获取密钥配置</h4>
            <p>获取AppKey、AppSecret等凭证，填入系统配置</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">5</div>
          <div class="step-content">
            <h4>打印面单发货</h4>
            <p>系统自动调用API获取单号并生成面单进行打印</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>二、对接方式说明</h2>
      <p>系统支持两种对接模式：</p>

      <el-tabs type="border-card">
        <el-tab-pane label="方式一：快递100聚合平台（推荐）">
          <h3>快递100 — 一个平台对接所有快递</h3>
          <el-alert type="success" :closable="false" style="margin-bottom: 15px">
            <template #title>推荐方式！只需注册一个平台账号，即可对接顺丰、圆通、中通、韵达等主流快递公司的电子面单和物流查询。</template>
          </el-alert>

          <h4>1. 注册快递100开放平台</h4>
          <ul>
            <li>访问 <el-link type="primary" href="https://api.kuaidi100.com" target="_blank">快递100开放平台 (api.kuaidi100.com)</el-link></li>
            <li>注册企业账号（需营业执照）</li>
            <li>完成实名认证</li>
          </ul>

          <h4>2. 开通所需服务</h4>
          <el-table :data="kuaidi100Services" stripe style="width: 100%; margin: 10px 0">
            <el-table-column prop="service" label="服务名称" width="180" />
            <el-table-column prop="description" label="功能说明" />
            <el-table-column prop="price" label="参考价格" width="150" />
          </el-table>

          <h4>3. 获取API凭证</h4>
          <ul>
            <li><strong>Customer</strong>：在"我的信息"中获取</li>
            <li><strong>Key（授权码）</strong>：在"我的信息"中获取</li>
            <li>这两个参数需要填入系统的"快递100配置"中</li>
          </ul>

          <h4>4. 电子面单申请</h4>
          <ol>
            <li>在快递100后台 → "电子面单" → 选择需要的快递公司</li>
            <li>提交商家信息（公司名称、联系方式、月发货量等）</li>
            <li>等待快递公司审核（一般1-3个工作日）</li>
            <li>审核通过后获得<strong>月结编码/客户编码</strong></li>
            <li>将编码填入系统物流公司的API配置中</li>
          </ol>
        </el-tab-pane>

        <el-tab-pane label="方式二：直接对接快递公司">
          <h3>直接对接各快递公司的官方开放平台</h3>
          <el-alert type="warning" :closable="false" style="margin-bottom: 15px">
            <template #title>需要分别到每家快递公司申请，适合与单一快递公司有深度合作的场景。</template>
          </el-alert>

          <h4>顺丰速运</h4>
          <ul>
            <li>开放平台：<el-link type="primary" href="https://open.sf-express.com" target="_blank">open.sf-express.com</el-link></li>
            <li>注册企业开发者 → 创建应用 → 申请"下单取号"和"路由查询"接口</li>
            <li>获取：<strong>App ID</strong>、<strong>App Secret</strong>、<strong>月结账号</strong></li>
          </ul>

          <h4>圆通速递</h4>
          <ul>
            <li>开放平台：<el-link type="primary" href="https://open.yto.net.cn" target="_blank">open.yto.net.cn</el-link></li>
            <li>注册 → 创建应用 → 申请电子面单接口</li>
            <li>获取：<strong>App Key</strong>、<strong>App Secret</strong>、<strong>客户编码</strong></li>
          </ul>

          <h4>中通快递</h4>
          <ul>
            <li>开放平台：<el-link type="primary" href="https://open.zto.cn" target="_blank">open.zto.cn</el-link></li>
            <li>注册 → 创建应用 → 申请"创建订单/获取运单号"接口</li>
            <li>获取：<strong>App Key</strong>、<strong>App Secret</strong>、<strong>合作商编码</strong></li>
          </ul>

          <h4>韵达速递</h4>
          <ul>
            <li>开放平台：<el-link type="primary" href="https://open.yunda.com" target="_blank">open.yunda.com</el-link></li>
            <li>注册 → 申请电子面单接口</li>
            <li>获取：<strong>App Key</strong>、<strong>客户编号</strong>、<strong>密钥</strong></li>
          </ul>

          <h4>极兔速递</h4>
          <ul>
            <li>开放平台：<el-link type="primary" href="https://open.jtexpress.cn" target="_blank">open.jtexpress.cn</el-link></li>
            <li>注册 → 申请下单和面单接口</li>
            <li>获取：<strong>API账号</strong>、<strong>API密码</strong>、<strong>客户编码</strong></li>
          </ul>
        </el-tab-pane>
      </el-tabs>
    </section>

    <section>
      <h2>三、系统中配置API</h2>
      <h3>步骤1：配置快递100（聚合查询）</h3>
      <ol>
        <li>进入 <strong>物流管理 → 物流公司</strong> 页面</li>
        <li>点击 <strong>"快递100配置"</strong> 按钮</li>
        <li>填入从快递100获取的 <strong>Customer</strong> 和 <strong>Key</strong></li>
        <li>点击"测试连接"确认配置正确</li>
        <li>保存配置</li>
      </ol>

      <h3>步骤2：配置各快递公司的API</h3>
      <ol>
        <li>在物流公司列表中，找到需要配置的快递公司</li>
        <li>点击操作列的 <strong>"API配置"</strong> 按钮</li>
        <li>根据对接方式填写：
          <ul>
            <li><strong>快递100方式</strong>：填入月结编码、网点名称等</li>
            <li><strong>官方API方式</strong>：填入App Key、App Secret等完整凭证</li>
          </ul>
        </li>
        <li>保存配置</li>
      </ol>

      <h3>步骤3：配置寄件人信息</h3>
      <ol>
        <li>进入 <strong>物流管理 → 发货列表</strong> 页面</li>
        <li>点击 <strong>"寄件人"</strong> 按钮</li>
        <li>添加寄件人信息（姓名、电话、地址等）</li>
        <li>设置一个默认寄件人</li>
        <li>打印面单时将自动使用默认寄件人信息</li>
      </ol>
    </section>

    <section>
      <h2>四、电子面单工作原理</h2>
      <div class="principle-box">
        <h4>📋 面单打印发货流程</h4>
        <ol>
          <li>用户在发货列表选择订单，点击"打印面单发货"</li>
          <li>系统调用物流公司API（或通过快递100中转），提交寄件人信息和收件人信息</li>
          <li>API返回<strong>快递单号</strong>和<strong>面单数据</strong></li>
          <li>系统根据面单模板生成电子面单</li>
          <li>用户通过热敏打印机打印面单，贴在包裹上</li>
          <li>系统自动更新订单状态为"已发货"，记录快递单号</li>
          <li>后续系统自动查询物流轨迹更新状态</li>
        </ol>
      </div>

      <h4>常见术语说明</h4>
      <el-table :data="termData" stripe style="width: 100%; margin: 10px 0">
        <el-table-column prop="term" label="术语" width="150" />
        <el-table-column prop="explanation" label="说明" />
      </el-table>
    </section>

    <section>
      <h2>五、常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 必须签合同才能用电子面单吗？" name="1">
          <p>A: 是的。电子面单需要与快递公司签订月结协议或通过快递100等第三方平台代签。签订后获得月结编码，系统才能通过API获取快递单号。如果只是手动填单号发货，则不需要API。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 不配置API也能发货吗？" name="2">
          <p>A: 可以！系统支持手动发货模式 — 您可以手动输入快递单号进行发货，或者使用批量导入Excel发货。只是无法自动打印面单和自动获取单号。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 快递100和直接对接哪个好？" name="3">
          <p>A: 推荐使用快递100聚合平台。优点是一次对接可以使用多家快递，管理方便。直接对接官方平台适合发货量大、需要定制化的场景，但需要分别维护每家快递的接口。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 物流查询需要配置API吗？" name="4">
          <p>A: 物流轨迹查询通过快递100的查询API实现，只需配置快递100的Customer和Key即可查询所有快递公司的物流信息。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: API配置后如何测试？" name="5">
          <p>A: 在物流公司的API配置中点击"测试连接"按钮，系统会尝试调用API验证凭证是否正确。也可以选择一个测试订单进行打印面单操作来验证完整流程。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const kuaidi100Services = [
  { service: '实时查询API', description: '查询物流轨迹信息，支持1700+快递公司', price: '按次计费 / 套餐' },
  { service: '电子面单API', description: '获取快递单号并生成电子面单', price: '按次计费 / 套餐' },
  { service: '订阅推送API', description: '物流状态变更自动推送通知', price: '按次计费' },
  { service: '智能识别API', description: '自动识别快递公司和单号', price: '按次计费' },
]

const termData = [
  { term: '电子面单', explanation: '由系统通过API获取快递单号后自动生成的物流面单，替代手写面单，可直接通过热敏打印机打印' },
  { term: '月结编码', explanation: '与快递公司签订月结协议后获得的客户编码，用于API调用时标识身份和计费' },
  { term: 'AppKey / AppSecret', explanation: '开放平台分配的应用密钥，用于API接口调用的身份验证' },
  { term: '热敏打印机', explanation: '专门用于打印面单的打印机，常见纸张尺寸为100×180mm或100×150mm' },
  { term: '快递100', explanation: '第三方物流信息聚合平台，提供统一的API接口对接多家快递公司' },
]
</script>

<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content h4 { font-size: 15px; color: #303133; margin: 15px 0 8px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 40px; }

.flow-steps { display: flex; gap: 12px; margin: 15px 0; flex-wrap: wrap; }
.flow-step { display: flex; align-items: flex-start; gap: 10px; padding: 15px; background: #f5f7fa; border-radius: 8px; flex: 1; min-width: 160px; border: 1px solid #e4e7ed; }
.step-number { width: 30px; height: 30px; border-radius: 50%; background: #409eff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; }
.step-content h4 { margin: 0 0 4px; font-size: 14px; }
.step-content p { margin: 0; font-size: 12px; color: #909399; }

.principle-box { background: #f0f9eb; border: 1px solid #e1f3d8; border-radius: 8px; padding: 20px; margin: 15px 0; }
.principle-box h4 { margin-top: 0; color: #67c23a; }

:deep(.el-collapse-item__header) { font-weight: 500; color: #303133; }
:deep(.el-collapse-item__content) { color: #606266; line-height: 1.8; }
</style>

