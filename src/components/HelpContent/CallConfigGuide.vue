<template>
  <div class="help-content">
    <h1>📞 通话管理与呼出配置完整指南</h1>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px">
      <template #title>本指南详细介绍系统的外呼配置、通话管理功能，包括所有呼出方式、线路配置、工作手机绑定、号码分配等完整操作步骤。</template>
    </el-alert>

    <!-- 目录导航 -->
    <section>
      <h2>📋 目录</h2>
      <div class="toc-list">
        <div class="toc-item" @click="scrollTo('overview')">一、通话管理概述</div>
        <div class="toc-item" @click="scrollTo('call-methods')">二、外呼方式详解</div>
        <div class="toc-item" @click="scrollTo('system-lines')">三、系统线路管理（管理员）</div>
        <div class="toc-item" @click="scrollTo('voip-config')">四、网络电话配置（管理员）</div>
        <div class="toc-item" @click="scrollTo('line-assign')">五、号码分配（管理员）</div>
        <div class="toc-item" @click="scrollTo('work-phone')">六、工作手机绑定（全员）</div>
        <div class="toc-item" @click="scrollTo('my-settings')">七、我的外呼设置（全员）</div>
        <div class="toc-item" @click="scrollTo('outbound-call')">八、发起外呼操作</div>
        <div class="toc-item" @click="scrollTo('call-records')">九、通话记录管理</div>
        <div class="toc-item" @click="scrollTo('recording-support')">十、通话录音支持</div>
        <div class="toc-item" @click="scrollTo('outbound-tasks')">十一、外呼任务管理</div>
        <div class="toc-item" @click="scrollTo('faq')">十二、常见问题</div>
      </div>
    </section>

    <!-- 一、通话管理概述 -->
    <section id="overview">
      <h2>一、通话管理概述</h2>
      <p>通话管理是云客CRM的核心功能模块之一，为销售团队提供高效的电话外呼能力。系统支持多种外呼方式，满足不同规模企业的需求。</p>

      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">📱</div>
          <h4>工作手机外呼</h4>
          <p>通过绑定的工作手机发起呼叫，使用手机SIM卡拨号，通话质量稳定</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🌐</div>
          <h4>网络电话(VoIP)</h4>
          <p>通过阿里云、腾讯云等服务商的VoIP线路拨号，成本低、可扩展</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📡</div>
          <h4>SIP线路</h4>
          <p>对接企业SIP中继线路，适合已有电话系统的企业</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">☎️</div>
          <h4>PSTN网关</h4>
          <p>通过PSTN语音网关拨号，支持模拟/数字中继</p>
        </div>
      </div>

      <el-alert type="warning" :closable="false" style="margin-top: 15px">
        <template #title>
          <strong>呼叫优先级</strong>：工作手机已绑定且在线 → 选择管理员配置的可用线路。如果工作手机在线且用户开启了"优先使用工作手机"，将自动使用工作手机拨号。
        </template>
      </el-alert>
    </section>

    <!-- 二、外呼方式详解 -->
    <section id="call-methods">
      <h2>二、外呼方式详解</h2>

      <h3>2.1 工作手机外呼</h3>
      <p>工作手机外呼是通过绑定员工的真实手机设备，由CRM系统远程控制手机发起呼叫的方式。</p>
      <div class="info-box">
        <h4>✅ 优点</h4>
        <ul>
          <li>使用真实手机号码，客户信任度高</li>
          <li>通话质量稳定，不受网络影响</li>
          <li>支持自动录音并同步至CRM</li>
          <li>无需额外购买外呼线路</li>
        </ul>
        <h4>⚠️ 注意事项</h4>
        <ul>
          <li>需在手机上安装"外呼助手"APP</li>
          <li>手机需保持在线状态（APP在后台运行）</li>
          <li>通话费用由手机SIM卡套餐承担</li>
        </ul>
      </div>

      <h3>2.2 网络电话(VoIP)外呼</h3>
      <p>通过云通信服务商（阿里云、腾讯云、华为云）的语音通话API发起呼叫。</p>
      <el-table :data="voipProviders" stripe style="width: 100%; margin: 10px 0">
        <el-table-column prop="provider" label="服务商" width="120" />
        <el-table-column prop="feature" label="特点" />
        <el-table-column prop="price" label="参考价格" width="150" />
        <el-table-column prop="apply" label="申请方式" width="200" />
      </el-table>

      <h3>2.3 SIP线路外呼</h3>
      <p>SIP（Session Initiation Protocol）线路适合已有IP电话系统的企业，可直接对接现有的SIP中继。</p>
      <div class="info-box">
        <h4>配置参数说明</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="SIP服务器">SIP中继服务器地址，如 sip.example.com</el-descriptions-item>
          <el-descriptions-item label="SIP端口">默认5060，TLS一般使用5061</el-descriptions-item>
          <el-descriptions-item label="传输协议">UDP（默认）、TCP、TLS（加密）</el-descriptions-item>
          <el-descriptions-item label="SIP用户名">SIP认证用户名</el-descriptions-item>
          <el-descriptions-item label="SIP密码">SIP认证密码</el-descriptions-item>
          <el-descriptions-item label="SIP域名">可选，部分服务商需要</el-descriptions-item>
        </el-descriptions>
      </div>

      <h3>2.4 PSTN网关外呼</h3>
      <p>通过传统电话网关（如语音网关、IP-PBX）发起呼叫，适合使用传统固话线路的企业。</p>
      <div class="info-box">
        <h4>支持的中继类型</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="模拟中继(FXO)">连接传统电话线路，通道数少但简单稳定</el-descriptions-item>
          <el-descriptions-item label="数字中继(E1/T1)">E1支持30路通话，适合中等规模呼叫中心</el-descriptions-item>
          <el-descriptions-item label="SIP中继">通过IP网络连接，灵活扩展通道数</el-descriptions-item>
          <el-descriptions-item label="PRI中继">基于ISDN的数字中继，信令稳定可靠</el-descriptions-item>
        </el-descriptions>
      </div>
    </section>

    <!-- 三、系统线路管理 -->
    <section id="system-lines">
      <h2>三、系统线路管理（管理员）</h2>
      <el-alert type="warning" :closable="false" style="margin-bottom: 15px">
        <template #title>此功能仅管理员和超级管理员可操作。</template>
      </el-alert>

      <h3>3.1 进入线路管理</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>打开呼出配置弹窗</strong>
            <p>在通话管理页面，点击顶部的 <el-tag size="small">呼出配置</el-tag> 按钮</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>切换到"系统线路管理"标签页</strong>
            <p>管理员默认显示此标签页，可查看所有已配置的外呼线路</p>
          </div>
        </div>
      </div>

      <h3>3.2 添加新线路</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>点击"添加线路"按钮</strong>
            <p>在线路列表右上角，点击蓝色的"添加线路"按钮</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>填写线路基本信息</strong>
            <ul>
              <li><strong>线路名称</strong>：给线路起一个易识别的名称，如"阿里云主线路"</li>
              <li><strong>服务商</strong>：选择阿里云通信 / 腾讯云通信 / 华为云通信 / 自定义</li>
              <li><strong>线路类型</strong>：网络电话(VoIP) / 传统电话(PSTN) / SIP线路</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>填写服务商配置</strong>
            <p>根据所选服务商填写对应的认证信息：</p>
            <ul>
              <li><strong>阿里云</strong>：AccessKey ID、AccessKey Secret、应用ID</li>
              <li><strong>腾讯云</strong>：SecretId、SecretKey、应用ID</li>
              <li><strong>华为云</strong>：Access Key、Secret Key</li>
              <li><strong>自定义SIP</strong>：SIP服务器地址、端口、用户名、密码</li>
              <li><strong>自定义PSTN</strong>：网关地址、端口、中继类型、通道数</li>
              <li><strong>自定义VoIP</strong>：API地址、API密钥</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>设置基本参数</strong>
            <ul>
              <li><strong>主叫号码</strong>：客户接听时显示的号码（需服务商支持）</li>
              <li><strong>日呼叫限额</strong>：每天最多呼叫次数（防止过度外呼）</li>
              <li><strong>最大并发</strong>：同一时间最多进行的通话数</li>
              <li><strong>启用</strong>：是否启用此线路</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-desc">
            <strong>保存线路</strong>
            <p>点击"保存"按钮完成线路创建</p>
          </div>
        </div>
      </div>

      <h3>3.3 管理已有线路</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="测试连接">点击线路操作栏的"测试"按钮，验证线路配置是否正确、网络是否通畅</el-descriptions-item>
        <el-descriptions-item label="编辑线路">修改线路名称、配置参数、限额等信息</el-descriptions-item>
        <el-descriptions-item label="启用/禁用">通过开关快速启用或禁用线路</el-descriptions-item>
        <el-descriptions-item label="删除线路">删除不再使用的线路（已分配给用户的需先取消分配）</el-descriptions-item>
        <el-descriptions-item label="查看用量">查看线路今日使用量和限额</el-descriptions-item>
      </el-descriptions>
    </section>

    <!-- 四、网络电话配置 -->
    <section id="voip-config">
      <h2>四、网络电话配置（管理员）</h2>
      <p>网络电话配置用于设置全局默认的VoIP服务商及其认证信息。</p>

      <h3>4.1 阿里云通信配置步骤</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>开通阿里云语音通话服务</strong>
            <p>访问 <strong>阿里云控制台 → 语音服务</strong>，开通语音通话功能</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>创建AccessKey</strong>
            <p>在阿里云 → 访问控制 → AccessKey管理 中创建子用户并获取AccessKey ID和Secret</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>创建语音通话应用</strong>
            <p>在语音服务控制台创建应用，获取应用ID</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>申请主叫号码</strong>
            <p>在号码管理中申请外呼号码（需提交企业资质审核）</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-desc">
            <strong>填写配置信息</strong>
            <p>在呼出配置 → 网络电话配置标签页中，选择"阿里云通信"，依次填入：</p>
            <ul>
              <li>AccessKey ID</li>
              <li>AccessKey Secret</li>
              <li>应用ID</li>
              <li>主叫号码</li>
              <li>服务区域（选择就近的区域，如华东1杭州）</li>
              <li>是否启用录音</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">6</div>
          <div class="step-desc">
            <strong>测试连接</strong>
            <p>点击"测试连接"按钮验证配置是否正确</p>
          </div>
        </div>
      </div>

      <h3>4.2 腾讯云通信配置步骤</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>开通腾讯云语音消息服务</strong>
            <p>访问腾讯云控制台，搜索"语音消息"并开通</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>获取API密钥</strong>
            <p>在 腾讯云 → 访问管理 → API密钥管理 中获取 SecretId 和 SecretKey</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>创建应用</strong>
            <p>在语音消息控制台创建应用，获取应用ID（SDKAppID）</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>填写配置</strong>
            <p>在呼出配置 → 网络电话配置中选择"腾讯云通信"，填入SecretId、SecretKey和应用ID</p>
          </div>
        </div>
      </div>

      <h3>4.3 华为云通信配置步骤</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>开通华为云通信服务</strong>
            <p>访问华为云控制台，开通语音通话服务</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>获取密钥</strong>
            <p>在华为云 → 我的凭证 中获取 Access Key 和 Secret Key</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>填写配置</strong>
            <p>在呼出配置 → 网络电话配置中选择"华为云通信"，填入对应密钥</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 五、号码分配 -->
    <section id="line-assign">
      <h2>五、号码分配（管理员）</h2>
      <p>管理员创建外呼线路后，需要将线路分配给具体的销售人员才能使用。</p>

      <h3>5.1 分配线路给用户</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>进入号码分配标签页</strong>
            <p>在呼出配置弹窗中，切换到"号码分配"标签页</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>点击"分配线路"按钮</strong>
            <p>打开分配弹窗</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>选择用户和线路</strong>
            <ul>
              <li><strong>选择用户</strong>：从下拉列表中选择目标销售人员</li>
              <li><strong>选择线路</strong>：选择要分配的外呼线路（仅显示已启用的线路）</li>
              <li><strong>主叫号码</strong>：可为该用户设置专属的主叫号码（可选，覆盖线路默认号码）</li>
              <li><strong>日呼叫限额</strong>：设置该用户每日最大呼叫次数（默认100次）</li>
              <li><strong>设为默认</strong>：是否设为该用户的默认外呼线路</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>确定分配</strong>
            <p>点击"确定分配"完成操作，用户即可在外呼时使用该线路</p>
          </div>
        </div>
      </div>

      <h3>5.2 管理分配</h3>
      <ul>
        <li><strong>查看分配列表</strong>：在号码分配标签页可查看所有已分配的用户-线路关系</li>
        <li><strong>取消分配</strong>：点击"取消"按钮可移除用户的线路分配</li>
      </ul>
    </section>

    <!-- 六、工作手机绑定 -->
    <section id="work-phone">
      <h2>六、工作手机绑定（全员）</h2>
      <el-alert type="success" :closable="false" style="margin-bottom: 15px">
        <template #title>所有员工都可以绑定自己的工作手机，绑定后可通过手机直接拨打客户电话，系统自动录音并同步通话记录。</template>
      </el-alert>

      <h3>6.1 绑定步骤</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>安装"外呼助手"APP</strong>
            <p>在工作手机上下载并安装"外呼助手"APP（支持Android/iOS）</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>打开呼出配置 → 工作手机标签页</strong>
            <p>在CRM系统中点击"呼出配置"，切换到"工作手机"标签页</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>点击"绑定新手机"按钮</strong>
            <p>系统会生成一个二维码</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>手机扫码绑定</strong>
            <p>在工作手机的"外呼助手"APP中，点击"扫码绑定"功能，扫描屏幕上的二维码</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-desc">
            <strong>等待绑定成功</strong>
            <p>扫码成功后系统会自动检测连接状态，显示"绑定成功"即可</p>
          </div>
        </div>
      </div>

      <h3>6.2 管理已绑定手机</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="查看状态">已绑定的手机会显示在线/离线状态</el-descriptions-item>
        <el-descriptions-item label="刷新状态">点击"刷新状态"按钮更新手机连接状态</el-descriptions-item>
        <el-descriptions-item label="设为主要">绑定多部手机时，可设置一部为主要拨号手机</el-descriptions-item>
        <el-descriptions-item label="重新扫码">手机离线时可点击"重新扫码"重新建立连接</el-descriptions-item>
        <el-descriptions-item label="解绑手机">不再使用时可解绑手机</el-descriptions-item>
      </el-descriptions>

      <el-alert type="info" :closable="false" style="margin-top: 15px">
        <template #title>
          <strong>提示</strong>：工作手机APP需保持在手机后台运行，且手机保持网络连接，才能正常接收外呼指令。
        </template>
      </el-alert>
    </section>

    <!-- 七、我的外呼设置 -->
    <section id="my-settings">
      <h2>七、我的外呼设置（全员）</h2>
      <p>每位员工可以设置自己的外呼偏好。</p>

      <h3>7.1 设置项说明</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="优先使用工作手机">
          开启后，当工作手机在线时优先使用工作手机拨打，而非系统VoIP线路。
          <el-tag size="small" type="success" style="margin-left: 8px">推荐开启</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="默认外呼线路">
          当不使用工作手机时，默认选择的外呼线路。仅显示管理员已分配给你的线路。
        </el-descriptions-item>
      </el-descriptions>

      <h3>7.2 我的可用线路</h3>
      <p>在"我的设置"标签页底部，可查看管理员分配给你的所有可用线路信息：</p>
      <ul>
        <li>线路名称和服务商</li>
        <li>是否为默认线路</li>
        <li>关联的主叫号码</li>
      </ul>
      <el-alert type="info" :closable="false">
        <template #title>如果没有可用线路，请联系管理员进行线路分配。</template>
      </el-alert>
    </section>

    <!-- 八、发起外呼操作 -->
    <section id="outbound-call">
      <h2>八、发起外呼操作</h2>
      <p>配置完成后，有多种方式可以发起外呼：</p>

      <h3>8.1 从客户详情页拨打</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>进入客户详情页</strong>
            <p>在客户管理中点击目标客户</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>点击电话号码旁的拨号图标</strong>
            <p>系统弹出外呼确认窗口</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>选择呼叫方式并确认</strong>
            <p>选择使用工作手机或系统线路，确认后发起呼叫</p>
          </div>
        </div>
      </div>

      <h3>8.2 从通话管理页面拨打</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>进入服务管理 → 通话管理</strong>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>点击"外呼"按钮</strong>
            <p>打开外呼弹窗</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>输入号码或选择客户</strong>
            <p>手动输入电话号码，或搜索选择已有客户</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>选择外呼方式</strong>
            <ul>
              <li><strong>工作手机</strong>：选择已绑定的在线工作手机</li>
              <li><strong>系统线路</strong>：选择管理员分配的VoIP/SIP线路</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-desc">
            <strong>发起呼叫</strong>
            <p>确认信息无误后点击"呼叫"按钮</p>
          </div>
        </div>
      </div>

      <h3>8.3 从外呼任务中拨打</h3>
      <p>管理员可创建外呼任务，分配给员工批量拨打。员工在任务列表中逐个拨打即可。</p>
    </section>

    <!-- 九、通话记录管理 -->
    <section id="call-records">
      <h2>九、通话记录管理</h2>
      <p>所有通过系统发起的通话都会自动记录，包括：</p>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="基本信息">客户姓名、电话号码、通话时间、通话时长</el-descriptions-item>
        <el-descriptions-item label="通话状态">已接通、未接通、忙线、无人接听等</el-descriptions-item>
        <el-descriptions-item label="通话方式">工作手机 / 系统VoIP线路 / SIP线路</el-descriptions-item>
        <el-descriptions-item label="录音回放">如已开启录音，可在通话记录中直接播放录音</el-descriptions-item>
        <el-descriptions-item label="通话备注">通话结束后可添加跟进备注</el-descriptions-item>
        <el-descriptions-item label="关联客户">通话记录自动关联到对应客户的跟进记录中</el-descriptions-item>
      </el-descriptions>

      <h3>筛选与搜索</h3>
      <p>通话记录支持多维度筛选：</p>
      <ul>
        <li>按时间范围筛选</li>
        <li>按通话状态筛选（已接通/未接通）</li>
        <li>按通话方式筛选</li>
        <li>按客户姓名或号码搜索</li>
        <li>按员工筛选（管理员可查看所有员工）</li>
      </ul>
    </section>

    <!-- 十、通话录音支持 -->
    <section id="recording-support">
      <h2>十、通话录音支持</h2>
      <p>通话录音是销售管理、质量监控和培训的重要工具。系统支持多种外呼方式的自动录音功能。</p>

      <el-alert type="success" :closable="false" style="margin-bottom: 15px">
        <template #title>
          <strong>所有外呼方式均已支持自动录音</strong>：系统会在通话开始时自动启动录音，通话结束后自动上传至服务器，无需手动操作。
        </template>
      </el-alert>

      <h3>10.1 各外呼方式录音支持情况</h3>
      <el-table :data="recordingSupport" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="method" label="外呼方式" width="140" />
        <el-table-column prop="autoRecordText" label="自动录音" width="100" />
        <el-table-column prop="autoUploadText" label="自动上传" width="100" />
        <el-table-column prop="recordingSource" label="录音来源" width="150" />
        <el-table-column prop="description" label="说明" />
      </el-table>

      <h3>10.2 工作手机录音</h3>
      <div class="info-box">
        <h4>🎙️ 录音原理</h4>
        <p>工作手机通过"外呼助手"APP调用系统原生通话录音功能，在通话开始时自动录音，通话结束后自动扫描录音文件并上传至CRM服务器。</p>
        <h4>✅ 支持的手机品牌</h4>
        <ul>
          <li><strong>小米 / Redmi</strong>：录音存储目录 MIUI &gt; sound_recorder &gt; call_rec</li>
          <li><strong>华为 / 荣耀</strong>：录音存储目录 Sounds &gt; CallRecord</li>
          <li><strong>OPPO / Realme</strong>：录音存储目录 Recordings &gt; Call</li>
          <li><strong>VIVO / iQOO</strong>：录音存储目录 Record &gt; Call</li>
          <li><strong>三星</strong>：录音存储目录 Call</li>
          <li><strong>其他Android</strong>：自动扫描常见录音目录</li>
        </ul>
        <h4>⚠️ 注意事项</h4>
        <ul>
          <li>首次使用需在手机上开启系统通话录音功能（APP会自动引导）</li>
          <li>需授予APP存储权限和录音权限</li>
          <li>iOS设备因系统限制，通话录音功能受限</li>
        </ul>
      </div>

      <h3>10.3 VoIP网络电话录音</h3>
      <div class="info-box">
        <h4>🎙️ 录音原理</h4>
        <p>VoIP通话录音由云通信服务商在服务端自动完成，录音文件存储在服务商的云存储中，系统通过回调自动获取录音文件并关联到通话记录。</p>
        <h4>✅ 各服务商录音支持</h4>
        <ul>
          <li><strong>阿里云通信</strong>：支持服务端自动录音，录音存储于OSS，通话结束后自动回调通知CRM获取录音</li>
          <li><strong>腾讯云通信</strong>：支持服务端录音，录音存储于COS，通过事件回调自动同步</li>
          <li><strong>华为云通信</strong>：支持录音，录音存储于OBS，支持回调获取</li>
        </ul>
        <h4>🔧 开启方法</h4>
        <div class="step-list">
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-desc">
              <strong>服务商控制台开启录音</strong>
              <p>在云通信服务商的控制台中，开启语音通话录音功能（部分需签约或额外付费）</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-desc">
              <strong>配置录音回调地址</strong>
              <p>在服务商控制台配置通话状态回调URL，指向CRM系统的回调接口</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-desc">
              <strong>CRM系统启用录音</strong>
              <p>在呼出配置 → 网络电话配置中，勾选"启用录音"选项</p>
            </div>
          </div>
        </div>
      </div>

      <h3>10.4 SIP线路录音</h3>
      <div class="info-box">
        <h4>🎙️ 录音原理</h4>
        <p>SIP线路通话录音通过SIP服务器端的媒体录制功能实现，录音在SIP中继服务器或IP-PBX上完成。</p>
        <h4>✅ 录音方式</h4>
        <ul>
          <li><strong>服务端录音</strong>：SIP中继服务器或IP-PBX自带录音功能，通话自动录音并存储，CRM通过API定期拉取录音文件</li>
          <li><strong>媒体流录音</strong>：CRM系统通过RTP媒体流捕获实现录音（需服务器支持媒体转发）</li>
        </ul>
        <h4>🔧 配置要求</h4>
        <ul>
          <li>SIP服务器需支持录音功能（如FreeSWITCH、Asterisk等）</li>
          <li>在SIP服务器上配置自动录音规则</li>
          <li>配置录音文件同步接口，使CRM可获取录音文件</li>
        </ul>
      </div>

      <h3>10.5 PSTN网关录音</h3>
      <div class="info-box">
        <h4>🎙️ 录音原理</h4>
        <p>PSTN网关录音在语音网关设备或IP-PBX上完成，通话信号经过网关时自动录制。</p>
        <h4>✅ 录音方式</h4>
        <ul>
          <li><strong>网关内置录音</strong>：部分语音网关自带录音功能，通话自动存储到本地或NAS</li>
          <li><strong>IP-PBX录音</strong>：通过IP-PBX（如Asterisk、FreeSWITCH）的录音模块实现</li>
          <li><strong>外挂录音</strong>：使用专业录音设备或软件对通话线路进行旁路录音</li>
        </ul>
        <h4>🔧 配置要求</h4>
        <ul>
          <li>语音网关或IP-PBX需支持录音功能</li>
          <li>配置录音文件存储路径和自动清理策略</li>
          <li>配置FTP/API同步，使CRM定期拉取录音文件并关联通话记录</li>
        </ul>
      </div>

      <h3>10.6 录音管理</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="录音播放">在通话记录列表中，点击录音图标即可在线播放（支持MP3、AMR、WAV、M4A格式）</el-descriptions-item>
        <el-descriptions-item label="录音下载">支持单条录音下载和批量导出</el-descriptions-item>
        <el-descriptions-item label="录音存储">录音文件存储在服务器本地或对象存储中，可配置自动清理策略</el-descriptions-item>
        <el-descriptions-item label="录音权限">管理员可查看所有录音，部门经理可查看本部门录音，销售员仅查看自己的录音</el-descriptions-item>
        <el-descriptions-item label="自动关联">录音自动关联到对应的通话记录和客户跟进记录</el-descriptions-item>
      </el-descriptions>
    </section>

    <!-- 十一、外呼任务管理 -->
    <section id="outbound-tasks">
      <h2>十一、外呼任务管理</h2>
      <p>外呼任务功能允许管理员创建批量拨打任务，提升团队外呼效率。</p>

      <h3>11.1 创建外呼任务</h3>
      <ul>
        <li>设置任务名称和描述</li>
        <li>导入待拨打的客户列表</li>
        <li>分配给指定的销售人员</li>
        <li>设置拨打时间段和优先级</li>
      </ul>

      <h3>11.2 执行外呼任务</h3>
      <ul>
        <li>员工在"我的外呼任务"中查看待拨打列表</li>
        <li>逐个点击拨打，系统自动记录通话结果</li>
        <li>通话结束后填写跟进备注</li>
        <li>标记客户意向等级</li>
      </ul>

      <h3>11.3 任务统计</h3>
      <ul>
        <li>查看任务完成进度</li>
        <li>统计接通率、平均通话时长</li>
        <li>导出任务执行报告</li>
      </ul>
    </section>

    <!-- 十二、常见问题 -->
    <section id="faq">
      <h2>十二、常见问题</h2>

      <el-collapse>
        <el-collapse-item title="Q1: 工作手机扫码后一直显示等待扫码怎么办" name="1">
          <p><strong>A：</strong></p>
          <ul>
            <li>确认手机APP已更新到最新版本</li>
            <li>确认手机网络连接正常</li>
            <li>尝试关闭APP重新打开</li>
            <li>如果二维码已过期(60秒)，点击「重新生成」获取新二维码</li>
            <li>检查手机是否开启了APP的通知权限和后台运行权限</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q2: 线路测试失败怎么处理" name="2">
          <p><strong>A：</strong></p>
          <ul>
            <li>检查服务商控制台中的服务是否已开通且正常</li>
            <li>确认AccessKey/SecretKey等密钥信息填写正确</li>
            <li>检查账户是否有足够余额</li>
            <li>确认主叫号码是否已通过审核</li>
            <li>查看服务商控制台的调用日志排查错误原因</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q3: 拨打电话时提示无可用线路" name="3">
          <p><strong>A：</strong></p>
          <ul>
            <li>普通员工：联系管理员分配外呼线路</li>
            <li>管理员：检查是否已创建并启用线路，线路是否已分配给员工</li>
            <li>检查线路是否已达到日限额</li>
            <li>检查线路状态是否正常</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q4: 通话没有录音怎么办" name="4">
          <p><strong>A：</strong></p>
          <ul>
            <li>VoIP线路：检查是否在网络电话配置中开启了「启用录音」</li>
            <li>工作手机：确认APP已授予录音权限</li>
            <li>部分服务商需要单独开通录音功能并配置录音存储桶</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q5: 如何降低外呼成本" name="5">
          <p><strong>A：</strong></p>
          <ul>
            <li>VoIP线路通常比传统电话线路费用更低</li>
            <li>合理设置日呼叫限额，避免无效呼叫</li>
            <li>使用工作手机绑定不限时套餐的SIM卡</li>
            <li>多比较各服务商(阿里云/腾讯云/华为云)的报价</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q6: 管理员看不到系统线路管理标签页" name="6">
          <p><strong>A：</strong></p>
          <ul>
            <li>确认当前登录账号的角色是管理员或超级管理员</li>
            <li>普通销售员和客服角色无法看到管理员配置标签页</li>
            <li>如需提升权限，请联系超级管理员在用户管理中修改角色</li>
          </ul>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
// VoIP服务商对比数据
const voipProviders = [
  { provider: '阿里云通信', feature: '国内领先，稳定性高，支持录音存储', price: '约0.1元/分钟', apply: '阿里云控制台 → 语音服务' },
  { provider: '腾讯云通信', feature: '集成腾讯生态，支持多种通话模式', price: '约0.1元/分钟', apply: '腾讯云控制台 → 语音消息' },
  { provider: '华为云通信', feature: '政企客户首选，安全合规性高', price: '约0.08元/分钟', apply: '华为云控制台 → 语音通话' },
]

// 各外呼方式录音支持情况
const recordingSupport = [
  {
    method: '📱 工作手机',
    autoRecordText: '✅ 支持',
    autoUploadText: '✅ 支持',
    recordingSource: 'APP系统录音',
    description: '通过外呼助手APP调用手机系统通话录音，通话结束后自动扫描并上传至CRM服务器。支持小米、华为、OPPO、VIVO等主流品牌。'
  },
  {
    method: '🌐 VoIP网络电话',
    autoRecordText: '✅ 支持',
    autoUploadText: '✅ 支持',
    recordingSource: '云服务商服务端录音',
    description: '由阿里云/腾讯云/华为云在服务端自动录音，通话结束后通过回调自动同步录音文件到CRM。需在服务商控制台和CRM中同时启用录音。'
  },
  {
    method: '📡 SIP线路',
    autoRecordText: '✅ 支持',
    autoUploadText: '✅ 支持',
    recordingSource: 'SIP服务器录音',
    description: '通过SIP中继服务器或IP-PBX的录音模块自动录制，录音文件通过API同步到CRM。需SIP服务器支持录音功能（如FreeSWITCH等）。'
  },
  {
    method: '☎️ PSTN网关',
    autoRecordText: '✅ 支持',
    autoUploadText: '✅ 支持',
    recordingSource: '网关或PBX录音',
    description: '通过语音网关或IP-PBX内置录音功能自动录制，录音文件通过FTP或API定期同步到CRM。需网关设备支持录音功能。'
  },
]

// 滚动到指定位置
const scrollTo = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
.help-content {
  line-height: 1.8;
  color: #333;
}

.help-content h1 {
  font-size: 28px;
  color: #1a1a1a;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #409eff;
}

.help-content h2 {
  font-size: 20px;
  color: #303133;
  margin: 35px 0 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.help-content h3 {
  font-size: 16px;
  color: #409eff;
  margin: 25px 0 10px;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 15px 0 8px;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ul,
.help-content ol {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 8px 0;
  color: #606266;
}

section {
  margin-bottom: 40px;
}

/* 目录导航 */
.toc-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toc-item {
  padding: 8px 16px;
  background: #f0f7ff;
  border: 1px solid #d4e8ff;
  border-radius: 6px;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toc-item:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

/* 特性网格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin: 15px 0;
}

.feature-card {
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
}

.feature-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.feature-card h4 {
  margin: 8px 0;
  color: #303133;
}

.feature-card p {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

/* 信息框 */
.info-box {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px 20px;
  margin: 12px 0;
}

.info-box h4 {
  margin-top: 10px;
}

.info-box h4:first-child {
  margin-top: 0;
}

/* 步骤列表 */
.step-list {
  margin: 15px 0;
}

.step-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 8px;
  border-left: 3px solid #409eff;
}

.step-num {
  width: 28px;
  height: 28px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  margin-right: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

.step-desc {
  flex: 1;
}

.step-desc strong {
  color: #303133;
  font-size: 15px;
}

.step-desc p {
  margin: 4px 0;
  color: #606266;
  font-size: 14px;
}

.step-desc ul {
  margin: 6px 0;
  padding-left: 18px;
}

.step-desc li {
  margin: 4px 0;
  font-size: 14px;
}

/* 折叠面板 */
:deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #303133;
  font-size: 15px;
}

:deep(.el-collapse-item__content) {
  color: #606266;
  line-height: 1.8;
}

:deep(.el-descriptions) {
  margin: 10px 0;
}
</style>

