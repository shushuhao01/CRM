<template>
  <div class="sidebar-preview-wrapper">
    <div class="phone-frame">
      <div class="phone-status-bar">
        <span>企业微信</span>
        <span style="font-size:10px">侧边栏</span>
      </div>

      <div class="phone-body" v-loading="loading">
        <!-- 绑定前：登录页 -->
        <div v-if="step === 'login'" class="preview-login">
          <div class="login-logo">☁️</div>
          <h4>云客CRM</h4>
          <p class="login-desc">绑定CRM账号查看客户信息</p>
          <div class="preview-form">
            <div class="form-group">
              <label>租户编码 / 授权码</label>
              <input v-model="loginTenantCode" placeholder="租户编码或私有授权码" class="preview-input" />
              <div style="font-size:10px;color:#909399;margin-top:2px">私有部署填授权码，SaaS填租户编码</div>
            </div>
            <div class="form-group">
              <label>用户名</label>
              <input v-model="loginUsername" placeholder="CRM登录用户名" class="preview-input" />
            </div>
            <div class="form-group">
              <label>密码</label>
              <input v-model="loginPassword" type="password" placeholder="CRM登录密码" class="preview-input" />
            </div>
            <button class="preview-btn" @click="handlePreviewLogin">绑定账号</button>
          </div>
          <div class="login-tip">
            <p>💡 员工在企微聊天侧边栏首次打开时需绑定CRM账号</p>
          </div>
        </div>

        <!-- ========== 客户详情视图 ========== -->
        <div v-else-if="step === 'detail' && appId === 'crm-detail'" class="preview-detail">
          <div class="preview-user-bar">
            <span>{{ boundUserName }}</span>
            <div>
              <span class="action-link" @click="step = 'login'">换绑</span>
              <span class="action-link" @click="step = 'login'" style="margin-left:8px">退出</span>
            </div>
          </div>
          <div class="preview-card" v-if="customerData">
            <div class="customer-head">
              <span class="avatar">👤</span>
              <div>
                <div class="customer-name">{{ customerData.name || '示例客户' }}</div>
                <div class="customer-company" v-if="customerData.company">{{ customerData.company }}</div>
                <div class="customer-follow">跟进人: {{ customerData.salesPersonName || '-' }}</div>
              </div>
            </div>
          </div>
          <!-- 企微客户详情卡片 -->
          <div class="preview-card">
            <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
              <span>💬 企微客户详情</span>
              <button class="link-crm-btn" @click="showLinkCrmDialog = true">🔗 关联CRM</button>
            </div>
            <div class="info-row"><span class="label">昵称</span><span>{{ customerData?.wecomNickname || customerData?.name || '-' }}</span></div>
            <div class="info-row"><span class="label">性别</span><span>{{ customerData?.wecomGender === 1 ? '男' : customerData?.wecomGender === 2 ? '女' : customerData?.gender || '-' }}</span></div>
            <div class="info-row"><span class="label">添加方式</span><span>{{ customerData?.wecomAddWay || '-' }}</span></div>
            <div class="info-row"><span class="label">添加时间</span><span>{{ customerData?.wecomAddTime ? formatTime(customerData.wecomAddTime) : '-' }}</span></div>
            <div class="info-row">
              <span class="label">UserID</span>
              <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;word-break:break-all">
                {{ customerData?.wecomUserId || customerData?.externalUserId || '-' }}
                <span v-if="customerData?.wecomUserId || customerData?.externalUserId" class="copy-icon-btn" @click="copyToClipboard(customerData?.wecomUserId || customerData?.externalUserId)" title="复制">⧉</span>
              </span>
            </div>
          </div>
          <div class="preview-card">
            <div class="card-title">👤 CRM客户信息</div>
            <div class="info-row" v-if="customerData?.name"><span class="label">姓名</span><span>{{ customerData.name }}</span></div>
            <div class="info-row" v-if="customerData?.phone"><span class="label">手机</span><span>{{ maskPhone(customerData.phone) }}</span></div>
            <div class="info-row" v-if="customerData?.email"><span class="label">邮箱</span><span>{{ maskEmail(customerData.email) }}</span></div>
            <div class="info-row" v-if="customerData?.wechatId || customerData?.wechat"><span class="label">微信</span><span>{{ maskWechat(customerData.wechatId || customerData.wechat) }}</span></div>
            <div class="info-row"><span class="label" style="white-space:nowrap">身高/年龄/体重</span><span style="white-space:nowrap">{{ customerData?.height || '-' }}cm / {{ customerData?.age || '-' }}岁 / {{ customerData?.weight || '-' }}kg</span></div>
            <div class="info-row"><span class="label">性别</span><span>{{ customerData?.gender === 'male' ? '男' : customerData?.gender === 'female' ? '女' : customerData?.gender || '-' }}</span></div>
            <div class="info-row"><span class="label">地址</span><span>{{ customerData?.address || '-' }}</span></div>
            <div class="info-row"><span class="label">疾病史</span><span>{{ customerData?.medicalHistory || '-' }}</span></div>
            <div class="info-row" v-if="customerData?.followStatus"><span class="label">状态</span><span>{{ transFollowStatus(customerData.followStatus) }}</span></div>
            <div class="customer-tags" v-if="customerData?.tags">
              <span class="mini-tag" v-for="t in parseTags(customerData.tags)" :key="t">{{ t }}</span>
            </div>
          </div>
          <div class="preview-card">
            <div class="card-title">📊 购买统计</div>
            <div class="stats-row">
              <div class="stat"><div class="stat-val">{{ customerData?.orderCount || 0 }}</div><div class="stat-lbl">订单数</div></div>
              <div class="stat"><div class="stat-val amount">¥{{ Number(customerData?.totalAmount || 0).toFixed(0) }}</div><div class="stat-lbl">累计消费</div></div>
              <div class="stat"><div class="stat-val">{{ portraitLastOrderDays }}</div><div class="stat-lbl">最后购买</div></div>
            </div>
          </div>
          <div class="preview-card" v-if="orders.length || orderTotal > 0">
            <div class="card-title">📋 最近订单</div>
            <div class="order-item" v-for="o in orders" :key="o.id">
              <div class="order-head">
                <span class="order-no">{{ o.orderNumber }}</span>
                <span class="order-status" :style="{ color: orderStatusColor(o.status) }">{{ transOrderStatus(o.status) }}</span>
              </div>
              <div class="order-body">
                <span class="order-amount">¥{{ Number(o.finalAmount || o.totalAmount || 0).toFixed(2) }}</span>
                <span class="order-time">{{ formatTime(o.createdAt) }}</span>
              </div>
            </div>
            <div v-if="orderTotal > orderPageSize" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:11px;color:#909399">
              <span class="action-link" :style="{ opacity: orderPage > 1 ? 1 : 0.4, cursor: orderPage > 1 ? 'pointer' : 'default' }" @click="prevOrderPage">‹ 上一页</span>
              <span>{{ orderPage }} / {{ Math.ceil(orderTotal / orderPageSize) }}</span>
              <span class="action-link" :style="{ opacity: orderPage * orderPageSize < orderTotal ? 1 : 0.4, cursor: orderPage * orderPageSize < orderTotal ? 'pointer' : 'default' }" @click="nextOrderPage">下一页 ›</span>
            </div>
          </div>
          <div class="preview-card">
            <div class="card-title">🔗 绑定信息</div>
            <div class="info-row"><span class="label">CRM用户</span><span>{{ boundUserName }}</span></div>
            <div class="info-row"><span class="label">租户编码</span><span>{{ tenantCode }}</span></div>
            <div class="info-row"><span class="label">绑定时间</span><span>{{ new Date().toLocaleDateString('zh-CN') }}</span></div>
          </div>
          <div style="padding:8px 12px">
            <button class="preview-btn full" :disabled="!customerData?.id" @click="openFullDetail">查看完整客户详情</button>
            <button class="preview-btn" style="margin-top:6px" :disabled="!customerData?.id" @click="goToQuickOrderWithCustomer">🛒 去下单</button>
          </div>
        </div>

        <!-- ========== 快捷话术视图 ========== -->
        <div v-else-if="step === 'detail' && appId === 'scripts'" class="preview-detail">
          <div class="preview-user-bar">
            <span>{{ boundUserName }}</span>
            <div>
              <span class="action-link" style="margin-left:6px" @click="step = 'login'">退出</span>
            </div>
          </div>
          <div style="padding:6px 10px;position:relative">
            <input v-model="sScriptSearch" placeholder="🔍 搜索话术关键词..." class="preview-input" style="font-size:11px;padding-right:24px" />
            <span v-if="sScriptSearch" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);cursor:pointer;color:#C0C4CC;font-size:13px;line-height:1" @click="sScriptSearch = ''" title="清空搜索">✕</span>
          </div>
          <!-- 操作按钮 -->
          <div style="display:flex;gap:4px;padding:0 10px 6px">
            <button class="link-crm-btn" style="flex:1;text-align:center" @click="sShowCatDialog = true">📁 管理分组</button>
            <button class="link-crm-btn" style="flex:1;text-align:center" @click="sOpenAddScript(null)">＋ 新建话术</button>
          </div>
          <!-- 搜索下拉结果 -->
          <div v-if="sScriptSearch && sSearchResults.length" class="s-search-dropdown">
            <div class="s-search-item" v-for="s in sSearchResults" :key="s.id"
              :title="s.content"
              @click.stop="sSend(s)" @dblclick.stop="sSendToEditBox(s)" @contextmenu.prevent="sShowCtxMenu($event, s)">
              <span class="s-scope-dot" :style="{ background: s.scope === 'personal' ? '#e6a23c' : '#07c160' }"></span>
              <span v-if="sHasAttachments(s)" class="s-att-icon">🖼️</span>
              <span class="s-search-title" :style="s.color ? { color: s.color } : {}">{{ s.title || '无标题' }}</span>
              <span class="s-search-content">{{ s.content }}</span>
              <span class="script-send-icon" title="点击发送" @click.stop="sSend(s)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></span>
            </div>
          </div>
          <div v-if="sScriptSearch && !sSearchResults.length" class="s-search-dropdown" style="text-align:center;padding:12px;color:#c0c4cc;font-size:11px">无匹配话术</div>
          <!-- 左右布局：左侧分组列表 + 可拖拽分割线 + 右侧话术列表 -->
          <div class="s-layout" v-show="!sScriptSearch">
            <div class="s-cat-panel" :style="{ width: sCatPanelWidth + 'px' }">
              <div class="s-cat-item" :class="{ active: sSelectedCatId === null }" @click="sSelectedCatId = null">
                <span class="script-group-color" style="background:#909399"></span>
                <span style="flex:1;font-size:11px">全部</span>
                <span style="font-size:10px;color:#c0c4cc">{{ sAllScripts.length }}</span>
              </div>
              <div class="s-cat-item" v-for="cat in sCategories" :key="cat.id" :class="{ active: sSelectedCatId === cat.id }" @click="sSelectedCatId = cat.id"
                @contextmenu.prevent="sShowCatCtxMenu($event, cat)"
                draggable="true" @dragstart="sDragCat($event, cat)" @dragover.prevent @drop="sDropCat($event, cat)">
                <span class="script-group-color" :style="{ background: cat.color || (cat.scope === 'personal' ? '#e6a23c' : '#07c160') }"></span>
                <span style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ cat.name }}</span>
                <span style="font-size:10px;color:#c0c4cc">{{ (sCatScriptCount[cat.id] || 0) }}</span>
              </div>
              <div class="s-cat-item" :class="{ active: sSelectedCatId === 0 }" @click="sSelectedCatId = 0">
                <span class="script-group-color" style="background:#c0c4cc"></span>
                <span style="flex:1;font-size:11px">未分组</span>
                <span style="font-size:10px;color:#c0c4cc">{{ sUncategorized.length }}</span>
              </div>
            </div>
            <div class="s-resizer" @mousedown="sStartResize"></div>
            <div class="s-script-panel">
              <div v-if="sDisplayScripts.length === 0" style="text-align:center;padding:30px 6px;color:#c0c4cc;font-size:11px">
                暂无话术
              </div>
              <div class="script-item" v-for="(s, idx) in sDisplayScripts" :key="s.id"
                :title="s.content"
                @dblclick.stop="sSendToEditBox(s)"
                @contextmenu.prevent="sShowCtxMenu($event, s)"
                draggable="true" @dragstart="sDragScript($event, s)" @dragover.prevent @drop="sDropScript($event, s)">
                <span class="script-idx">{{ idx + 1 }}</span>
                <span class="s-scope-dot" :style="{ background: s.scope === 'personal' ? '#e6a23c' : '#07c160' }"></span>
                <span v-if="sHasAttachments(s)" class="s-att-icon">🖼️</span>
                <span class="script-title-text" :style="s.color ? { color: s.color } : {}">{{ s.title || '无标题' }}</span>
                <span class="script-content-inline">{{ s.content }}</span>
                <span class="script-send-icon" title="点击发送" @click.stop="sSend(s)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></span>
              </div>
            </div>
          </div>
          <!-- 右键菜单 -->
          <teleport to="body">
            <div v-if="sCtxMenu.visible" class="s-ctx-menu" :style="{ left: sCtxMenu.x + 'px', top: sCtxMenu.y + 'px' }" @click="sCtxMenu.visible = false">
              <div class="s-ctx-item" @click="sOpenAddScript(sCtxMenu.script)">✏️ 编辑</div>
              <div class="s-ctx-item" @click="sDelScript(sCtxMenu.script)">🗑️ 删除</div>
              <div class="s-ctx-item" @click="sCopyScript(sCtxMenu.script)">📋 复制内容</div>
              <div class="s-ctx-item" @click="sInsertScript(sCtxMenu.script)">➕ 在此插入话术</div>
              <div class="s-ctx-item" v-if="sScriptSearch" @click="sLocateScript(sCtxMenu.script)">📍 定位所在位置</div>
            </div>
            <div v-if="sCatCtxMenu.visible" class="s-ctx-menu" :style="{ left: sCatCtxMenu.x + 'px', top: sCatCtxMenu.y + 'px' }" @click="sCatCtxMenu.visible = false">
              <div class="s-ctx-item" @click="sRenameCat(sCatCtxMenu.cat)">✏️ 重命名</div>
              <div class="s-ctx-item" @click="sDelCat(sCatCtxMenu.cat)">🗑️ 删除分组</div>
            </div>
          </teleport>
          <!-- 管理分组弹窗 -->
          <div v-if="sShowCatDialog" class="s-dialog-overlay" @click.self="sShowCatDialog = false">
            <div class="s-dialog">
              <div class="s-dialog-header">
                <span>📁 管理分组</span>
                <span class="action-link" @click="sShowCatDialog = false">✕</span>
              </div>
              <div class="s-dialog-body">
                <!-- 新建分组表单 -->
                <div style="background:#f9fafb;border-radius:8px;padding:8px;margin-bottom:10px">
                  <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center">
                    <input v-model="sNewCatName" placeholder="分组名称" class="preview-input" style="flex:1;font-size:11px" @keyup.enter="sSaveCat" />
                    <select v-model="sNewCatScope" class="preview-input" style="width:65px;font-size:10px;padding:3px 4px">
                      <option value="public">🌐 公共</option>
                      <option value="personal">👤 个人</option>
                    </select>
                    <button class="link-crm-btn" @click="sSaveCat">{{ sEditingCatId ? '保存' : '添加' }}</button>
                    <button v-if="sEditingCatId" class="link-crm-btn" style="color:#f56c6c" @click="sCancelEditCat">取消</button>
                  </div>
                  <div style="display:flex;gap:2px;align-items:center">
                    <span style="font-size:10px;color:#909399;margin-right:2px">颜色：</span>
                    <span v-for="c in sColors" :key="c" class="color-dot" :style="{ background: c }" :class="{ active: sNewCatColor === c }" @click="sNewCatColor = sNewCatColor === c ? '' : c"></span>
                  </div>
                </div>
                <!-- 分组列表 -->
                <div v-for="(cat, catIdx) in sCategories" :key="cat.id" class="s-cat-manage-item"
                  draggable="true" @dragstart="sDragCatManage($event, catIdx)" @dragover.prevent @drop="sDropCatManage($event, catIdx)">
                  <span style="cursor:grab;color:#c0c4cc;margin-right:2px;font-size:10px">⠿</span>
                  <span class="script-group-color" :style="{ background: cat.color || (cat.scope === 'personal' ? '#e6a23c' : '#07c160') }"></span>
                  <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ cat.name }}</span>
                  <span class="s-scope-badge" :class="cat.scope === 'personal' ? 'personal' : 'public'">{{ cat.scope === 'personal' ? '个人' : '公共' }}</span>
                  <span style="font-size:10px;color:#c0c4cc;margin:0 4px">{{ sCatScriptCount[cat.id] || 0 }}</span>
                  <span class="action-link" style="font-size:10px;color:#409eff;margin-right:4px" @click="sStartEditCat(cat)">编辑</span>
                  <span class="action-link" style="font-size:10px;color:#f56c6c" @click="sDelCat(cat)">删除</span>
                </div>
                <div v-if="!sCategories.length" style="text-align:center;padding:16px;color:#c0c4cc;font-size:11px">暂无分组</div>
              </div>
            </div>
          </div>
          <!-- 新建/编辑话术弹窗 -->
          <div v-if="sShowAddScript" class="s-dialog-overlay" @click.self="sShowAddScript = false">
            <div class="s-dialog">
              <div class="s-dialog-header">
                <span>{{ sEditScript ? '编辑话术' : '新建话术' }}</span>
                <span class="action-link" @click="sShowAddScript = false">✕</span>
              </div>
              <div class="s-dialog-body">
                <input v-model="sScriptForm.title" placeholder="话术标题" class="preview-input" style="font-size:11px;margin-bottom:6px" />
                <textarea v-model="sScriptForm.content" placeholder="话术内容..." class="preview-input" style="font-size:11px;min-height:60px;resize:vertical;margin-bottom:6px"></textarea>
                <select v-model="sScriptForm.categoryId" class="preview-input" style="font-size:11px;margin-bottom:6px">
                  <option :value="null">未分组</option>
                  <option v-for="cat in sCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
                  <span style="font-size:10px;color:#909399">类型：</span>
                  <span class="s-scope-radio" :class="{ active: sScriptForm.scope === 'public' }" @click="sScriptForm.scope = 'public'">🌐 公共</span>
                  <span class="s-scope-radio" :class="{ active: sScriptForm.scope === 'personal' }" @click="sScriptForm.scope = 'personal'">👤 个人</span>
                </div>
                <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px">
                  <span style="font-size:10px;color:#909399">颜色：</span>
                  <span v-for="c in sColors" :key="c" class="color-dot" :style="{ background: c }" :class="{ active: sScriptForm.color === c }" @click="sScriptForm.color = c"></span>
                </div>
                <!-- 附件上传 -->
                <div style="margin-bottom:6px">
                  <div v-if="sScriptForm.attachments && sScriptForm.attachments.length" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">
                    <div v-for="(att, idx) in sScriptForm.attachments" :key="idx" style="position:relative;width:40px;height:40px">
                      <img v-if="att.type && att.type.startsWith('image/')" :src="att.url" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;cursor:pointer" @click="sPreviewImage = att.url" />
                      <span v-else style="display:flex;width:40px;height:40px;align-items:center;justify-content:center;background:#f5f5f5;border-radius:4px;font-size:16px">📎</span>
                      <span style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#f56c6c;color:#fff;border-radius:50%;font-size:8px;display:flex;align-items:center;justify-content:center;cursor:pointer" @click="sScriptForm.attachments.splice(idx, 1)">✕</span>
                    </div>
                  </div>
                  <div style="display:flex;gap:4px">
                    <label class="link-crm-btn s-upload-btn" style="cursor:pointer;font-size:10px">📎 上传<input type="file" accept="*/*" style="display:none" multiple @change="sHandleFileUpload" /></label>
                    <button class="link-crm-btn s-upload-btn" style="font-size:10px" @click="sHandlePasteUpload">📋 粘贴</button>
                  </div>
                </div>
                <div style="display:flex;gap:6px;justify-content:flex-end">
                  <button class="link-crm-btn" style="color:#909399;border-color:#dcdfe6" @click="sShowAddScript = false">取消</button>
                  <button class="link-crm-btn" @click="sSaveScript">保存</button>
                </div>
              </div>
            </div>
          </div>
          <!-- 图片预览遮罩 -->
          <div v-if="sPreviewImage" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center" @click="sPreviewImage = ''">
            <img :src="sPreviewImage" style="max-width:90%;max-height:90%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3)" />
          </div>
        </div>

        <!-- ========== 快捷下单视图 ========== -->
        <div v-else-if="step === 'detail' && appId === 'quick-order'" class="preview-detail">
          <div class="preview-user-bar">
            <span>{{ boundUserName }}</span>
            <div><span class="action-link" @click="step = 'login'">退出</span></div>
          </div>

          <!-- 步骤指示器 -->
          <div class="qo-steps">
            <div class="qo-step" :class="{ active: qoStep === 1, done: qoStep > 1 }" @click="qoStep > 1 && (qoStep = 1)">
              <span class="step-num">{{ qoStep > 1 ? '✓' : '1' }}</span><span class="step-text">选客户</span>
            </div>
            <div class="qo-step-line" :class="{ active: qoStep > 1 }"></div>
            <div class="qo-step" :class="{ active: qoStep === 2, done: qoStep > 2 }" @click="qoStep > 2 && (qoStep = 2)">
              <span class="step-num">{{ qoStep > 2 ? '✓' : '2' }}</span><span class="step-text">选产品</span>
            </div>
            <div class="qo-step-line" :class="{ active: qoStep > 2 }"></div>
            <div class="qo-step" :class="{ active: qoStep === 3, done: qoStep > 3 }">
              <span class="step-num">{{ qoStep > 3 ? '✓' : '3' }}</span><span class="step-text">确认下单</span>
            </div>
          </div>

          <!-- 步骤1: 选择/新建客户 -->
          <div v-if="qoStep === 1" class="qo-step-content">
            <!-- 模式切换Tab -->
            <div class="qo-mode-tabs">
              <span class="qo-mode-tab" :class="{ active: qoCustomerMode === 'search' }" @click="qoCustomerMode = 'search'">🔍 搜索客户</span>
              <span class="qo-mode-tab" :class="{ active: qoCustomerMode === 'new' }" @click="qoCustomerMode = 'new'">➕ 新建客户</span>
            </div>

            <!-- 搜索已有客户 -->
            <div v-if="qoCustomerMode === 'search'">
              <div class="preview-card">
                <div class="card-title">👤 搜索已有客户</div>
                <div class="qo-search-box">
                  <input v-model="qoCustomerKeyword" placeholder="搜索姓名/手机号..." class="preview-input" @input="searchQoCustomers" @focus="!qoCustomerList.length && !qoCustomerKeyword && loadQoCustomerDefault()" />
                </div>
                <!-- 自动匹配提示 -->
                <div v-if="qoAutoMatchedCustomer" class="qo-auto-match">
                  <div class="qo-match-badge">✅ 已匹配CRM客户</div>
                  <div class="qo-customer-item selected" @click="selectQoCustomer(qoAutoMatchedCustomer)">
                    <div class="qo-cust-name">{{ qoAutoMatchedCustomer.name }} <span class="qo-cust-phone">{{ maskPhone(qoAutoMatchedCustomer.phone) }}</span></div>
                    <div class="qo-cust-extra">
                      <span v-if="qoAutoMatchedCustomer.source" class="mini-tag">{{ transSource(qoAutoMatchedCustomer.source) }}</span>
                      <span v-if="qoAutoMatchedCustomer.level" class="mini-tag">{{ transLevel(qoAutoMatchedCustomer.level) }}</span>
                    </div>
                  </div>
                </div>
                <div class="qo-customer-list" v-if="qoCustomerList.length" @scroll="onQoCustomerScroll">
                  <div class="qo-customer-item" v-for="c in qoCustomerList" :key="c.id" :class="{ selected: qoForm.customerId === c.id }" @click="selectQoCustomer(c)">
                    <div class="qo-cust-name">{{ c.name }} <span class="qo-cust-phone">{{ maskPhone(c.phone) }}</span></div>
                    <div class="qo-cust-extra">
                      <span v-if="c.source" class="mini-tag">{{ transSource(c.source) }}</span>
                      <span v-if="c.level" class="mini-tag">{{ transLevel(c.level) }}</span>
                    </div>
                  </div>
                  <div v-if="qoCustomerLoading" style="text-align:center;padding:4px;font-size:10px;color:#c0c4cc">加载更多...</div>
                </div>
                <div v-else-if="qoCustomerKeyword && !qoCustomerLoading" class="qo-empty-hint">
                  未找到客户 · <span class="action-link" @click="qoCustomerMode = 'new'; newCustForm.phone = qoCustomerKeyword">新建客户</span>
                </div>
                <div v-else class="qo-empty-hint">输入关键词搜索客户</div>
              </div>
            </div>

            <!-- 新建客户表单 -->
            <div v-if="qoCustomerMode === 'new'">
              <div class="preview-card">
                <div class="card-title">📝 新建客户</div>
                <div class="qo-new-form">
                  <!-- 手机号（必填） -->
                  <div class="form-group">
                    <label>手机号 <span class="qo-req">*</span></label>
                    <input v-model="newCustForm.phone" placeholder="输入客户手机号" class="preview-input" @blur="checkPhoneExists" />
                    <div v-if="newCustPhoneExists" class="qo-field-hint warn">⚠ 该手机号已存在客户，<span class="action-link" @click="useExistingCustomer">点击使用</span></div>
                  </div>
                  <!-- 姓名（必填） -->
                  <div class="form-group">
                    <label>客户姓名 <span class="qo-req">*</span></label>
                    <input v-model="newCustForm.name" placeholder="输入客户姓名" class="preview-input" />
                  </div>
                  <!-- 性别 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('gender')">
                    <label>性别 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('gender')">*</span></label>
                    <div class="qo-radio-group">
                      <span class="qo-radio" :class="{ active: newCustForm.gender === '男' }" @click="newCustForm.gender = '男'">男</span>
                      <span class="qo-radio" :class="{ active: newCustForm.gender === '女' }" @click="newCustForm.gender = '女'">女</span>
                    </div>
                  </div>
                  <!-- 年龄 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('age')">
                    <label>年龄 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('age')">*</span></label>
                    <input v-model.number="newCustForm.age" placeholder="年龄" class="preview-input" type="number" />
                  </div>
                  <!-- 来源 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('source')">
                    <label>客户来源 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('source')">*</span></label>
                    <select v-model="newCustForm.source" class="preview-input">
                      <option value="">请选择</option>
                      <option value="wecom">企微</option>
                      <option value="wechat">微信</option>
                      <option value="phone">电话</option>
                      <option value="website">官网</option>
                      <option value="douyin">抖音</option>
                      <option value="referral">转介绍</option>
                      <option value="offline">线下</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <!-- 等级 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('level')">
                    <label>客户等级 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('level')">*</span></label>
                    <select v-model="newCustForm.level" class="preview-input">
                      <option value="">请选择</option>
                      <option value="bronze">铜牌</option>
                      <option value="silver">银牌</option>
                      <option value="gold">金牌</option>
                      <option value="diamond">钻石</option>
                    </select>
                  </div>
                  <!-- 状态 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('status')">
                    <label>客户状态 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('status')">*</span></label>
                    <select v-model="newCustForm.status" class="preview-input">
                      <option value="">请选择</option>
                      <option value="potential">潜在客户</option>
                      <option value="active">活跃</option>
                      <option value="inactive">不活跃</option>
                    </select>
                  </div>
                  <!-- 微信号 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('wechat')">
                    <label>微信号</label>
                    <input v-model="newCustForm.wechat" placeholder="微信号" class="preview-input" />
                  </div>
                  <!-- 邮箱 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('email')">
                    <label>邮箱</label>
                    <input v-model="newCustForm.email" placeholder="邮箱地址" class="preview-input" type="email" />
                  </div>
                  <!-- 身高 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('height')">
                    <label>身高(cm) <span class="qo-req" v-if="custFieldCfg.isFieldRequired('height')">*</span></label>
                    <input v-model.number="newCustForm.height" placeholder="身高" class="preview-input" type="number" />
                  </div>
                  <!-- 体重 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('weight')">
                    <label>体重(kg) <span class="qo-req" v-if="custFieldCfg.isFieldRequired('weight')">*</span></label>
                    <input v-model.number="newCustForm.weight" placeholder="体重" class="preview-input" type="number" />
                  </div>
                  <!-- 生日 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('birthday')">
                    <label>生日 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('birthday')">*</span></label>
                    <input v-model="newCustForm.birthday" class="preview-input" type="date" />
                  </div>
                  <!-- 进粉时间 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('fanAcquisitionTime')">
                    <label>进粉时间 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('fanAcquisitionTime')">*</span></label>
                    <input v-model="newCustForm.fanAcquisitionTime" class="preview-input" type="date" />
                  </div>
                  <!-- 标签 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('tags')">
                    <label>客户标签</label>
                    <input v-model="newCustForm.tagsStr" placeholder="多个标签用逗号分隔" class="preview-input" />
                  </div>
                  <!-- 疾病史 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('medicalHistory')">
                    <label>疾病史 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('medicalHistory')">*</span></label>
                    <input v-model="newCustForm.medicalHistory" placeholder="疾病史" class="preview-input" />
                  </div>
                  <!-- 收货地址 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('address')">
                    <label>收货地址 <span class="qo-req" v-if="custFieldCfg.isFieldRequired('address')">*</span></label>
                    <input v-model="newCustForm.address" placeholder="收货地址" class="preview-input" />
                  </div>
                  <!-- 备注 -->
                  <div class="form-group" v-if="custFieldCfg.isFieldEnabled('remark')">
                    <label>备注</label>
                    <input v-model="newCustForm.remark" placeholder="备注信息" class="preview-input" />
                  </div>
                  <!-- 自定义字段 -->
                  <template v-if="custFieldCfg.customFields.length">
                    <div class="form-group" v-for="cf in custFieldCfg.customFields" :key="cf.fieldKey">
                      <label>{{ cf.fieldName }} <span class="qo-req" v-if="cf.required">*</span></label>
                      <select v-if="cf.fieldType === 'select'" v-model="newCustForm.customFields[cf.fieldKey]" class="preview-input">
                        <option value="">请选择</option>
                        <option v-for="opt in cf.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                      <input v-else-if="cf.fieldType === 'number'" v-model.number="newCustForm.customFields[cf.fieldKey]" :placeholder="cf.placeholder || '请输入'" class="preview-input" type="number" />
                      <input v-else-if="cf.fieldType === 'date'" v-model="newCustForm.customFields[cf.fieldKey]" :placeholder="cf.placeholder || '请选择日期'" class="preview-input" type="date" />
                      <input v-else v-model="newCustForm.customFields[cf.fieldKey]" :placeholder="cf.placeholder || '请输入' + cf.fieldName" class="preview-input" />
                    </div>
                  </template>
                </div>
                <div class="qo-new-actions">
                  <button class="preview-btn" style="background:#409eff" :disabled="newCustSaving" @click="saveNewCustomer(false)">
                    {{ newCustSaving ? '保存中...' : '💾 仅保存客户' }}
                  </button>
                  <button class="preview-btn" :disabled="newCustSaving" @click="saveNewCustomer(true)">
                    {{ newCustSaving ? '保存中...' : '💾 保存并下单' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 已选客户 - 收货信息 -->
            <div class="preview-card" v-if="qoForm.customerId">
              <div class="qo-selected-cust-bar">
                <span>✅ {{ qoForm.customerName }}</span>
                <span class="action-link" @click="clearSelectedCustomer">更换</span>
              </div>
              <div class="card-title" style="margin-top:8px">📋 收货信息</div>
              <div class="form-group"><label>收货人 *</label><input v-model="qoForm.receiverName" placeholder="收货人姓名" class="preview-input" /></div>
              <div class="form-group"><label>收货电话 *</label><input v-model="qoForm.receiverPhone" placeholder="收货电话" class="preview-input" /></div>
              <div class="form-group"><label>收货地址 *</label><input v-model="qoForm.receiverAddress" placeholder="详细收货地址" class="preview-input" /></div>
              <button class="preview-btn" :disabled="!qoForm.receiverName || !qoForm.receiverPhone || !qoForm.receiverAddress" @click="qoStep = 2">下一步：选择产品</button>
            </div>
          </div>

          <!-- 步骤2: 选择产品 + 订单信息 -->
          <div v-if="qoStep === 2" class="qo-step-content">
            <div class="preview-card">
              <div class="card-title">🛒 选择产品</div>
              <div class="qo-search-box">
                <input v-model="qoProductKeyword" placeholder="搜索产品名称..." class="preview-input" @input="searchQoProducts" />
              </div>
              <div class="qo-product-list" v-if="qoProductList.length">
                <div class="qo-product-item" v-for="p in qoProductList" :key="p.id">
                  <div class="qo-prod-img">
                    <img :src="p.image || p.imageUrl || p.thumbnail || '/default-product.png'" :alt="p.name" />
                  </div>
                  <div class="qo-prod-info">
                    <div class="qo-prod-name">{{ p.name }}</div>
                    <div class="qo-prod-meta">
                      <span class="qo-prod-price">¥{{ p.price }}</span>
                      <span class="qo-prod-stock">库存 {{ p.stock }}</span>
                    </div>
                  </div>
                  <button class="qo-add-btn" @click="addQoProduct(p)" :disabled="p.stock <= 0">{{ p.stock > 0 ? '+' : '无货' }}</button>
                </div>
              </div>
              <div v-else class="qo-empty-hint">{{ qoProductKeyword ? '未找到产品' : '加载产品中...' }}</div>
            </div>
            <!-- 已选产品 -->
            <div class="preview-card" v-if="qoForm.products.length">
              <div class="card-title">📦 已选产品 ({{ qoForm.products.length }})</div>
              <div class="qo-selected-product" v-for="(sp, idx) in qoForm.products" :key="sp.id">
                <div class="qo-sp-top">
                  <span class="qo-sp-name">{{ sp.name }}</span>
                  <span class="qo-sp-remove" @click="qoForm.products.splice(idx, 1); calcQoTotal()">✕</span>
                </div>
                <div class="qo-sp-bottom">
                  <div class="qo-sp-qty">
                    <span class="qo-qty-btn" @click="changeQoQty(idx, -1)">－</span>
                    <span class="qo-qty-val">{{ sp.quantity }}</span>
                    <span class="qo-qty-btn" @click="changeQoQty(idx, 1)">＋</span>
                  </div>
                  <div class="qo-sp-price-edit">
                    <span style="font-size:10px;color:#909399">单价 ¥</span>
                    <input v-model.number="sp.price" class="qo-price-input" @input="calcQoTotal()" />
                  </div>
                  <span class="qo-sp-total">¥{{ (sp.price * sp.quantity).toFixed(2) }}</span>
                </div>
              </div>
            </div>
            <!-- 金额与订单信息 -->
            <div class="preview-card" v-if="qoForm.products.length">
              <div class="card-title">💰 金额信息</div>
              <div class="qo-amount-row">
                <span class="qo-amount-label">商品小计</span>
                <span class="qo-amount-val">¥{{ qoSubtotal.toFixed(2) }}</span>
              </div>
              <div class="form-group">
                <label>订单总额（可改价）</label>
                <input v-model.number="qoForm.totalAmount" class="preview-input" type="number" step="0.01" @input="calcQoCollect()" />
              </div>
              <div class="form-group">
                <label>定金</label>
                <input v-model.number="qoForm.depositAmount" class="preview-input" type="number" step="0.01" placeholder="0.00" @input="calcQoCollect()" />
              </div>
              <div class="qo-amount-row">
                <span class="qo-amount-label">代收金额</span>
                <span class="qo-amount-val" style="color:#f56c6c;font-weight:700">¥{{ qoCollectAmount.toFixed(2) }}</span>
              </div>
              <div class="form-group">
                <label>支付方式 <span class="qo-req">*</span></label>
                <select v-model="qoForm.paymentMethod" class="preview-input">
                  <option value="">请选择</option>
                  <option v-for="m in qoPaymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
              </div>
              <div class="form-group" v-if="qoForm.paymentMethod === 'other'">
                <label>其他支付方式</label>
                <input v-model="qoForm.paymentMethodOther" class="preview-input" placeholder="请输入" />
              </div>
              <div class="form-group">
                <label>定金截图</label>
                <div class="qo-screenshot-area">
                  <div class="qo-screenshot-list" v-if="qoForm.depositScreenshots.length">
                    <div class="qo-screenshot-thumb" v-for="(img, i) in qoForm.depositScreenshots" :key="i">
                      <img :src="img" alt="定金截图" />
                      <span class="qo-screenshot-del" @click="qoForm.depositScreenshots.splice(i, 1)">✕</span>
                    </div>
                  </div>
                  <div class="qo-upload-actions">
                    <label class="qo-upload-btn">
                      📷 上传截图
                      <input type="file" accept="image/*" multiple style="display:none" @change="handleQoScreenshot" />
                    </label>
                    <span class="qo-upload-btn" @click="pasteQoScreenshot">📋 粘贴图片</span>
                  </div>
                  <div class="qo-paste-hint">💡 也可直接 Ctrl+V 粘贴截图</div>
                </div>
              </div>
            </div>
            <!-- 订单必填信息 -->
            <div class="preview-card" v-if="qoForm.products.length">
              <div class="card-title">📋 订单信息</div>
              <div class="form-group">
                <label>客服微信号 <span class="qo-req">*</span></label>
                <input v-model="qoForm.serviceWechat" class="preview-input" placeholder="负责客服的微信号" />
              </div>
              <div class="form-group">
                <label>{{ orderFieldCfg.orderSourceFieldName }} <span class="qo-req">*</span></label>
                <select v-model="qoForm.orderSource" class="preview-input">
                  <option value="">请选择</option>
                  <option v-for="opt in orderFieldCfg.orderSourceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>快递公司 <span class="qo-req">*</span></label>
                <select v-model="qoForm.expressCompany" class="preview-input">
                  <option value="">请选择</option>
                  <option v-for="ec in qoExpressCompanyList" :key="ec.code" :value="ec.code">{{ ec.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>订单类型 <span class="qo-req">*</span></label>
                <div class="qo-radio-group">
                  <span class="qo-radio" :class="{ active: qoForm.markType === 'normal' }" @click="qoForm.markType = 'normal'">正常发货单</span>
                  <span class="qo-radio" :class="{ active: qoForm.markType === 'reserved' }" @click="qoForm.markType = 'reserved'">预留单</span>
                </div>
              </div>
              <div class="form-group">
                <label>订单备注</label>
                <input v-model="qoForm.remark" class="preview-input" placeholder="选填备注信息" />
              </div>
              <!-- 订单自定义字段 -->
              <template v-if="orderFieldCfg.customFields.length">
                <div class="form-group" v-for="cf in orderFieldCfg.customFields" :key="cf.fieldKey">
                  <label>{{ cf.fieldName }} <span class="qo-req" v-if="cf.required">*</span></label>
                  <select v-if="cf.fieldType === 'select'" v-model="qoForm.customFields[cf.fieldKey]" class="preview-input">
                    <option value="">请选择</option>
                    <option v-for="opt in cf.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <input v-else-if="cf.fieldType === 'number'" v-model.number="qoForm.customFields[cf.fieldKey]" class="preview-input" type="number" :placeholder="cf.placeholder || '请输入'" />
                  <input v-else-if="cf.fieldType === 'date'" v-model="qoForm.customFields[cf.fieldKey]" class="preview-input" type="date" />
                  <input v-else v-model="qoForm.customFields[cf.fieldKey]" class="preview-input" :placeholder="cf.placeholder || '请输入' + cf.fieldName" />
                </div>
              </template>
              <button class="preview-btn" @click="goToConfirm" style="margin-top:8px">下一步：确认订单</button>
            </div>
          </div>

          <!-- 步骤3: 确认下单 -->
          <div v-if="qoStep === 3" class="qo-step-content">
            <div class="preview-card">
              <div class="card-title">📝 订单确认</div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">客户</div>
                <div class="qo-confirm-val">{{ qoForm.customerName }}</div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">收货人</div>
                <div class="qo-confirm-val">{{ qoForm.receiverName }} {{ maskPhone(qoForm.receiverPhone) }}</div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">收货地址</div>
                <div class="qo-confirm-val">{{ qoForm.receiverAddress }}</div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">快递</div>
                <div class="qo-confirm-val">{{ qoExpressCompanyList.find(e => e.code === qoForm.expressCompany)?.name || qoForm.expressCompany || '-' }}</div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">产品明细</div>
                <div class="qo-confirm-product" v-for="sp in qoForm.products" :key="sp.id">
                  {{ sp.name }} × {{ sp.quantity }} = ¥{{ (sp.price * sp.quantity).toFixed(2) }}
                </div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">客服微信</div>
                <div class="qo-confirm-val">{{ qoForm.serviceWechat || '-' }}</div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">{{ orderFieldCfg.orderSourceFieldName }}</div>
                <div class="qo-confirm-val">{{ orderFieldCfg.orderSourceOptions.find(o => o.value === qoForm.orderSource)?.label || qoForm.orderSource || '-' }}</div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">支付方式</div>
                <div class="qo-confirm-val">{{ qoPaymentMethods.find(m => m.value === qoForm.paymentMethod)?.label || qoForm.paymentMethodOther || '-' }}</div>
              </div>
              <div class="qo-confirm-section">
                <div class="qo-confirm-label">订单类型</div>
                <div class="qo-confirm-val">{{ qoForm.markType === 'reserved' ? '预留单' : '正常发货单' }}</div>
              </div>
            </div>
            <div class="preview-card">
              <div class="qo-total-bar">
                <span style="font-weight:600">订单总额</span>
                <span class="qo-total-amount">¥{{ Number(qoForm.totalAmount || 0).toFixed(2) }}</span>
              </div>
              <div class="qo-total-bar" v-if="qoForm.depositAmount">
                <span>定金</span>
                <span style="color:#67c23a">-¥{{ Number(qoForm.depositAmount || 0).toFixed(2) }}</span>
              </div>
              <div class="qo-total-bar">
                <span>代收金额</span>
                <span style="color:#f56c6c;font-weight:600">¥{{ qoCollectAmount.toFixed(2) }}</span>
              </div>
              <div class="qo-screenshot-list" v-if="qoForm.depositScreenshots.length" style="margin:8px 0">
                <div class="qo-screenshot-thumb" v-for="(img, i) in qoForm.depositScreenshots" :key="i">
                  <img :src="img" alt="定金截图" />
                </div>
              </div>
              <button class="preview-btn" style="margin-top:8px" :disabled="qoSubmitting" @click="submitQuickOrder">
                {{ qoSubmitting ? '提交中...' : '🛒 提交订单' }}
              </button>
              <button class="preview-btn" style="background:#909399;margin-top:6px" @click="qoStep = 2">返回修改</button>
            </div>
          </div>

          <!-- 下单成功 -->
          <div v-if="qoStep === 4" class="qo-step-content" style="text-align:center;padding:40px 20px">
            <div style="font-size:48px;margin-bottom:12px">✅</div>
            <div style="font-size:16px;font-weight:600;color:#303133;margin-bottom:8px">订单提交成功！</div>
            <div style="font-size:12px;color:#909399;margin-bottom:4px">订单号：{{ qoResultOrderNo }}</div>
            <div style="font-size:14px;color:#f56c6c;font-weight:600;margin-bottom:16px">¥{{ Number(qoForm.totalAmount || qoTotalAmount).toFixed(2) }}</div>
            <button class="preview-btn" @click="resetQuickOrder">继续下单</button>
            <button class="preview-btn full" style="margin-top:6px" @click="goToCustomerDetail">查看客户详情</button>
          </div>
        </div>

        <!-- ========== 客户画像视图 ========== -->
        <div v-else-if="step === 'detail' && appId === 'portrait'" class="preview-detail">
          <div class="preview-user-bar">
            <span>{{ boundUserName }}</span>
            <div><span class="action-link" @click="step = 'login'">退出</span></div>
          </div>

          <!-- 画像头部 -->
          <div class="preview-card">
            <div class="customer-head">
              <span class="avatar" style="font-size:28px">📊</span>
              <div>
                <div class="customer-name">{{ customerData?.name || '企微客户' }}</div>
                <div style="font-size:10px;color:#909399;margin-top:2px">
                  <span v-if="customerData?.id" class="mini-tag" style="background:#e8f5e9;color:#4caf50">已关联CRM</span>
                  <span v-else class="mini-tag" style="background:#fff3e0;color:#ff9800">未关联CRM</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== 未关联CRM：简易画像 ===== -->
          <template v-if="!customerData?.id">
            <div class="preview-card">
              <div class="card-title">💬 企微互动概览</div>
              <div class="portrait-grid">
                <div class="portrait-metric">
                  <div class="metric-icon">💬</div>
                  <div class="metric-val">{{ portraitData.chatCount || 0 }}</div>
                  <div class="metric-lbl">聊天消息数</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-icon">📅</div>
                  <div class="metric-val">{{ portraitData.addDays || 0 }}天</div>
                  <div class="metric-lbl">添加天数</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-icon">🔄</div>
                  <div class="metric-val">{{ portraitData.replyRate || '-' }}</div>
                  <div class="metric-lbl">回复率</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-icon">⏱️</div>
                  <div class="metric-val">{{ portraitData.avgReplyTime || '-' }}</div>
                  <div class="metric-lbl">平均回复时长</div>
                </div>
              </div>
            </div>
            <div class="preview-card">
              <div class="card-title">📌 基本信息</div>
              <div class="info-row"><span class="label">昵称</span><span>{{ customerData?.wecomNickname || '-' }}</span></div>
              <div class="info-row"><span class="label">性别</span><span>{{ customerData?.wecomGender === 1 ? '男' : customerData?.wecomGender === 2 ? '女' : '-' }}</span></div>
              <div class="info-row"><span class="label">添加方式</span><span>{{ customerData?.wecomAddWay || '-' }}</span></div>
              <div class="info-row"><span class="label">添加时间</span><span>{{ customerData?.wecomAddTime ? formatTime(customerData.wecomAddTime) : '-' }}</span></div>
            </div>
            <div class="preview-card">
              <div class="card-title">🏷️ 智能标签</div>
              <div class="portrait-tags" style="padding:4px 0">
                <span class="p-tag" style="background:#e3f2fd;color:#1976d2">企微客户</span>
                <span class="p-tag" :style="portraitData.chatCount > 10 ? 'background:#e8f5e9;color:#388e3c' : 'background:#fff3e0;color:#f57c00'">
                  {{ portraitData.chatCount > 10 ? '活跃沟通' : '低频互动' }}
                </span>
                <span class="p-tag" style="background:#fce4ec;color:#c62828" v-if="portraitData.addDays > 30">长期客户</span>
                <span class="p-tag" style="background:#f3e5f5;color:#7b1fa2" v-if="portraitData.addDays <= 7">新添加</span>
              </div>
            </div>
            <div class="preview-card" style="text-align:center;padding:16px">
              <div style="font-size:11px;color:#909399;margin-bottom:8px">关联CRM客户后可查看完整多维度画像</div>
              <button class="link-crm-btn" @click="showLinkCrmDialog = true">🔗 关联CRM客户</button>
            </div>
          </template>

          <!-- ===== 已关联CRM：完整多维度画像 ===== -->
          <template v-else>
            <!-- 综合评分 -->
            <div class="preview-card">
              <div class="card-title">⭐ 客户综合评分</div>
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0">
                <div class="score-ring">
                  <svg viewBox="0 0 80 80" width="64" height="64">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#f0f0f0" stroke-width="6" />
                    <circle cx="40" cy="40" r="34" fill="none" :stroke="finalScore >= 70 ? '#66bb6a' : finalScore >= 40 ? '#ffa726' : '#ef5350'" stroke-width="6" stroke-linecap="round" :stroke-dasharray="(finalScore / 100) * 213.6 + ' 213.6'" transform="rotate(-90 40 40)" />
                    <text x="40" y="44" text-anchor="middle" font-size="16" font-weight="700" :fill="finalScore >= 70 ? '#388e3c' : finalScore >= 40 ? '#f57c00' : '#d32f2f'">{{ finalScore }}</text>
                  </svg>
                </div>
                <div style="flex:1">
                  <div style="font-size:14px;font-weight:700;color:#303133">{{ finalScoreLabel }}</div>
                  <div style="font-size:10px;color:#909399;margin-top:3px;line-height:1.4">{{ finalScoreDesc }}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-top:1px solid #f5f5f5;margin-top:4px">
                <span style="font-size:11px;color:#909399">手动评分：</span>
                <span v-for="s in 5" :key="s" class="star-btn" :class="{ active: s <= manualStarRating }" @click="setStarRating(s)">★</span>
                <span style="font-size:10px;color:#bdbdbd;margin-left:4px">{{ manualStarRating > 0 ? manualStarRating + '/5' : '未评（点击评分）' }}</span>
              </div>
            </div>

            <!-- 消费分析 -->
            <div class="preview-card">
              <div class="card-title">💰 消费分析</div>
              <div class="portrait-grid">
                <div class="portrait-metric">
                  <div class="metric-val" style="color:#ef5350">¥{{ Number(customerData?.totalAmount || 0).toFixed(0) }}</div>
                  <div class="metric-lbl">累计消费</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-val" style="color:#42a5f5">{{ customerData?.orderCount || 0 }}</div>
                  <div class="metric-lbl">订单总数</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-val" style="color:#ab47bc">¥{{ portraitAvgOrder }}</div>
                  <div class="metric-lbl">客单价</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-val" style="color:#26a69a">{{ portraitLastOrderDays }}</div>
                  <div class="metric-lbl">距上次购买</div>
                </div>
              </div>
              <!-- 消费趋势 - 曲线图+悬浮标签 -->
              <div v-if="portraitOrderTrend.length > 1" style="margin-top:8px;position:relative">
                <div style="font-size:10px;color:#909399;margin-bottom:4px">消费趋势</div>
                <svg :viewBox="'0 0 240 65'" width="100%" height="65" style="overflow:visible" @mouseleave="sidebarTrendHover = -1">
                  <defs>
                    <linearGradient id="sbTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#42a5f5" stop-opacity="0.2" />
                      <stop offset="100%" stop-color="#42a5f5" stop-opacity="0.01" />
                    </linearGradient>
                  </defs>
                  <polygon :points="trendAreaPoints" fill="url(#sbTrendGrad)" />
                  <path :d="sidebarTrendCurve" fill="none" stroke="#42a5f5" stroke-width="2" stroke-linecap="round" />
                  <template v-for="(p, i) in trendDots" :key="'sg'+i">
                    <circle :cx="p.x" :cy="p.y" r="10" fill="transparent" @mouseenter="sidebarTrendHover = i" style="cursor:pointer" />
                    <circle :cx="p.x" :cy="p.y" :r="sidebarTrendHover === i ? 4.5 : 3" :fill="sidebarTrendHover === i ? '#1e88e5' : '#42a5f5'" :stroke="sidebarTrendHover === i ? '#fff' : 'none'" :stroke-width="sidebarTrendHover === i ? 1.5 : 0" style="transition:all .15s;pointer-events:none" />
                  </template>
                  <template v-if="sidebarTrendHover >= 0 && trendDots[sidebarTrendHover]">
                    <rect :x="trendDots[sidebarTrendHover].x - 30" :y="trendDots[sidebarTrendHover].y - 22" width="60" height="16" rx="3" fill="#303133" opacity="0.88" />
                    <text :x="trendDots[sidebarTrendHover].x" :y="trendDots[sidebarTrendHover].y - 11" text-anchor="middle" font-size="9" font-weight="600" fill="#fff">{{ portraitOrderTrend[sidebarTrendHover].label }} ¥{{ portraitOrderTrend[sidebarTrendHover].amount }}</text>
                  </template>
                </svg>
                <div style="display:flex;justify-content:space-between;font-size:9px;color:#bdbdbd">
                  <span v-for="(m, i) in portraitOrderTrend" :key="i" :style="{ fontWeight: sidebarTrendHover === i ? '700' : '400', color: sidebarTrendHover === i ? '#42a5f5' : '#bdbdbd' }">{{ m.label }}</span>
                </div>
              </div>
            </div>

            <!-- 客户属性 -->
            <div class="preview-card">
              <div class="card-title">📋 客户属性</div>
              <div class="info-row"><span class="label">姓名</span><span>{{ customerData?.name || '-' }}</span></div>
              <div class="info-row"><span class="label">性别</span><span>{{ customerData?.gender === 'male' ? '男' : customerData?.gender === 'female' ? '女' : customerData?.gender || '-' }}</span></div>
              <div class="info-row"><span class="label">年龄</span><span>{{ customerData?.age ? customerData.age + '岁' : '-' }}</span></div>
              <div class="info-row"><span class="label">来源</span><span>{{ transSource(customerData?.source) }}</span></div>
              <div class="info-row"><span class="label">等级</span><span class="tag">{{ transLevel(customerData?.level) }}</span></div>
              <div class="info-row"><span class="label">状态</span><span>{{ transFollowStatus(customerData?.followStatus) }}</span></div>
              <div class="info-row"><span class="label">地址</span><span>{{ customerData?.address || '-' }}</span></div>
              <div class="info-row" v-if="customerData?.medicalHistory"><span class="label">疾病史</span><span>{{ sidebarLatestMedical }}<span v-if="sidebarAllMedicalRecords.length > 1" class="mini-tag" style="background:#f0f0f0;color:#909399;cursor:pointer;margin-left:4px;font-size:9px" :title="sidebarAllMedicalRecords.map((r:any) => (r.content||r) + (r.createTime ? ' ('+r.createTime+')' : '')).join('\n')" @click="showMedicalPopup=!showMedicalPopup">还有{{ sidebarAllMedicalRecords.length - 1 }}条</span></span></div>
              <div v-if="showMedicalPopup && sidebarAllMedicalRecords.length > 1 && customerData?.medicalHistory" style="background:#fafafa;border:1px solid #eee;border-radius:6px;padding:6px 8px;margin:-2px 0 4px;max-height:120px;overflow-y:auto">
                <div v-for="(rec, idx) in sidebarAllMedicalRecords" :key="idx" style="padding:3px 0;border-bottom:1px solid #f0f0f0;font-size:10px">
                  <div style="color:#303133">{{ rec.content || rec }}</div>
                  <div v-if="rec.createTime" style="font-size:9px;color:#bdbdbd">{{ rec.createTime }}</div>
                </div>
              </div>
            </div>

            <!-- 维度雷达（简易SVG五维图） -->
            <div class="preview-card">
              <div class="card-title">🎯 多维度评估</div>
              <div style="text-align:center;padding:4px 0">
                <svg viewBox="0 0 200 180" width="180" height="160">
                  <!-- 背景五边形 -->
                  <polygon v-for="n in 4" :key="'bg'+n" :points="radarBgPoints(n)" fill="none" :stroke="n === 4 ? '#e0e0e0' : '#f5f5f5'" stroke-width="1" />
                  <!-- 轴线 -->
                  <line v-for="(_, i) in radarDimensions" :key="'ax'+i" x1="100" y1="85" :x2="radarAxisPoint(i).x" :y2="radarAxisPoint(i).y" stroke="#f0f0f0" stroke-width="1" />
                  <!-- 数据区域 -->
                  <polygon :points="radarDataPoints" fill="rgba(102,187,106,0.15)" stroke="#66bb6a" stroke-width="2" />
                  <circle v-for="(d, i) in radarDimensions" :key="'dot'+i" :cx="radarDataPoint(i).x" :cy="radarDataPoint(i).y" r="3" fill="#66bb6a" />
                  <!-- 标签 -->
                  <text v-for="(d, i) in radarDimensions" :key="'lbl'+i" :x="radarLabelPoint(i).x" :y="radarLabelPoint(i).y" text-anchor="middle" font-size="9" fill="#757575">{{ d.label }}</text>
                </svg>
              </div>
              <div class="radar-legend">
                <div class="radar-legend-item" v-for="d in radarDimensions" :key="d.label">
                  <span class="radar-dot" :style="{ background: d.color }"></span>
                  <span>{{ d.label }}</span>
                  <span style="margin-left:auto;font-weight:600">{{ d.value }}</span>
                </div>
              </div>
            </div>

            <!-- 标签画像 -->
            <div class="preview-card">
              <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
                <span>🏷️ 智能标签</span>
                <span class="link-crm-btn" @click="showTagInput = !showTagInput" style="font-size:12px;padding:1px 6px">＋</span>
              </div>
              <div v-if="showTagInput" style="display:flex;gap:4px;margin-bottom:6px">
                <input v-model="newTagInput" placeholder="输入标签名" class="preview-input" style="flex:1;padding:3px 6px;font-size:11px" @keyup.enter="addCustomerTag" />
                <button class="link-crm-btn" style="padding:3px 8px" @click="addCustomerTag">添加</button>
              </div>
              <div class="portrait-tags" style="padding:4px 0">
                <span class="p-tag" :style="'background:#e8f5e9;color:#388e3c'" v-if="(customerData?.orderCount || 0) >= 3">复购客户</span>
                <span class="p-tag" :style="'background:#e3f2fd;color:#1565c0'" v-if="(customerData?.totalAmount || 0) >= 1000">高消费</span>
                <span class="p-tag" :style="'background:#fce4ec;color:#c62828'" v-if="(customerData?.totalAmount || 0) < 100 && (customerData?.orderCount || 0) > 0">低消费</span>
                <span class="p-tag" :style="'background:#f3e5f5;color:#7b1fa2'" v-if="customerData?.level === 'vip' || customerData?.level === 'svip'">VIP</span>
                <span class="p-tag" :style="'background:#fff3e0;color:#e65100'" v-if="portraitLastOrderDaysNum > 60">流失风险</span>
                <span class="p-tag" :style="'background:#e0f2f1;color:#00695c'" v-if="portraitLastOrderDaysNum <= 14 && (customerData?.orderCount || 0) > 0">近期活跃</span>
                <span class="p-tag colored tag-deletable" v-for="t in parseTags(customerData?.tags)" :key="t">
                  {{ t }}
                  <span class="tag-del" @click.stop="removeCustomerTag(t)">✕</span>
                </span>
              </div>
            </div>

            <!-- 售后概览 -->
            <div class="preview-card" v-if="portraitData.afterSalesCount > 0">
              <div class="card-title">🛡️ 售后概览</div>
              <div class="portrait-grid">
                <div class="portrait-metric">
                  <div class="metric-val" style="color:#ef5350">{{ portraitData.afterSalesCount }}</div>
                  <div class="metric-lbl">售后次数</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-val" style="color:#ffa726">¥{{ Number(portraitData.afterSalesAmount || 0).toFixed(0) }}</div>
                  <div class="metric-lbl">售后金额</div>
                </div>
              </div>
            </div>

            <!-- 互动分析 -->
            <div class="preview-card">
              <div class="card-title">💬 互动分析</div>
              <div class="portrait-grid">
                <div class="portrait-metric">
                  <div class="metric-icon">💬</div>
                  <div class="metric-val">{{ portraitData.chatCount || 0 }}</div>
                  <div class="metric-lbl">消息数</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-icon">📅</div>
                  <div class="metric-val">{{ portraitData.addDays || 0 }}天</div>
                  <div class="metric-lbl">添加天数</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-icon">🔄</div>
                  <div class="metric-val">{{ portraitData.replyRate || '-' }}</div>
                  <div class="metric-lbl">回复率</div>
                </div>
                <div class="portrait-metric">
                  <div class="metric-icon">📝</div>
                  <div class="metric-val">{{ portraitData.followUpCount || 0 }}</div>
                  <div class="metric-lbl">跟进次数</div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 通用已绑定但无匹配appId -->
        <div v-else-if="step === 'detail'" class="preview-detail">
          <div class="preview-user-bar">
            <span>{{ boundUserName }}</span>
            <div><span class="action-link" @click="step = 'login'">退出</span></div>
          </div>
          <div class="preview-empty">
            <div style="font-size:48px;margin-bottom:12px">{{ appIcon }}</div>
            <p>{{ appName }}</p>
            <p class="tip">该应用内容预览开发中</p>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="preview-empty">
          <div style="font-size:48px;margin-bottom:12px">{{ appIcon }}</div>
          <p>{{ appName }}</p>
          <p class="tip">请先绑定CRM账号</p>
        </div>
      </div>
    </div>
    <!-- 关联CRM客户弹窗 -->
    <div v-if="showLinkCrmDialog" class="link-crm-overlay" @click.self="showLinkCrmDialog = false">
      <div class="link-crm-dialog">
        <div class="link-crm-header">
          <span>🔗 关联CRM客户</span>
          <span class="action-link" @click="showLinkCrmDialog = false">✕</span>
        </div>
        <div class="link-crm-body">
          <input v-model="linkCrmKeyword" placeholder="搜索姓名/手机号..." class="preview-input" @input="searchLinkCrmCustomers" @focus="!linkCrmList.length && !linkCrmKeyword && loadLinkCrmDefault()" />
          <div v-if="linkCrmLoading && !linkCrmList.length" style="text-align:center;padding:12px;font-size:11px;color:#909399">加载中...</div>
          <div v-else-if="linkCrmList.length" class="link-crm-list" @scroll="onLinkCrmScroll">
            <div class="qo-customer-item" v-for="c in linkCrmList" :key="c.id" @click="selectLinkCrmCustomer(c)">
              <div class="qo-cust-name">{{ c.name }} <span class="qo-cust-phone">{{ maskPhone(c.phone) }}</span></div>
              <div class="qo-cust-extra">
                <span v-if="c.source" class="mini-tag">{{ transSource(c.source) }}</span>
              </div>
            </div>
            <div v-if="linkCrmLoading" style="text-align:center;padding:6px;font-size:10px;color:#c0c4cc">加载更多...</div>
          </div>
          <div v-else-if="linkCrmKeyword" style="text-align:center;padding:12px;font-size:11px;color:#909399">未找到客户</div>
          <div v-else style="text-align:center;padding:12px;font-size:11px;color:#909399">点击搜索框加载客户列表</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { useCustomerFieldConfigStore } from '@/stores/customerFieldConfig'
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'

const props = defineProps<{
  appId: string
  appName: string
  appIcon: string
}>()

const emit = defineEmits<{
  'switch-app': [appId: string]
}>()

const router = useRouter()
const custFieldCfg = useCustomerFieldConfigStore()
const orderFieldCfg = useOrderFieldConfigStore()
const loading = ref(false)
const step = ref<'login' | 'detail'>('login')
const loginUsername = ref('')
const loginPassword = ref('')
const loginTenantCode = ref('')
const boundUserName = ref('')
const tenantCode = ref('')
const customerData = ref<any>(null)
const orders = ref<any[]>([])
const orderPage = ref(1)
const orderTotal = ref(0)
const orderPageSize = 3
const showLinkCrmDialog = ref(false)
const linkCrmKeyword = ref('')
const linkCrmList = ref<any[]>([])
const linkCrmLoading = ref(false)
const manualStarRating = ref(0)
const allOrdersCache = ref<any[]>([])
const sidebarTrendHover = ref(-1)
// Persist star rating + finalScore to database and log
const setStarRating = async (s: number) => {
  const oldVal = manualStarRating.value
  const newVal = manualStarRating.value === s ? 0 : s
  manualStarRating.value = newVal
  if (customerData.value?.id) {
    try {
      const score = newVal > 0 ? newVal * 20 : portraitScore.value
      await request.put('/customers/' + customerData.value.id, { starRating: newVal, finalScore: score })
      await request.post('/customers/' + customerData.value.id + '/logs', {
        logType: 'portrait',
        content: `客户画像手动评分变更：${oldVal || 0} 星 → ${newVal} 星（综合评分 ${score} 分）`,
        detail: { action: 'star_rating', oldValue: oldVal, newValue: newVal, finalScore: score }
      }).catch(() => {})
      ElMessage.success('评分已保存')
    } catch { ElMessage.warning('评分保存失败') }
  }
}

// Load star rating from customer data
watch(() => customerData.value?.starRating, (val) => {
  if (val !== undefined && val !== null) {
    manualStarRating.value = Number(val) || 0
  }
}, { immediate: true })
const newTagInput = ref('')
const showTagInput = ref(false)
const showMedicalPopup = ref(false)

// Medical history parsing
const sidebarAllMedicalRecords = computed(() => {
  const raw = customerData.value?.medicalHistory
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.sort((a: any, b: any) => new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime())
    }
    return [{ content: raw }]
  } catch {
    return raw ? [{ content: raw }] : []
  }
})
const sidebarLatestMedical = computed(() => {
  const rec = sidebarAllMedicalRecords.value[0]
  return rec?.content || rec || '-'
})

const addCustomerTag = async () => {
  const tag = newTagInput.value.trim()
  if (!tag) return
  const currentTags = parseTags(customerData.value?.tags)
  if (currentTags.includes(tag)) { ElMessage.warning('标签已存在'); return }
  currentTags.push(tag)
  const newTags = currentTags.join(',')
  customerData.value.tags = newTags
  newTagInput.value = ''
  showTagInput.value = false
  // Sync to CRM backend
  if (customerData.value?.id) {
    try {
      await request.put('/customers/' + customerData.value.id, { tags: newTags })
      await request.post('/customers/' + customerData.value.id + '/logs', {
        logType: 'portrait', content: `客户画像添加标签：${tag}`, detail: { action: 'add_tag', tag }
      }).catch(() => {})
      ElMessage.success('标签已同步到CRM')
    } catch { ElMessage.warning('标签保存失败，请稍后重试') }
  }
}

const removeCustomerTag = async (tag: string) => {
  const currentTags = parseTags(customerData.value?.tags).filter((t: string) => t !== tag)
  const newTags = currentTags.join(',')
  customerData.value.tags = newTags
  // Sync to CRM backend
  if (customerData.value?.id) {
    try {
      await request.put('/customers/' + customerData.value.id, { tags: newTags })
      await request.post('/customers/' + customerData.value.id + '/logs', {
        logType: 'portrait', content: `客户画像删除标签：${tag}`, detail: { action: 'remove_tag', tag }
      }).catch(() => {})
      ElMessage.success('标签已删除并同步')
    } catch { ElMessage.warning('标签删除失败') }
  }
}

const copyToClipboard = (text: string) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.warning('复制失败，请手动复制')
  })
}

const searchLinkCrmCustomers = () => {
  linkCrmPage = 1
  linkCrmHasMore = true
  linkCrmLoading.value = true
  clearTimeout(linkCrmTimer)
  linkCrmTimer = setTimeout(async () => {
    try {
      const res: any = await request.get('/customers', { params: { keyword: linkCrmKeyword.value || '', page: 1, pageSize: 6 } })
      linkCrmList.value = res?.data?.list || res?.list || res?.data || []
      const total = res?.data?.total || res?.total || linkCrmList.value.length
      linkCrmHasMore = linkCrmList.value.length < total
    } catch { linkCrmList.value = [] }
    linkCrmLoading.value = false
  }, 300) as any
}

let linkCrmTimer: any = null
let linkCrmPage = 1
let linkCrmHasMore = true

const loadLinkCrmDefault = async () => {
  linkCrmPage = 1
  linkCrmHasMore = true
  linkCrmLoading.value = true
  try {
    const res: any = await request.get('/customers', { params: { page: 1, pageSize: 6 } })
    linkCrmList.value = res?.data?.list || res?.list || res?.data || []
    const total = res?.data?.total || res?.total || linkCrmList.value.length
    linkCrmHasMore = linkCrmList.value.length < total
  } catch { linkCrmList.value = [] }
  linkCrmLoading.value = false
}

const onLinkCrmScroll = async (e: Event) => {
  const el = e.target as HTMLElement
  if (!linkCrmHasMore || linkCrmLoading.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    linkCrmLoading.value = true
    linkCrmPage++
    try {
      const res: any = await request.get('/customers', { params: { keyword: linkCrmKeyword.value || '', page: linkCrmPage, pageSize: 6 } })
      const more = res?.data?.list || res?.list || res?.data || []
      linkCrmList.value = [...linkCrmList.value, ...more]
      const total = res?.data?.total || res?.total || 0
      linkCrmHasMore = linkCrmList.value.length < total
    } catch { linkCrmHasMore = false }
    linkCrmLoading.value = false
  }
}

const selectLinkCrmCustomer = async (c: any) => {
  customerData.value = { ...customerData.value, ...c }
  showLinkCrmDialog.value = false
  linkCrmKeyword.value = ''
  linkCrmList.value = []
  if (c.id) {
    await loadCustomerOrders(c.id, 1)
  }
  ElMessage.success('已关联CRM客户：' + (c.name || ''))
}

watch(showLinkCrmDialog, (v) => {
  if (v) { linkCrmKeyword.value = ''; loadLinkCrmDefault() }
})
// ========== 中文翻译映射 ==========
const sourceMap: Record<string, string> = {
  wechat: '微信', wecom: '企微', website: '官网', phone: '电话',
  referral: '转介绍', exhibition: '展会', ad: '广告', other: '其他',
  douyin: '抖音', taobao: '淘宝', jd: '京东', offline: '线下',
  online: '线上', friend: '朋友介绍', self: '自主开发',
}
const levelMap: Record<string, string> = {
  bronze: '青铜', silver: '白银', gold: '黄金', platinum: '铂金',
  diamond: '钻石', vip: 'VIP', svip: 'SVIP',
  normal: '普通', important: '重要', key: '关键', strategic: '战略',
  A: 'A级', B: 'B级', C: 'C级', D: 'D级',
}
const followStatusMap: Record<string, string> = {
  new: '新客户', following: '跟进中', interested: '有意向',
  negotiating: '谈判中', signed: '已签约', lost: '已流失',
  inactive: '不活跃', active: '活跃', pending: '待跟进',
  converted: '已转化', rejected: '已拒绝',
}
const orderStatusMap: Record<string, string> = {
  pending: '待处理', processing: '处理中', shipped: '已发货',
  delivered: '已送达', completed: '已完成', cancelled: '已取消',
  refunded: '已退款', paid: '已付款', unpaid: '未付款',
  confirmed: '已确认', draft: '草稿',
}

const transSource = (v: string) => (v && sourceMap[v]) || v || '-'
const transLevel = (v: string) => (v && levelMap[v]) || v || '-'
const transFollowStatus = (v: string) => (v && followStatusMap[v]) || v || '-'
const transOrderStatus = (v: string) => (v && orderStatusMap[v]) || v || '-'
const orderStatusColor = (s: string) => {
  const m: Record<string, string> = { completed: '#67c23a', shipped: '#409eff', pending: '#e6a23c', cancelled: '#f56c6c', refunded: '#f56c6c', paid: '#67c23a' }
  return m[s] || '#07c160'
}

const parseTags = (tags: any): string[] => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') return tags.split(',').map((t: string) => t.trim()).filter(Boolean)
  return []
}

const maskPhone = (p: string) => {
  if (!p || p.length < 7) return p || '-'
  return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const maskEmail = (e: string) => {
  if (!e || !e.includes('@')) return e || '-'
  const [user, domain] = e.split('@')
  if (user.length <= 2) return `${user[0]}***@${domain}`
  return `${user.slice(0, 2)}***@${domain}`
}

const maskWechat = (w: string) => {
  if (!w || w.length < 4) return w || '-'
  return w.slice(0, 2) + '****' + w.slice(-2)
}

const formatTime = (t: string) => {
  if (!t) return '-'
  return new Date(t).toLocaleDateString('zh-CN')
}

// ========== 客户画像相关 ==========
const portraitData = ref<any>({
  chatCount: 0, addDays: 0, replyRate: '-', avgReplyTime: '-',
  afterSalesCount: 0, afterSalesAmount: 0, followUpCount: 0
})

watch(() => customerData.value, (cust) => {
  if (!cust) return
  const addTime = cust.wecomAddTime || cust.createdAt
  const addDays = addTime ? Math.max(1, Math.floor((Date.now() - new Date(addTime).getTime()) / 86400000)) : 0
  portraitData.value = {
    chatCount: cust.chatCount || 0,
    addDays,
    replyRate: cust.replyRate || '-',
    avgReplyTime: cust.avgReplyTime || '-',
    afterSalesCount: cust.afterSalesCount || 0,
    afterSalesAmount: cust.afterSalesAmount || 0,
    followUpCount: cust.followUpCount || 0
  }
}, { immediate: true })

const portraitAvgOrder = computed(() => {
  const cnt = customerData.value?.orderCount || 0
  const amt = customerData.value?.totalAmount || 0
  return cnt > 0 ? (amt / cnt).toFixed(0) : '0'
})

const portraitLastOrderDaysNum = computed(() => {
  const t = customerData.value?.lastOrderTime
  if (!t) return 999
  return Math.floor((Date.now() - new Date(t).getTime()) / 86400000)
})

const portraitLastOrderDays = computed(() => {
  const d = portraitLastOrderDaysNum.value
  if (d >= 999) return '-'
  if (d === 0) return '今天'
  return d + '天前'
})

const portraitScore = computed(() => {
  const dims = radarDimensions.value
  const weights = [0.30, 0.25, 0.20, 0.10, 0.15]
  let score = 0
  for (let i = 0; i < dims.length; i++) { score += dims[i].value * weights[i] }
  return Math.min(100, Math.round(score))
})

const finalScore = computed(() => manualStarRating.value > 0 ? manualStarRating.value * 20 : portraitScore.value)
const finalScoreLabel = computed(() => {
  const s = finalScore.value
  return s >= 90 ? '顶级客户' : s >= 80 ? '优质客户' : s >= 60 ? '潜力客户' : s >= 40 ? '一般客户' : s >= 20 ? '待激活客户' : '新客户'
})

const finalScoreDesc = computed(() => {
  const s = finalScore.value
  if (manualStarRating.value > 0) {
    const descs: Record<number, string> = {
      1: '评级较低，需重点关注客户需求和满意度',
      2: '尚有提升空间，建议加强沟通和服务',
      3: '中等水平，客户关系稳定，可挖掘潜力',
      4: '表现良好，高价值客户，需持续维护',
      5: '极高评价，核心客户，提供VIP级服务'
    }
    return '手动评分 ' + manualStarRating.value + ' 星 · ' + (descs[manualStarRating.value] || '')
  }
  if (s >= 90) return '消费力强、复购率高、互动活跃，核心客户需重点维护'
  if (s >= 80) return '消费稳定、粘性较高，有潜力升级为顶级客户'
  if (s >= 60) return '有一定消费基础，可通过精准营销提升价值'
  if (s >= 40) return '消费一般，建议加强跟进和互动频率'
  if (s >= 20) return '消费较少或长期未活跃，需激活唤醒'
  return '新客户或无消费记录，建议建立初步联系'
})

const portraitOrderTrend = computed(() => {
  const now = new Date()
  const months: { label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ label: (d.getMonth() + 1) + '月', amount: 0 })
  }
  // Aggregate from allOrdersCache if available
  if (allOrdersCache.value.length) {
    for (const o of allOrdersCache.value) {
      const od = new Date(o.createTime || o.createdAt || o.orderDate)
      for (let i = 0; i < months.length; i++) {
        const md = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const mdNext = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
        if (od >= md && od < mdNext) {
          months[i].amount += Number(o.finalAmount || o.totalAmount || 0)
        }
      }
    }
  }
  return months
})

const trendLinePoints = computed(() => {
  const data = portraitOrderTrend.value
  if (data.length < 2) return ''
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  return data.map((d, i) => {
    const x = (i / (data.length - 1)) * 230 + 5
    const y = 55 - (d.amount / maxVal) * 45
    return x + ',' + y
  }).join(' ')
})

const trendAreaPoints = computed(() => {
  const data = portraitOrderTrend.value
  if (data.length < 2) return ''
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 230 + 5
    const y = 55 - (d.amount / maxVal) * 45
    return x + ',' + y
  })
  return pts.join(' ') + ' 235,55 5,55'
})

const trendDots = computed(() => {
  const data = portraitOrderTrend.value
  if (data.length < 2) return []
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  return data.map((d, i) => ({
    x: (i / (data.length - 1)) * 230 + 5,
    y: 55 - (d.amount / maxVal) * 45
  }))
})

const sidebarTrendCurve = computed(() => {
  const pts = trendDots.value
  if (pts.length < 2) return ''
  let d = 'M' + pts[0].x + ',' + pts[0].y
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2
    d += ' C' + cx + ',' + pts[i].y + ' ' + cx + ',' + pts[i + 1].y + ' ' + pts[i + 1].x + ',' + pts[i + 1].y
  }
  return d
})

const sidebarTenureDays = computed(() => {
  const t = customerData.value?.createdAt || customerData.value?.wecomAddTime
  return t ? Math.max(1, Math.floor((Date.now() - new Date(t).getTime()) / 86400000)) : 1
})

const radarDimensions = computed(() => {
  const cnt = customerData.value?.orderCount || 0
  const amt = customerData.value?.totalAmount || 0
  const days = portraitLastOrderDaysNum.value
  const chat = portraitData.value.chatCount || 0
  const followUp = portraitData.value.followUpCount || 0
  const tenure = sidebarTenureDays.value
  const avgOrd = cnt > 0 ? amt / cnt : 0
  const level = customerData.value?.level || ''
  const afterSales = portraitData.value.afterSalesCount || 0

  const spendBase = amt > 0 ? Math.min(70, Math.round(Math.log10(amt + 1) * 20)) : 0
  const avgBonus = avgOrd > 500 ? 20 : avgOrd > 200 ? 15 : avgOrd > 50 ? 10 : 0
  const spendPower = Math.min(100, spendBase + avgBonus + (cnt >= 5 ? 10 : 0))

  const monthsActive = Math.max(1, tenure / 30)
  const freq = cnt / monthsActive
  const repurchase = Math.min(100, Math.round(
    (freq >= 2 ? 50 : freq >= 1 ? 35 : freq >= 0.5 ? 20 : freq > 0 ? 10 : 0) +
    (cnt >= 10 ? 30 : cnt >= 5 ? 20 : cnt >= 3 ? 15 : cnt >= 1 ? 5 : 0) +
    (cnt >= 2 && days < 30 ? 20 : 0)
  ))

  const recencyScore = days < 7 ? 40 : days < 14 ? 32 : days < 30 ? 24 : days < 60 ? 15 : days < 90 ? 8 : 3
  const chatRecency = chat > 0 ? Math.min(30, Math.round(Math.sqrt(chat) * 5)) : 0
  const followBonusVal = followUp > 0 ? Math.min(30, followUp * 5) : 0
  const activity = Math.min(100, recencyScore + chatRecency + followBonusVal)

  const chatScoreVal = Math.min(40, Math.round(Math.sqrt(chat) * 6))
  const followScoreVal = Math.min(30, followUp * 6)
  const replyStr = String(portraitData.value.replyRate || '0')
  const replyPct = parseFloat(replyStr) || 0
  const replyScoreVal = Math.min(30, Math.round(replyPct * 0.3))
  const interaction = Math.min(100, chatScoreVal + followScoreVal + replyScoreVal)

  const tenureScore = tenure > 365 ? 30 : tenure > 180 ? 22 : tenure > 90 ? 15 : tenure > 30 ? 8 : 3
  const loyalRepurchase = cnt >= 5 ? 25 : cnt >= 3 ? 18 : cnt >= 2 ? 12 : cnt >= 1 ? 5 : 0
  const levelBonus = (level === 'svip' || level === 'diamond') ? 20 : (level === 'vip' || level === 'platinum') ? 15 : (level === 'gold' || level === 'important') ? 10 : (level === 'silver') ? 5 : 0
  const recentBonus = days < 30 ? 15 : days < 60 ? 8 : 0
  const afterSalesPenalty = afterSales > 3 ? 15 : afterSales > 1 ? 8 : 0
  const loyalty = Math.min(100, Math.max(0, tenureScore + loyalRepurchase + levelBonus + recentBonus - afterSalesPenalty + (amt > 2000 ? 10 : 0)))

  return [
    { label: '消费力', value: spendPower, color: '#ef5350' },
    { label: '复购率', value: repurchase, color: '#42a5f5' },
    { label: '活跃度', value: activity, color: '#66bb6a' },
    { label: '互动量', value: interaction, color: '#ffa726' },
    { label: '忠诚度', value: loyalty, color: '#ab47bc' }
  ]
})

const radarAngle = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2
const radarBgPoints = (level: number) => {
  const r = (level / 4) * 65
  return Array.from({ length: 5 }, (_, i) => {
    const a = radarAngle(i)
    return (100 + r * Math.cos(a)) + ',' + (85 + r * Math.sin(a))
  }).join(' ')
}
const radarAxisPoint = (i: number) => {
  const a = radarAngle(i)
  return { x: 100 + 65 * Math.cos(a), y: 85 + 65 * Math.sin(a) }
}
const radarDataPoint = (i: number) => {
  const a = radarAngle(i)
  const r = (radarDimensions.value[i].value / 100) * 65
  return { x: 100 + r * Math.cos(a), y: 85 + r * Math.sin(a) }
}
const radarDataPoints = computed(() => {
  return Array.from({ length: 5 }, (_, i) => {
    const p = radarDataPoint(i)
    return p.x + ',' + p.y
  }).join(' ')
})
const radarLabelPoint = (i: number) => {
  const a = radarAngle(i)
  return { x: 100 + 78 * Math.cos(a), y: 88 + 78 * Math.sin(a) }
}

// ========== 快捷下单相关 ==========
const qoStep = ref(1)
const qoCustomerMode = ref<'search' | 'new'>('search')
const qoAutoMatchedCustomer = ref<any>(null)
const qoCustomerKeyword = ref('')
const qoCustomerList = ref<any[]>([])
const qoCustomerLoading = ref(false)
const qoProductKeyword = ref('')
const qoProductList = ref<any[]>([])
const qoTotalAmount = ref(0)
const qoSubmitting = ref(false)
const qoResultOrderNo = ref('')
const qoForm = ref<{
  customerId: string | number
  customerName: string
  customerPhone: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  products: { id: any; name: string; price: number; quantity: number; stock: number; image?: string }[]
  totalAmount: number
  depositAmount: number
  depositScreenshots: string[]
  paymentMethod: string
  paymentMethodOther: string
  serviceWechat: string
  orderSource: string
  expressCompany: string
  markType: string
  remark: string
  customFields: Record<string, any>
}>({
  customerId: '',
  customerName: '',
  customerPhone: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  products: [],
  totalAmount: 0,
  depositAmount: 0,
  depositScreenshots: [],
  paymentMethod: '',
  paymentMethodOther: '',
  serviceWechat: '',
  orderSource: '',
  expressCompany: '',
  markType: 'normal',
  remark: '',
  customFields: {}
})

let qoSearchTimer: any = null
let qoCustomerPage = 1
let qoCustomerHasMore = true

const searchQoCustomers = () => {
  clearTimeout(qoSearchTimer)
  qoSearchTimer = setTimeout(async () => {
    qoCustomerPage = 1
    qoCustomerHasMore = true
    if (!qoCustomerKeyword.value.trim()) { qoCustomerList.value = []; return }
    qoCustomerLoading.value = true
    try {
      const res: any = await request.get('/customers', { params: { keyword: qoCustomerKeyword.value, page: 1, pageSize: 6 } })
      qoCustomerList.value = res?.data?.list || res?.list || res?.data || []
      const total = res?.data?.total || res?.total || qoCustomerList.value.length
      qoCustomerHasMore = qoCustomerList.value.length < total
    } catch { qoCustomerList.value = [] }
    qoCustomerLoading.value = false
  }, 300)
}

const loadQoCustomerDefault = async () => {
  qoCustomerPage = 1
  qoCustomerHasMore = true
  qoCustomerLoading.value = true
  try {
    const res: any = await request.get('/customers', { params: { page: 1, pageSize: 6 } })
    qoCustomerList.value = res?.data?.list || res?.list || res?.data || []
    const total = res?.data?.total || res?.total || qoCustomerList.value.length
    qoCustomerHasMore = qoCustomerList.value.length < total
  } catch { qoCustomerList.value = [] }
  qoCustomerLoading.value = false
}

const onQoCustomerScroll = async (e: Event) => {
  const el = e.target as HTMLElement
  if (!qoCustomerHasMore || qoCustomerLoading.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    qoCustomerLoading.value = true
    qoCustomerPage++
    try {
      const res: any = await request.get('/customers', { params: { keyword: qoCustomerKeyword.value || '', page: qoCustomerPage, pageSize: 6 } })
      const more = res?.data?.list || res?.list || res?.data || []
      qoCustomerList.value = [...qoCustomerList.value, ...more]
      const total = res?.data?.total || res?.total || 0
      qoCustomerHasMore = qoCustomerList.value.length < total
    } catch { qoCustomerHasMore = false }
    qoCustomerLoading.value = false
  }
}

const selectQoCustomer = (c: any) => {
  qoForm.value.customerId = c.id
  qoForm.value.customerName = c.name || ''
  qoForm.value.customerPhone = maskPhone(c.phone || '')
  qoForm.value.receiverName = c.name || ''
  qoForm.value.receiverPhone = maskPhone(c.phone || '')
  qoForm.value.receiverAddress = c.address || ''
  qoCustomerMode.value = 'search'
}

const clearSelectedCustomer = () => {
  qoForm.value.customerId = ''
  qoForm.value.customerName = ''
  qoForm.value.customerPhone = ''
  qoForm.value.receiverName = ''
  qoForm.value.receiverPhone = ''
  qoForm.value.receiverAddress = ''
}

// ========== 新建客户相关 ==========
const newCustForm = ref<Record<string, any>>({
  phone: '', name: '', gender: '', age: null, source: 'wecom', level: '', status: 'potential',
  wechat: '', email: '', height: null, weight: null, birthday: '', fanAcquisitionTime: '',
  tagsStr: '', medicalHistory: '', address: '', remark: '', customFields: {} as Record<string, any>
})
const newCustSaving = ref(false)
const newCustPhoneExists = ref(false)
const newCustExistingCustomer = ref<any>(null)

const checkPhoneExists = async () => {
  if (!newCustForm.value.phone || newCustForm.value.phone.length < 11) {
    newCustPhoneExists.value = false; return
  }
  try {
    const res: any = await request.get('/customers/check-exists', { params: { phone: newCustForm.value.phone } })
    if (res?.data) {
      newCustPhoneExists.value = true
      newCustExistingCustomer.value = res.data
    } else {
      newCustPhoneExists.value = false
      newCustExistingCustomer.value = null
    }
  } catch { newCustPhoneExists.value = false }
}

const useExistingCustomer = () => {
  if (newCustExistingCustomer.value) {
    selectQoCustomer(newCustExistingCustomer.value)
    newCustPhoneExists.value = false
  }
}

const validateNewCustForm = (): string | null => {
  if (!newCustForm.value.phone || !/^1[3-9]\d{9}$/.test(newCustForm.value.phone)) return '请输入正确的手机号'
  if (!newCustForm.value.name?.trim()) return '请输入客户姓名'
  if (custFieldCfg.isFieldRequired('gender') && !newCustForm.value.gender) return '请选择性别'
  if (custFieldCfg.isFieldRequired('age') && !newCustForm.value.age) return '请输入年龄'
  if (custFieldCfg.isFieldRequired('source') && !newCustForm.value.source) return '请选择客户来源'
  if (custFieldCfg.isFieldRequired('level') && !newCustForm.value.level) return '请选择客户等级'
  if (custFieldCfg.isFieldRequired('status') && !newCustForm.value.status) return '请选择客户状态'
  if (custFieldCfg.isFieldRequired('height') && !newCustForm.value.height) return '请输入身高'
  if (custFieldCfg.isFieldRequired('weight') && !newCustForm.value.weight) return '请输入体重'
  if (custFieldCfg.isFieldRequired('address') && !newCustForm.value.address) return '请输入收货地址'
  if (custFieldCfg.isFieldRequired('fanAcquisitionTime') && !newCustForm.value.fanAcquisitionTime) return '请选择进粉时间'
  if (custFieldCfg.isFieldRequired('medicalHistory') && !newCustForm.value.medicalHistory) return '请输入疾病史'
  if (custFieldCfg.isFieldRequired('birthday') && !newCustForm.value.birthday) return '请选择生日'
  for (const cf of custFieldCfg.customFields) {
    if (cf.required && !newCustForm.value.customFields[cf.fieldKey]) return `请填写${cf.fieldName}`
  }
  return null
}

const saveNewCustomer = async (andOrder: boolean) => {
  const err = validateNewCustForm()
  if (err) { ElMessage.warning(err); return }
  if (newCustPhoneExists.value) { ElMessage.warning('该手机号已存在客户，请直接使用'); return }
  newCustSaving.value = true
  try {
    const tags = newCustForm.value.tagsStr ? newCustForm.value.tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined
    const payload: any = {
      name: newCustForm.value.name.trim(),
      phone: newCustForm.value.phone,
      gender: newCustForm.value.gender || undefined,
      age: newCustForm.value.age || undefined,
      source: newCustForm.value.source || undefined,
      level: newCustForm.value.level || 'normal',
      status: newCustForm.value.status || 'potential',
      wechatId: newCustForm.value.wechat || undefined,
      email: newCustForm.value.email || undefined,
      height: newCustForm.value.height || undefined,
      weight: newCustForm.value.weight || undefined,
      birthday: newCustForm.value.birthday || undefined,
      fanAcquisitionTime: newCustForm.value.fanAcquisitionTime || undefined,
      medicalHistory: newCustForm.value.medicalHistory || undefined,
      tags,
      address: newCustForm.value.address || undefined,
      remarks: newCustForm.value.remark || undefined,
      customFields: Object.keys(newCustForm.value.customFields).length ? newCustForm.value.customFields : undefined
    }
    const res: any = await request.post('/customers', payload)
    const created = res?.data || res
    if (!created?.id) throw new Error('创建客户失败：未返回客户ID')
    ElMessage.success('客户创建成功！')
    selectQoCustomer(created)
    if (andOrder) qoStep.value = 2
  } catch (e: any) {
    ElMessage.error(e?.message || '创建客户失败')
  }
  newCustSaving.value = false
}

const searchQoProducts = () => {
  clearTimeout(qoSearchTimer)
  qoSearchTimer = setTimeout(async () => {
    try {
      const res: any = await request.get('/products', { params: { keyword: qoProductKeyword.value, page: 1, pageSize: 50, status: 'active' } })
      qoProductList.value = res?.data?.list || res?.list || res?.data || []
    } catch { qoProductList.value = [] }
  }, 300)
}

const addQoProduct = (p: any) => {
  const existing = qoForm.value.products.find(x => x.id === p.id)
  if (existing) {
    if (existing.quantity < p.stock) { existing.quantity++; calcQoTotal() }
    else ElMessage.warning('库存不足')
  } else {
    qoForm.value.products.push({ id: p.id, name: p.name, price: Number(p.price) || 0, quantity: 1, stock: p.stock || 999, image: p.image || p.imageUrl || '' })
    calcQoTotal()
  }
}

const changeQoQty = (idx: number, delta: number) => {
  const sp = qoForm.value.products[idx]
  const newQty = sp.quantity + delta
  if (newQty < 1) { qoForm.value.products.splice(idx, 1) }
  else if (newQty > sp.stock) { ElMessage.warning('库存不足') }
  else { sp.quantity = newQty }
  calcQoTotal()
}

const calcQoTotal = () => {
  const subtotal = qoForm.value.products.reduce((sum, p) => sum + p.price * p.quantity, 0)
  qoTotalAmount.value = subtotal
  // Always sync totalAmount to subtotal when products change
  qoForm.value.totalAmount = subtotal
}

const qoSubtotal = computed(() => qoForm.value.products.reduce((sum, p) => sum + p.price * p.quantity, 0))
const qoCollectAmount = computed(() => Math.max(Number(qoForm.value.totalAmount || 0) - Number(qoForm.value.depositAmount || 0), 0))

const calcQoCollect = () => {
  // Just trigger reactivity
}

// 支付方式
const qoPaymentMethods = ref([
  { label: '微信支付', value: 'wechat' },
  { label: '支付宝支付', value: 'alipay' },
  { label: '银行转账', value: 'bank_transfer' },
  { label: '云闪付', value: 'unionpay' },
  { label: '货到付款', value: 'cod' },
  { label: '其他', value: 'other' }
])

// 快递公司（默认列表，code与CRM一致用大写）
const qoExpressCompanyList = ref<{ code: string; name: string }[]>([
  { code: 'SF', name: '顺丰速运' },
  { code: 'YD', name: '韵达速递' },
  { code: 'ZTO', name: '中通快递' },
  { code: 'YTO', name: '圆通速递' },
  { code: 'STO', name: '申通快递' },
  { code: 'JTSD', name: '极兔速递' },
  { code: 'JD', name: '京东物流' },
  { code: 'EMS', name: 'EMS' },
  { code: 'DB', name: '德邦快递' }
])

// 加载支付方式和快递公司
const loadQoOptions = async () => {
  try {
    const res: any = await request.get('/system/payment-methods')
    if (res?.data?.length) {
      qoPaymentMethods.value = res.data.map((m: any) => ({ label: m.name || m.label, value: m.code || m.value }))
    }
  } catch { /* use defaults */ }
  try {
    const res: any = await request.get('/logistics/companies/active')
    const dataList = res?.data || (Array.isArray(res) ? res : null)
    if (dataList?.length) {
      qoExpressCompanyList.value = dataList.map((item: any) => ({ code: item.code, name: item.name }))
    }
  } catch { /* use defaults */ }
}

// 定金截图上传
const handleQoScreenshot = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const maxImages = 3
  const remaining = maxImages - qoForm.value.depositScreenshots.length
  if (remaining <= 0) { ElMessage.warning('最多上传3张截图'); return }
  const files = Array.from(input.files).slice(0, remaining)
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) {
        qoForm.value.depositScreenshots.push(ev.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  })
  input.value = ''
}

// 粘贴截图
const pasteQoScreenshot = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
      const imageType = item.types.find(t => t.startsWith('image/'))
      if (imageType) {
        if (qoForm.value.depositScreenshots.length >= 3) { ElMessage.warning('最多上传3张截图'); return }
        const blob = await item.getType(imageType)
        const reader = new FileReader()
        reader.onload = (ev) => {
          if (ev.target?.result) qoForm.value.depositScreenshots.push(ev.target.result as string)
        }
        reader.readAsDataURL(blob)
        ElMessage.success('粘贴截图成功')
        return
      }
    }
    ElMessage.info('剪贴板中没有图片')
  } catch {
    ElMessage.info('无法读取剪贴板，请使用Ctrl+V或上传按钮')
  }
}

// 全局Ctrl+V粘贴监听（在快捷下单步骤2时生效）
const handleGlobalPaste = async (e: ClipboardEvent) => {
  // Script form paste handler
  if (sShowAddScript.value && props.appId === 'scripts') {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) await sUploadAttachment(blob, `paste_${Date.now()}.png`)
        return
      }
    }
    return
  }
  // Quick order paste handler
  if (qoStep.value !== 2 || props.appId !== 'quick-order') return
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      if (qoForm.value.depositScreenshots.length >= 3) { ElMessage.warning('最多上传3张截图'); return }
      const blob = item.getAsFile()
      if (!blob) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          qoForm.value.depositScreenshots.push(ev.target.result as string)
          ElMessage.success('粘贴截图成功')
        }
      }
      reader.readAsDataURL(blob)
      return
    }
  }
}

// 查看客户详情（从成功页 -> 切换到crm-detail视图）
const goToCustomerDetail = () => {
  if (qoForm.value.customerId) {
    // 加载客户详情数据
    loadCustomerById(String(qoForm.value.customerId))
    // 切换到crm-detail应用
    emit('switch-app', 'crm-detail')
  }
}

// 加载指定客户详情
const loadCustomerById = async (id: string) => {
  try {
    const res: any = await request.get(`/customers/${id}`)
    const cust = res?.data || res
    if (cust?.id) {
      customerData.value = cust
      await loadCustomerOrders(id, 1)
    }
  } catch { /* ignore */ }
}

// 从CRM客户详情 -> 跳到快捷下单并自动填充客户
const goToQuickOrderWithCustomer = () => {
  if (!customerData.value?.id) {
    ElMessage.info('请先关联客户')
    return
  }
  // 重置下单表单并填充客户
  resetQuickOrder()
  selectQoCustomer(customerData.value)
  // 通知父组件切换到quick-order (通过emit)
  emit('switch-app', 'quick-order')
}

// 步骤2→3校验
const goToConfirm = () => {
  if (!qoForm.value.serviceWechat) { ElMessage.warning('请输入客服微信号'); return }
  if (!qoForm.value.orderSource) { ElMessage.warning(`请选择${orderFieldCfg.orderSourceFieldName}`); return }
  if (!qoForm.value.paymentMethod) { ElMessage.warning('请选择支付方式'); return }
  if (!qoForm.value.expressCompany) { ElMessage.warning('请选择快递公司'); return }
  // 校验订单自定义字段
  for (const cf of orderFieldCfg.customFields) {
    if (cf.required && !qoForm.value.customFields[cf.fieldKey]) {
      ElMessage.warning(`请填写${cf.fieldName}`)
      return
    }
  }
  qoStep.value = 3
}

const generateOrderNumber = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const timestamp = now.getTime().toString().slice(-6)
  return `ORD${y}${m}${d}${timestamp}`
}

const submitQuickOrder = async () => {
  if (!qoForm.value.customerId) { ElMessage.warning('请选择客户'); return }
  if (!qoForm.value.products.length) { ElMessage.warning('请选择产品'); return }
  if (!qoForm.value.receiverName || !qoForm.value.receiverPhone) { ElMessage.warning('请填写收货信息'); return }
  qoSubmitting.value = true
  try {
    const orderNumber = generateOrderNumber()
    const payload: any = {
      orderNumber,
      customerId: qoForm.value.customerId,
      customerName: qoForm.value.customerName,
      customerPhone: qoForm.value.customerPhone,
      receiverName: qoForm.value.receiverName,
      receiverPhone: qoForm.value.receiverPhone,
      receiverAddress: qoForm.value.receiverAddress,
      expressCompany: qoForm.value.expressCompany,
      serviceWechat: qoForm.value.serviceWechat,
      orderSource: qoForm.value.orderSource,
      paymentMethod: qoForm.value.paymentMethod === 'other' ? qoForm.value.paymentMethodOther : qoForm.value.paymentMethod,
      markType: qoForm.value.markType,
      products: qoForm.value.products.map(p => ({
        id: p.id,
        productId: p.id,
        name: p.name,
        productName: p.name,
        quantity: p.quantity,
        price: p.price,
        unitPrice: p.price,
        total: p.price * p.quantity,
        totalPrice: p.price * p.quantity,
        image: p.image || ''
      })),
      totalAmount: Number(qoForm.value.totalAmount) || qoTotalAmount.value,
      depositAmount: Number(qoForm.value.depositAmount) || 0,
      depositScreenshot: qoForm.value.depositScreenshots[0] || '',
      remark: qoForm.value.remark ? `[企微快捷下单] ${qoForm.value.remark}` : '[企微快捷下单]',
      customFields: Object.keys(qoForm.value.customFields).length ? qoForm.value.customFields : undefined,
      source: 'wecom_sidebar'
    }
    const res: any = await request.post('/orders', payload)
    qoResultOrderNo.value = res?.data?.orderNumber || res?.orderNumber || orderNumber
    qoStep.value = 4
    ElMessage.success('订单提交成功！')
  } catch (e: any) {
    ElMessage.error(e?.message || '订单提交失败，请重试')
  }
  qoSubmitting.value = false
}

const resetQuickOrder = () => {
  qoStep.value = 1
  qoCustomerMode.value = 'search'
  qoAutoMatchedCustomer.value = null
  qoForm.value = {
    customerId: '', customerName: '', customerPhone: '',
    receiverName: '', receiverPhone: '', receiverAddress: '',
    products: [], totalAmount: 0, depositAmount: 0, depositScreenshots: [],
    paymentMethod: '', paymentMethodOther: '', serviceWechat: '',
    orderSource: '', expressCompany: '', markType: 'normal',
    remark: '', customFields: {}
  }
  qoTotalAmount.value = 0
  qoCustomerKeyword.value = ''
  qoCustomerList.value = []
  newCustForm.value = { phone: '', name: '', gender: '', age: null, source: 'wecom', level: '', status: 'potential', wechat: '', email: '', height: null, weight: null, birthday: '', fanAcquisitionTime: '', tagsStr: '', medicalHistory: '', address: '', remark: '', customFields: {} }
  newCustPhoneExists.value = false
}

const initQoProducts = async () => {
  try {
    const res: any = await request.get('/products', { params: { page: 1, pageSize: 50, status: 'active' } })
    qoProductList.value = res?.data?.list || res?.list || res?.data || []
  } catch { /* ignore */ }
  loadQoOptions()
}

const demoScripts = [
  { id: 1, title: '欢迎语', content: '您好，很高兴为您服务！请问有什么可以帮助您的？' },
  { id: 2, title: '工作时间', content: '我们的工作时间是周一至周五 9:00-18:00，感谢您的理解。' },
  { id: 3, title: '产品咨询', content: '感谢您的关注！我们的产品系列丰富，请问您对哪方面感兴趣呢？' },
]

// ========== 快捷话术预览相关 ==========
const sScriptSearch = ref('')
const sScriptSettings = ref(false)
const sShowCatDialog = ref(false)
const sShowAddScript = ref(false)
const sEditScript = ref<any>(null)
const sNewCatName = ref('')
const sNewCatColor = ref('#07c160')
const sNewCatScope = ref<'public' | 'personal'>('public')
const sEditingCatId = ref<number | null>(null)
const sDragManageCatIdx = ref<number | null>(null)
const sColors = ['#07c160', '#409eff', '#e6a23c', '#f56c6c', '#67c23a', '#909399', '#ab47bc', '#00acc1']
const sScriptForm = ref<any>({ title: '', content: '', categoryId: null, color: '', attachments: [] })
const sCategories = ref<any[]>([])
const sAllScripts = ref<any[]>([])
const sAllScriptsBackup = ref<any[]>([])
const sCollapsed = ref<Record<number, boolean>>({})
const sSelectedCatId = ref<number | null>(null)
const sEnableDrag = ref(false)
const sSortByUse = ref(false)
const sPreviewImage = ref('')
const sDraggedCat = ref<any>(null)
const sDraggedScript = ref<any>(null)
const sCatPanelWidth = ref(90)
const sCtxMenu = ref<{ visible: boolean; x: number; y: number; script: any }>({ visible: false, x: 0, y: 0, script: null })
const sCatCtxMenu = ref<{ visible: boolean; x: number; y: number; cat: any }>({ visible: false, x: 0, y: 0, cat: null })

// Resizable panel
const sStartResize = (e: MouseEvent) => {
  const startX = e.clientX
  const startW = sCatPanelWidth.value
  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX
    sCatPanelWidth.value = Math.max(60, Math.min(180, startW + delta))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Context menu
const sShowCtxMenu = (e: MouseEvent, s: any) => {
  sCtxMenu.value = { visible: true, x: e.clientX, y: e.clientY, script: s }
  sCatCtxMenu.value.visible = false
}
const sShowCatCtxMenu = (e: MouseEvent, cat: any) => {
  sCatCtxMenu.value = { visible: true, x: e.clientX, y: e.clientY, cat }
  sCtxMenu.value.visible = false
}
const sCloseCtxMenu = () => { sCtxMenu.value.visible = false; sCatCtxMenu.value.visible = false }

const sCopyScript = (s: any) => {
  if (s?.content) {
    navigator.clipboard.writeText(s.content).then(() => ElMessage.success('已复制')).catch(() => {})
  }
}

const sInsertScript = (s: any) => {
  // Open add script dialog with same category as context script
  sEditScript.value = null
  sScriptForm.value = { title: '', content: '', categoryId: s?.categoryId || null, color: '', scope: 'personal', attachments: [] }
  sShowAddScript.value = true
}

const sSendToEditBox = (s: any) => {
  // Double-click: copy content to clipboard (simulates putting in edit box)
  if (s?.content) {
    navigator.clipboard.writeText(s.content).then(() => {
      ElMessage.success('话术已复制到编辑框（剪贴板）')
    }).catch(() => {
      ElMessage.info(s.content)
    })
  }
}

const sLocateScript = (s: any) => {
  // Clear search and locate the script's category
  sScriptSearch.value = ''
  sAllScripts.value = [...sAllScriptsBackup.value]
  if (s?.categoryId) {
    sSelectedCatId.value = s.categoryId
  } else {
    sSelectedCatId.value = 0
  }
  ElMessage.success('已定位到: ' + (s?.title || '该话术'))
}

const sDelCat = async (cat: any) => {
  if (!confirm('确定删除分组"' + cat.name + '"？')) return
  try {
    await request.delete('/wecom/scripts/categories/' + cat.id)
    ElMessage.success('已删除')
    await sLoadData()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

const sRenameCat = async (cat: any) => {
  const newName = prompt('请输入新分组名称', cat.name)
  if (!newName || newName.trim() === cat.name) return
  try {
    await request.put('/wecom/scripts/categories/' + cat.id, { name: newName.trim() })
    ElMessage.success('已重命名')
    await sLoadData()
  } catch (e: any) { ElMessage.error(e?.message || '重命名失败') }
}

const sHasAttachments = (s: any): boolean => {
  let atts = s.attachments
  if (typeof atts === 'string') { try { atts = JSON.parse(atts) } catch { return false } }
  return Array.isArray(atts) && atts.length > 0
}

const sSearchResults = computed(() => {
  const kw = sScriptSearch.value.trim().toLowerCase()
  if (!kw) return []
  return sAllScriptsBackup.value.filter(s =>
    (s.title || '').toLowerCase().includes(kw) || (s.content || '').toLowerCase().includes(kw)
  )
})

const sCatScriptCount = computed(() => {
  const map: Record<number, number> = {}
  for (const s of sAllScripts.value) {
    if (s.categoryId) map[s.categoryId] = (map[s.categoryId] || 0) + 1
  }
  return map
})

const sCatsWithScripts = computed(() => {
  return sCategories.value.map(cat => ({
    ...cat,
    _scripts: sAllScripts.value.filter(s => s.categoryId === cat.id)
  })).filter(cat => cat._scripts.length > 0)
})

const sUncategorized = computed(() => {
  const catIds = sCategories.value.map(c => c.id)
  return sAllScripts.value.filter(s => !s.categoryId || !catIds.includes(s.categoryId))
})

const sDisplayScripts = computed(() => {
  let list: any[]
  if (sSelectedCatId.value === null) {
    list = [...sAllScripts.value]
  } else if (sSelectedCatId.value === 0) {
    list = [...sUncategorized.value]
  } else {
    list = sAllScripts.value.filter(s => s.categoryId === sSelectedCatId.value)
  }
  // Parse attachments
  list = list.map(s => {
    let atts = s.attachments
    if (typeof atts === 'string') { try { atts = JSON.parse(atts) } catch { atts = [] } }
    const imgAtts = Array.isArray(atts) ? atts.filter((a: any) => a.type?.startsWith('image/')) : []
    return { ...s, _attachments: imgAtts }
  })
  if (sSortByUse.value) {
    list.sort((a, b) => (b.useCount || b.use_count || 0) - (a.useCount || a.use_count || 0))
  }
  return list
})

const sLoadData = async () => {
  try {
    const catRes: any = await request.get('/wecom/scripts/categories')
    sCategories.value = Array.isArray(catRes) ? catRes : (catRes?.data || catRes || [])
    const scriptRes: any = await request.get('/wecom/scripts', { params: { pageSize: 200 } })
    const list = scriptRes?.list || (Array.isArray(scriptRes) ? scriptRes : (scriptRes?.data?.list || scriptRes?.data || []))
    sAllScripts.value = Array.isArray(list) ? list : []
    sAllScriptsBackup.value = [...sAllScripts.value]
  } catch {
    sCategories.value = []
    sAllScripts.value = []
  }
}

const sFilterScripts = () => {
  const kw = sScriptSearch.value.trim().toLowerCase()
  if (!kw) {
    sAllScripts.value = [...sAllScriptsBackup.value]
    return
  }
  sAllScripts.value = sAllScriptsBackup.value.filter(s =>
    (s.title || '').toLowerCase().includes(kw) || (s.content || '').toLowerCase().includes(kw)
  )
}

const sOpenAddScript = (s: any) => {
  sEditScript.value = s
  if (s) {
    let atts = s.attachments
    if (typeof atts === 'string') { try { atts = JSON.parse(atts) } catch { atts = [] } }
    sScriptForm.value = { title: s.title, content: s.content, categoryId: s.categoryId, color: s.color || '', scope: s.scope || 'personal', attachments: Array.isArray(atts) ? atts : [] }
  } else {
    sScriptForm.value = { title: '', content: '', categoryId: sSelectedCatId.value > 0 ? sSelectedCatId.value : null, color: '', scope: 'personal', attachments: [] }
  }
  sShowAddScript.value = true
}

const sSaveCat = async () => {
  if (!sNewCatName.value.trim()) { ElMessage.warning('请输入分组名称'); return }
  try {
    if (sEditingCatId.value) {
      await request.put('/wecom/scripts/categories/' + sEditingCatId.value, { name: sNewCatName.value.trim(), color: sNewCatColor.value, scope: sNewCatScope.value })
      ElMessage.success('分组已更新')
      sEditingCatId.value = null
    } else {
      await request.post('/wecom/scripts/categories', { name: sNewCatName.value.trim(), color: sNewCatColor.value, scope: sNewCatScope.value })
      ElMessage.success('分组已创建')
    }
    sNewCatName.value = ''
    sNewCatColor.value = '#07c160'
    await sLoadData()
  } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

const sStartEditCat = (cat: any) => {
  sEditingCatId.value = cat.id
  sNewCatName.value = cat.name
  sNewCatScope.value = cat.scope || 'public'
  sNewCatColor.value = cat.color || '#07c160'
}

const sCancelEditCat = () => {
  sEditingCatId.value = null
  sNewCatName.value = ''
  sNewCatScope.value = 'public'
  sNewCatColor.value = '#07c160'
}

const sDragCatManage = (e: DragEvent, idx: number) => {
  sDragManageCatIdx.value = idx
  e.dataTransfer?.setData('text/plain', String(idx))
}

const sDropCatManage = async (e: DragEvent, targetIdx: number) => {
  const fromIdx = sDragManageCatIdx.value
  if (fromIdx === null || fromIdx === targetIdx) return
  const list = [...sCategories.value]
  const [moved] = list.splice(fromIdx, 1)
  list.splice(targetIdx, 0, moved)
  sCategories.value = list
  sDragManageCatIdx.value = null
  // Save sort order
  try {
    // 过滤掉无效的 id
    const ids = list
      .map(c => c.id)
      .filter(id => id != null && !isNaN(Number(id)) && Number(id) > 0)

    if (ids.length > 0) {
      await request.put('/wecom/scripts/categories/sort', { ids })
    }
  } catch (error) {
    console.error('Failed to save category sort order:', error)
  }
}

const sSaveScript = async () => {
  if (!sScriptForm.value.title && !sScriptForm.value.content) {
    ElMessage.warning('标题或内容至少填一项'); return
  }
  try {
    const payload = { ...sScriptForm.value, scope: sScriptForm.value.scope || 'personal', attachments: JSON.stringify(sScriptForm.value.attachments || []) }
    if (sEditScript.value?.id) {
      await request.put('/wecom/scripts/' + sEditScript.value.id, payload)
    } else {
      await request.post('/wecom/scripts', payload)
    }
    sShowAddScript.value = false
    ElMessage.success(sEditScript.value ? '话术已更新' : '话术已创建')
    await sLoadData()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
}

const sDelScript = async (s: any) => {
  if (!confirm('确定删除该话术？')) return
  try {
    await request.delete('/wecom/scripts/' + s.id)
    ElMessage.success('已删除')
    await sLoadData()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

const sSend = async (s: any) => {
  // Click: send to customer (copy text+attachments info to clipboard)
  let atts = s.attachments
  if (typeof atts === 'string') { try { atts = JSON.parse(atts) } catch { atts = [] } }
  const imgAtts = Array.isArray(atts) ? atts.filter((a: any) => a.type?.startsWith('image/')) : []
  const hasText = !!s.content
  const hasImg = imgAtts.length > 0

  if (hasText) {
    try { await navigator.clipboard.writeText(s.content) } catch {}
  }
  if (hasText && hasImg) {
    ElMessage.success(`已发送话术（含${imgAtts.length}张图片）`)
  } else if (hasText) {
    ElMessage.success('已发送话术')
  } else if (hasImg) {
    ElMessage.success(`已发送${imgAtts.length}张图片`)
  }
  // Increment use count
  request.post('/wecom/scripts/' + s.id + '/use').catch(() => {})
}

const sSendEdit = (s: any) => {
  // Double-click: open in edit mode (show in dialog/edit box)
  sOpenAddScript(s)
}

// ========== 话术附件上传 ==========
const sUploadAttachment = async (blob: Blob, filename: string) => {
  const formData = new FormData()
  formData.append('file', blob, filename)
  try {
    const res: any = await request.post('/wecom/scripts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const data = res?.url ? res : (res?.data || res)
    if (data?.url) {
      if (!sScriptForm.value.attachments) sScriptForm.value.attachments = []
      sScriptForm.value.attachments.push(data)
      ElMessage.success('上传成功')
    }
  } catch (e: any) {
    ElMessage.error('上传失败: ' + (e?.message || ''))
  }
}

const sHandleFileUpload = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  for (const f of files) {
    if (f.size > 10 * 1024 * 1024) { ElMessage.warning('文件超过10MB限制'); continue }
    await sUploadAttachment(f, f.name)
  }
  (e.target as HTMLInputElement).value = ''
}

const sHandlePasteUpload = async () => {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const imageType = item.types.find(t => t.startsWith('image/'))
      if (imageType) {
        const blob = await item.getType(imageType)
        await sUploadAttachment(blob, `paste_${Date.now()}.png`)
        return
      }
    }
    ElMessage.info('剪贴板中没有图片')
  } catch {
    ElMessage.info('无法读取剪贴板，请使用 Ctrl+V')
  }
}

// ========== 拖拽排序 ==========
const sDragCat = (e: DragEvent, cat: any) => { sDraggedCat.value = cat }
const sDropCat = async (e: DragEvent, targetCat: any) => {
  if (!sDraggedCat.value || sDraggedCat.value.id === targetCat.id) return
  const cats = [...sCategories.value]
  const fromIdx = cats.findIndex(c => c.id === sDraggedCat.value.id)
  const toIdx = cats.findIndex(c => c.id === targetCat.id)
  if (fromIdx < 0 || toIdx < 0) return
  cats.splice(fromIdx, 1)
  cats.splice(toIdx, 0, sDraggedCat.value)
  sCategories.value = cats
  // Save sort order
  try {
    await request.put('/wecom/scripts/categories/sort', { ids: cats.map(c => c.id) })
  } catch {}
  sDraggedCat.value = null
}

const sDragScript = (e: DragEvent, s: any) => { sDraggedScript.value = s }
const sDropScript = async (e: DragEvent, target: any) => {
  if (!sDraggedScript.value || sDraggedScript.value.id === target.id) return
  const list = [...sAllScripts.value]
  const fromIdx = list.findIndex(x => x.id === sDraggedScript.value.id)
  const toIdx = list.findIndex(x => x.id === target.id)
  if (fromIdx < 0 || toIdx < 0) return
  list.splice(fromIdx, 1)
  list.splice(toIdx, 0, sDraggedScript.value)
  sAllScripts.value = list
  sAllScriptsBackup.value = [...list]
  try {
    await request.put('/wecom/scripts/sort', { ids: list.map(x => x.id) })
  } catch {}
  sDraggedScript.value = null
}

const sExportScripts = (format: string) => {
  if (format === 'text') {
    let text = '【快捷话术导出】\n'
    for (const cat of sCategories.value) {
      text += '\n【' + cat.name + '】\n'
      sAllScripts.value.filter(s => s.categoryId === cat.id).forEach((s, i) => {
        text += (i + 1) + '. ' + s.title + '\n' + s.content + '\n\n'
      })
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scripts.txt'; a.click()
  } else {
    const data = { version: '1.0', categories: sCategories.value, scripts: sAllScripts.value }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scripts.json'; a.click()
  }
}

const sImportScripts = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  try {
    const text = await files[0].text()
    const data = JSON.parse(text)
    await request.post('/wecom/scripts/import', data)
    ElMessage.success('导入成功')
    await sLoadData()
  } catch { ElMessage.error('导入失败') }
}

// Load scripts data when entering scripts preview
watch(() => props.appId, (val) => {
  if (val === 'scripts' && step.value === 'detail') sLoadData()
}, { immediate: true })

watch(step, (val) => {
  if (val === 'detail' && props.appId === 'scripts') sLoadData()
})

const openFullDetail = () => {
  if (customerData.value?.id) {
    const url = router.resolve({ path: `/customer/detail/${customerData.value.id}` }).href
    window.open(url, '_blank')
  } else {
    ElMessage.info('暂无客户详情可查看')
  }
}

const handlePreviewLogin = async () => {
  if (!loginUsername.value || !loginPassword.value) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    let resolvedTenantId = ''
    if (loginTenantCode.value) {
      try {
        const tenantRes: any = await request.post('/tenant-license/verify-code', { tenantCode: loginTenantCode.value })
        resolvedTenantId = tenantRes?.tenantId || tenantRes?.data?.tenantId || tenantRes?.id || ''
        if (!resolvedTenantId) {
          const licRes: any = await request.post('/tenant-license/verify', { licenseKey: loginTenantCode.value })
          resolvedTenantId = licRes?.tenantId || licRes?.data?.tenantId || licRes?.id || ''
        }
      } catch {
        resolvedTenantId = loginTenantCode.value
      }
    }
    const loginPayload: any = { username: loginUsername.value, password: loginPassword.value }
    if (resolvedTenantId) loginPayload.tenantId = resolvedTenantId
    const authRes: any = await request.post('/auth/login', loginPayload)
    const user = authRes?.user || authRes?.data?.user || authRes
    boundUserName.value = user?.name || user?.username || loginUsername.value
    tenantCode.value = loginTenantCode.value || user?.tenantCode || user?.tenantId || ''
    await loadPreviewCustomer()
    step.value = 'detail'
    ElMessage.success('预览：绑定成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '登录失败，请检查用户名密码')
  }
  loading.value = false
}

const loadPreviewCustomer = async () => {
  try {
    const res: any = await request.get('/customers', { params: { page: 1, pageSize: 1 } })
    const list = res?.data?.list || res?.list || res?.data || []
    if (list.length > 0) {
      customerData.value = list[0]
    } else {
      customerData.value = { name: '示例客户', phone: '138****8888', source: 'other', level: 'normal', orderCount: 0, totalAmount: 0 }
    }
    if (customerData.value?.id) {
      await loadCustomerOrders(customerData.value.id, 1)
    }
  } catch {
    customerData.value = { name: '示例客户', phone: '138****8888', source: 'other', level: 'normal', orderCount: 0, totalAmount: 0 }
  }
}

const loadCustomerOrders = async (customerId: any, page: number) => {
  try {
    const ordRes: any = await request.get('/orders', { params: { customerId, page, pageSize: orderPageSize } })
    orders.value = ordRes?.data?.list || ordRes?.list || ordRes?.data || []
    orderTotal.value = ordRes?.data?.total || ordRes?.total || orders.value.length
    orderPage.value = page
    // 首次加载时计算购买统计
    if (page === 1 && orderTotal.value > 0) {
      // 从全部订单计算统计
      try {
        const allRes: any = await request.get('/orders', { params: { customerId, page: 1, pageSize: 9999 } })
        const allOrders = allRes?.data?.list || allRes?.list || allRes?.data || []
        if (allOrders.length > 0) {
          allOrdersCache.value = allOrders
          customerData.value.orderCount = allOrders.length
          customerData.value.totalAmount = allOrders.reduce((sum: number, o: any) => sum + Number(o.finalAmount || o.totalAmount || 0), 0)
          const lastOrder = allOrders[0]
          customerData.value.lastOrderTime = lastOrder?.createdAt || null
        }
      } catch { /* use existing stats */ }
    }
  } catch { orders.value = [] }
}

const prevOrderPage = () => {
  if (orderPage.value > 1 && customerData.value?.id) {
    loadCustomerOrders(customerData.value.id, orderPage.value - 1)
  }
}

const nextOrderPage = () => {
  if (orderPage.value * orderPageSize < orderTotal.value && customerData.value?.id) {
    loadCustomerOrders(customerData.value.id, orderPage.value + 1)
  }
}

onMounted(() => {
  try {
    const userStr = localStorage.getItem('user') || localStorage.getItem('user_info') || sessionStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      boundUserName.value = user.name || user.username || ''
      tenantCode.value = localStorage.getItem('crm_tenant_code') || user.tenantCode || user.tenantId || ''
      loginTenantCode.value = tenantCode.value
    }
  } catch {}
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token && boundUserName.value) {
    loading.value = true
    loadPreviewCustomer().then(() => {
      step.value = 'detail'
      loading.value = false
    }).catch(() => { loading.value = false })
  }
  if (props.appId === 'quick-order') initQoProducts()

  // 粘贴监听
  document.addEventListener('paste', handleGlobalPaste)
  document.addEventListener('click', sCloseCtxMenu)

  // 如果已有客户数据且进入快捷下单，自动填充客户
  if (props.appId === 'quick-order' && customerData.value?.id) {
    selectQoCustomer(customerData.value)
  }
})

watch(() => props.appId, (val) => {
  if (val === 'quick-order' && step.value === 'detail') {
    initQoProducts()
    // 自动填充已有的CRM客户数据
    if (customerData.value?.id && !qoForm.value.customerId) {
      selectQoCustomer(customerData.value)
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('paste', handleGlobalPaste)
  document.removeEventListener('click', sCloseCtxMenu)
})
</script>

<style scoped>
.sidebar-preview-wrapper { display: flex; justify-content: center; padding: 8px 0; }
.phone-frame { width: 375px; border: 2px solid #e5e7eb; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12); background: #f5f5f5; }
.phone-status-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #07c160; color: #fff; font-size: 13px; font-weight: 600; }
.phone-body { height: 560px; overflow-y: auto; background: #f5f5f5; }
.preview-login { padding: 32px 24px; text-align: center; }
.login-logo { font-size: 48px; margin-bottom: 8px; }
.preview-login h4 { margin: 0; color: #303133; font-size: 18px; }
.login-desc { color: #909399; font-size: 13px; margin: 4px 0 20px; }
.preview-form { text-align: left; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; color: #606266; margin-bottom: 4px; }
.preview-input { width: 100%; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; }
.preview-input:focus { border-color: #07c160; }
.preview-btn { width: 100%; padding: 10px; border: none; border-radius: 6px; background: #07c160; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.preview-btn:hover { background: #06ad56; }
.preview-btn:disabled { background: #c0c4cc; cursor: not-allowed; }
.preview-btn.full { background: #4c6ef5; }
.preview-btn.full:hover { background: #3b5de7; }
.login-tip { margin-top: 16px; font-size: 11px; color: #909399; }
.login-tip p { margin: 4px 0; }
.preview-detail { padding: 0; }
.preview-user-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fff; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-weight: 500; }
.action-link { color: #4c6ef5; cursor: pointer; font-size: 12px; font-weight: 400; }
.preview-card { background: #fff; margin: 8px; border-radius: 10px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.customer-head { display: flex; align-items: center; gap: 10px; }
.avatar { font-size: 36px; }
.customer-name { font-size: 15px; font-weight: 600; color: #303133; }
.customer-company { font-size: 12px; color: #606266; }
.customer-follow { font-size: 11px; color: #909399; margin-top: 2px; }
.card-title { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #303133; border-bottom: 1px solid #f5f5f5; }
.info-row .label { color: #909399; flex-shrink: 0; width: 60px; }
.info-row .tag { background: #ecf5ff; color: #409eff; padding: 0 6px; border-radius: 3px; font-size: 11px; }
.customer-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.mini-tag { background: #f4f4f5; color: #909399; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
.stats-row { display: flex; gap: 8px; }
.stat { flex: 1; text-align: center; padding: 6px; background: #f9fafb; border-radius: 6px; }
.stat-val { font-size: 16px; font-weight: 700; color: #303133; }
.stat-val.amount { font-size: 14px; color: #f56c6c; }
.stat-lbl { font-size: 10px; color: #909399; margin-top: 2px; }
.order-item { padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
.order-item:last-child { border-bottom: none; }
.order-head { display: flex; justify-content: space-between; font-size: 12px; }
.order-no { color: #303133; font-weight: 500; }
.order-status { font-size: 11px; }
.order-body { display: flex; justify-content: space-between; font-size: 11px; color: #909399; margin-top: 2px; }
.order-amount { color: #f56c6c; font-weight: 500; }
.preview-empty { text-align: center; padding: 80px 24px; color: #909399; }
.preview-empty .tip { font-size: 12px; margin-top: 4px; }
.scripts-tip { font-size: 11px; color: #909399; margin-bottom: 10px; padding: 6px 8px; background: #fdf6ec; border-radius: 6px; border: 1px solid #faecd8; }
.script-group { margin-top: 8px; }
.script-group-title { font-size: 12px; font-weight: 600; color: #606266; margin-bottom: 6px; }
.script-item { padding: 8px; margin-bottom: 6px; background: #f9fafb; border-radius: 8px; border: 1px solid #f0f0f0; position: relative; }
.script-title { font-size: 12px; font-weight: 600; color: #303133; margin-bottom: 3px; }
.script-content { font-size: 11px; color: #606266; line-height: 1.5; padding-right: 40px; }
.script-send-btn { position: absolute; right: 8px; top: 8px; padding: 2px 10px; font-size: 10px; background: #07c160; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
/* ========== 快捷下单步骤条 ========== */
.qo-steps { display: flex; align-items: center; padding: 10px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; }
.qo-step { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.qo-step .step-num { width: 20px; height: 20px; border-radius: 50%; background: #dcdfe6; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.qo-step.active .step-num { background: #07c160; }
.qo-step.done .step-num { background: #67c23a; }
.qo-step .step-text { font-size: 11px; color: #909399; }
.qo-step.active .step-text { color: #07c160; font-weight: 600; }
.qo-step.done .step-text { color: #67c23a; }
.qo-step-line { flex: 1; height: 2px; background: #dcdfe6; margin: 0 6px; }
.qo-step-line.active { background: #67c23a; }
.qo-step-content { padding: 0; }
/* 客户搜索列表 */
.qo-search-box { margin-bottom: 8px; }
.qo-customer-list { max-height: 180px; overflow-y: auto; }
.qo-customer-item { padding: 8px; border-radius: 6px; border: 1px solid #f0f0f0; margin-bottom: 4px; cursor: pointer; transition: all 0.2s; }
.qo-customer-item:hover { border-color: #07c160; background: #f0faf4; }
.qo-customer-item.selected { border-color: #07c160; background: #e8f8ef; }
.qo-cust-name { font-size: 13px; font-weight: 500; color: #303133; }
.qo-cust-phone { font-size: 11px; color: #909399; margin-left: 6px; }
.qo-cust-extra { display: flex; gap: 4px; margin-top: 3px; }
.qo-empty-hint { text-align: center; font-size: 11px; color: #c0c4cc; padding: 16px 0; }
/* 产品列表 */
.qo-product-list { max-height: 200px; overflow-y: auto; }
.qo-product-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid #f5f5f5; }
.qo-prod-img { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #f5f5f5; }
.qo-prod-img img { width: 100%; height: 100%; object-fit: cover; }
.qo-prod-info { flex: 1; min-width: 0; }
.qo-prod-name { font-size: 12px; font-weight: 500; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qo-prod-meta { display: flex; gap: 8px; margin-top: 2px; }
.qo-prod-price { font-size: 12px; color: #f56c6c; font-weight: 600; }
.qo-prod-stock { font-size: 10px; color: #909399; }
.qo-add-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: #07c160; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qo-add-btn:disabled { background: #dcdfe6; cursor: not-allowed; }
/* 已选产品 */
.qo-selected-product { padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.qo-selected-product:last-child { border-bottom: none; }
.qo-sp-top { display: flex; justify-content: space-between; align-items: center; }
.qo-sp-name { font-size: 12px; font-weight: 500; color: #303133; }
.qo-sp-remove { color: #f56c6c; cursor: pointer; font-size: 14px; }
.qo-sp-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.qo-sp-qty { display: flex; align-items: center; gap: 0; }
.qo-qty-btn { width: 22px; height: 22px; border-radius: 4px; background: #f0f0f0; color: #303133; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; }
.qo-qty-btn:hover { background: #e0e0e0; }
.qo-qty-val { width: 28px; text-align: center; font-size: 12px; font-weight: 600; }
.qo-sp-price-edit { display: flex; align-items: center; gap: 2px; }
.qo-price-input { width: 50px; border: 1px solid #dcdfe6; border-radius: 4px; padding: 2px 4px; font-size: 12px; text-align: right; outline: none; }
.qo-price-input:focus { border-color: #07c160; }
.qo-sp-total { font-size: 12px; color: #f56c6c; font-weight: 600; min-width: 60px; text-align: right; }
.qo-total-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #303133; }
.qo-total-amount { font-size: 16px; font-weight: 700; color: #f56c6c; }
/* 确认页 */
.qo-confirm-section { padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
.qo-confirm-label { font-size: 10px; color: #909399; }
.qo-confirm-val { font-size: 12px; color: #303133; font-weight: 500; }
.qo-confirm-product { font-size: 11px; color: #606266; padding: 2px 0; }
.portrait-section { margin-top: 8px; }
.portrait-item { margin-bottom: 10px; }
.portrait-label { font-size: 11px; font-weight: 600; color: #606266; margin-bottom: 4px; }
.portrait-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.p-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #f4f4f5; color: #606266; }
.p-tag.colored { background: #ecf5ff; color: #409eff; }
.portrait-bar { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin: 4px 0; }
.portrait-bar-fill { height: 100%; background: linear-gradient(90deg, #67c23a, #409eff); border-radius: 4px; transition: width 0.3s; }
.portrait-bar-fill.active { background: linear-gradient(90deg, #e6a23c, #f56c6c); }
.portrait-val { font-size: 10px; color: #909399; }
/* 关联CRM按钮(浅色边框) */
.link-crm-btn { font-size: 10px; padding: 2px 8px; border: 1px solid #c8e6c9; border-radius: 4px; background: #fff; color: #4caf50; cursor: pointer; white-space: nowrap; }
.link-crm-btn:hover { background: #e8f5e9; border-color: #81c784; }
.s-upload-btn { border-color: #dcdfe6 !important; color: #606266 !important; background: transparent !important; }
.s-upload-btn:hover { border-color: #409eff !important; color: #409eff !important; background: #ecf5ff !important; }
/* 复制图标按钮 */
.copy-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 3px; background: #f5f5f5; color: #757575; font-size: 12px; cursor: pointer; border: 1px solid #e0e0e0; flex-shrink: 0; }
.copy-icon-btn:hover { background: #e3f2fd; color: #1976d2; border-color: #90caf9; }
/* 画像网格 */
.portrait-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 6px 0; }
.portrait-metric { text-align: center; padding: 8px 4px; background: #fafafa; border-radius: 8px; }
.portrait-metric .metric-icon { font-size: 18px; margin-bottom: 2px; }
.portrait-metric .metric-val { font-size: 16px; font-weight: 700; color: #303133; }
.portrait-metric .metric-lbl { font-size: 10px; color: #909399; margin-top: 2px; }
/* 雷达图图例 */
.radar-legend { display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
.radar-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #606266; }
.radar-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
/* 星星评分 */
.star-btn { font-size: 18px; color: #e0e0e0; cursor: pointer; transition: color 0.15s, transform 0.15s; line-height: 1; }
.star-btn:hover { transform: scale(1.2); color: #ffd54f; }
.star-btn.active { color: #ffb300; }
/* Tag delete */
.tag-deletable { position: relative; padding-right: 16px !important; }
.tag-del { position: absolute; top: -2px; right: 1px; font-size: 8px; color: #c0c4cc; cursor: pointer; line-height: 1; }
.tag-del:hover { color: #f56c6c; }
/* Scrollable customer lists */
.qo-customer-list { max-height: 240px; overflow-y: auto; }
.link-crm-list { max-height: 280px; overflow-y: auto; }
/* ========== 快捷话术样式 ========== */
.s-layout { display: flex; flex: 1; overflow: hidden; border-top: 1px solid #f0f0f0; }
.s-cat-panel { width: 90px; flex-shrink: 0; overflow-y: auto; background: #f5f7fa; border-right: none; }
.s-resizer { width: 5px; cursor: col-resize; background: #e8e8e8; flex-shrink: 0; transition: background 0.15s; }
.s-resizer:hover { background: #07c160; }
.s-cat-item { display: flex; align-items: center; gap: 4px; padding: 8px 6px; cursor: pointer; font-size: 11px; transition: background 0.15s; border-left: 3px solid transparent; }
.s-cat-item:hover { background: #ebeef5; }
.s-cat-item.active { background: #fff; border-left-color: #07c160; font-weight: 600; }
.script-group-color { width: 4px; height: 16px; border-radius: 2px; flex-shrink: 0; }
.s-script-panel { flex: 1; overflow-y: auto; padding: 4px; max-height: 400px; }
.script-item { display: flex; align-items: center; gap: 4px; padding: 6px 8px; margin: 1px 0; border-radius: 4px; background: #fafafa; border: 1px solid #f0f0f0; cursor: pointer; transition: all 0.15s; white-space: nowrap; overflow: hidden; }
.script-item:hover { background: #f0faf4; border-color: #c8e6c9; }
.script-idx { font-size: 9px; color: #c0c4cc; min-width: 14px; flex-shrink: 0; }
.s-att-icon { font-size: 10px; flex-shrink: 0; }
.script-title-text { font-size: 11px; font-weight: 600; color: #303133; flex-shrink: 0; max-width: 60px; overflow: hidden; text-overflow: ellipsis; }
.script-content-inline { font-size: 10px; color: #909399; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: 4px; }
.script-send-btn { padding: 2px 8px; border: none; background: #07c160; color: #fff; border-radius: 4px; font-size: 10px; cursor: pointer; flex-shrink: 0; margin-left: auto; }
/* Send icon */
.s-send-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; color: #07c160; cursor: pointer; flex-shrink: 0; margin-left: auto; transition: all 0.2s; }
.s-send-icon:hover { background: #07c160; color: #fff; transform: scale(1.1); }
.script-send-btn:hover { background: #06ad56; }
/* Right-click context menu */
.s-ctx-menu { position: fixed; background: #fff; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); z-index: 10000; min-width: 140px; padding: 4px 0; }
.s-ctx-item { padding: 8px 16px; font-size: 12px; cursor: pointer; color: #303133; transition: background 0.15s; }
.s-ctx-item:hover { background: #f0faf4; }
/* Dialog overlay */
.s-dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.s-dialog { background: #fff; border-radius: 12px; width: 340px; max-height: 480px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.s-dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; font-weight: 600; }
.s-dialog-body { padding: 12px 16px; max-height: 380px; overflow-y: auto; }
.s-cat-manage-item { display: flex; align-items: center; gap: 6px; padding: 8px 4px; border-bottom: 1px solid #f5f5f5; }
/* Search dropdown */
.s-search-dropdown { margin: 0 10px 6px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; max-height: 300px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.s-search-item { display: flex; align-items: center; gap: 6px; padding: 8px 10px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f8f8f8; }
.s-search-item:last-child { border-bottom: none; }
.s-search-item:hover { background: #f0faf4; }
.s-search-title { font-size: 11px; font-weight: 600; flex-shrink: 0; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-search-content { font-size: 10px; color: #909399; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.color-dot { width: 16px; height: 16px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: all 0.15s; flex-shrink: 0; }
.color-dot:hover { transform: scale(1.2); }
.color-dot.active { border-color: #303133; box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
/* 客户选择模式Tab */
.qo-mode-tabs { display: flex; background: #fff; border-bottom: 1px solid #f0f0f0; }
.qo-mode-tab { flex: 1; text-align: center; padding: 10px 0; font-size: 12px; color: #909399; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.qo-mode-tab.active { color: #07c160; border-bottom-color: #07c160; font-weight: 600; }
.qo-auto-match { margin-bottom: 8px; }
.qo-match-badge { font-size: 10px; color: #67c23a; font-weight: 600; margin-bottom: 4px; }
.qo-new-form { max-height: 340px; overflow-y: auto; }
.qo-req { color: #f56c6c; font-weight: 700; }
.qo-field-hint { font-size: 10px; margin-top: 2px; }
.qo-field-hint.warn { color: #e6a23c; }
.qo-radio-group { display: flex; gap: 8px; flex-wrap: wrap; }
.qo-radio { padding: 4px 14px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.qo-radio.active { border-color: #07c160; background: #f0faf4; color: #07c160; font-weight: 600; }
.qo-new-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.qo-selected-cust-bar { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 500; color: #303133; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.qo-amount-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; }
.qo-amount-label { color: #909399; }
.qo-amount-val { color: #303133; font-weight: 600; }
.qo-screenshot-area { margin-top: 4px; }
.qo-screenshot-list { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.qo-screenshot-thumb { width: 56px; height: 56px; border-radius: 6px; overflow: hidden; position: relative; border: 1px solid #e5e7eb; }
.qo-screenshot-thumb img { width: 100%; height: 100%; object-fit: cover; }
.qo-screenshot-del { position: absolute; top: -2px; right: -2px; width: 16px; height: 16px; background: #f56c6c; color: #fff; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.qo-upload-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px dashed #dcdfe6; border-radius: 6px; font-size: 11px; color: #606266; cursor: pointer; }
.qo-upload-btn:hover { border-color: #07c160; color: #07c160; }
.qo-upload-actions { display: flex; gap: 6px; }
.qo-paste-hint { font-size: 10px; color: #c0c4cc; margin-top: 4px; }
/* 关联CRM客户弹窗 */
.link-crm-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.link-crm-dialog { background: #fff; border-radius: 12px; width: 320px; max-height: 420px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.link-crm-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; font-weight: 600; }
.link-crm-body { padding: 12px 16px; }
.link-crm-body .preview-input { margin-bottom: 8px; }
.link-crm-list { max-height: 260px; overflow-y: auto; }
/* Scope dot */
.s-scope-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
/* Scope radio toggle */
.s-scope-radio { display: inline-flex; align-items: center; gap: 2px; padding: 2px 8px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 10px; cursor: pointer; color: #909399; transition: all 0.15s; user-select: none; }
.s-scope-radio:hover { border-color: #c0c4cc; }
.s-scope-radio.active { border-color: #07c160; color: #07c160; background: #f0faf4; font-weight: 600; }
/* Scope badge */
.s-scope-badge { font-size: 9px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; }
.s-scope-badge.public { background: #e8f5e9; color: #388e3c; }
.s-scope-badge.personal { background: #fff3e0; color: #e65100; }
</style>

