<template>
  <el-dialog
    v-model="visible"
    title="呼出配置"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 帮助中心跳转链接 - 显示在最前面 -->
    <div class="help-link-bar">
      <el-button type="primary" link class="help-link-btn" @click="goToCallConfigGuide">
        <el-icon class="help-link-icon"><QuestionFilled /></el-icon>
        <span>查看《通话管理与呼出配置完整指南》</span>
        <el-icon class="help-link-arrow"><ArrowRight /></el-icon>
      </el-button>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 管理员配置标签页 (仅管理员可见) -->
      <el-tab-pane v-if="isAdmin" label="系统线路管理" name="lines">
        <div class="config-section">
          <div class="section-header">
            <span class="section-title">外呼线路列表</span>
            <el-button type="primary" size="small" :icon="Plus" @click="openLineDialog()">
              添加线路
            </el-button>
          </div>

          <el-table :data="pagedCallLines" v-loading="linesLoading" style="width: 100%">
            <el-table-column prop="name" label="线路名称" min-width="130" show-overflow-tooltip />
            <el-table-column prop="provider" label="服务商" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ getProviderText(row.provider) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="callerNumber" label="主叫号码" min-width="120" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'active' ? '正常' : '异常' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="isEnabled" label="启用" width="70">
              <template #default="{ row }">
                <el-switch v-model="row.isEnabled" size="small" @change="toggleLineStatus(row)" />
              </template>
            </el-table-column>
            <el-table-column prop="dailyUsed" label="今日使用" width="100">
              <template #default="{ row }">
                {{ row.dailyUsed || 0 }} / {{ row.dailyLimit || 1000 }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="success" link size="small" @click="testLineConnection(row)" :loading="row._testing">测试</el-button>
                <el-button type="primary" link size="small" @click="openLineDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="deleteLine(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
            <el-pagination
              layout="total, prev, pager, next"
              :total="callLines.length"
              :page-size="linePageSize"
              v-model:current-page="linePage"
              small
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 网络电话配置 (仅管理员可见) -->
      <el-tab-pane v-if="isAdmin" label="网络电话配置" name="voip">
        <div class="config-section">
          <el-form :model="globalConfig" label-width="140px">
            <el-form-item label="服务商">
              <el-select v-model="globalConfig.voipProvider" style="width: 200px">
                <el-option label="阿里云云联络中心" value="aliyun" />
              </el-select>
            </el-form-item>

            <template v-if="globalConfig.voipProvider === 'aliyun'">
              <el-divider content-position="left">阿里云云联络中心（CCC）配置</el-divider>
              <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
                <template #title>
                  <div style="line-height: 1.8;">
                    每个租户使用自己在阿里云申请的云联络中心实例和号码，配置互相独立。<br />
                    配置步骤：1. 在阿里云开通云联络中心并创建实例、购买固话号码；2. 在下方填写RAM用户的AccessKey（需授权 AliyunCCCFullAccess）、实例ID和号码；3. 保存后系统会自动创建阿里云线路，在「号码分配」把号码分给员工即可外呼。
                  </div>
                </template>
              </el-alert>
              <el-form-item label="外呼方式">
                <!-- Element Plus 2.3.x 的 radio-button 用 label 传值（value 属性 2.6+ 才支持） -->
                <el-radio-group v-model="globalConfig.aliyunConfig.callMode">
                  <el-radio-button label="double_call">双呼（免设备）</el-radio-button>
                  <el-radio-button label="softphone">软电话（网页）</el-radio-button>
                  <el-radio-button label="hardphone">硬话机（SIP）</el-radio-button>
                </el-radio-group>
                <div class="form-tip" v-if="globalConfig.aliyunConfig.callMode === 'double_call' || !globalConfig.aliyunConfig.callMode">
                  双呼：员工点外呼后，系统先呼叫员工的工作号码（号码分配中填写），接听后自动呼叫客户。无需任何设备，适合大多数场景
                </div>
                <div class="form-tip" v-else-if="globalConfig.aliyunConfig.callMode === 'softphone'">
                  软电话：员工需登录阿里云坐席工作台（网页），用电脑的耳麦或USB话务盒通话。点外呼后工作台先振铃，接听后呼叫客户。需在「号码分配」中为员工绑定坐席账号
                </div>
                <div class="form-tip" v-else>
                  硬话机：SIP话机通过网线/WiFi注册到云联络中心（在坐席工作台绑定话机），点外呼后话机先振铃，接听后呼叫客户。需在「号码分配」中为员工绑定坐席账号
                </div>
                <div v-if="globalConfig.aliyunConfig.callMode === 'softphone' || globalConfig.aliyunConfig.callMode === 'hardphone'" style="margin-top: 8px;">
                  <el-button size="small" type="primary" plain @click="openWorkbench" :loading="loadingWorkbench">打开坐席工作台</el-button>
                  <span class="form-tip" style="display: inline; margin-left: 8px;">员工用阿里云坐席账号登录工作台后才能接听</span>
                </div>
              </el-form-item>
              <el-form-item label="AccessKey ID" required>
                <el-input v-model="globalConfig.aliyunConfig.accessKeyId" placeholder="请输入" show-password style="width: 100%" />
              </el-form-item>
              <el-form-item label="AccessKey Secret" required>
                <el-input v-model="globalConfig.aliyunConfig.accessKeySecret" placeholder="请输入" type="password" show-password style="width: 100%" />
              </el-form-item>
              <el-form-item label="实例ID" required>
                <div style="display: flex; gap: 8px; width: 100%;">
                  <el-select
                    v-model="globalConfig.aliyunConfig.appId"
                    filterable
                    allow-create
                    default-first-option
                    clearable
                    placeholder="点击「获取实例」拉取列表，或手动输入实例ID"
                    style="flex: 1"
                  >
                    <el-option v-for="inst in aliyunInstances" :key="inst.id" :label="`${inst.id}（${inst.name}）`" :value="inst.id" />
                  </el-select>
                  <el-button @click="fetchAliyunInstances" :loading="loadingInstances">获取实例</el-button>
                </div>
                <div class="form-tip">填写 AccessKey 后点「获取实例」自动拉取账号下的实例；无实例时请先在阿里云云联络中心控制台创建</div>
              </el-form-item>
              <el-form-item label="号码池">
                <div style="display: flex; gap: 8px; width: 100%;">
                  <el-select
                    v-model="globalConfig.aliyunConfig.numberList"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    clearable
                    placeholder="点击「获取号码」拉取实例下已购号码，或手动输入"
                    style="flex: 1"
                  >
                    <el-option v-for="num in aliyunNumbers" :key="num.number" :label="num.city ? `${num.number}（${num.city}）` : num.number" :value="num.number" />
                  </el-select>
                  <el-button @click="fetchAliyunNumbers" :loading="loadingNumbers">获取号码</el-button>
                </div>
                <div class="form-tip">绑定到系统的外呼号码池，保存后可在「号码分配」中把号码分给指定成员；无号码时请在阿里云控制台「号码管理」中购买并绑定到实例</div>
              </el-form-item>
              <el-form-item label="默认主叫号码">
                <el-select
                  v-model="globalConfig.aliyunConfig.callerNumber"
                  filterable
                  allow-create
                  default-first-option
                  clearable
                  placeholder="从号码池选择或手动输入"
                  style="width: 100%"
                >
                  <el-option v-for="num in (globalConfig.aliyunConfig.numberList || [])" :key="num" :label="num" :value="num" />
                </el-select>
                <div class="form-tip">兜底号码：当成员在「号码分配」中没有被分配专属号码时，外呼显示此号码</div>
              </el-form-item>
              <el-form-item label="服务区域">
                <el-select v-model="globalConfig.aliyunConfig.region" style="width: 200px">
                  <el-option label="华东2（上海）" value="cn-shanghai" />
                  <el-option label="华东1（杭州）" value="cn-hangzhou" />
                  <el-option label="华北2（北京）" value="cn-beijing" />
                  <el-option label="华南1（深圳）" value="cn-shenzhen" />
                </el-select>
                <div class="form-tip">云联络中心API统一接入华东2（上海），建议保持默认</div>
              </el-form-item>
              <el-form-item label="启用录音">
                <el-switch v-model="globalConfig.aliyunConfig.enableRecording" />
                <div class="form-tip">开启后通话结束自动拉取云联络中心录音（需在阿里云实例中开启录音）</div>
              </el-form-item>
            </template>

            <el-form-item>
              <el-button type="primary" @click="saveGlobalConfig" :loading="savingGlobal">保存配置</el-button>
              <el-button @click="testVoipConnection" :loading="testingVoip">测试连接</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- 号码分配 (仅管理员可见) -->
      <el-tab-pane v-if="isAdmin" label="号码分配" name="assignments">
        <div class="config-section">
          <div class="section-header">
            <span class="section-title">用户线路分配</span>
            <el-button type="primary" size="small" :icon="Plus" @click="openAssignDialog">
              分配线路
            </el-button>
          </div>

          <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
            <template #title>号码独占：一个主叫号码只能分配给一个成员，取消或禁用分配后释放。禁用后员工看不到该线路和号码，启用后恢复。双呼外呼时系统先呼叫"员工号码"，接通后再呼客户，客户看到的来电显示为"主叫号码"。</template>
          </el-alert>
          <div style="margin-bottom: 12px;">
            <el-input
              v-model="assignmentSearch"
              placeholder="搜索员工姓名 / 主叫号码 / 员工号码 / 线路"
              clearable
              style="width: 320px;"
              @input="assignmentPage = 1"
            />
          </div>
          <el-table :data="pagedAssignments" v-loading="assignmentsLoading" style="width: 100%">
            <el-table-column prop="userName" label="用户" min-width="90" />
            <el-table-column prop="lineName" label="线路" min-width="120" show-overflow-tooltip />
            <el-table-column prop="callerNumber" label="主叫号码" min-width="120" show-overflow-tooltip />
            <el-table-column prop="agentPhone" label="员工号码" min-width="110">
              <template #default="{ row }">
                <span v-if="row.agentPhone">{{ row.agentPhone }}</span>
                <el-tooltip v-else content="未填写时使用该员工个人资料中的手机号" placement="top">
                  <span style="color: #909399;">资料手机号</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="isDefault" label="默认" width="60">
              <template #default="{ row }">
                <el-tag v-if="row.isDefault" type="success" size="small">是</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="dailyLimit" label="日限额" width="75" />
            <el-table-column prop="isActive" label="状态" width="70">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                  {{ row.isActive ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditAssignDialog(row)">编辑</el-button>
                <el-button :type="row.isActive ? 'warning' : 'success'" link size="small" @click="toggleAssignmentActive(row)">
                  {{ row.isActive ? '禁用' : '启用' }}
                </el-button>
                <el-button type="danger" link size="small" @click="removeAssignment(row)">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
            <el-pagination
              layout="total, prev, pager, next"
              :total="filteredAssignments.length"
              :page-size="assignmentPageSize"
              v-model:current-page="assignmentPage"
              small
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 工作手机标签页 (全员可见) -->
      <el-tab-pane label="工作手机" name="workPhone">
        <div class="config-section">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
            <template #title>
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span>工作手机说明：绑定您的工作手机后，可通过手机直接拨打客户电话，系统自动录音并同步通话记录。</span>
                <el-button type="primary" link @click="goToMobileAppDownload" style="margin-left: 12px; white-space: nowrap;">
                  <el-icon style="margin-right: 4px;"><Download /></el-icon>下载移动应用
                </el-button>
              </div>
            </template>
          </el-alert>

          <div class="section-header">
            <span class="section-title">已绑定手机</span>
            <div class="section-actions">
              <el-button type="default" size="small" :icon="Refresh" @click="refreshWorkPhoneStatus" :loading="refreshingStatus">
                刷新状态
              </el-button>
              <el-button type="primary" size="small" :icon="Plus" @click="showBindQRCode">
                绑定新手机
              </el-button>
            </div>
          </div>

          <div v-if="workPhones.length > 0" class="work-phones-list">
            <div v-for="phone in workPhones" :key="phone.id" class="phone-card">
              <div class="phone-info">
                <div class="phone-number">
                  <el-icon><Cellphone /></el-icon>
                  {{ phone.phoneNumber }}
                  <el-tag v-if="phone.isPrimary" type="success" size="small" style="margin-left: 8px;">主要</el-tag>
                </div>
                <div class="phone-meta">
                  <span>{{ phone.deviceName || '未知设备' }}</span>
                  <span v-if="phone.deviceModel"> · {{ phone.deviceModel }}</span>
                </div>
                <div class="phone-status">
                  <el-tag :type="phone.onlineStatus === 'online' ? 'success' : 'danger'" size="small">
                    {{ phone.onlineStatus === 'online' ? '在线' : '离线' }}
                  </el-tag>
                </div>
              </div>
              <div class="phone-actions">
                <el-button v-if="phone.onlineStatus !== 'online'" type="primary" link size="small" @click="showBindQRCode">
                  重新扫码
                </el-button>
                <el-button v-if="!phone.isPrimary" type="primary" link size="small" @click="setAsPrimary(phone)">
                  设为主要
                </el-button>
                <el-button type="danger" link size="small" @click="unbindPhone(phone)">解绑</el-button>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂未绑定工作手机" />
        </div>
      </el-tab-pane>

      <!-- 我的外呼设置 (全员可见) -->
      <el-tab-pane label="我的设置" name="mySettings">
        <div class="config-section">
          <el-form :model="userPreference" label-width="140px">
            <el-form-item label="优先使用工作手机">
              <el-switch v-model="userPreference.preferMobile" />
              <div class="form-tip">开启后，有绑定的工作手机时优先使用工作手机拨打</div>
            </el-form-item>

            <el-form-item label="默认外呼线路">
              <el-select v-model="userPreference.defaultLineId" placeholder="请选择" clearable style="width: 300px">
                <el-option v-for="line in myAvailableLines" :key="line.id" :label="line.name" :value="line.id" />
              </el-select>
              <div class="form-tip">当不使用工作手机时，默认选择的外呼线路</div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveUserPreference" :loading="savingPreference">
                保存设置
              </el-button>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">我的可用线路</el-divider>
          <div v-if="myAvailableLines.length > 0" class="my-lines-list">
            <div v-for="line in myAvailableLines" :key="line.id" class="line-item">
              <div class="line-info">
                <span class="line-name">{{ line.name }}</span>
                <el-tag size="small" type="info">{{ getProviderText(line.provider) }}</el-tag>
                <el-tag v-if="line.isDefault" size="small" type="success">默认</el-tag>
              </div>
              <div class="line-meta">
                主叫号码: {{ line.callerNumber || '未设置' }}
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无可用线路，请联系管理员分配" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 线路编辑弹窗 -->
    <el-dialog v-model="lineDialogVisible" :title="editingLine ? '编辑线路' : '添加线路'" width="600px" append-to-body>
      <el-form :model="lineForm" :rules="lineRules" ref="lineFormRef" label-width="120px">
        <el-form-item label="线路名称" prop="name">
          <el-input v-model="lineForm.name" placeholder="请输入线路名称" />
        </el-form-item>
        <el-form-item label="服务商" prop="provider">
          <el-select v-model="lineForm.provider" style="width: 100%" @change="onProviderChange">
            <el-option label="阿里云云联络中心" value="aliyun" />
            <el-option label="自定义（SIP/PSTN网关）" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="线路类型" prop="type">
          <el-select v-model="lineForm.type" style="width: 100%">
            <el-option label="网络电话(VoIP)" value="voip" />
            <el-option label="传统电话(PSTN)" value="pstn" />
            <el-option label="SIP线路" value="sip" />
          </el-select>
        </el-form-item>

        <!-- 阿里云配置 -->
        <template v-if="lineForm.provider === 'aliyun'">
          <el-divider content-position="left">阿里云云联络中心配置</el-divider>
          <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
            <template #title>以下留空时自动使用「网络电话配置」中保存的全局阿里云配置，只需填写主叫号码即可</template>
          </el-alert>
          <el-form-item label="AccessKey ID">
            <el-input v-model="lineForm.config.accessKeyId" placeholder="留空使用全局配置" />
          </el-form-item>
          <el-form-item label="AccessKey Secret">
            <el-input v-model="lineForm.config.accessKeySecret" placeholder="留空使用全局配置" type="password" show-password />
          </el-form-item>
          <el-form-item label="实例ID">
            <el-input v-model="lineForm.config.appId" placeholder="云联络中心实例ID（如 ccc-xxxx），留空使用全局配置" />
          </el-form-item>
        </template>

        <!-- 自定义配置 -->
        <template v-if="lineForm.provider === 'custom'">
          <el-divider content-position="left">自定义配置</el-divider>

          <!-- SIP线路配置 -->
          <template v-if="lineForm.type === 'sip'">
            <el-form-item label="SIP服务器">
              <el-input v-model="lineForm.config.sipServer" placeholder="例: sip.example.com" />
            </el-form-item>
            <el-form-item label="SIP端口">
              <el-input-number v-model="lineForm.config.sipPort" :min="1" :max="65535" style="width: 200px" />
            </el-form-item>
            <el-form-item label="传输协议">
              <el-select v-model="lineForm.config.transport" style="width: 200px">
                <el-option label="UDP" value="udp" />
                <el-option label="TCP" value="tcp" />
                <el-option label="TLS" value="tls" />
              </el-select>
            </el-form-item>
            <el-form-item label="SIP用户名">
              <el-input v-model="lineForm.config.sipUsername" placeholder="SIP认证用户名" />
            </el-form-item>
            <el-form-item label="SIP密码">
              <el-input v-model="lineForm.config.sipPassword" placeholder="SIP认证密码" type="password" show-password />
            </el-form-item>
            <el-form-item label="SIP域名">
              <el-input v-model="lineForm.config.sipDomain" placeholder="SIP域名(可选)" />
            </el-form-item>
          </template>

          <!-- PSTN网关配置 -->
          <template v-else-if="lineForm.type === 'pstn'">
            <el-form-item label="网关地址">
              <el-input v-model="lineForm.config.gatewayHost" placeholder="例: 192.168.1.100 或 gateway.example.com" />
            </el-form-item>
            <el-form-item label="网关端口">
              <el-input-number v-model="lineForm.config.gatewayPort" :min="1" :max="65535" style="width: 200px" />
            </el-form-item>
            <el-form-item label="中继类型">
              <el-select v-model="lineForm.config.trunkType" style="width: 200px">
                <el-option label="模拟中继(FXO)" value="fxo" />
                <el-option label="数字中继(E1/T1)" value="e1" />
                <el-option label="SIP中继" value="sip_trunk" />
                <el-option label="PRI中继" value="pri" />
              </el-select>
            </el-form-item>
            <el-form-item label="中继通道数">
              <el-input-number v-model="lineForm.config.channels" :min="1" :max="120" style="width: 200px" />
            </el-form-item>
            <el-form-item label="认证用户名">
              <el-input v-model="lineForm.config.authUsername" placeholder="网关认证用户名(可选)" />
            </el-form-item>
            <el-form-item label="认证密码">
              <el-input v-model="lineForm.config.authPassword" placeholder="网关认证密码(可选)" type="password" show-password />
            </el-form-item>
          </template>

          <!-- VoIP自定义API -->
          <template v-else>
            <el-form-item label="API地址">
              <el-input v-model="lineForm.config.apiUrl" placeholder="请输入API地址" />
            </el-form-item>
            <el-form-item label="API密钥">
              <el-input v-model="lineForm.config.apiKey" placeholder="请输入API密钥" type="password" show-password />
            </el-form-item>
          </template>
        </template>

        <el-divider content-position="left">基本设置</el-divider>
        <el-form-item label="主叫号码">
          <el-input v-model="lineForm.callerNumber" placeholder="客户接听时显示的号码" />
        </el-form-item>
        <el-form-item label="日呼叫限额">
          <el-input-number v-model="lineForm.dailyLimit" :min="0" :max="10000" style="width: 200px" />
        </el-form-item>
        <el-form-item label="最大并发">
          <el-input-number v-model="lineForm.maxConcurrent" :min="1" :max="100" style="width: 200px" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="lineForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="lineForm.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="lineDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLine" :loading="savingLine">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配线路弹窗（新建/编辑共用） -->
    <el-dialog v-model="assignDialogVisible" :title="editingAssignment ? '编辑分配' : '分配线路给用户'" width="500px" append-to-body>
      <el-form :model="assignForm" :rules="assignRules" ref="assignFormRef" label-width="100px">
        <el-form-item label="选择用户" prop="userId">
          <el-select v-model="assignForm.userId" filterable placeholder="请选择用户" style="width: 100%" :loading="usersLoading" :disabled="!!editingAssignment">
            <el-option v-for="user in userList" :key="user.id" :label="user.realName || user.name" :value="user.id">
              <div style="display: flex; justify-content: space-between;">
                <span>{{ user.realName || user.name }}</span>
                <span style="color: #909399; font-size: 12px;">{{ user.departmentName }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="选择线路" prop="lineId">
          <el-select v-model="assignForm.lineId" placeholder="请选择线路" style="width: 100%">
            <el-option v-for="line in enabledLines" :key="line.id" :label="line.name" :value="line.id">
              <div style="display: flex; justify-content: space-between;">
                <span>{{ line.name }}</span>
                <el-tag size="small">{{ getProviderText(line.provider) }}</el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="enabledLines.length === 0" class="form-tip" style="color: #e6a23c;">
            暂无可用线路：请先在「网络电话配置」中保存阿里云配置（会自动创建线路），或到「线路管理」手动新建线路
          </div>
        </el-form-item>
        <el-form-item label="主叫号码">
          <el-select
            v-model="assignForm.callerNumber"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="从号码池选择或手动输入，留空使用线路默认号码"
            style="width: 100%"
          >
            <el-option
              v-for="num in assignableNumbers"
              :key="num.number"
              :label="num.occupied ? `${num.number}（已分配给 ${num.occupiedBy}）` : num.number"
              :value="num.number"
              :disabled="num.occupied"
            />
          </el-select>
          <div class="form-tip">客户接听时显示的号码；号码独占，已分配给其他成员的号码不可选</div>
        </el-form-item>
        <el-form-item label="员工号码">
          <el-input v-model="assignForm.agentPhone" placeholder="双呼时先呼叫此号码（员工的工作手机/座机）" />
          <div class="form-tip">双呼模式使用：留空则使用该员工个人资料中的手机号；个人手机号是私人号码时请在此填写工作号码</div>
        </el-form-item>
        <el-form-item label="坐席账号">
          <div style="display: flex; gap: 8px; width: 100%;">
            <el-select
              v-model="assignForm.cccUserId"
              filterable
              allow-create
              default-first-option
              clearable
              placeholder="软电话/硬话机模式使用，点「获取坐席」拉取"
              style="flex: 1"
            >
              <el-option
                v-for="agent in cccUsers"
                :key="agent.userId"
                :label="`${agent.displayName}（${agent.loginName}）${agent.extension ? ' 软电话分机:' + agent.extension : ''}${agent.sipExtension ? ' SIP分机:' + agent.sipExtension : ''}`"
                :value="agent.userId"
              />
            </el-select>
            <el-button @click="fetchCccUsers" :loading="loadingCccUsers">获取坐席</el-button>
          </div>
          <div class="form-tip">仅软电话/硬话机模式需要：绑定该员工在阿里云云联络中心的坐席账号，员工登录坐席工作台后即可外呼</div>
        </el-form-item>
        <el-form-item label="日呼叫限额">
          <el-input-number v-model="assignForm.dailyLimit" :min="0" :max="1000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="assignForm.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAssignment" :loading="savingAssignment">{{ editingAssignment ? '保存修改' : '确定分配' }}</el-button>
      </template>
    </el-dialog>

    <!-- 绑定二维码弹窗 -->
    <el-dialog v-model="qrDialogVisible" title="扫码绑定工作手机" width="400px" append-to-body>
      <div class="qr-bind-content">
        <div v-if="qrCodeUrl" class="qr-code-wrapper">
          <img :src="qrCodeUrl" alt="绑定二维码" class="qr-code-img" />
          <div class="qr-status">
            <template v-if="bindStatus === 'pending'">
              <el-icon class="is-loading"><Loading /></el-icon>
              等待扫码...
            </template>
            <template v-else-if="bindStatus === 'connected'">
              <el-icon style="color: #67c23a;"><CircleCheckFilled /></el-icon>
              绑定成功！
            </template>
            <template v-else-if="bindStatus === 'expired'">
              <el-icon style="color: #f56c6c;"><WarningFilled /></el-icon>
              二维码已过期
            </template>
          </div>
        </div>
        <div v-else class="qr-loading">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
          <p>正在生成二维码...</p>
        </div>
        <div class="qr-tips">
          <p>1. 在工作手机上打开"外呼助手"APP</p>
          <p>2. 点击"扫码绑定"功能</p>
          <p>3. 扫描上方二维码完成绑定</p>
        </div>
      </div>
      <template #footer>
        <el-button v-if="bindStatus === 'expired'" type="primary" @click="refreshQRCode">
          重新生成
        </el-button>
        <el-button @click="qrDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>


<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Cellphone, Loading, CircleCheckFilled, WarningFilled, Refresh, QuestionFilled, ArrowRight, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import * as callConfigApi from '@/api/callConfig'
import type { CallLine, UserLineAssignment, WorkPhone, UserCallPreference } from '@/api/callConfig'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()
const userStore = useUserStore()

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isAdmin = computed(() => ['super_admin', 'admin'].includes(userStore.user?.role || ''))

// 标签页
const activeTab = ref(isAdmin.value ? 'lines' : 'workPhone')

// 加载状态
const linesLoading = ref(false)
const assignmentsLoading = ref(false)
const usersLoading = ref(false)
const savingGlobal = ref(false)
const testingVoip = ref(false)
const savingLine = ref(false)
const savingAssignment = ref(false)
const savingPreference = ref(false)
const refreshingStatus = ref(false)

// 数据
const callLines = ref<CallLine[]>([])
const assignments = ref<UserLineAssignment[]>([])
const workPhones = ref<WorkPhone[]>([])
const myAvailableLines = ref<any[]>([])
const userList = ref<any[]>([])

// 计算启用的线路
const enabledLines = computed(() => {
  const filtered = callLines.value.filter(line => line.isEnabled)
  console.log('[CallConfig] enabledLines:', filtered.length, 'from', callLines.value.length, 'total')
  return filtered
})

// 线路列表分页（5条/页）
const linePage = ref(1)
const linePageSize = 5
const pagedCallLines = computed(() =>
  callLines.value.slice((linePage.value - 1) * linePageSize, linePage.value * linePageSize)
)

// 号码分配搜索 + 分页（6条/页）
const assignmentSearch = ref('')
const assignmentPage = ref(1)
const assignmentPageSize = 6
const filteredAssignments = computed(() => {
  const kw = assignmentSearch.value.trim().toLowerCase()
  if (!kw) return assignments.value
  return assignments.value.filter(a =>
    (a.userName || '').toLowerCase().includes(kw) ||
    (a.callerNumber || '').toLowerCase().includes(kw) ||
    (a.agentPhone || '').toLowerCase().includes(kw) ||
    (a.lineName || '').toLowerCase().includes(kw)
  )
})
const pagedAssignments = computed(() =>
  filteredAssignments.value.slice((assignmentPage.value - 1) * assignmentPageSize, assignmentPage.value * assignmentPageSize)
)

// 全局配置
const globalConfig = reactive({
  voipProvider: 'aliyun',
  aliyunConfig: {
    accessKeyId: '',
    accessKeySecret: '',
    appId: '',
    callerNumber: '',
    numberList: [] as string[],
    callMode: 'double_call' as 'double_call' | 'softphone' | 'hardphone',
    region: 'cn-shanghai',
    enableRecording: false
  },
  tencentConfig: {
    secretId: '',
    secretKey: '',
    appId: ''
  },
  huaweiConfig: {
    accessKey: '',
    secretKey: ''
  }
})

// 用户偏好
const userPreference = reactive<UserCallPreference>({
  preferMobile: false,
  defaultLineId: undefined
})

// 线路编辑
const lineDialogVisible = ref(false)
const editingLine = ref<CallLine | null>(null)
const lineFormRef = ref()
const lineForm = reactive({
  name: '',
  provider: 'aliyun' as 'aliyun' | 'tencent' | 'huawei' | 'custom',
  type: 'voip' as 'voip' | 'pstn' | 'sip',
  callerNumber: '',
  dailyLimit: 1000,
  maxConcurrent: 10,
  description: '',
  isEnabled: true,
  config: {
    accessKeyId: '',
    accessKeySecret: '',
    appId: '',
    secretId: '',
    secretKey: '',
    accessKey: '',
    apiUrl: '',
    apiKey: '',
    // SIP线路配置
    sipServer: '',
    sipPort: 5060,
    transport: 'udp',
    sipUsername: '',
    sipPassword: '',
    sipDomain: '',
    // PSTN网关配置
    gatewayHost: '',
    gatewayPort: 5060,
    trunkType: 'sip_trunk',
    channels: 30,
    authUsername: '',
    authPassword: ''
  } as Record<string, any>
})
const lineRules = {
  name: [{ required: true, message: '请输入线路名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  type: [{ required: true, message: '请选择线路类型', trigger: 'change' }]
}

// 分配线路（editingAssignment 非空时为编辑模式）
const assignDialogVisible = ref(false)
const assignFormRef = ref()
const editingAssignment = ref<UserLineAssignment | null>(null)
const assignForm = reactive({
  userId: undefined as number | undefined,
  lineId: undefined as number | undefined,
  callerNumber: '',
  agentPhone: '',
  cccUserId: '',
  dailyLimit: 100,
  isDefault: false
})

// 阿里云实例/号码/坐席拉取
const aliyunInstances = ref<Array<{ id: string; name: string; status?: string }>>([])
const aliyunNumbers = ref<Array<{ number: string; city?: string; usage?: string }>>([])
const cccUsers = ref<Array<{ userId: string; loginName: string; displayName: string; extension?: string; sipExtension?: string }>>([])
const loadingInstances = ref(false)
const loadingNumbers = ref(false)
const loadingCccUsers = ref(false)
const loadingWorkbench = ref(false)

// 分配弹窗可选号码：全局号码池 + 所选线路默认号码，标记已被其他成员占用的号码（独占）
const assignableNumbers = computed(() => {
  const pool = new Set<string>(globalConfig.aliyunConfig.numberList || [])
  const selectedLine = callLines.value.find(l => l.id === assignForm.lineId)
  if (selectedLine?.callerNumber) {
    pool.add(selectedLine.callerNumber)
  }
  return Array.from(pool).map(number => {
    const occupiedBy = assignments.value.find(
      a => a.isActive && a.callerNumber === number && String(a.userId) !== String(assignForm.userId || '')
    )
    return {
      number,
      occupied: !!occupiedBy,
      occupiedBy: occupiedBy?.userName || ''
    }
  })
})
const assignRules = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  lineId: [{ required: true, message: '请选择线路', trigger: 'change' }]
}

// 工作手机绑定
const qrDialogVisible = ref(false)
const qrCodeUrl = ref('')
const connectionId = ref('')
const bindStatus = ref<'pending' | 'connected' | 'expired'>('pending')
let bindCheckTimer: ReturnType<typeof setInterval> | null = null

// 方法
const getProviderText = (provider: string) => {
  const map: Record<string, string> = {
    aliyun: '阿里云',
    tencent: '腾讯云',
    huawei: '华为云',
    custom: '自定义',
    system: '系统'
  }
  return map[provider] || provider
}

// 切换服务商时清空配置
const onProviderChange = () => {
  // 清空所有配置字段
  lineForm.config.accessKeyId = ''
  lineForm.config.accessKeySecret = ''
  lineForm.config.appId = ''
  lineForm.config.secretId = ''
  lineForm.config.secretKey = ''
  lineForm.config.accessKey = ''
  lineForm.config.apiUrl = ''
  lineForm.config.apiKey = ''
}

// 加载数据
const loadData = async () => {
  console.log('[CallConfig] ========== loadData called ==========')
  console.log('[CallConfig] isAdmin:', isAdmin.value)
  console.log('[CallConfig] userStore.token:', userStore.token ? userStore.token.substring(0, 30) + '...' : 'EMPTY')

  if (isAdmin.value) {
    console.log('[CallConfig] Loading admin data...')
    // 并行加载所有数据，不要让一个失败影响其他
    Promise.all([
      loadCallLines().catch(e => console.error('loadCallLines error:', e)),
      loadAssignments().catch(e => console.error('loadAssignments error:', e)),
      loadGlobalConfig().catch(e => console.error('loadGlobalConfig error:', e)),
      loadUserList().catch(e => console.error('loadUserList error:', e))
    ])
  }

  console.log('[CallConfig] Loading common data (workPhones, myAvailableLines, userPreference)...')
  loadWorkPhones()
  loadMyAvailableLines()
  loadUserPreference()
}

const loadCallLines = async () => {
  console.log('[CallConfig] loadCallLines called')
  linesLoading.value = true
  try {
    const res = await callConfigApi.getCallLines()
    console.log('[CallConfig] getCallLines response:', res)
    console.log('[CallConfig] response type:', typeof res)
    console.log('[CallConfig] is array:', Array.isArray(res))

    // request.ts 响应拦截器已经提取了 data，所以 res 可能直接是数组
    if (Array.isArray(res)) {
      callLines.value = res as CallLine[]
      console.log('[CallConfig] callLines set from array:', callLines.value.length, 'items')
    } else if (res && (res as any).success !== undefined) {
      // 标准响应格式
      if ((res as any).success) {
        callLines.value = (res as any).data || []
        console.log('[CallConfig] callLines set from response.data:', callLines.value.length, 'items')
      } else {
        console.log('[CallConfig] getCallLines failed:', res)
      }
    } else if (res) {
      // 其他情况，尝试直接使用
      callLines.value = ((res as any).data || res || []) as CallLine[]
      console.log('[CallConfig] callLines set from fallback:', callLines.value.length, 'items')
    }
  } catch (e: any) {
    console.error('[CallConfig] 加载线路失败:', e.message || e)
  } finally {
    linesLoading.value = false
  }
}

const loadAssignments = async () => {
  assignmentsLoading.value = true
  try {
    const res = await callConfigApi.getLineAssignments()
    console.log('[CallConfig] getLineAssignments response:', res)
    // 处理不同的响应格式
    if (Array.isArray(res)) {
      assignments.value = res
    } else if (res && (res as any).success !== undefined) {
      assignments.value = (res as any).data || []
    } else if (res) {
      assignments.value = ((res as any).data || res || []) as UserLineAssignment[]
    }
    console.log('[CallConfig] assignments set to:', assignments.value.length, 'items')
  } catch (e) {
    console.error('加载分配失败:', e)
  } finally {
    assignmentsLoading.value = false
  }
}

const loadGlobalConfig = async () => {
  try {
    const res: any = await callConfigApi.getGlobalConfig()
    // axios 拦截器已解包内层 data：res 本身就是配置对象；兼容 {success, data} 包装格式
    const data = (res && res.success !== undefined && res.data !== undefined) ? res.data : res
    if (data && typeof data === 'object') {
      // 仅支持阿里云；历史配置为其他服务商时也归一到阿里云
      globalConfig.voipProvider = 'aliyun'
      if (data.aliyun_config) {
        Object.assign(globalConfig.aliyunConfig, data.aliyun_config)
        // 号码池必须是数组，避免旧配置为 null 时多选框报错
        if (!Array.isArray(globalConfig.aliyunConfig.numberList)) {
          globalConfig.aliyunConfig.numberList = []
        }
        if (!globalConfig.aliyunConfig.callMode) {
          globalConfig.aliyunConfig.callMode = 'double_call'
        }
      }
      if (data.tencent_config) Object.assign(globalConfig.tencentConfig, data.tencent_config)
      if (data.huawei_config) Object.assign(globalConfig.huaweiConfig, data.huawei_config)
    }
  } catch (e: any) {
    console.error('加载全局配置失败:', e)
    // 明确提示加载失败，避免表单静默显示为空让用户误以为配置丢失
    ElMessage.warning(`已保存的网络电话配置加载失败：${e?.message || '网络异常'}，请刷新重试`)
  }
}

const loadWorkPhones = async () => {
  try {
    const res = await callConfigApi.getMyWorkPhones()
    console.log('[CallConfig] loadWorkPhones response:', res)
    console.log('[CallConfig] loadWorkPhones raw data:', JSON.stringify(res))

    // request.ts 响应拦截器返回的是 data
    let phones: any[] = []

    if (Array.isArray(res)) {
      phones = res
      console.log('[CallConfig] workPhones from array:', phones.length)
    } else if (res && (res as any).success !== undefined) {
      phones = (res as any).data || []
      console.log('[CallConfig] workPhones from success response:', phones.length)
    } else if (res) {
      phones = (res as unknown as any[]) || []
      console.log('[CallConfig] workPhones from other:', phones.length)
    }

    // 🔥 修复：确保每个手机对象都有正确的 id 字段
    workPhones.value = phones.map((p: any, index: number) => {
      // 🔥 调试：打印原始数据
      console.log(`[CallConfig] 原始手机数据 ${index}:`, JSON.stringify(p))

      // 🔥 关键修复：确保 id 有效
      let phoneId = p.id
      if (phoneId === undefined || phoneId === null || phoneId === '') {
        console.warn(`[CallConfig] 工作手机 ${index} 的 id 无效，使用 index+1 作为临时 ID`)
        phoneId = index + 1
      } else if (typeof phoneId === 'string') {
        phoneId = parseInt(phoneId) || index + 1
      }

      const phone = {
        id: phoneId,
        phoneNumber: p.phoneNumber || p.phone_number || p.deviceName || p.device_name || '未知号码',
        deviceName: p.deviceName || p.device_name || '工作手机',
        deviceModel: p.deviceModel || p.device_model,
        onlineStatus: p.onlineStatus || p.online_status || 'offline',
        isPrimary: p.isPrimary || p.is_primary === 1,
        lastActiveAt: p.lastActiveAt || p.last_active_at
      }
      console.log(`[CallConfig] 映射手机 ${index}:`, phone)
      return phone
    })

    console.log('[CallConfig] workPhones 最终数据:', workPhones.value)
  } catch (e) {
    console.error('加载工作手机失败:', e)
  }
}

// 刷新工作手机状态
const refreshWorkPhoneStatus = async () => {
  refreshingStatus.value = true
  try {
    await loadWorkPhones()
    ElMessage.success('状态已刷新')
  } catch (_e) {
    ElMessage.error('刷新失败')
  } finally {
    refreshingStatus.value = false
  }
}

const loadMyAvailableLines = async () => {
  try {
    console.log('[CallConfig] loadMyAvailableLines called')
    const res = await callConfigApi.getMyAvailableLines()
    console.log('[CallConfig] loadMyAvailableLines response:', res)
    console.log('[CallConfig] loadMyAvailableLines response type:', typeof res)
    console.log('[CallConfig] loadMyAvailableLines assignedLines:', (res as any)?.assignedLines)
    // request.ts 响应拦截器返回的是 data，所以 res 可能直接是 {assignedLines, workPhones, hasAvailableMethod}
    if (res && (res as any).assignedLines !== undefined) {
      myAvailableLines.value = (res as any).assignedLines || []
      console.log('[CallConfig] myAvailableLines set to:', myAvailableLines.value.length, 'items')
    } else if (res && (res as any).success && (res as any).data) {
      // 兼容完整响应格式
      myAvailableLines.value = (res as any).data.assignedLines || []
      console.log('[CallConfig] myAvailableLines set from data:', myAvailableLines.value.length, 'items')
    } else {
      console.log('[CallConfig] loadMyAvailableLines: unexpected response format')
    }
  } catch (e) {
    console.error('加载可用线路失败:', e)
  }
}

const loadUserPreference = async () => {
  try {
    const res = await callConfigApi.getUserPreference()
    console.log('[CallConfig] loadUserPreference response:', res)
    // request.ts 响应拦截器返回的是 data
    if (res && (res as any).preferMobile !== undefined) {
      Object.assign(userPreference, res)
    } else if (res && (res as any).success && (res as any).data) {
      Object.assign(userPreference, (res as any).data)
    }
  } catch (e) {
    console.error('加载用户偏好失败:', e)
  }
}

const loadUserList = async () => {
  usersLoading.value = true
  try {
    console.log('[CallConfig] loadUserList called')
    const res = await fetch('/api/v1/users?pageSize=1000', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await res.json()
    console.log('[CallConfig] loadUserList response:', data)

    if (data.success && data.data) {
      // API 返回的是 data.data.items 或 data.data.users
      userList.value = data.data.items || data.data.users || []
      console.log('[CallConfig] userList set to:', userList.value.length, 'users')
    }
  } catch (e) {
    console.error('[CallConfig] 加载用户列表失败:', e)
  } finally {
    usersLoading.value = false
  }
}


// 线路管理
const openLineDialog = (line?: CallLine) => {
  editingLine.value = line || null
  if (line) {
    lineForm.name = line.name
    lineForm.provider = line.provider
    lineForm.type = line.type
    lineForm.callerNumber = line.callerNumber || ''
    lineForm.dailyLimit = line.dailyLimit
    lineForm.maxConcurrent = line.maxConcurrent
    lineForm.description = line.description || ''
    lineForm.isEnabled = line.isEnabled
    // 处理配置
    const cfg = line.config || {}
    lineForm.config.accessKeyId = cfg.accessKeyId || ''
    lineForm.config.accessKeySecret = cfg.accessKeySecret || ''
    lineForm.config.appId = cfg.appId || ''
    lineForm.config.secretId = cfg.secretId || ''
    lineForm.config.secretKey = cfg.secretKey || ''
    lineForm.config.accessKey = cfg.accessKey || ''
    lineForm.config.apiUrl = cfg.apiUrl || ''
    lineForm.config.apiKey = cfg.apiKey || ''
    // SIP配置
    lineForm.config.sipServer = cfg.sipServer || ''
    lineForm.config.sipPort = cfg.sipPort || 5060
    lineForm.config.transport = cfg.transport || 'udp'
    lineForm.config.sipUsername = cfg.sipUsername || ''
    lineForm.config.sipPassword = cfg.sipPassword || ''
    lineForm.config.sipDomain = cfg.sipDomain || ''
    // PSTN配置
    lineForm.config.gatewayHost = cfg.gatewayHost || ''
    lineForm.config.gatewayPort = cfg.gatewayPort || 5060
    lineForm.config.trunkType = cfg.trunkType || 'sip_trunk'
    lineForm.config.channels = cfg.channels || 30
    lineForm.config.authUsername = cfg.authUsername || ''
    lineForm.config.authPassword = cfg.authPassword || ''
  } else {
    // 重置表单
    lineForm.name = ''
    lineForm.provider = 'aliyun'
    lineForm.type = 'voip'
    lineForm.callerNumber = ''
    lineForm.dailyLimit = 1000
    lineForm.maxConcurrent = 10
    lineForm.description = ''
    lineForm.isEnabled = true
    lineForm.config.accessKeyId = ''
    lineForm.config.accessKeySecret = ''
    lineForm.config.appId = ''
    lineForm.config.secretId = ''
    lineForm.config.secretKey = ''
    lineForm.config.accessKey = ''
    lineForm.config.apiUrl = ''
    lineForm.config.apiKey = ''
    lineForm.config.sipServer = ''
    lineForm.config.sipPort = 5060
    lineForm.config.transport = 'udp'
    lineForm.config.sipUsername = ''
    lineForm.config.sipPassword = ''
    lineForm.config.sipDomain = ''
    lineForm.config.gatewayHost = ''
    lineForm.config.gatewayPort = 5060
    lineForm.config.trunkType = 'sip_trunk'
    lineForm.config.channels = 30
    lineForm.config.authUsername = ''
    lineForm.config.authPassword = ''
  }
  lineDialogVisible.value = true
}

const saveLine = async () => {
  try {
    await lineFormRef.value?.validate()
    savingLine.value = true

    // 根据服务商构建配置
    let config: Record<string, any> = {}
    if (lineForm.provider === 'aliyun') {
      config = {
        accessKeyId: lineForm.config.accessKeyId,
        accessKeySecret: lineForm.config.accessKeySecret,
        appId: lineForm.config.appId
      }
    } else if (lineForm.provider === 'tencent') {
      config = {
        secretId: lineForm.config.secretId,
        secretKey: lineForm.config.secretKey,
        appId: lineForm.config.appId
      }
    } else if (lineForm.provider === 'huawei') {
      config = {
        accessKey: lineForm.config.accessKey,
        secretKey: lineForm.config.secretKey
      }
    } else if (lineForm.provider === 'custom') {
      if (lineForm.type === 'sip') {
        config = {
          sipServer: lineForm.config.sipServer,
          sipPort: lineForm.config.sipPort,
          transport: lineForm.config.transport,
          sipUsername: lineForm.config.sipUsername,
          sipPassword: lineForm.config.sipPassword,
          sipDomain: lineForm.config.sipDomain
        }
      } else if (lineForm.type === 'pstn') {
        config = {
          gatewayHost: lineForm.config.gatewayHost,
          gatewayPort: lineForm.config.gatewayPort,
          trunkType: lineForm.config.trunkType,
          channels: lineForm.config.channels,
          authUsername: lineForm.config.authUsername,
          authPassword: lineForm.config.authPassword
        }
      } else {
        config = {
          apiUrl: lineForm.config.apiUrl,
          apiKey: lineForm.config.apiKey
        }
      }
    }

    const data = {
      name: lineForm.name,
      provider: lineForm.provider as 'aliyun' | 'tencent' | 'huawei' | 'custom',
      type: lineForm.type as 'voip' | 'pstn' | 'sip',
      callerNumber: lineForm.callerNumber,
      dailyLimit: lineForm.dailyLimit,
      maxConcurrent: lineForm.maxConcurrent,
      description: lineForm.description,
      isEnabled: lineForm.isEnabled,
      config
    }

    if (editingLine.value) {
      await callConfigApi.updateCallLine(editingLine.value.id, data)
      ElMessage.success('线路更新成功')
    } else {
      await callConfigApi.createCallLine(data)
      ElMessage.success('线路创建成功')
    }
    lineDialogVisible.value = false
    loadCallLines()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '保存失败')
    }
  } finally {
    savingLine.value = false
  }
}

const toggleLineStatus = async (line: CallLine) => {
  try {
    await callConfigApi.updateCallLine(line.id, { isEnabled: line.isEnabled })
    ElMessage.success(line.isEnabled ? '线路已启用' : '线路已禁用')
  } catch (_e) {
    line.isEnabled = !line.isEnabled
    ElMessage.error('操作失败')
  }
}

const deleteLine = async (line: CallLine) => {
  try {
    await ElMessageBox.confirm(`确定要删除线路"${line.name}"吗？`, '确认删除', { type: 'warning' })
    await callConfigApi.deleteCallLine(line.id)
    ElMessage.success('删除成功')
    loadCallLines()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

// 获取阿里云实例列表
const fetchAliyunInstances = async () => {
  if (!globalConfig.aliyunConfig.accessKeyId || !globalConfig.aliyunConfig.accessKeySecret) {
    ElMessage.warning('请先填写 AccessKey ID 和 AccessKey Secret')
    return
  }
  loadingInstances.value = true
  try {
    const res = await callConfigApi.getAliyunInstances({
      accessKeyId: globalConfig.aliyunConfig.accessKeyId,
      accessKeySecret: globalConfig.aliyunConfig.accessKeySecret
    })
    const data = (res as any)?.instances !== undefined ? res : ((res as any)?.data || res)
    if (data?.success) {
      aliyunInstances.value = data.instances || []
      if (aliyunInstances.value.length === 0) {
        ElMessage.warning('该账号下暂无云联络中心实例，请先在阿里云控制台创建实例')
      } else {
        // 只有一个实例时自动选中
        if (aliyunInstances.value.length === 1) {
          globalConfig.aliyunConfig.appId = aliyunInstances.value[0].id
        }
        ElMessage.success(`获取到 ${aliyunInstances.value.length} 个实例，请在下拉框中选择`)
      }
    } else {
      ElMessage.error(data?.message || '获取实例列表失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取实例列表失败')
  } finally {
    loadingInstances.value = false
  }
}

// 获取阿里云实例下的号码列表
const fetchAliyunNumbers = async () => {
  if (!globalConfig.aliyunConfig.accessKeyId || !globalConfig.aliyunConfig.accessKeySecret) {
    ElMessage.warning('请先填写 AccessKey ID 和 AccessKey Secret')
    return
  }
  if (!globalConfig.aliyunConfig.appId) {
    ElMessage.warning('请先填写或获取实例ID')
    return
  }
  loadingNumbers.value = true
  try {
    const res = await callConfigApi.getAliyunNumbers({
      config: {
        accessKeyId: globalConfig.aliyunConfig.accessKeyId,
        accessKeySecret: globalConfig.aliyunConfig.accessKeySecret
      },
      instanceId: globalConfig.aliyunConfig.appId
    })
    const data = (res as any)?.numbers !== undefined ? res : ((res as any)?.data || res)
    if (data?.success) {
      aliyunNumbers.value = data.numbers || []
      if (aliyunNumbers.value.length === 0) {
        ElMessage.warning('该实例下暂无号码。请在阿里云云联络中心控制台「号码管理」中购买号码并绑定到实例，或手动输入号码')
      } else {
        // 自动把获取到的号码并入号码池
        const existing = new Set(globalConfig.aliyunConfig.numberList || [])
        aliyunNumbers.value.forEach(n => existing.add(n.number))
        globalConfig.aliyunConfig.numberList = Array.from(existing)
        ElMessage.success(`获取到 ${aliyunNumbers.value.length} 个号码，已加入号码池，保存配置后生效`)
      }
    } else {
      ElMessage.error(data?.message || '获取号码列表失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取号码列表失败')
  } finally {
    loadingNumbers.value = false
  }
}

// 获取云联络中心坐席列表（软电话/硬话机模式绑定坐席）
const fetchCccUsers = async () => {
  loadingCccUsers.value = true
  try {
    const res = await callConfigApi.getAliyunCccUsers({
      instanceId: globalConfig.aliyunConfig.appId || undefined
    })
    const data = (res as any)?.users !== undefined ? res : ((res as any)?.data || res)
    if (data?.success) {
      cccUsers.value = data.users || []
      if (cccUsers.value.length === 0) {
        ElMessage.warning('该实例下暂无坐席，请先在阿里云云联络中心控制台的「坐席管理」中添加坐席')
      } else {
        ElMessage.success(`获取到 ${cccUsers.value.length} 个坐席账号`)
      }
    } else {
      ElMessage.error(data?.message || '获取坐席列表失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取坐席列表失败')
  } finally {
    loadingCccUsers.value = false
  }
}

// 打开阿里云坐席工作台
const openWorkbench = async () => {
  loadingWorkbench.value = true
  try {
    const res = await callConfigApi.getWorkbenchUrl()
    const data = (res as any)?.url !== undefined ? res : ((res as any)?.data || res)
    if (data?.success && data.url) {
      window.open(data.url, '_blank')
    } else {
      ElMessage.error(data?.message || '获取坐席工作台地址失败，请先保存配置')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取坐席工作台地址失败')
  } finally {
    loadingWorkbench.value = false
  }
}

// 分配管理
const openAssignDialog = () => {
  editingAssignment.value = null
  assignForm.userId = undefined
  assignForm.lineId = undefined
  assignForm.callerNumber = ''
  assignForm.agentPhone = ''
  assignForm.cccUserId = ''
  assignForm.dailyLimit = 100
  assignForm.isDefault = false
  // 强制刷新线路与号码池，避免刚保存的配置/自动创建的线路未同步
  loadCallLines()
  loadGlobalConfig()
  if (userList.value.length === 0) {
    loadUserList()
  }
  assignDialogVisible.value = true
}

// 编辑已有分配：预填表单，保存时走更新接口
const openEditAssignDialog = (assignment: UserLineAssignment) => {
  editingAssignment.value = assignment
  assignForm.userId = assignment.userId as any
  assignForm.lineId = assignment.lineId
  assignForm.callerNumber = assignment.callerNumber || ''
  assignForm.agentPhone = assignment.agentPhone || ''
  assignForm.cccUserId = assignment.cccUserId || ''
  assignForm.dailyLimit = assignment.dailyLimit || 100
  assignForm.isDefault = assignment.isDefault
  loadCallLines()
  loadGlobalConfig()
  if (userList.value.length === 0) {
    loadUserList()
  }
  assignDialogVisible.value = true
}

const saveAssignment = async () => {
  try {
    await assignFormRef.value?.validate()
    savingAssignment.value = true
    // 选中的坐席带分机号则一并保存（否则后端会自动向阿里云查询）
    const selectedAgent = cccUsers.value.find(u => u.userId === assignForm.cccUserId)

    if (editingAssignment.value) {
      await callConfigApi.updateAssignment(editingAssignment.value.id, {
        lineId: assignForm.lineId!,
        callerNumber: assignForm.callerNumber || '',
        agentPhone: assignForm.agentPhone || '',
        cccUserId: assignForm.cccUserId || '',
        agentExtension: selectedAgent?.extension,
        sipExtension: selectedAgent?.sipExtension,
        dailyLimit: assignForm.dailyLimit,
        isDefault: assignForm.isDefault
      })
      ElMessage.success('分配已更新')
    } else {
      await callConfigApi.assignLineToUser({
        userId: assignForm.userId!,
        lineId: assignForm.lineId!,
        callerNumber: assignForm.callerNumber || undefined,
        agentPhone: assignForm.agentPhone || undefined,
        cccUserId: assignForm.cccUserId || undefined,
        agentExtension: selectedAgent?.extension || undefined,
        sipExtension: selectedAgent?.sipExtension || undefined,
        dailyLimit: assignForm.dailyLimit,
        isDefault: assignForm.isDefault
      })
      ElMessage.success('分配成功')
    }
    assignDialogVisible.value = false
    editingAssignment.value = null
    loadAssignments()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '保存失败')
    }
  } finally {
    savingAssignment.value = false
  }
}

// 启用/禁用分配：禁用后员工看不到该线路，号码释放；启用前校验号码未被他人占用（后端也会校验）
const toggleAssignmentActive = async (assignment: UserLineAssignment) => {
  const action = assignment.isActive ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      assignment.isActive
        ? `禁用后 ${assignment.userName} 将看不到该线路和号码，号码 ${assignment.callerNumber || ''} 释放为可分配。确定禁用？`
        : `启用后 ${assignment.userName} 恢复使用该线路外呼。确定启用？`,
      `确认${action}`,
      { type: 'warning' }
    )
    const res: any = await callConfigApi.updateAssignment(assignment.id, { isActive: !assignment.isActive })
    ElMessage.success(res?.message || `已${action}`)
    loadAssignments()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || `${action}失败`)
    }
  }
}

const removeAssignment = async (assignment: UserLineAssignment) => {
  try {
    await ElMessageBox.confirm(`确定要取消${assignment.userName}的线路分配吗？`, '确认取消', { type: 'warning' })
    await callConfigApi.removeLineAssignment(assignment.id)
    ElMessage.success('已取消分配')
    loadAssignments()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '操作失败')
    }
  }
}

// 全局配置
const saveGlobalConfig = async () => {
  savingGlobal.value = true
  try {
    const config: Record<string, any> = {
      voip_provider: 'aliyun',
      aliyun_config: globalConfig.aliyunConfig
    }
    const res: any = await callConfigApi.updateGlobalConfig(config)
    ElMessage.success(res?.message || '配置已保存')
    // 保存后可能自动创建了阿里云线路，刷新线路与配置（密钥变为掩码显示）
    loadCallLines()
    loadGlobalConfig()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingGlobal.value = false
  }
}

const testVoipConnection = async () => {
  if (!globalConfig.aliyunConfig.accessKeyId || !globalConfig.aliyunConfig.accessKeySecret || !globalConfig.aliyunConfig.appId) {
    ElMessage.warning('请先填写阿里云 AccessKey ID、AccessKey Secret 和实例ID')
    return
  }

  testingVoip.value = true
  try {
    // 使用当前表单中的配置直接测试（真实调用 GetInstance 验证）
    const res = await callConfigApi.testVoipConfig({
      provider: 'aliyun',
      config: globalConfig.aliyunConfig
    })
    const result = (res as any)?.success !== undefined && (res as any)?.data ? (res as any).data : res
    const testData = (result as any)?.latency !== undefined ? result : ((result as any)?.data || result)

    if (testData?.success) {
      ElMessage.success(`连接测试成功 (延迟: ${testData.latency || 0}ms) - ${testData.message || ''}`)
    } else {
      ElMessage.warning(testData?.message || '连接测试失败，请检查配置')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '连接测试失败')
  } finally {
    testingVoip.value = false
  }
}

// 测试单条线路连接
const testLineConnection = async (line: CallLine) => {
  // 使用Vue的响应式方式标记加载
  ;(line as any)._testing = true
  try {
    const res = await callConfigApi.testLineConnection(line.id)
    const result = (res as any)?.success !== undefined ? res : (res as any)?.data || res
    const testData = (result as any)?.data || result

    if (testData?.success) {
      ElMessage.success(`线路 "${line.name}" 测试通过 (延迟: ${testData.latency || 0}ms)`)
      // 刷新线路列表以更新状态
      loadCallLines()
    } else {
      ElMessage.error(`线路 "${line.name}" 测试失败: ${testData?.message || '未知错误'}`)
    }
  } catch (e: any) {
    ElMessage.error(`线路测试异常: ${e.message || '请稍后重试'}`)
  } finally {
    ;(line as any)._testing = false
  }
}

// 用户偏好
const saveUserPreference = async () => {
  savingPreference.value = true
  try {
    await callConfigApi.updateUserPreference(userPreference)
    ElMessage.success('设置已保存')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingPreference.value = false
  }
}


// 工作手机
const showBindQRCode = async () => {
  qrDialogVisible.value = true
  qrCodeUrl.value = ''
  bindStatus.value = 'pending'
  await generateQRCode()
}

const generateQRCode = async () => {
  try {
    const res = await callConfigApi.generateWorkPhoneQRCode()
    console.log('[CallConfig] generateQRCode response:', res)
    // request.ts 返回的是 data，所以 res 直接是 {qrCodeUrl, connectionId, expiresAt}
    if (res && (res as any).qrCodeUrl) {
      qrCodeUrl.value = (res as any).qrCodeUrl
      connectionId.value = (res as any).connectionId
      startBindCheck()
    } else if (res && (res as any).success && (res as any).data) {
      // 兼容完整响应格式
      qrCodeUrl.value = (res as any).data.qrCodeUrl
      connectionId.value = (res as any).data.connectionId
      startBindCheck()
    } else {
      ElMessage.error('生成二维码失败')
    }
  } catch (_e) {
    console.error('[CallConfig] generateQRCode error:', _e)
    ElMessage.error('生成二维码失败')
  }
}

const refreshQRCode = () => {
  stopBindCheck()
  generateQRCode()
}

const startBindCheck = () => {
  stopBindCheck()
  bindCheckTimer = setInterval(async () => {
    try {
      const res = await callConfigApi.checkWorkPhoneBindStatus(connectionId.value)
      console.log('[CallConfig] checkWorkPhoneBindStatus response:', res)
      // 处理不同的响应格式
      const status = (res as any).status || ((res as any).data?.status)
      if (status) {
        bindStatus.value = status
        if (status === 'connected') {
          stopBindCheck()
          ElMessage.success('绑定成功')
          loadWorkPhones()
          setTimeout(() => {
            qrDialogVisible.value = false
          }, 1500)
        } else if (status === 'expired') {
          stopBindCheck()
        }
      }
    } catch (_e) {
      console.error('检查绑定状态失败:', _e)
    }
  }, 2000)
}

const stopBindCheck = () => {
  if (bindCheckTimer) {
    clearInterval(bindCheckTimer)
    bindCheckTimer = null
  }
}

const setAsPrimary = async (phone: WorkPhone) => {
  try {
    await callConfigApi.setPrimaryWorkPhone(phone.id)
    ElMessage.success('已设为主要手机')
    loadWorkPhones()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

const unbindPhone = async (phone: WorkPhone) => {
  try {
    console.log('[unbindPhone] phone:', phone)
    console.log('[unbindPhone] phone.id:', phone.id, 'type:', typeof phone.id)

    // 🔥 修复：确保 phone.id 存在
    if (!phone.id && phone.id !== 0) {
      console.error('[unbindPhone] phone.id 为空，无法解绑')
      ElMessage.error('手机ID无效，无法解绑')
      return
    }

    await ElMessageBox.confirm(`确定要解绑手机 ${phone.phoneNumber} 吗？`, '确认解绑', { type: 'warning' })

    // 🔥 修复：确保传递正确的 ID
    const phoneId = phone.id
    console.log('[unbindPhone] 调用API解绑，phoneId:', phoneId)

    await callConfigApi.unbindWorkPhone(phoneId)
    ElMessage.success('解绑成功')
    loadWorkPhones()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      console.error('[unbindPhone] 解绑失败:', e)
      ElMessage.error(e.message || '解绑失败')
    }
  }
}

// 跳转到帮助中心-通话管理配置指南
const goToCallConfigGuide = () => {
  // 关闭当前弹窗
  visible.value = false
  // 跳转到帮助中心对应章节
  router.push('/help-center?section=call-config-guide')
}

const goToMobileAppDownload = () => {
  visible.value = false
  router.push('/mobile-app-download')
}

const handleClose = () => {
  stopBindCheck()
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    loadData()
  } else {
    stopBindCheck()
  }
})

onMounted(() => {
  if (visible.value) {
    loadData()
  }
})
</script>

<style scoped lang="scss">
.help-link-bar {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f7ff 100%);
  border: 1px solid #d4e8ff;
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;

  .help-link-btn {
    font-size: 14px;
    font-weight: 500;
    color: #409eff;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    height: auto;

    &:hover {
      color: #337ecc;
    }

    .help-link-icon {
      font-size: 18px;
      color: #409eff;
    }

    .help-link-arrow {
      font-size: 14px;
      margin-left: 2px;
      transition: transform 0.2s;
    }

    &:hover .help-link-arrow {
      transform: translateX(3px);
    }
  }
}

.config-section {
  padding: 16px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-title {
      font-size: 15px;
      font-weight: 500;
      color: #303133;
    }

    .section-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.work-phones-list {
  .phone-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    margin-bottom: 12px;

    &:hover {
      border-color: #409eff;
      background: #f5f7fa;
    }

    .phone-info {
      .phone-number {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .phone-meta {
        font-size: 13px;
        color: #909399;
        margin-top: 4px;
      }

      .phone-status {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
      }
    }

    .phone-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.my-lines-list {
  .line-item {
    padding: 12px 16px;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    margin-bottom: 8px;

    .line-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .line-name {
        font-weight: 500;
        color: #303133;
      }
    }

    .line-meta {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.qr-bind-content {
  text-align: center;

  .qr-code-wrapper {
    .qr-code-img {
      width: 200px;
      height: 200px;
      border: 1px solid #ebeef5;
      border-radius: 8px;
    }

    .qr-status {
      margin-top: 12px;
      font-size: 14px;
      color: #606266;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  }

  .qr-loading {
    padding: 40px;
    color: #909399;

    p {
      margin-top: 12px;
    }
  }

  .qr-tips {
    margin-top: 20px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;
    text-align: left;
    font-size: 13px;
    color: #606266;

    p {
      margin: 4px 0;
    }
  }
}
</style>
