<template>
  <div class="wecom-sidebar">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="sidebar">
          侧边栏
          <template #actions>
            <el-button v-if="isAdminUser" type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>添加应用
            </el-button>
          </template>
        </WecomHeader>
      </template>

      <el-alert v-if="isAdminUser" type="info" :closable="false" style="margin-bottom: 15px">
        侧边栏应用可在企业微信聊天窗口右侧展示，方便员工快速查看客户信息、订单等数据。配置保存在服务器端，同一租户下所有用户共享。需在企微后台「应用管理→自建应用→侧边栏」中添加对应网页地址。
      </el-alert>

      <el-alert v-if="isAdminUser" type="success" :closable="false" style="margin-bottom: 15px">
        <template #title><strong>🎯 内置侧边栏客户详情</strong></template>
        <div style="margin-top:4px">
          <p style="margin:2px 0">系统已内置「侧边栏客户详情」页面，员工在企微聊天时可查看客户CRM信息、订单记录和购买统计。</p>
          <p style="margin:6px 0 2px">侧边栏地址（请在企微后台配置）：</p>
          <code style="background:#f0faf4;padding:4px 8px;border-radius:4px;font-size:12px;word-break:break-all;display:block">
            {{ sidebarDetailUrl }}
          </code>
          <p style="margin:4px 0;color:#909399;font-size:12px">将此地址添加到企微后台 → 应用管理 → 自建应用 → 配置到聊天侧边栏。其中 <code>corpId</code> 参数需替换为您的企业ID。</p>
        </div>
      </el-alert>

      <!-- 汇总统计卡片 -->
      <div class="sidebar-stats-row" v-if="isAdminUser && (isDemoMode || appList.length > 0)">
        <div class="sidebar-stat-card">
          <div class="sidebar-stat-val">{{ currentStats.totalApps }}</div>
          <div class="sidebar-stat-label">总应用数</div>
        </div>
        <div class="sidebar-stat-card sidebar-stat-success">
          <div class="sidebar-stat-val">{{ currentStats.activeApps }}</div>
          <div class="sidebar-stat-label">活跃应用</div>
        </div>
        <div class="sidebar-stat-card sidebar-stat-primary">
          <div class="sidebar-stat-val">{{ currentStats.totalUseCount }}</div>
          <div class="sidebar-stat-label">总使用次数</div>
        </div>
        <div class="sidebar-stat-card">
          <div class="sidebar-stat-val">{{ currentStats.totalUserCount }}</div>
          <div class="sidebar-stat-label">使用人数</div>
        </div>
      </div>

      <!-- 应用分区 -->
      <el-tabs v-model="appTab">
        <el-tab-pane v-if="isAdminUser" label="内置应用" name="builtin">
          <el-table :data="builtinApps" size="small" stripe>
            <el-table-column label="应用" min-width="180">
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 8px">
                  <span style="font-size: 22px">{{ row.icon }}</span>
                  <div>
                    <div style="font-weight: 600; color: #303133">{{ row.name }}</div>
                    <div style="font-size: 12px; color: #909399">{{ row.desc }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="路径" min-width="200">
              <template #default="{ row }">
                <code style="font-size: 12px; color: #606266">{{ row.path }}</code>
              </template>
            </el-table-column>
            <el-table-column width="70" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" size="small" @change="handleSaveBuiltinApps" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handlePreviewBuiltin(row)">预览</el-button>
                <el-button type="success" link size="small" @click="handleCopyBuiltinUrl(row)">复制</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="isAdminUser" label="自定义应用" name="custom">
      <el-table :data="displayApps" v-loading="loading" stripe>
        <el-table-column label="应用" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-size: 22px">{{ row.icon || '📱' }}</span>
              <div>
                <div style="font-weight: 600; color: #303133">{{ row.name }}</div>
                <div style="font-size: 12px; color: #909399">{{ row.appType || '自定义' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="应用地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column label="使用统计" width="120" align="center">
          <template #default="{ row }">
            <div style="font-size: 13px">
              <div><strong>{{ row.useCount || 0 }}</strong> 次</div>
              <div style="color: #909399; font-size: 11px">{{ row.userCount || 0 }} 人使用</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="可见范围" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.visibility || '全部' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.isEnabled" size="small" @change="handleToggle(row)" :disabled="row._demo" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
            <el-button type="success" link size="small" @click="handleCopyUrl(row)">复制地址</el-button>
            <el-button type="warning" link size="small" @click="handlePreview(row)">预览</el-button>
            <template v-if="!row._demo">
              <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      </el-tab-pane>

        <el-tab-pane label="快捷话术" name="scripts">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="scriptSearchKeyword" placeholder="搜索话术..." style="width:220px" clearable @input="loadScriptsData" />
              <el-select v-model="scriptFilterScope" style="width:130px" placeholder="全部类型" clearable @change="loadScriptsData">
                <el-option label="全部" value="" />
                <el-option label="公共话术" value="public" />
                <el-option label="个人话术" value="personal" />
              </el-select>
            </div>
            <div style="display:flex;gap:8px">
              <el-button @click="showScriptCategoryDialog = true">📁 管理分组</el-button>
              <el-button type="primary" @click="openScriptDialog(null)">＋ 新建话术</el-button>
              <el-dropdown>
                <el-button>更多 ▾</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleExportScripts('json')">📥 导出全部(JSON+HTML预览)</el-dropdown-item>
                    <el-dropdown-item @click="handleExportScripts('xlsx')">📊 导出文字版(Excel)</el-dropdown-item>
                    <el-dropdown-item>
                      <label style="cursor:pointer;display:block">
                        📤 导入话术(JSON/Excel)
                        <input type="file" accept=".json,.xlsx,.xls" style="display:none" @change="handleImportScripts" />
                      </label>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <!-- 左右分栏布局：左侧分组 + 右侧话术详情 -->
          <div class="scripts-split-layout" v-loading="scriptsLoading">
            <!-- 左侧分组面板 -->
            <div class="scripts-group-panel">
              <div class="scripts-group-item" :class="{ active: scriptSelectedCatId === null }" @click="scriptSelectedCatId = null">
                <span class="scripts-group-dot" style="background:#909399"></span>
                <span class="scripts-group-name">全部话术</span>
                <el-badge :value="scriptsTableData.length" :max="999" type="info" />
              </div>
              <div
                v-for="cat in scriptCategoriesList"
                :key="cat.id"
                class="scripts-group-item"
                :class="{ active: scriptSelectedCatId === cat.id }"
                @click="scriptSelectedCatId = cat.id"
              >
                <span class="scripts-group-dot" :style="{ background: cat.color || (cat.scope === 'personal' ? '#e6a23c' : '#07c160') }"></span>
                <span class="scripts-group-name">{{ cat.name }}</span>
                <el-tag size="small" :type="cat.scope === 'personal' ? 'warning' : 'success'" style="margin-left:auto;margin-right:4px">
                  {{ cat.scope === 'personal' ? '个人' : '公共' }}
                </el-tag>
                <el-badge :value="scriptCatCountMap[cat.id] || 0" :max="999" type="info" />
              </div>
              <div class="scripts-group-item" :class="{ active: scriptSelectedCatId === 0 }" @click="scriptSelectedCatId = 0">
                <span class="scripts-group-dot" style="background:#C0C4CC"></span>
                <span class="scripts-group-name">未分组</span>
                <el-badge :value="scriptUncategorizedCount" :max="999" type="info" />
              </div>
            </div>

            <!-- 右侧话术列表+详情 -->
            <div class="scripts-detail-panel">
              <div v-if="scriptFilteredList.length === 0" style="text-align:center;padding:60px 20px;color:#C0C4CC">
                <div style="font-size:48px;margin-bottom:12px">📝</div>
                <div>当前分组暂无话术</div>
              </div>
              <template v-else>
                <!-- 紧凑双行话术列表 -->
                <div class="script-compact-list">
                  <div
                    v-for="(row, idx) in scriptPagedList"
                    :key="row.id"
                    class="script-row"
                    :class="{ 'script-row--selected': scriptSelectedId === row.id }"
                    @click="scriptSelectedId = row.id"
                  >
                    <!-- 第一行：序号 + 标题 + 内容预览 + 附件标记 + 操作按钮 -->
                    <div class="script-row__line1">
                      <span class="script-row__index">{{ (scriptPage - 1) * scriptPageSize + idx + 1 }}</span>
                      <span class="script-row__title" :style="row.color ? { color: row.color } : {}">{{ row.title || '(无标题)' }}</span>
                      <span class="script-row__content">{{ row.content || '' }}</span>
                      <span v-if="getAttachments(row).length" class="script-row__att-badge" title="含附件">📎{{ getAttachments(row).length }}</span>
                      <span class="script-row__actions">
                        <el-button type="primary" link size="small" @click.stop="openScriptDialog(row)">编辑</el-button>
                        <el-button type="danger" link size="small" @click.stop="handleDeleteScript(row)">删除</el-button>
                        <el-button type="success" link size="small" @click.stop="handleCopyScriptContent(row)">复制</el-button>
                      </span>
                    </div>
                    <!-- 第二行：类型 + 分组 + 使用次数 + 时间 -->
                    <div class="script-row__line2">
                      <el-tag size="small" :type="row.scope === 'personal' ? 'warning' : 'success'">
                        {{ row.scope === 'personal' ? '个人' : '公共' }}
                      </el-tag>
                      <el-tag v-if="row._categoryName" size="small" type="info">{{ row._categoryName }}</el-tag>
                      <span v-else class="script-row__meta">未分组</span>
                      <span class="script-row__meta">使用 {{ row.useCount || 0 }} 次</span>
                      <span class="script-row__meta">{{ formatDate(row.updatedAt || row.createdAt) }}</span>
                    </div>
                  </div>
                </div>

                <!-- 分页 (超过30条) -->
                <div v-if="scriptFilteredList.length > scriptPageSize" class="scripts-pagination">
                  <el-pagination
                    v-model:current-page="scriptPage"
                    :page-size="scriptPageSize"
                    :total="scriptFilteredList.length"
                    :page-sizes="[30, 50, 100]"
                    layout="total, prev, pager, next"
                    background
                    small
                    @current-change="scriptPage = $event"
                  />
                  <el-button v-if="!scriptExpanded && scriptFilteredList.length > scriptPageSize" type="primary" link size="small" @click="scriptExpanded = true; scriptPageSize = 100">
                    展开全部 ({{ scriptFilteredList.length }}条)
                  </el-button>
                  <el-button v-if="scriptExpanded" type="info" link size="small" @click="scriptExpanded = false; scriptPageSize = 30; scriptPage = 1">
                    收起
                  </el-button>
                </div>
              </template>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 话术编辑弹窗 -->
      <el-dialog v-model="scriptDialogVisible" :title="scriptEditData ? '编辑话术' : '新建话术'" width="860px">
        <el-form label-width="80px" size="default">
          <el-form-item label="标题">
            <el-input v-model="scriptDialogForm.title" placeholder="话术标题" />
          </el-form-item>
          <el-form-item label="内容">
            <el-input v-model="scriptDialogForm.content" type="textarea" :rows="6" placeholder="话术内容..." />
          </el-form-item>
          <el-form-item label="分组">
            <el-select v-model="scriptDialogForm.categoryId" placeholder="选择分组" clearable style="width:100%">
              <el-option v-for="cat in scriptCategoriesList" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-radio-group v-model="scriptDialogForm.scope">
              <el-radio v-if="isAdminUser" label="public">公共（全员可见）</el-radio>
              <el-radio label="personal">个人（仅自己）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="颜色">
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span v-for="c in ['#07c160','#409eff','#e6a23c','#f56c6c','#67c23a','#909399','#ab47bc','#00acc1']" :key="c"
                style="width:20px;height:20px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all 0.15s"
                :style="{ background: c, borderColor: scriptDialogForm.color === c ? '#303133' : 'transparent' }"
                @click="scriptDialogForm.color = c"></span>
              <span style="width:20px;height:20px;border-radius:50%;cursor:pointer;background:#f0f0f0;text-align:center;font-size:10px;line-height:20px"
                @click="scriptDialogForm.color = ''">✕</span>
            </div>
          </el-form-item>
          <el-form-item label="附件">
            <div>
              <div v-if="scriptDialogForm.attachments && scriptDialogForm.attachments.length" style="margin-bottom:8px">
                <div v-for="(att, idx) in scriptDialogForm.attachments" :key="idx" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px;background:#f5f7fa;border-radius:8px;border:1px solid #e5e7eb">
                  <img v-if="att.type && att.type.startsWith('image/')" :src="att.url" style="width:48px;height:48px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid #e5e7eb" @click="previewAttImage = att.url" />
                  <span v-else style="font-size:24px">📎</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ att.name }}</div>
                    <div style="font-size:11px;color:#909399">{{ (att.size / 1024).toFixed(1) }}KB</div>
                  </div>
                  <el-button type="danger" link size="small" @click="scriptDialogForm.attachments.splice(idx, 1)">删除</el-button>
                </div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <el-upload
                  action="/api/v1/wecom/scripts/upload"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleScriptAttachmentSuccess"
                  :before-upload="beforeScriptAttachmentUpload"
                  accept="*/*"
                >
                  <el-button size="small" plain>📎 上传文件</el-button>
                </el-upload>
                <el-button size="small" plain @click="handleScriptPaste">📋 粘贴图片</el-button>
              </div>
              <div style="font-size:12px;color:#909399;margin-top:4px">支持图片、文档等，单文件最大10MB；也可直接 Ctrl+V 粘贴图片</div>
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="scriptDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveScriptDialog">保存</el-button>
        </template>
      </el-dialog>

      <!-- 附件图片预览 -->
      <el-dialog v-model="previewAttImageVisible" title="图片预览" width="600px" append-to-body>
        <img :src="previewAttImage" style="width:100%;border-radius:8px" />
      </el-dialog>

      <!-- 分组管理弹窗 -->
      <el-dialog v-model="showScriptCategoryDialog" title="📁 管理话术分组" width="720px">
        <div style="margin-bottom:12px">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <el-input v-model="newScriptCatName" :placeholder="editingCatId ? '编辑分组名称' : '新分组名称'" style="flex:1" @keyup.enter="addScriptCategory" />
            <el-select v-model="newScriptCatScope" style="width:120px" placeholder="类型">
              <el-option label="🌐 公共" value="public" />
              <el-option label="👤 个人" value="personal" />
            </el-select>
            <el-button type="primary" @click="addScriptCategory">{{ editingCatId ? '保存' : '添加' }}</el-button>
            <el-button v-if="editingCatId" @click="cancelEditCategory">取消</el-button>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="font-size:12px;color:#909399">颜色：</span>
            <span v-for="c in scriptCatColors" :key="c"
              style="width:20px;height:20px;border-radius:50%;cursor:pointer;display:inline-block;border:2px solid transparent;transition:all 0.2s"
              :style="{ background: c, borderColor: newScriptCatColor === c ? '#333' : 'transparent', transform: newScriptCatColor === c ? 'scale(1.2)' : 'scale(1)' }"
              @click="newScriptCatColor = newScriptCatColor === c ? '' : c"></span>
            <span v-if="newScriptCatColor" style="font-size:11px;color:#909399;margin-left:4px">
              <span style="display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:middle" :style="{ background: newScriptCatColor }"></span>
              {{ newScriptCatColor }}
              <el-button link size="small" @click="newScriptCatColor = ''">清除</el-button>
            </span>
          </div>
        </div>
        <el-table :data="scriptCategoriesList" stripe row-key="id" @row-drop="handleCategoryDrop">
          <el-table-column label="排序" width="50" align="center">
            <template #default>
              <span style="cursor:grab;color:#c0c4cc">⠿</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="分组名称" min-width="150" />
          <el-table-column label="颜色" width="70" align="center">
            <template #default="{ row }">
              <span v-if="row.color || row.scope" style="width:14px;height:14px;border-radius:50%;display:inline-block" :style="{ background: row.color || (row.scope === 'personal' ? '#e6a23c' : '#07c160') }"></span>
            </template>
          </el-table-column>
          <el-table-column label="话术数" width="80" align="center">
            <template #default="{ row }">{{ row.scriptCount || 0 }}</template>
          </el-table-column>
          <el-table-column label="类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.scope === 'personal' ? 'warning' : 'success'">{{ row.scope === 'personal' ? '个人' : '公共' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="startEditCategory(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="deleteScriptCategory(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-dialog>
    </el-card>

    <!-- 添加/编辑应用弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑应用' : '添加应用'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="应用图标">
          <div class="icon-picker">
            <span v-for="icon in iconOptions" :key="icon" class="icon-option" :class="{ active: form.icon === icon }" @click="form.icon = icon">{{ icon }}</span>
          </div>
        </el-form-item>
        <el-form-item label="应用名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入应用名称" />
        </el-form-item>
        <el-form-item label="应用类型">
          <el-select v-model="form.appType" placeholder="选择应用类型" style="width: 100%">
            <el-option label="客户详情" value="客户详情" />
            <el-option label="订单查询" value="订单查询" />
            <el-option label="知识库" value="知识库" />
            <el-option label="自定义" value="自定义" />
          </el-select>
        </el-form-item>
        <el-form-item label="应用地址" prop="url">
          <el-input v-model="form.url" placeholder="请输入应用URL，如 https://crm.example.com/sidebar" />
        </el-form-item>
        <el-form-item label="可见范围">
          <el-select v-model="form.visibility" placeholder="选择可见范围" style="width: 100%">
            <el-option label="全部成员" value="全部成员" />
            <el-option label="销售部" value="销售部" />
            <el-option label="客服部" value="客服部" />
            <el-option label="技术部" value="技术部" />
          </el-select>
        </el-form-item>
        <el-form-item label="应用描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="可选，应用用途说明" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailDrawerVisible" title="应用详情" size="420px">
      <template v-if="detailApp">
        <div class="detail-header">
          <span class="detail-icon">{{ detailApp.icon || '📱' }}</span>
          <div>
            <div class="detail-name">{{ detailApp.name }}</div>
            <el-tag :type="detailApp.isEnabled ? 'success' : 'info'" size="small">{{ detailApp.isEnabled ? '已启用' : '已禁用' }}</el-tag>
          </div>
        </div>
        <el-descriptions :column="1" border style="margin-top: 16px">
          <el-descriptions-item label="应用类型">{{ detailApp.appType || '自定义' }}</el-descriptions-item>
          <el-descriptions-item label="可见范围">{{ detailApp.visibility || '全部成员' }}</el-descriptions-item>
          <el-descriptions-item label="应用描述">{{ detailApp.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="应用地址">
            <span style="word-break: break-all; font-size: 12px">{{ detailApp.url }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="使用次数"><strong>{{ detailApp.useCount || 0 }}</strong> 次</el-descriptions-item>
          <el-descriptions-item label="使用人数"><strong>{{ detailApp.userCount || 0 }}</strong> 人</el-descriptions-item>
          <el-descriptions-item label="最近使用">{{ detailApp.lastUsedAt ? formatDate(detailApp.lastUsedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailApp.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="'侧边栏预览 - ' + (previewApp?.name || '')" width="440px" destroy-on-close>
      <SidebarPreview v-if="previewVisible" :app-id="previewApp?.id || ''" :app-name="previewApp?.name || ''" :app-icon="previewApp?.icon || '📱'" @switch-app="handleSwitchPreviewApp" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomSidebar' })
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getSidebarApps, addSidebarApp, saveSidebarApps, deleteSidebarApp } from '@/api/wecom'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import SidebarPreview from './components/SidebarPreview.vue'
import { formatDateTime } from '@/utils/date'
import { useWecomDemo, DEMO_SIDEBAR_APPS, DEMO_SIDEBAR_STATS } from './composables/useWecomDemo'
import { useUserStore } from '@/stores/user'
import Sortable from 'sortablejs'

const { isDemoMode } = useWecomDemo()
const userStore = useUserStore()
const isAdminUser = computed(() => userStore.isAdmin)

const loading = ref(false)
const submitting = ref(false)
const appList = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const formRef = ref()
const appTab = ref('')

// Set default tab based on role
watch(isAdminUser, (val) => {
  if (!appTab.value) appTab.value = val ? 'builtin' : 'scripts'
}, { immediate: true })

// 内置应用
const builtinApps = ref([
  { id: 'crm-detail', name: 'CRM客户详情', desc: '查看客户信息、订单、跟进记录', icon: '👤', path: '/wecom-sidebar', enabled: true },
  { id: 'scripts', name: '快捷话术', desc: '分类话术一键发送到聊天', icon: '💬', path: '/wecom-sidebar?tab=scripts', enabled: true },
  { id: 'quick-order', name: '快捷下单', desc: '在聊天中快速为客户创建订单', icon: '🛒', path: '/wecom-sidebar?tab=order', enabled: false },
  { id: 'portrait', name: '客户画像', desc: '多维度客户画像与AI分析', icon: '📊', path: '/wecom-sidebar?tab=portrait', enabled: false },
])

const handleSaveBuiltinApps = async () => {
  try {
    // 内置应用启用状态保存到 TenantSettings
    const { default: request } = await import('@/utils/request')
    await request.put('/wecom/sidebar-builtin-config', { builtinApps: builtinApps.value })
    ElMessage.success('内置应用配置已保存')
  } catch {
    // 静默处理，配置会在下次加载时重新获取
  }
}

const handlePreviewBuiltin = (row: any) => {
  previewApp.value = row
  previewVisible.value = true
}

// 处理侧边栏预览内应用切换
const handleSwitchPreviewApp = (appId: string) => {
  const app = builtinApps.value.find((a: any) => a.id === appId)
  if (app) {
    previewApp.value = { ...app }
  }
}

const handleCopyBuiltinUrl = async (row: any) => {
  const fullUrl = `${window.location.origin}${row.path}`
  try {
    await navigator.clipboard.writeText(fullUrl)
    ElMessage.success('地址已复制到剪贴板')
  } catch {
    ElMessage.info(`地址: ${fullUrl}`)
  }
}

// 详情 & 预览
const detailDrawerVisible = ref(false)
const detailApp = ref<any>(null)
const previewVisible = ref(false)
const previewApp = ref<any>(null)

const iconOptions = ['👤', '📚', '📦', '💰', '🎫', '🔍', '📊', '💬', '🛒', '📋', '🎯', '⚙️']

const sidebarDetailUrl = computed(() => {
  const origin = window.location.origin
  return `${origin}/wecom-sidebar?corpId=YOUR_CORP_ID`
})

/** 显示的应用列表 */
const displayApps = computed(() => {
  if (appList.value.length > 0 || !isDemoMode.value) return appList.value
  return DEMO_SIDEBAR_APPS
})

/** 统计数据 */
const currentStats = computed(() => {
  const ds = isDemoMode.value ? DEMO_SIDEBAR_STATS : null
  const list = appList.value
  return {
    totalApps: ds ? ds.totalApps : list.length,
    activeApps: ds ? (ds.activeApps || ds.enabledApps || 0) : list.filter((a: any) => a.isEnabled).length,
    totalUseCount: ds ? (ds.totalUseCount || ds.todayVisits || 0) : list.reduce((s: number, a: any) => s + (a.useCount || 0), 0),
    totalUserCount: ds ? (ds.totalUserCount || ds.totalVisits || 0) : (new Set(list.flatMap((a: any) => a.users || [])).size || list.length),
  }
})

const form = ref({ name: '', url: '', description: '', isEnabled: true, icon: '📱', appType: '自定义', visibility: '全部成员' })
const rules = {
  name: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入应用地址', trigger: 'blur' },
    { pattern: /^https?:\/\//, message: '请输入有效的URL地址', trigger: 'blur' }
  ]
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getSidebarApps()
    appList.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.error('[WecomSidebar] Fetch error:', e)
    appList.value = []
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  currentId.value = null
  form.value = { name: '', url: '', description: '', isEnabled: true, icon: '📱', appType: '自定义', visibility: '全部成员' }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  currentId.value = row.id
  form.value = { name: row.name, url: row.url, description: row.description || '', isEnabled: row.isEnabled, icon: row.icon || '📱', appType: row.appType || '自定义', visibility: row.visibility || '全部成员' }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value && currentId.value !== null) {
      const idx = appList.value.findIndex(a => a.id === currentId.value)
      if (idx >= 0) {
        appList.value[idx] = { ...appList.value[idx], ...form.value }
      }
      await saveSidebarApps(appList.value)
      ElMessage.success('更新成功')
    } else {
      const res = await addSidebarApp(form.value)
      if (res) {
        ElMessage.success('添加成功')
      }
      await fetchList()
    }
    dialogVisible.value = false
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleToggle = async (row: any) => {
  if (row._demo) {
    ElMessage.info('示例模式：授权后可操作')
    row.isEnabled = !row.isEnabled
    return
  }
  try {
    await saveSidebarApps(appList.value)
    ElMessage.success(row.isEnabled ? '已启用' : '已禁用')
  } catch (_e: any) {
    ElMessage.error('操作失败')
    row.isEnabled = !row.isEnabled
  }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定要删除该应用吗？', '提示', { type: 'warning' })
  try {
    await deleteSidebarApp(row.id)
    appList.value = appList.value.filter(a => a.id !== row.id)
    ElMessage.success('删除成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const handleViewDetail = (row: any) => {
  detailApp.value = row
  detailDrawerVisible.value = true
}

const handleCopyUrl = async (row: any) => {
  try {
    await navigator.clipboard.writeText(row.url)
    ElMessage.success('地址已复制到剪贴板')
  } catch {
    ElMessage.info(`地址: ${row.url}`)
  }
}

const handlePreview = (row: any) => {
  previewApp.value = row
  previewVisible.value = true
}


onMounted(() => {
  fetchList()
  loadBuiltinConfig()
  if (appTab.value === 'scripts') loadScriptsData()
  // Ctrl+V paste listener for script dialog
  document.addEventListener('paste', handleGlobalScriptPaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handleGlobalScriptPaste)
})

const handleGlobalScriptPaste = async (e: ClipboardEvent) => {
  if (!scriptDialogVisible.value) return
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const blob = item.getAsFile()
      if (blob) await uploadBlobAsAttachment(blob, `paste_${Date.now()}.png`)
      return
    }
  }
}

const loadBuiltinConfig = async () => {
  try {
    const { default: request } = await import('@/utils/request')
    const res: any = await request.get('/wecom/sidebar-builtin-config')
    const saved = res?.data || res
    if (Array.isArray(saved) && saved.length > 0) {
      // 合并保存的启用状态
      saved.forEach((s: any) => {
        const app = builtinApps.value.find(a => a.id === s.id)
        if (app) app.enabled = s.enabled
      })
    }
  } catch { /* ignore */ }
}

// ========== 快捷话术管理 ==========
const scriptSearchKeyword = ref('')
const scriptFilterScope = ref('')
const scriptFilterCategory = ref('')
const scriptsLoading = ref(false)
const scriptsTableData = ref<any[]>([])
const scriptCategoriesList = ref<any[]>([])
const scriptDialogVisible = ref(false)
const scriptEditData = ref<any>(null)
const scriptDialogForm = ref<any>({ title: '', content: '', categoryId: null, scope: 'public', color: '', attachments: [] })
const showScriptCategoryDialog = ref(false)
const newScriptCatName = ref('')
const newScriptCatScope = ref('public')
const newScriptCatColor = ref('')
const editingCatId = ref<number | null>(null)
const scriptCatColors = ['#07c160', '#1890ff', '#722ed1', '#eb2f96', '#fa8c16', '#52c41a', '#13c2c2', '#f5222d', '#faad14', '#2f54eb']

// 左右分栏状态
const scriptSelectedCatId = ref<number | null>(null) // null=全部, 0=未分组, number=具体分组
const scriptSelectedId = ref<number | null>(null)
const scriptPage = ref(1)
const scriptPageSize = ref(30)
const scriptExpanded = ref(false)

// 分组话术计数
const scriptCatCountMap = computed(() => {
  const map: Record<number, number> = {}
  for (const s of scriptsTableData.value) {
    if (s.categoryId) map[s.categoryId] = (map[s.categoryId] || 0) + 1
  }
  return map
})

const scriptUncategorizedCount = computed(() => {
  return scriptsTableData.value.filter(s => !s.categoryId || !scriptCategoriesList.value.find(c => c.id === s.categoryId)).length
})

// 按分组筛选
const scriptFilteredList = computed(() => {
  let list = scriptsTableData.value
  if (scriptSelectedCatId.value === null) {
    // 全部
  } else if (scriptSelectedCatId.value === 0) {
    // 未分组
    list = list.filter(s => !s.categoryId || !scriptCategoriesList.value.find((c: any) => c.id === s.categoryId))
  } else {
    list = list.filter(s => s.categoryId === scriptSelectedCatId.value)
  }
  return list
})

// 分页
const scriptPagedList = computed(() => {
  const start = (scriptPage.value - 1) * scriptPageSize.value
  return scriptFilteredList.value.slice(start, start + scriptPageSize.value)
})

// 解析附件
const getAttachments = (row: any): any[] => {
  if (!row.attachments) return []
  try {
    return typeof row.attachments === 'string' ? JSON.parse(row.attachments || '[]') : row.attachments
  } catch { return [] }
}

// 复制话术内容（文字+附件信息）
const handleCopyScriptContent = async (row: any) => {
  try {
    let text = row.content || row.title || ''
    const atts = getAttachments(row)
    if (atts.length > 0) {
      const attText = atts.map((a: any) => `[附件: ${a.name || a.url || '文件'}]`).join('\n')
      text = text + '\n' + attText
    }
    await navigator.clipboard.writeText(text)
    ElMessage.success('话术内容已复制')
  } catch {
    ElMessage.info(row.content || row.title || '')
  }
}

// Upload headers for attachments
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || ''
  return { Authorization: `Bearer ${token}` }
})

const handleScriptAttachmentSuccess = (response: any) => {
  if (response?.success && response?.data) {
    if (!scriptDialogForm.value.attachments) scriptDialogForm.value.attachments = []
    scriptDialogForm.value.attachments.push(response.data)
    ElMessage.success('附件上传成功')
  } else {
    ElMessage.error('附件上传失败')
  }
}

const beforeScriptAttachmentUpload = (file: any) => {
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过10MB')
    return false
  }
  return true
}

const previewAttImage = ref('')
const previewAttImageVisible = computed({
  get: () => !!previewAttImage.value,
  set: (v: boolean) => { if (!v) previewAttImage.value = '' }
})

const handleScriptPaste = async () => {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const imageType = item.types.find(t => t.startsWith('image/'))
      if (imageType) {
        const blob = await item.getType(imageType)
        await uploadBlobAsAttachment(blob, `paste_${Date.now()}.png`)
        return
      }
    }
    ElMessage.info('剪贴板中没有图片')
  } catch {
    ElMessage.info('无法读取剪贴板，请使用 Ctrl+V')
  }
}

const uploadBlobAsAttachment = async (blob: Blob, filename: string) => {
  const formData = new FormData()
  formData.append('file', blob, filename)
  try {
    const { default: request } = await import('@/utils/request')
    const res: any = await request.post('/wecom/scripts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const data = res?.data || res
    if (data?.url) {
      if (!scriptDialogForm.value.attachments) scriptDialogForm.value.attachments = []
      scriptDialogForm.value.attachments.push(data)
      ElMessage.success('图片已上传')
    }
  } catch (e: any) {
    ElMessage.error('上传失败: ' + (e?.message || ''))
  }
}

const loadScriptsData = async () => {
  scriptsLoading.value = true
  try {
    const { default: request } = await import('@/utils/request')
    const params: any = { pageSize: 200 }
    if (scriptSearchKeyword.value) params.keyword = scriptSearchKeyword.value
    if (scriptFilterScope.value) params.scope = scriptFilterScope.value
    if (scriptFilterCategory.value) params.categoryId = scriptFilterCategory.value
    const res: any = await request.get('/wecom/scripts', { params })
    const list = res?.list || res?.data?.list || (Array.isArray(res) ? res : res?.data || [])
    const catRes: any = await request.get('/wecom/scripts/categories')
    scriptCategoriesList.value = Array.isArray(catRes) ? catRes : (catRes?.data || catRes || [])
    const catMap: Record<number, string> = {}
    scriptCategoriesList.value.forEach((c: any) => { catMap[c.id] = c.name })
    scriptsTableData.value = list.map((s: any) => ({ ...s, _categoryName: catMap[s.categoryId] || '' }))
  } catch { scriptsTableData.value = [] }
  scriptsLoading.value = false
}

const openScriptDialog = (row: any) => {
  scriptEditData.value = row
  const defaultScope = isAdminUser.value ? 'public' : 'personal'
  if (row) {
    const attachments = row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments || '[]') : row.attachments) : []
    scriptDialogForm.value = { title: row.title, content: row.content, categoryId: row.categoryId, scope: row.scope || defaultScope, color: row.color || '', attachments }
  } else {
    scriptDialogForm.value = { title: '', content: '', categoryId: null, scope: defaultScope, color: '', attachments: [] }
  }
  scriptDialogVisible.value = true
}

const saveScriptDialog = async () => {
  if (!scriptDialogForm.value.title && !scriptDialogForm.value.content) {
    ElMessage.warning('标题或内容至少填一项'); return
  }
  try {
    const { default: request } = await import('@/utils/request')
    const payload = { ...scriptDialogForm.value, attachments: JSON.stringify(scriptDialogForm.value.attachments || []) }
    if (scriptEditData.value?.id) {
      await request.put('/wecom/scripts/' + scriptEditData.value.id, payload)
    } else {
      await request.post('/wecom/scripts', payload)
    }
    scriptDialogVisible.value = false
    ElMessage.success(scriptEditData.value ? '话术已更新' : '话术已创建')
    await loadScriptsData()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
}

const handleDeleteScript = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定删除话术「' + (row.title || '无标题') + '」？', '提示', { type: 'warning' })
    const { default: request } = await import('@/utils/request')
    await request.delete('/wecom/scripts/' + row.id)
    ElMessage.success('已删除')
    await loadScriptsData()
  } catch {}
}

const addScriptCategory = async () => {
  if (!newScriptCatName.value.trim()) { ElMessage.warning('请输入分组名称'); return }
  try {
    const { default: request } = await import('@/utils/request')
    if (editingCatId.value) {
      await request.put('/wecom/scripts/categories/' + editingCatId.value, { name: newScriptCatName.value.trim(), scope: newScriptCatScope.value, color: newScriptCatColor.value })
      ElMessage.success('分组已更新')
      editingCatId.value = null
    } else {
      await request.post('/wecom/scripts/categories', { name: newScriptCatName.value.trim(), scope: newScriptCatScope.value, color: newScriptCatColor.value })
      ElMessage.success('分组已创建')
    }
    newScriptCatName.value = ''
    newScriptCatColor.value = ''
    await loadScriptsData()
  } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

const startEditCategory = (row: any) => {
  editingCatId.value = row.id
  newScriptCatName.value = row.name
  newScriptCatScope.value = row.scope || 'public'
  newScriptCatColor.value = row.color || ''
}

const cancelEditCategory = () => {
  editingCatId.value = null
  newScriptCatName.value = ''
  newScriptCatScope.value = 'public'
  newScriptCatColor.value = ''
}

const handleCategoryDrop = async () => {
  // Drag sort for categories - save new order
  try {
    const { default: request } = await import('@/utils/request')
    // 过滤掉无效的 id，防止 NaN 传入后端导致 SQL 错误
    const ids = scriptCategoriesList.value
      .map((c: any) => c.id)
      .filter((id: any) => id != null && !isNaN(Number(id)) && Number(id) > 0)
    if (ids.length > 0) {
      await request.put('/wecom/scripts/categories/sort', { ids })
    }
  } catch {}
}

// Initialize drag sorting when category dialog opens
watch(showScriptCategoryDialog, (v) => {
  if (v) {
    nextTick(() => {
      const tableEl = document.querySelector('.el-dialog .el-table__body-wrapper tbody')
      if (tableEl) {
        Sortable.create(tableEl as HTMLElement, {
          handle: 'td:first-child',
          animation: 150,
          onEnd: ({ oldIndex, newIndex }: any) => {
            if (oldIndex !== newIndex && oldIndex != null && newIndex != null) {
              const list = [...scriptCategoriesList.value]
              const [moved] = list.splice(oldIndex, 1)
              list.splice(newIndex, 0, moved)
              scriptCategoriesList.value = list
              handleCategoryDrop()
            }
          }
        })
      }
    })
  }
})

const deleteScriptCategory = async (row: any) => {
  try {
    await ElMessageBox.confirm('删除分组将同时删除组内所有话术，确定？', '提示', { type: 'warning' })
    const { default: request } = await import('@/utils/request')
    await request.delete('/wecom/scripts/categories/' + row.id)
    ElMessage.success('已删除')
    await loadScriptsData()
  } catch {}
}

const handleExportScripts = async (format: string) => {
  try {
    if (format === 'xlsx') {
      // Excel导出
      const XLSX = await import('xlsx')
      const rows: any[] = []
      for (const s of scriptsTableData.value) {
        rows.push({
          '话术标题': s.title || '',
          '内容': s.content || '',
          '分组': s._categoryName || '未分组',
          '类型': s.scope === 'personal' ? '个人' : '公共',
          '颜色': s.color || '',
          '使用次数': s.useCount || 0
        })
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{ wch: 20 }, { wch: 60 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 10 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '快捷话术')
      XLSX.writeFile(wb, `快捷话术导出_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } else {
      // JSON+HTML预览导出
      const data = {
        version: '1.0', exportedAt: new Date().toISOString(),
        categories: scriptCategoriesList.value.map((c: any) => ({ name: c.name, color: c.color, scope: c.scope })),
        scripts: scriptsTableData.value.map((s: any) => ({ title: s.title, content: s.content, categoryName: s._categoryName, color: s.color, scope: s.scope, tags: s.tags, attachments: s.attachments }))
      }
      // 同时下载JSON
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      const ja = document.createElement('a'); ja.href = URL.createObjectURL(jsonBlob); ja.download = 'scripts-export.json'; ja.click()
      // 生成HTML预览文件
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>快捷话术导出预览</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:900px;margin:20px auto;padding:0 20px;color:#333}
h1{color:#07c160;border-bottom:2px solid #07c160;padding-bottom:8px}
h2{color:#409eff;margin-top:24px;border-left:4px solid #409eff;padding-left:8px}
.script{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:8px 0}
.script-title{font-weight:600;color:#1f2937;font-size:15px}
.script-content{color:#4b5563;margin-top:4px;white-space:pre-wrap}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-right:4px}
.tag-public{background:#ecfdf5;color:#059669}.tag-personal{background:#fffbeb;color:#d97706}
.meta{font-size:12px;color:#9ca3af;margin-top:16px;text-align:center}
img{max-width:200px;border-radius:6px;margin:4px}</style></head><body>
<h1>📋 快捷话术库</h1><p style="color:#6b7280">导出时间：${new Date().toLocaleString('zh-CN')}</p>`
      for (const cat of scriptCategoriesList.value) {
        const catScripts = scriptsTableData.value.filter((s: any) => s.categoryId === cat.id)
        if (!catScripts.length) continue
        const scopeTag = cat.scope === 'personal' ? '<span class="tag tag-personal">个人</span>' : '<span class="tag tag-public">公共</span>'
        html += `<h2>${cat.name} ${scopeTag} (${catScripts.length}条)</h2>`
        for (const s of catScripts) {
          let attHtml = ''
          if (s.attachments) {
            let atts = typeof s.attachments === 'string' ? JSON.parse(s.attachments || '[]') : s.attachments
            if (Array.isArray(atts)) atts.forEach((a: any) => { if (a.type?.startsWith('image/')) attHtml += `<img src="${a.url}" alt="${a.name||'图片'}"/>` })
          }
          html += `<div class="script"><div class="script-title">${s.title || '(无标题)'}</div><div class="script-content">${(s.content || '').replace(/</g,'&lt;')}</div>${attHtml}</div>`
        }
      }
      const uncategorized = scriptsTableData.value.filter((s: any) => !s.categoryId || !scriptCategoriesList.value.find((c: any) => c.id === s.categoryId))
      if (uncategorized.length) {
        html += `<h2>未分组 (${uncategorized.length}条)</h2>`
        for (const s of uncategorized) {
          html += `<div class="script"><div class="script-title">${s.title || '(无标题)'}</div><div class="script-content">${(s.content || '').replace(/</g,'&lt;')}</div></div>`
        }
      }
      html += `<div class="meta">共 ${scriptsTableData.value.length} 条话术 · ${scriptCategoriesList.value.length} 个分组</div></body></html>`
      const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const ha = document.createElement('a'); ha.href = URL.createObjectURL(htmlBlob); ha.download = `快捷话术预览_${new Date().toISOString().slice(0, 10)}.html`; ha.click()
    }
    ElMessage.success('导出成功')
  } catch (e: any) { ElMessage.error('导出失败: ' + (e?.message || '')) }
}

const handleImportScripts = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  const file = files[0]
  try {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Excel导入
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)
      // 转为标准导入格式
      const catSet = new Set<string>()
      const scripts: any[] = []
      for (const row of rows) {
        const catName = row['分组'] || row['categoryName'] || ''
        if (catName && catName !== '未分组') catSet.add(catName)
        scripts.push({
          title: row['话术标题'] || row['title'] || '',
          content: row['内容'] || row['content'] || '',
          categoryName: catName || null,
          scope: (row['类型'] === '个人' || row['scope'] === 'personal') ? 'personal' : 'public',
          color: row['颜色'] || row['color'] || null
        })
      }
      const importData = {
        categories: Array.from(catSet).map(name => ({ name, scope: 'public' })),
        scripts
      }
      const { default: request } = await import('@/utils/request')
      const res: any = await request.post('/wecom/scripts/import', importData)
      ElMessage.success('Excel导入成功：' + (res?.data?.importedScripts || 0) + '条话术')
    } else {
      // JSON导入
      const text = await file.text()
      const data = JSON.parse(text)
      const { default: request } = await import('@/utils/request')
      const res: any = await request.post('/wecom/scripts/import', data)
      ElMessage.success('导入成功：' + (res?.data?.importedScripts || 0) + '条话术')
    }
    await loadScriptsData()
  } catch (e: any) { ElMessage.error('导入失败：' + (e?.message || '格式错误')) }
  (e.target as HTMLInputElement).value = ''
}

watch(appTab, (v) => { if (v === 'scripts') loadScriptsData() })

// 切换分组时重置分页
watch(scriptSelectedCatId, () => { scriptPage.value = 1 })
</script>

<style scoped lang="scss">
.wecom-sidebar { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }

/* V4 统计卡片 */
.sidebar-stats-row {
  display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
}
.sidebar-stat-card {
  flex: 1; min-width: 100px; padding: 14px 16px; background: #fff;
  border-radius: 12px; text-align: center; border: 1px solid #F3F4F6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.25s;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
}
.sidebar-stat-success { background: #ECFDF5; border-color: #D1FAE5; }
.sidebar-stat-primary { background: #EEF2FF; border-color: #E0E7FF; }
.sidebar-stat-val { font-size: 22px; font-weight: 700; color: #1F2937; }
.sidebar-stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

/* V4 图标选择器 */
.icon-picker { display: flex; flex-wrap: wrap; gap: 8px; }
.icon-option {
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  font-size: 22px; border: 2px solid #E5E7EB; border-radius: 10px; cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #4C6EF5; background: #EEF2FF; }
  &.active { border-color: #4C6EF5; background: #EEF2FF; box-shadow: 0 0 0 2px rgba(76,110,245,0.2); }
}

/* 详情抽屉 */
.detail-header {
  display: flex; align-items: center; gap: 12px;
}
.detail-icon { font-size: 36px; }
.detail-name { font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 4px; }

/* 表格标题不换行 */
:deep(.el-table th .cell) { white-space: nowrap; }

/* ========== 话术左右分栏布局 ========== */
.scripts-split-layout {
  display: flex; gap: 0; height: calc(100vh - 340px); min-height: 400px; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; background: #fff;
}
.scripts-group-panel {
  width: 220px; min-width: 220px; border-right: 1px solid #E5E7EB; background: #FAFBFC;
  overflow-y: auto; padding: 8px 0; position: sticky; top: 0; align-self: flex-start; height: 100%;
}
.scripts-group-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px; cursor: pointer;
  transition: all 0.15s; font-size: 13px; color: #4B5563; border-left: 3px solid transparent;
  &:hover { background: #F3F4F6; }
  &.active { background: #EEF2FF; color: #4C6EF5; border-left-color: #4C6EF5; font-weight: 600; }
}
.scripts-group-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.scripts-group-name {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.scripts-detail-panel {
  flex: 1; overflow-y: auto; padding: 0;
}

/* ========== 紧凑双行话术条目 ========== */
.script-compact-list {
  display: flex; flex-direction: column;
}
.script-row {
  padding: 10px 16px;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: #F9FAFB; }
  &:last-child { border-bottom: none; }
}
.script-row--selected {
  background: #F0F4FF;
  border-left: 3px solid #4C6EF5;
}
.script-row__line1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.script-row__index {
  flex-shrink: 0;
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #F3F4F6; border-radius: 50%;
  font-size: 11px; font-weight: 600; color: #9CA3AF;
}
.script-row__title {
  font-weight: 700; font-size: 14px; color: #1F2937;
  flex-shrink: 0; max-width: 180px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.script-row__content {
  flex: 1; font-size: 13px; color: #6B7280;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.script-row__att-badge {
  flex-shrink: 0; font-size: 11px; color: #F59E0B; background: #FFFBEB;
  padding: 1px 6px; border-radius: 4px;
}
.script-row__actions {
  flex-shrink: 0;
  display: flex; gap: 2px;
  opacity: 0.6;
  transition: opacity 0.15s;
}
.script-row:hover .script-row__actions { opacity: 1; }
.script-row__line2 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 30px;
  font-size: 11px;
  line-height: 1;
  margin-top: 2px;
}
.script-row__line2 .el-tag { transform: scale(0.85); transform-origin: left center; }
.script-row__meta {
  color: #C0C4CC; font-size: 11px;
}
.scripts-pagination {
  display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-top: 1px solid #F3F4F6; margin-top: 8px;
}

/* V4 预览弹窗 */
.preview-container {
  border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;
}
.preview-header {
  padding: 10px 16px; background: #F9FAFB; font-weight: 600; border-bottom: 1px solid #E5E7EB; color: #1F2937;
}
.preview-body {
  height: 400px; display: flex; align-items: center; justify-content: center; background: #FAFBFC;
}
</style>
