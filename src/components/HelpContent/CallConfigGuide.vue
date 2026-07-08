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
        <div class="toc-item" @click="scrollTo('inbound-call')">十二、呼入功能与来电弹窗</div>
        <div class="toc-item" @click="scrollTo('sip-pbx')">十三、SIP/PBX 呼入对接</div>
        <div class="toc-item" @click="scrollTo('agent-status')">十四、坐席状态管理</div>
        <div class="toc-item" @click="scrollTo('faq')">十五、常见问题</div>
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
          <p>对接阿里云云联络中心（CCC），支持双呼、软电话、硬话机三种外呼方式</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📡</div>
          <h4>SIP线路（预留）</h4>
          <p>预留对接企业SIP中继的配置能力，需自建软交换后二次开发打通</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">☎️</div>
          <h4>PSTN网关（预留）</h4>
          <p>预留传统语音网关的配置能力，支持模拟/数字中继参数录入</p>
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

      <h3>2.2 网络电话(VoIP)外呼 —— 阿里云云联络中心</h3>
      <p>系统对接<strong>阿里云云联络中心（CCC，Cloud Call Center）</strong>发起真实外呼。每个租户使用自己申请的实例和号码，配置互相独立、数据严格隔离。支持三种外呼方式，在「网络电话配置」中三选一，选了哪种就按哪种生效：</p>
      <el-table :data="cccCallModes" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="mode" label="外呼方式" width="140" />
        <el-table-column prop="device" label="所需设备" width="180" />
        <el-table-column prop="flow" label="呼叫流程" />
        <el-table-column prop="scene" label="适用场景" width="180" />
      </el-table>
      <div class="info-box">
        <h4>📞 三种方式说明</h4>
        <ul>
          <li><strong>双呼（免设备）</strong>：员工点外呼后，系统先呼叫员工的"员工号码"（在号码分配中填写的工作手机/座机），员工接听后系统自动呼叫客户。客户看到的来电显示是分配的"主叫号码"（企业固话）。无需任何额外设备，<strong>推荐大多数场景使用</strong>。</li>
          <li><strong>软电话（网页）</strong>：员工登录阿里云坐席工作台（网页），用电脑耳麦或USB话务盒通话。点外呼后工作台先振铃，接听后呼叫客户。需在「号码分配」中为员工绑定云联络中心的坐席账号。</li>
          <li><strong>硬话机（SIP）</strong>：SIP话机通过网线/WiFi注册到云联络中心（在坐席工作台绑定话机），点外呼后话机先振铃，接听后呼叫客户。同样需绑定坐席账号。</li>
        </ul>
        <h4>✅ 功能支持</h4>
        <ul>
          <li>外呼、呼入来电弹窗、CRM内接听/拒接（软电话模式）</li>
          <li>坐席就绪/忙碌状态与云联络中心在线状态同步</li>
          <li>通话结束自动拉取云端录音并永久存储到CRM，通话记录内直接播放</li>
          <li>从实例动态拉取号码池、坐席列表和分机号</li>
        </ul>
      </div>

      <h3>2.3 SIP线路外呼（预留能力）</h3>
      <el-alert type="warning" :closable="false" style="margin-bottom: 10px">
        <template #title>SIP/PSTN 自定义线路目前仅支持配置保存与连通性测试，不能直接发起真实呼叫，需自建软交换（如 FreeSWITCH）并二次开发对接。真实外呼请使用阿里云云联络中心。</template>
      </el-alert>
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

      <h3>2.4 PSTN网关外呼（预留能力）</h3>
      <p>通过传统电话网关（如语音网关、IP-PBX）发起呼叫，适合使用传统固话线路的企业。同SIP线路，此能力为配置预留，真实拨打需二次开发对接。</p>
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
              <li><strong>服务商</strong>：阿里云云联络中心 / 自定义（SIP/PSTN网关）</li>
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
              <li><strong>阿里云云联络中心</strong>：AccessKey ID、AccessKey Secret、实例ID。<strong>留空时自动使用「网络电话配置」中保存的全局配置</strong>，通常只需填主叫号码即可</li>
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
      <p>网络电话配置用于对接<strong>阿里云云联络中心（CCC）</strong>。每个租户（企业）使用自己申请的实例、AccessKey 和号码，配置互相独立，密钥加密存储。</p>

      <h3>4.1 阿里云侧准备工作</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>开通云联络中心并创建实例</strong>
            <p>访问 <strong>阿里云控制台 → 云联络中心（CCC）</strong>，开通服务并创建实例。记下实例ID（如 <code>ccc-xxxx</code> 或 <code>demo-xxxxxxxx</code>，注意是实例ID不是实例名称）</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>购买固话号码并绑定到实例</strong>
            <p>在云联络中心控制台的「号码管理」中购买号码（需企业资质审核），并绑定到实例。此号码就是客户看到的来电显示</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>创建RAM用户并授权</strong>
            <p>在 <strong>阿里云 → 访问控制（RAM）</strong> 中创建RAM用户，勾选"OpenAPI调用访问"，创建后保存 AccessKey ID 和 AccessKey Secret，并为该用户授权 <code>AliyunCCCFullAccess</code> 权限策略</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>将RAM用户添加为实例成员（重要）</strong>
            <p>回到云联络中心控制台，进入实例的「坐席管理」，把上一步的RAM账号添加为<strong>管理员</strong>角色。不加入实例会导致获取号码/坐席时报 <code>NotExists.UserId</code> 错误</p>
          </div>
        </div>
      </div>

      <h3>4.2 CRM侧配置步骤</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>打开配置页</strong>
            <p>呼出配置 → 网络电话配置 标签页，服务商为"阿里云云联络中心"</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>选择外呼方式（三选一）</strong>
            <p><strong>双呼（免设备）</strong> / <strong>软电话（网页）</strong> / <strong>硬话机（SIP）</strong>。选了哪种，员工外呼时就按哪种方式生效。软电话/硬话机模式下可点击"打开坐席工作台"让员工登录接听</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>填写 AccessKey ID 和 AccessKey Secret</strong>
            <p>填入RAM用户的密钥。保存后 Secret 以掩码（********）显示，不修改时无需重填，直接保存会保留原密钥</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>获取实例ID</strong>
            <p>填好密钥后点击 <el-tag size="small">获取实例</el-tag> 按钮，自动拉取账号下的实例列表下拉选择；也支持手动输入。没有实例时请先到阿里云控制台创建</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-desc">
            <strong>获取号码池</strong>
            <p>点击 <el-tag size="small">获取号码</el-tag> 自动拉取实例下已购买的号码，支持多选绑定为系统号码池；保存后可在「号码分配」中把号码分给指定成员，实现一人一号独占外显</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">6</div>
          <div class="step-desc">
            <strong>设置默认主叫号码、服务区域、录音</strong>
            <ul>
              <li><strong>默认主叫号码</strong>：兜底号码，成员没有被分配专属号码时外呼显示此号码</li>
              <li><strong>服务区域</strong>：建议保持默认"华东2（上海）"，云联络中心API统一接入该区域</li>
              <li><strong>启用录音</strong>：开启后通话结束自动拉取云端录音并永久保存到CRM（需实例侧也开启录音）</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">7</div>
          <div class="step-desc">
            <strong>测试连接并保存</strong>
            <p>点击"测试连接"验证密钥和实例（真实调用阿里云接口）；点击"保存配置"后系统会<strong>自动创建一条"阿里云云联络中心"线路</strong>，无需手动建线路，直接去「号码分配」分配即可</p>
          </div>
        </div>
      </div>

      <h3>4.3 配置安全与保存机制</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="租户隔离">SaaS部署下每个租户的配置、线路、号码、通话记录完全隔离，呼入呼出不会串到其他租户</el-descriptions-item>
        <el-descriptions-item label="密钥加密">AccessKey Secret 使用 AES-256 加密存储，前端仅显示掩码，任何接口不回传明文</el-descriptions-item>
        <el-descriptions-item label="防误清空">保存时空字段不会覆盖已保存的值。例如只切换"外呼方式"直接保存，已填的密钥、实例、号码池都会原样保留</el-descriptions-item>
        <el-descriptions-item label="配置回显">重新打开配置页会自动加载已保存的配置；加载失败时会弹出提示，而不是静默显示空表单</el-descriptions-item>
      </el-descriptions>

      <h3>4.4 常见报错与处理</h3>
      <el-table :data="aliyunErrorList" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="error" label="报错" width="260" />
        <el-table-column prop="reason" label="原因" />
        <el-table-column prop="solution" label="处理方法" />
      </el-table>

      <h3>4.5 呼入与IVR注意事项</h3>
      <div class="info-box">
        <h4>📥 客户回拨固话号码时</h4>
        <p>来电先进入阿里云侧绑定的 <strong>IVR联系流程</strong>（语音导航），再转到坐席。如果IVR配置了"输入分机号"：</p>
        <ul>
          <li>员工的分机号显示在CRM通话管理页头部（软电话分机 / SIP分机）</li>
          <li>IVR收号组件的<strong>最大收号位数</strong>要和分机号实际位数一致，否则会输不完就被挂断</li>
          <li>建议把<strong>结束符</strong>设为 <code>#</code>、收号超时加长到10秒</li>
          <li>不需要分机转接时，可把号码直接绑定到<strong>技能组</strong>流程，来电直接振铃到就绪的坐席</li>
        </ul>
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
            <strong>填写分配信息</strong>
            <ul>
              <li><strong>选择用户</strong>：从下拉列表中选择目标销售人员</li>
              <li><strong>选择线路</strong>：选择要分配的外呼线路（仅显示已启用的线路）</li>
              <li><strong>主叫号码</strong>：从号码池选择该员工的专属外显号码，也可手动输入。<strong>号码独占</strong>：一个号码只能分配给一个成员，已被占用的号码在下拉中置灰不可选</li>
              <li><strong>员工号码</strong>：双呼模式下系统先呼叫此号码（员工的工作手机/座机）。留空则使用员工个人资料中的手机号；个人手机是私人号码时请在此填写工作号码</li>
              <li><strong>坐席账号</strong>：软电话/硬话机模式使用。点「获取坐席」拉取云联络中心的坐席列表并绑定，绑定后自动获取该坐席的软电话分机号和SIP分机号，显示在员工的通话管理页头部</li>
              <li><strong>日呼叫限额</strong>：设置该用户每日最大呼叫次数（默认100次）</li>
              <li><strong>设为默认</strong>：是否设为该用户的默认外呼线路</li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-desc">
            <strong>确定分配</strong>
            <p>点击"确定分配"完成操作，用户即可在外呼时使用该线路和专属号码</p>
          </div>
        </div>
      </div>

      <h3>5.2 管理分配</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="搜索">支持按员工姓名、主叫号码、员工号码、线路名称模糊搜索</el-descriptions-item>
        <el-descriptions-item label="分页">列表默认每页6条，底部分页器显示总数并支持翻页</el-descriptions-item>
        <el-descriptions-item label="编辑">点击"编辑"可修改该分配的线路、主叫号码、员工号码、坐席账号、日限额、默认标记（用户不可改，如需换人请取消后重新分配）；换号码时同样做独占校验</el-descriptions-item>
        <el-descriptions-item label="禁用">点击"禁用"后该员工立即看不到此线路和号码，号码释放为可分配状态，其他成员可以使用</el-descriptions-item>
        <el-descriptions-item label="启用">点击"启用"恢复该分配；启用时会校验号码是否已被其他成员占用，被占用则无法启用</el-descriptions-item>
        <el-descriptions-item label="取消">点击"取消"彻底删除该分配记录，号码释放</el-descriptions-item>
      </el-descriptions>

      <el-alert type="info" :closable="false" style="margin-top: 12px">
        <template #title>
          <strong>号码独占规则</strong>：一个主叫号码同一时间只能被一个成员的"启用中"分配占用。取消分配或禁用分配后号码自动释放，可再分配给其他成员。
        </template>
      </el-alert>
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

      <h3>10.3 VoIP网络电话录音（阿里云云联络中心）</h3>
      <div class="info-box">
        <h4>🎙️ 录音原理</h4>
        <p>录音由阿里云云联络中心在服务端自动完成。通话结束后，CRM轮询通话详情获取录音地址，<strong>自动把录音文件下载到CRM服务器永久存储</strong>（阿里云的临时录音链接仅1天有效，下载后不受影响），并关联到通话记录，可直接在线播放。</p>
        <h4>🔧 开启方法</h4>
        <div class="step-list">
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-desc">
              <strong>实例侧开启录音</strong>
              <p>在阿里云云联络中心控制台的实例设置中开启通话录音</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-desc">
              <strong>CRM侧启用录音</strong>
              <p>在呼出配置 → 网络电话配置中，打开"启用录音"开关并保存</p>
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

    <!-- 十二、呼入功能与来电弹窗 -->
    <section id="inbound-call">
      <h2>十二、呼入功能与来电弹窗</h2>
      <el-alert type="success" :closable="false" style="margin-bottom: 15px">
        <template #title>系统支持多种呼入场景：SIP/PBX呼入、工作手机来电、APP侧来电检测。当有客户来电时，系统自动匹配客户信息并在前端弹窗显示。</template>
      </el-alert>

      <h3>12.1 呼入场景总览</h3>
      <el-table :data="inboundScenarios" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="scenario" label="呼入场景" width="160" />
        <el-table-column prop="trigger" label="触发方式" width="220" />
        <el-table-column prop="description" label="说明" />
      </el-table>

      <h3>12.2 来电弹窗功能</h3>
      <p>当有来电时，CRM前端会弹出来电通知窗口，包含以下信息：</p>
      <div class="info-box">
        <h4>📞 来电弹窗内容</h4>
        <ul>
          <li><strong>主叫号码</strong>：客户电话号码</li>
          <li><strong>客户信息</strong>：自动匹配的客户姓名、公司、等级、标签</li>
          <li><strong>历史通话</strong>：上次通话时间</li>
          <li><strong>来电源</strong>：SIP线路 / 工作手机 / 网络电话</li>
          <li><strong>操作按钮</strong>：接听 / 拒绝</li>
        </ul>
        <h4>⚠️ 来电匹配规则</h4>
        <ul>
          <li>系统根据主叫号码自动查找客户表的 <strong>phone</strong> 和 <strong>mobile</strong> 字段</li>
          <li>匹配到客户时，显示客户详细信息，可一键跳转客户详情页</li>
          <li>未匹配时显示“未知来电”，可手动关联客户</li>
        </ul>
      </div>

      <h3>12.3 呼入来电分配策略</h3>
      <p>当收到来电时，系统按以下优先级分配坐席（从低到高）：</p>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>呼入路由匹配</strong>
            <p>根据被叫号码（DID）在 <strong>呼入路由表</strong> 中查找配置的目标坐席</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>线路分配匹配</strong>
            <p>根据被叫号码在 <strong>线路分配</strong> 中查找对应坐席</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>客户专属销售 ← 最高优先级</strong>
            <p>如果来电客户有专属销售，最终会覆盖前两步的分配结果</p>
          </div>
        </div>
      </div>

      <h3>12.4 呼入通话记录</h3>
      <p>所有呼入通话自动记录，包含：</p>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="呼叫方向">入站（in），区别于外呼的 out</el-descriptions-item>
        <el-descriptions-item label="呼入来源">SIP分机 / 工作手机 / 网络电话 / PBX系统</el-descriptions-item>
        <el-descriptions-item label="振铃时长">从来电到接听的等待时间（秒）</el-descriptions-item>
        <el-descriptions-item label="排队时长">呼入队列等待时间（秒）</el-descriptions-item>
        <el-descriptions-item label="转接信息">转接来源坐席 / 转接目标坐席</el-descriptions-item>
        <el-descriptions-item label="呼入路由">关联的呼入路由配置名称</el-descriptions-item>
      </el-descriptions>
    </section>

    <!-- 十三、SIP/PBX 呼入对接 -->
    <section id="sip-pbx">
      <h2>十三、SIP/PBX 呼入对接</h2>
      <el-alert type="warning" :closable="false" style="margin-bottom: 15px">
        <template #title>此功能面向系统管理员和运维人员。需要在PBX/SIP系统和CRM两侧同时配置。</template>
      </el-alert>

      <h3>13.1 对接架构</h3>
      <div class="info-box">
        <h4>📡 呼入数据流</h4>
        <p>外线来电 → PBX/SIP网关 → <strong>Webhook POST</strong> → CRM后端 → <strong>WebSocket</strong> → CRM前端弹窗</p>
        <h4>接口地址</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="呼入通知">POST {CRM地址}/api/v1/calls/webhook/sip/incoming</el-descriptions-item>
          <el-descriptions-item label="状态更新">POST {CRM地址}/api/v1/calls/webhook/sip/status</el-descriptions-item>
          <el-descriptions-item label="测试接口">POST {CRM地址}/api/v1/calls/webhook/test</el-descriptions-item>
        </el-descriptions>
      </div>

      <h3>13.2 安全配置（Webhook密钥）</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>配置环境变量</strong>
            <p>在CRM后端 <code>.env</code> 文件中添加：<code>SIP_WEBHOOK_SECRET=你的密钥</code></p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>PBX侧携带密钥</strong>
            <p>支持两种方式（任选其一）：</p>
            <ul>
              <li><strong>HTTP Header</strong>：<code>X-Webhook-Secret: 你的密钥</code>（推荐）</li>
              <li><strong>请求体字段</strong>：<code>"secret": "你的密钥"</code></li>
            </ul>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>开发模式</strong>
            <p>如果未设置 <code>SIP_WEBHOOK_SECRET</code> 环境变量，系统会跳过密钥验证，方便开发调试</p>
          </div>
        </div>
      </div>

      <h3>13.3 呼入通知接口参数</h3>
      <el-table :data="sipIncomingParams" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="field" label="字段" width="150" />
        <el-table-column prop="required" label="必填" width="70" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="example" label="示例" width="200" />
      </el-table>

      <h3>13.4 状态更新接口参数</h3>
      <el-table :data="sipStatusParams" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="field" label="字段" width="150" />
        <el-table-column prop="required" label="必填" width="70" />
        <el-table-column prop="description" label="说明" />
      </el-table>

      <h3>13.5 状态事件映射</h3>
      <el-table :data="sipEventMapping" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="event" label="PBX事件" width="120" />
        <el-table-column prop="crmStatus" label="CRM状态" width="120" />
        <el-table-column prop="description" label="说明" />
      </el-table>

      <h3>13.6 PBX配置示例</h3>
      <el-collapse>
        <el-collapse-item title="FreePBX 配置方法" name="freepbx">
          <div class="info-box">
            <h4>AGI 脚本方式</h4>
            <p>1. 创建 AGI 脚本 <code>/var/lib/asterisk/agi-bin/crm_webhook.sh</code>，在脚本中使用 <code>curl</code> 调用 CRM 的 <code>/sip/incoming</code> 接口</p>
            <p>2. 设置脚本权限：<code>chmod +x</code> 并将 owner 设为 asterisk</p>
            <p>3. 在 FreePBX 入站路由中添加自定义拨号计划，调用此 AGI 脚本</p>
          </div>
        </el-collapse-item>

        <el-collapse-item title="Asterisk 原生配置" name="asterisk">
          <div class="info-box">
            <h4>extensions.conf 配置</h4>
            <p>1. 在 <code>[incoming]</code> context 中使用 <code>CURL()</code> 函数调用 CRM Webhook</p>
            <p>2. 在 <code>exten => h</code> （hangup handler）中调用 <code>/sip/status</code> 接口通知挂断</p>
            <p>3. 需要加载 <code>func_curl.so</code> 模块</p>
          </div>
        </el-collapse-item>

        <el-collapse-item title="FusionPBX 配置方法" name="fusionpbx">
          <div class="info-box">
            <h4>Lua 脚本方式</h4>
            <p>1. 创建 Lua 脚本 <code>/usr/share/freeswitch/scripts/crm_incoming.lua</code></p>
            <p>2. 在脚本中使用 <code>os.execute</code> + <code>curl</code> 调用 CRM Webhook</p>
            <p>3. 在 FusionPBX 管理面板 → Dialplan → Inbound Routes 中添加 lua action</p>
          </div>
        </el-collapse-item>

        <el-collapse-item title="其他PBX系统（3CX、Yeastar等）" name="other">
          <div class="info-box">
            <p>如果PBX支持自定义HTTP Webhook回调，直接配置：</p>
            <ul>
              <li><strong>URL</strong>：CRM的 <code>/api/v1/calls/webhook/sip/incoming</code></li>
              <li><strong>Method</strong>：POST</li>
              <li><strong>Headers</strong>：<code>Content-Type: application/json</code>, <code>X-Webhook-Secret: 你的密钥</code></li>
              <li><strong>Body</strong>：按照上述参数格式映射PBX字段即可</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>

      <h3>13.7 呼入路由配置</h3>
      <div class="info-box">
        <h4>🛣️ 呼入路由说明</h4>
        <p>管理员可在数据库 <code>inbound_routes</code> 表中配置 DID 号码到坐席的映射规则。</p>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="直接分配 (direct)">指定 DID 号码直接转接给某个坐席</el-descriptions-item>
          <el-descriptions-item label="排队分配 (queue)">来电进入队列，按策略分配（轮询/最少通话/随机/优先级）</el-descriptions-item>
          <el-descriptions-item label="振铃组 (ring_group)">多个坐席同时振铃，先接听的获得通话</el-descriptions-item>
          <el-descriptions-item label="IVR转接 (ivr)">通过IVR语音菜单引导客户选择服务</el-descriptions-item>
        </el-descriptions>
        <h4>⚙️ 溢出策略</h4>
        <p>当所有坐席忙碌或超时未接听时：</p>
        <ul>
          <li><strong>语音留言</strong>：转入留言信箱</li>
          <li><strong>转接</strong>：转接到其他号码或坐席</li>
          <li><strong>挂断</strong>：直接挂断通话</li>
        </ul>
      </div>

      <h3>13.8 对接验证清单</h3>
      <el-table :data="sipChecklist" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="step" label="步骤" width="60" />
        <el-table-column prop="action" label="操作" width="220" />
        <el-table-column prop="expected" label="预期结果" />
      </el-table>
    </section>

    <!-- 十四、坐席状态管理 -->
    <section id="agent-status">
      <h2>十四、坐席状态管理</h2>
      <el-alert type="info" :closable="false" style="margin-bottom: 15px">
        <template #title>坐席状态决定了您是否会收到来电通知。切换为“忙碌”状态后，呼入电话将不会分配给您。</template>
      </el-alert>

      <h3>14.1 状态说明</h3>
      <el-table :data="agentStatusList" stripe style="width: 100%; margin: 10px 0" border>
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="label" label="显示" width="100" />
        <el-table-column prop="effect" label="效果" />
      </el-table>

      <h3>14.2 切换坐席状态</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-desc">
            <strong>打开通话管理页面</strong>
            <p>进入 服务管理 → 通话管理</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-desc">
            <strong>点击状态切换按钮</strong>
            <p>页面顶部显示当前坐席状态，点击即可在「就绪」和「忙碌」之间切换</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-desc">
            <strong>状态自动同步</strong>
            <p>状态变更会实时同步到后端数据库，并通过WebSocket广播给管理后台</p>
          </div>
        </div>
      </div>

      <h3>14.3 管理员坐席监控</h3>
      <div class="info-box">
        <h4>📊 坐席列表</h4>
        <p>管理员和超级管理员可查看所有坐席的实时状态：</p>
        <ul>
          <li>坐席姓名、当前状态、状态变更时间</li>
          <li>实时更新（通过WebSocket推送）</li>
          <li>可用于监控团队在线情况和工作负载</li>
        </ul>
      </div>
    </section>

    <!-- 十五、常见问题 -->
    <section id="faq">
      <h2>十五、常见问题</h2>

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
            <li>网络电话：检查CRM「网络电话配置」中是否开启了「启用录音」，以及阿里云实例侧是否开启了通话录音</li>
            <li>工作手机：确认APP已授予录音权限</li>
            <li>录音在通话结束后由系统自动拉取，可能有1-2分钟延迟，稍后刷新通话记录</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q5: 如何降低外呼成本" name="5">
          <p><strong>A：</strong></p>
          <ul>
            <li>VoIP线路通常比传统电话线路费用更低</li>
            <li>合理设置日呼叫限额，避免无效呼叫</li>
            <li>使用工作手机绑定不限时套餐的SIM卡</li>
            <li>关注阿里云云联络中心的套餐与通信费报价，按团队呼叫量选择</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q10: 外呼报错 OutboundCallRestricted（号码被限制）" name="10">
          <p><strong>A：</strong>被叫号码被阿里云外呼策略拦截，不是CRM的问题：</p>
          <ul>
            <li>新开通/资质未报备完成的实例默认开启「外呼白名单」模式，只能呼叫白名单内号码</li>
            <li>临时测试：到云联络中心控制台 → 实例设置 → 外呼白名单，把要测试的号码加进去</li>
            <li>长期方案：完成号码资质审核/实名报备后，申请解除白名单限制</li>
            <li>另外检查该号码是否在阿里云 DoNotCall 禁呼名单中</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q11: 只想改外呼方式，会不会把已填的配置清掉" name="11">
          <p><strong>A：</strong>不会。保存时空字段不会覆盖已保存的非空值：</p>
          <ul>
            <li>只切换"外呼方式"直接保存，密钥、实例ID、号码池全部保留</li>
            <li>AccessKey Secret 保存后显示为掩码（********），不修改时无需重填</li>
            <li>需要更换密钥时，直接在密钥输入框填入新值再保存即可</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q12: 客户回拨固话，输分机号没输完就被挂断" name="12">
          <p><strong>A：</strong>这是阿里云侧IVR联系流程的收号配置问题：</p>
          <ul>
            <li>到云联络中心控制台编辑该号码绑定的IVR流程，找到收号组件</li>
            <li>把「最大收号位数」改成分机号的实际位数（CRM通话管理页头部显示的"软电话分机"就是要输的号码）</li>
            <li>「结束符」设为 #，收号超时适当加长（如10秒）</li>
            <li>不需要分机转接时，可把号码直接绑定到技能组流程，来电直接振铃到就绪坐席</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q13: 禁用了某个成员的号码分配，会发生什么" name="13">
          <p><strong>A：</strong></p>
          <ul>
            <li>该成员的外呼弹窗中立即看不到这条线路和号码，无法再用它外呼</li>
            <li>号码释放为可分配状态，可以分配给其他成员</li>
            <li>重新启用时系统会校验号码是否已被别人占用，被占用则无法启用</li>
            <li>与"取消"的区别：禁用保留分配记录可随时恢复，取消则彻底删除</li>
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

        <el-collapse-item title="Q7: 来电振铃不显示怎么办" name="7">
          <p><strong>A：</strong></p>
          <ul>
            <li>确认坐席状态为“就绪”，忙碌状态不会接收来电</li>
            <li>检查浏览器是否允许弹窗通知</li>
            <li>确认WebSocket连接正常（页面右下角无异常提示）</li>
            <li>确认PBX/SIP系统已正确配置Webhook地址和密钥</li>
            <li>检查来电号码是否已匹配到客户信息</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q8: PBX调用Webhook返回401/403" name="8">
          <p><strong>A：</strong></p>
          <ul>
            <li><strong>401</strong>：请求中缺少密钥，确认在Header或Body中包含了密钥</li>
            <li><strong>403</strong>：密钥不匹配，检查PBX配置的密钥与CRM后端.env中的SIP_WEBHOOK_SECRET是否一致</li>
            <li>开发环境可能需要临时修改.env中的SIP_WEBHOOK_SECRET以绕过验证</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="Q9: 客户信息显示&quot;未知来电&quot;" name="9">
          <p><strong>A：</strong></p>
          <ul>
            <li>主叫号码未匹配到客户表中的phone或mobile字段</li>
            <li>检查号码格式：确认CRM中存储的号码格式与PBX传递的号码格式一致（是否包含国家码、区号等）</li>
            <li>多租户场景下，确认Webhook请求中包含了正确的tenantCode</li>
          </ul>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
// 阿里云云联络中心三种外呼方式对比
const cccCallModes = [
  { mode: '双呼（免设备）', device: '员工的手机/座机即可', flow: '系统先呼员工号码 → 员工接听 → 自动呼叫客户，客户看到企业固话外显', scene: '大多数场景，推荐' },
  { mode: '软电话（网页）', device: '电脑 + 耳麦/USB话务盒', flow: '员工登录阿里云坐席工作台 → 点外呼工作台振铃 → 接听后呼叫客户', scene: '固定工位呼叫中心' },
  { mode: '硬话机（SIP）', device: 'SIP话机（网线/WiFi）', flow: '话机注册到云联络中心 → 点外呼话机振铃 → 接听后呼叫客户', scene: '习惯实体话机的团队' },
]

// 阿里云常见报错与处理
const aliyunErrorList = [
  {
    error: 'NotExists.InstanceId',
    reason: '实例ID填错，常见于填了实例"名称"而不是实例ID',
    solution: '点击「获取实例」从下拉列表选择正确的实例ID（如 ccc-xxxx）'
  },
  {
    error: 'NotExists.UserId',
    reason: 'AccessKey对应的RAM账号不是该实例的成员',
    solution: '到云联络中心控制台 → 实例 → 坐席管理，把该RAM账号添加为管理员'
  },
  {
    error: 'InvalidAccessKeyId / SignatureDoesNotMatch',
    reason: 'AccessKey ID 或 Secret 填写错误',
    solution: '检查密钥是否复制完整；重新生成密钥后需同步更新CRM配置'
  },
  {
    error: 'InvalidOperation.OutboundCallRestricted',
    reason: '被叫号码被外呼白名单或DoNotCall禁呼名单拦截。新实例/资质未报备完成时默认只能呼叫白名单内号码',
    solution: '到云联络中心控制台 → 实例设置 → 外呼白名单，添加要呼叫的号码测试；长期方案是完成号码资质报备后申请解除白名单限制'
  },
  {
    error: '连接阿里云服务失败（网络波动）',
    reason: '本机/服务器到 aliyuncs.com 的网络不稳定',
    solution: '系统已自动重试，仍失败时检查网络、防火墙或代理设置后重试'
  },
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
    recordingSource: '阿里云云联络中心服务端录音',
    description: '由阿里云云联络中心在服务端自动录音，通话结束后CRM自动下载录音并永久存储（阿里云临时链接仅1天有效），通话记录内直接播放。需在实例侧和CRM「启用录音」同时开启。'
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

// 呼入场景总览
const inboundScenarios = [
  { scenario: 'SIP/PBX 呼入', trigger: 'PBX调用Webhook通知CRM', description: '企业PBX或SIP中继收到外线来电时，通过HTTP Webhook通知CRM系统，CRM自动匹配客户并推送来电弹窗' },
  { scenario: '工作手机来电', trigger: 'APP检测来电→WebSocket通知', description: '外呼助手APP在后台监听来电，检测到来电后通过WebSocket发送INCOMING_CALL_DETECTED消息给CRM' },
  { scenario: 'APP HTTP上报', trigger: 'APP调用HTTP API上报', description: '外呼助手APP通过HTTP接口主动上报来电信息，适用于WebSocket不稳定的场景' },
]

// SIP呼入通知接口参数
const sipIncomingParams = [
  { field: 'callerNumber', required: '是', description: '主叫号码（客户号码）', example: '13800138888' },
  { field: 'calledNumber', required: '是', description: '被叫号码（企业DID号码）', example: '02188888888' },
  { field: 'callId', required: '否', description: 'PBX侧通话唯一ID', example: 'sip-1717430400-abc' },
  { field: 'trunkId', required: '否', description: '中继线路ID', example: 'trunk-001' },
  { field: 'trunkName', required: '否', description: '中继线路名称', example: '主线路' },
  { field: 'tenantCode', required: '否', description: 'SaaS模式下的租户编码', example: 'company-a' },
  { field: 'secret', required: '否', description: 'Webhook验证密钥（如不用Header传递）', example: 'your-secret-key' },
]

// SIP状态更新接口参数
const sipStatusParams = [
  { field: 'callId', required: '是', description: '通话ID（来自呼入通知响应的callId）' },
  { field: 'event', required: '是', description: '事件类型：ringing/answered/hangup/failed/busy/no_answer' },
  { field: 'duration', required: '否', description: '通话时长（秒），hangup事件时传入' },
  { field: 'hangupCause', required: '否', description: '挂断原因，如 normal、busy、cancel 等' },
  { field: 'recordingUrl', required: '否', description: '录音文件URL，PBX有录音时传入' },
  { field: 'ringDuration', required: '否', description: '振铃时长（秒）' },
]

// SIP事件映射
const sipEventMapping = [
  { event: 'ringing', crmStatus: 'ringing', description: '振铃中，来电正在等待接听' },
  { event: 'answered', crmStatus: 'connected', description: '已接听，通话开始' },
  { event: 'hangup', crmStatus: 'connected/missed', description: '挂断。有通话时长记为connected，无时长记为missed' },
  { event: 'failed', crmStatus: 'failed', description: '呼叫失败，网络或线路异常' },
  { event: 'busy', crmStatus: 'busy', description: '忙线，对方正在通话中' },
  { event: 'no_answer', crmStatus: 'missed', description: '无人接听，振铃超时' },
]

// 对接验证清单
const sipChecklist = [
  { step: '1', action: '测试Webhook连通性', expected: '调用 /webhook/test 返回 success: true' },
  { step: '2', action: '模拟SIP呼入通知', expected: '调用 /sip/incoming 返回 callId 和匹配信息' },
  { step: '3', action: '验证密钥认证', expected: '错误密钥返回 403，正确密钥返回 200' },
  { step: '4', action: '验证来电弹窗', expected: 'CRM前端收到WebSocket推送，弹出来电弹窗' },
  { step: '5', action: '模拟接听/挂断', expected: '调用 /sip/status 后通话记录状态和时长更新正确' },
  { step: '6', action: '验证客户匹配', expected: '已有客户来电时弹窗显示客户姓名和公司信息' },
  { step: '7', action: '验证坐席忙碌过滤', expected: '坐席设为忙碌时，来电只记录不弹窗' },
]

// 坐席状态列表
const agentStatusList = [
  { status: 'ready', label: '🟢 就绪', effect: '可以接收来电。系统会将呼入电话分配给处于就绪状态的坐席，并推送来电弹窗通知' },
  { status: 'busy', label: '🟡 忙碌', effect: '暂停接收来电。呼入电话仍会创建通话记录，但不会推送来电弹窗给该坐席' },
  { status: 'offline', label: '⚫ 离线', effect: '不在线。通常在用户登出或长时间未操作时自动设置' },
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

