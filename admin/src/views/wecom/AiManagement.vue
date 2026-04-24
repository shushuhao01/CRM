<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header"><span>AI额度管理</span></div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- Tab1: 平台模型 -->
        <el-tab-pane label="平台模型" name="models">
          <div class="tab-toolbar">
            <span class="section-title">平台AI模型(全局)</span>
            <el-button v-permission="'wecom-management:ai:edit'" type="primary" @click="openModelDialog()">+ 添加模型</el-button>
          </div>
          <el-table :data="models" v-loading="modelsLoading" stripe>
            <el-table-column prop="modelName" label="模型名称" min-width="130" />
            <el-table-column label="提供商" width="110">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ row.provider }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="modelId" label="模型ID" width="140" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.lastTestStatus === 'success' ? 'success' : 'info'" size="small">
                  {{ row.lastTestStatus === 'success' ? '正常' : '未测试' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Token成本" width="110">
              <template #default="{ row }">{{ row.inputCostPer1k || '-' }}/1K</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button v-permission="'wecom-management:ai:edit'" type="primary" link size="small" @click="openModelDialog(row)">编辑</el-button>
                <el-button v-permission="'wecom-management:ai:edit'" type="success" link size="small" @click="handleTestModel(row)" :loading="testingModelId === row.id">测试</el-button>
                <el-button v-permission="'wecom-management:ai:edit'" type="danger" link size="small" @click="handleDeleteModel(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Tab2: 租户额度 -->
        <el-tab-pane label="租户额度" name="quotas">
          <div class="tab-toolbar">
            <div style="display:flex; gap:8px; align-items:center">
              <el-input v-model="quotaSearch" placeholder="搜索租户名称/编码" clearable size="small" style="width: 220px" @keyup.enter="fetchQuotas" />
              <el-button type="primary" size="small" @click="fetchQuotas">搜索</el-button>
            </div>
            <el-button v-permission="'wecom-management:ai:edit'" type="primary" size="small" @click="showBatchDialog = true">批量分配</el-button>
          </div>
          <el-table :data="quotas" v-loading="quotasLoading" stripe>
            <el-table-column label="租户" min-width="130">
              <template #default="{ row }">
                <div>{{ row.tenantName || row.tenantId }}</div>
                <div v-if="row.tenantCode" style="font-size:11px;color:#909399">{{ row.tenantCode }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="packageName" label="套餐" width="110">
              <template #default="{ row }">
                <el-tag :type="row.totalQuota > 0 ? 'success' : 'info'" size="small">{{ row.packageName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="总额度" width="100" align="right">
              <template #default="{ row }">{{ row.totalQuota > 0 ? row.totalQuota.toLocaleString() + '次' : '-' }}</template>
            </el-table-column>
            <el-table-column label="已用" width="100" align="right">
              <template #default="{ row }">{{ row.usedQuota > 0 ? row.usedQuota.toLocaleString() + '次' : '-' }}</template>
            </el-table-column>
            <el-table-column label="剩余" width="100" align="right">
              <template #default="{ row }">
                <template v-if="row.totalQuota > 0">
                  <span :style="{ color: row.remainingQuota < 100 ? '#f56c6c' : '#67c23a', fontWeight: 600 }">{{ row.remainingQuota?.toLocaleString() }}</span>
                </template>
                <span v-else style="color:#c0c4cc">-</span>
              </template>
            </el-table-column>
            <el-table-column label="使用率" width="100" align="center">
              <template #default="{ row }">
                <el-progress v-if="row.totalQuota > 0" :percentage="Math.min(Math.round(row.usedQuota / row.totalQuota * 100), 100)" :stroke-width="6" :show-text="true"
                  :color="row.usedQuota / row.totalQuota > 0.9 ? '#f56c6c' : row.usedQuota / row.totalQuota > 0.7 ? '#e6a23c' : '#67c23a'" />
                <span v-else style="color:#c0c4cc">-</span>
              </template>
            </el-table-column>
            <el-table-column label="到期时间" width="110">
              <template #default="{ row }">{{ row.expireDate ? row.expireDate.substring(0, 10) : '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button v-permission="'wecom-management:ai:edit'" type="primary" link size="small" @click="openQuotaDialog(row)">调整</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-bar">
            <el-pagination
              v-model:current-page="quotaPage"
              v-model:page-size="quotaPageSize"
              :total="quotaTotal"
              :page-sizes="[15, 30, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchQuotas"
              @current-change="fetchQuotas"
            />
          </div>
        </el-tab-pane>

        <!-- Tab3: 计费配置 -->
        <el-tab-pane label="计费配置" name="billing">
          <el-form label-width="140px" style="max-width: 700px" v-loading="billingLoading">
            <el-alert type="info" :closable="false" style="margin-bottom:16px">
              计费模式决定了AI调用的扣费方式。此处配置全局计费模式后，将同步应用到「套餐与定价 → AI额度定价」中的所有套餐。
            </el-alert>
            <el-form-item label="计费模式">
              <el-radio-group v-model="billing.mode">
                <el-radio label="per_call">按调用次数计费</el-radio>
                <el-radio label="per_token">按Token消耗计费</el-radio>
                <el-radio label="monthly">包月不限次数</el-radio>
                <el-radio label="yearly">包年不限次数</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="计费说明">
              <div class="billing-mode-desc">
                <template v-if="billing.mode === 'per_call'">
                  <p><strong>按次数</strong>：每次AI调用扣减1次配额，不区分Token量。适合调用频次可控的场景。</p>
                  <p>套餐定价以「调用次数」为单位（如100次/¥0、5000次/¥399）</p>
                </template>
                <template v-else-if="billing.mode === 'per_token'">
                  <p><strong>按Token</strong>：根据实际输入+输出Token消耗扣费，更精确但成本波动较大。</p>
                  <p>套餐定价以「Token额度」为单位（如100K tokens/免费、5M tokens/¥399）</p>
                </template>
                <template v-else-if="billing.mode === 'monthly'">
                  <p><strong>包月</strong>：按月收费，有效期内不限调用次数和Token量。适合高频使用场景。</p>
                  <p>套餐定价以「月费」为单位（如¥299/月、¥699/月）</p>
                </template>
                <template v-else>
                  <p><strong>包年</strong>：按年收费，有效期内不限调用次数和Token量。比包月更优惠。</p>
                  <p>套餐定价以「年费」为单位（如¥2999/年、¥6999/年）</p>
                </template>
              </div>
            </el-form-item>

            <el-divider content-position="left">扣费规则</el-divider>
            <el-form-item label="超额处理">
              <el-radio-group v-model="billing.overQuotaAction">
                <el-radio label="stop">额度耗尽停止服务</el-radio>
                <el-radio label="notify">额度耗尽发送提醒，继续服务</el-radio>
                <el-radio label="auto_upgrade">自动按最小套餐续费</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="billing.mode === 'per_token'" label="Token换算比例">
              <div style="display:flex; align-items:center; gap:8px">
                <span>1次调用 ≈</span>
                <el-input-number v-model="billing.tokenPerCall" :min="100" :max="100000" :step="100" style="width:140px" />
                <span>tokens（用于次数↔Token换算参考）</span>
              </div>
            </el-form-item>

            <el-form-item style="margin-top: 16px">
              <el-button v-permission="'wecom-management:ai:edit'" type="primary" @click="handleSaveBilling" :loading="savingBilling">保存配置</el-button>
              <span style="margin-left:12px; font-size:12px; color:#909399">套餐管理请前往「套餐与定价 → AI额度定价」</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab4: 使用监控 -->
        <el-tab-pane label="使用监控" name="usage">
          <!-- 筛选栏 -->
          <div class="usage-filter-bar">
            <div class="filter-left">
              <el-select v-model="usageTenantId" placeholder="全部租户" clearable size="default" style="width: 200px" @change="fetchUsageStats" filterable>
                <el-option label="全部租户" value="" />
                <el-option v-for="t in tenantList" :key="t.tenantId" :label="t.tenantName || t.tenantId" :value="t.tenantId" />
              </el-select>
              <el-select v-model="usageModelFilter" placeholder="全部模型" clearable size="default" style="width: 180px" @change="fetchUsageStats">
                <el-option label="全部模型" value="" />
                <el-option v-for="m in models" :key="m.id" :label="m.modelName" :value="m.modelName" />
              </el-select>
            </div>
            <div class="filter-right">
              <el-radio-group v-model="usagePeriod" size="default" @change="onPeriodChange">
                <el-radio-button label="today">今日</el-radio-button>
                <el-radio-button label="yesterday">昨天</el-radio-button>
                <el-radio-button label="7d">近7天</el-radio-button>
                <el-radio-button label="30d">近30天</el-radio-button>
                <el-radio-button label="90d">近90天</el-radio-button>
                <el-radio-button label="custom">自定义</el-radio-button>
              </el-radio-group>
              <el-date-picker
                v-if="usagePeriod === 'custom'"
                v-model="usageDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                size="default"
                style="width: 260px"
                value-format="YYYY-MM-DD"
                @change="fetchUsageStats"
              />
            </div>
          </div>

          <!-- 总览统计卡片 -->
          <el-row :gutter="16" style="margin-bottom: 20px">
            <el-col :span="4">
              <div class="stat-card stat-primary">
                <div class="stat-icon">📊</div>
                <div class="stat-value">{{ usageStats.todayCalls?.toLocaleString() || 0 }}</div>
                <div class="stat-label">今日调用</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-card stat-success">
                <div class="stat-icon">📈</div>
                <div class="stat-value">{{ usageStats.monthCalls?.toLocaleString() || 0 }}</div>
                <div class="stat-label">本月调用</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-card stat-info">
                <div class="stat-icon">🔢</div>
                <div class="stat-value">{{ usageStats.totalCalls?.toLocaleString() || 0 }}</div>
                <div class="stat-label">累计调用</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-card stat-warning">
                <div class="stat-icon">🪙</div>
                <div class="stat-value">{{ formatTokens(usageStats.totalTokens) }}</div>
                <div class="stat-label">累计Token</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-card">
                <div class="stat-icon">⬇️</div>
                <div class="stat-value">{{ formatTokens(usageStats.totalInputTokens) }}</div>
                <div class="stat-label">输入Token</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-card stat-danger">
                <div class="stat-icon">💰</div>
                <div class="stat-value">¥{{ usageStats.estimatedCost || 0 }}</div>
                <div class="stat-label">预估成本</div>
              </div>
            </el-col>
          </el-row>

          <!-- 按模型分组统计 -->
          <el-card shadow="never" style="margin-bottom: 16px">
            <template #header><span style="font-weight:600">各模型使用统计</span></template>
            <el-table :data="usageStats.modelBreakdown || []" v-loading="usageLoading" stripe size="small">
              <el-table-column prop="modelName" label="模型/智能体" min-width="140">
                <template #default="{ row }">
                  <span style="font-weight:500">{{ row.modelName || '未知' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="调用次数" width="100" align="right">
                <template #default="{ row }">{{ row.callCount?.toLocaleString() }}</template>
              </el-table-column>
              <el-table-column label="输入Token" width="110" align="right">
                <template #default="{ row }">{{ formatTokens(row.inputTokens) }}</template>
              </el-table-column>
              <el-table-column label="输出Token" width="110" align="right">
                <template #default="{ row }">{{ formatTokens(row.outputTokens) }}</template>
              </el-table-column>
              <el-table-column label="总Token" width="100" align="right">
                <template #default="{ row }">{{ formatTokens(row.totalTokens) }}</template>
              </el-table-column>
              <el-table-column label="平均延迟" width="100" align="right">
                <template #default="{ row }">
                  <span :style="{ color: (row.avgDurationMs || 0) > 3000 ? '#f56c6c' : '#67c23a' }">{{ row.avgDurationMs ? row.avgDurationMs + 'ms' : '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="成功率" width="100" align="center">
                <template #default="{ row }">
                  <el-progress
                    :percentage="row.successRate || 0"
                    :stroke-width="6"
                    :color="(row.successRate || 0) >= 95 ? '#67c23a' : (row.successRate || 0) >= 80 ? '#e6a23c' : '#f56c6c'"
                    :show-text="true"
                  />
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <!-- 按操作类型统计 + 租户TOP10 并排 -->
          <el-row :gutter="16">
            <el-col :span="12">
              <el-card shadow="never">
                <template #header><span style="font-weight:600">按功能类型统计</span></template>
                <el-table :data="usageStats.operationBreakdown || []" stripe size="small">
                  <el-table-column prop="operationType" label="功能类型" min-width="120">
                    <template #default="{ row }">{{ operationTypeLabel(row.operationType) }}</template>
                  </el-table-column>
                  <el-table-column label="调用次数" width="100" align="right">
                    <template #default="{ row }">{{ row.callCount?.toLocaleString() }}</template>
                  </el-table-column>
                  <el-table-column label="Token消耗" width="100" align="right">
                    <template #default="{ row }">{{ formatTokens(row.totalTokens) }}</template>
                  </el-table-column>
                  <el-table-column label="占比" width="120" align="center">
                    <template #default="{ row }">
                      <el-progress :percentage="usageStats.totalCalls > 0 ? Math.round(row.callCount / usageStats.totalCalls * 100) : 0" :stroke-width="8" :show-text="true" />
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="never">
                <template #header><span style="font-weight:600">租户TOP10（按Token消耗）</span></template>
                <el-table :data="usageTop" v-loading="usageLoading" stripe size="small">
                  <el-table-column label="#" width="40" align="center">
                    <template #default="{ $index }">
                      <span :style="{ color: $index < 3 ? '#f56c6c' : '#909399', fontWeight: $index < 3 ? '700' : '400' }">{{ $index + 1 }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="租户" min-width="100">
                    <template #default="{ row }">{{ row.tenantName || row.tenantId }}</template>
                  </el-table-column>
                  <el-table-column label="调用" width="80" align="right">
                    <template #default="{ row }">{{ row.callCount?.toLocaleString() }}</template>
                  </el-table-column>
                  <el-table-column label="Token" width="80" align="right">
                    <template #default="{ row }">{{ formatTokens(row.tokenCount) }}</template>
                  </el-table-column>
                  <el-table-column label="成本" width="70" align="right">
                    <template #default="{ row }">¥{{ row.cost || 0 }}</template>
                  </el-table-column>
                  <el-table-column label="成功率" width="75" align="center">
                    <template #default="{ row }">
                      <el-tag :type="(row.successRate || 0) >= 95 ? 'success' : 'warning'" size="small">{{ row.successRate || 0 }}%</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- Tab5: 全局设置 -->
        <el-tab-pane label="全局设置" name="settings">
          <el-form label-width="180px" style="max-width: 650px" v-loading="settingsLoading">
            <el-divider content-position="left">租户自配API</el-divider>
            <el-form-item label="允许租户自配AI模型">
              <el-switch v-permission="'wecom-management:ai:edit'" v-model="globalSettings.allowSelfConfig" />
              <div style="font-size: 12px; color: #909399; margin-top: 4px">开启后租户可在CRM的AI助手中自行添加模型和API Key</div>
            </el-form-item>

            <el-divider content-position="left">默认分配</el-divider>
            <el-form-item label="新租户默认AI额度">
              <el-input-number v-model="globalSettings.defaultQuota" :min="0" :max="100000" :step="100" /> 次
            </el-form-item>
            <el-form-item label="默认模型">
              <el-select v-model="globalSettings.defaultModelId" style="width: 250px">
                <el-option v-for="m in models" :key="m.id" :label="`${m.modelName} (${m.modelId})`" :value="m.id" />
              </el-select>
            </el-form-item>

            <el-divider content-position="left">限流</el-divider>
            <el-form-item label="单租户每分钟最大调用">
              <el-input-number v-model="globalSettings.rateLimitPerMinute" :min="1" :max="1000" /> 次
            </el-form-item>
            <el-form-item label="单租户每天最大调用">
              <el-input-number v-model="globalSettings.rateLimitPerDay" :min="1" :max="100000" /> 次
            </el-form-item>
            <el-form-item label="平台每分钟总调用">
              <el-input-number v-model="globalSettings.platformRateLimitPerMinute" :min="1" :max="10000" /> 次
            </el-form-item>

            <el-divider content-position="left">安全</el-divider>
            <el-form-item label="API Key加密存储">
              <el-switch v-model="globalSettings.encryptApiKey" disabled />
              <span style="margin-left: 8px; font-size: 12px; color: #909399">AES-256（始终开启）</span>
            </el-form-item>
            <el-form-item label="调用日志脱敏">
              <el-switch v-permission="'wecom-management:ai:edit'" v-model="globalSettings.maskLogData" />
            </el-form-item>
            <el-form-item label="额度耗尽自动停止">
              <el-switch v-permission="'wecom-management:ai:edit'" v-model="globalSettings.stopOnQuotaExhaust" />
            </el-form-item>

            <el-form-item>
              <el-button v-permission="'wecom-management:ai:edit'" type="primary" @click="handleSaveSettings" :loading="savingSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 添加/编辑模型弹窗（重新设计） -->
    <el-dialog v-model="showModelDialog" :title="editingModel ? '编辑AI模型配置' : '添加AI模型'" width="660px" destroy-on-close>
      <el-alert type="info" :closable="false" style="margin-bottom:16px">
        选择提供商和模型后，API地址和成本将自动填入市场参考价，API Key 需手动粘贴。建议测试连接通过后再保存。
      </el-alert>
      <el-form :model="modelForm" label-width="130px" label-position="right">

        <!-- ① 选提供商 -->
        <el-form-item required>
          <template #label><span class="dlg-lbl">AI 提供商</span></template>
          <el-select v-model="modelForm.provider" style="width:100%" @change="onProviderChange" placeholder="选择提供商">
            <el-option-group label="🌏 国际顶级">
              <el-option label="OpenAI (GPT / o系列)" value="openai" />
              <el-option label="Anthropic (Claude)" value="anthropic" />
              <el-option label="Google (Gemini)" value="google" />
              <el-option label="Meta (Llama)" value="meta" />
              <el-option label="Mistral AI" value="mistral" />
            </el-option-group>
            <el-option-group label="🇨🇳 国内顶级">
              <el-option label="DeepSeek（深度求索）" value="deepseek" />
              <el-option label="阿里云 通义千问 (Qwen)" value="aliyun" />
              <el-option label="智谱AI (GLM)" value="zhipu" />
              <el-option label="字节跳动 豆包 (Doubao)" value="doubao" />
              <el-option label="百度 文心 (ERNIE)" value="baidu" />
              <el-option label="月之暗面 Kimi (Moonshot)" value="moonshot" />
              <el-option label="讯飞 星火 (Spark)" value="xunfei" />
              <el-option label="MiniMax" value="minimax" />
            </el-option-group>
            <el-option-group label="🖥 本地 / 私有">
              <el-option label="Ollama (本地部署)" value="ollama" />
              <el-option label="自定义 OpenAI 兼容接口" value="custom" />
            </el-option-group>
          </el-select>
        </el-form-item>

        <!-- ② 选模型（自动显示该提供商的常用模型，可自由输入） -->
        <el-form-item required>
          <template #label><span class="dlg-lbl">选择模型</span></template>
          <el-select
            v-model="modelForm.modelId"
            style="width:100%"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入模型 ID"
            @change="onModelChange"
          >
            <el-option
              v-for="m in providerModels"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            >
              <div class="model-opt">
                <span class="model-opt-name">{{ m.name }}</span>
                <span class="model-opt-id">{{ m.id }}</span>
                <span v-if="m.inputCost" class="model-opt-cost">输入¥{{ m.inputCost }}/1K · 输出¥{{ m.outputCost }}/1K</span>
              </div>
            </el-option>
          </el-select>
          <div v-if="modelForm.provider === 'custom' || providerModels.length === 0" class="field-tip">
            自定义模式请直接输入模型 ID
          </div>
        </el-form-item>

        <!-- ③ 展示名称 -->
        <el-form-item required>
          <template #label><span class="dlg-lbl">展示名称</span></template>
          <el-input v-model="modelForm.modelName" placeholder="对租户显示的友好名称，如 GPT-4o 智能助手" />
        </el-form-item>

        <!-- ④ API 地址（自动填充，可修改） -->
        <el-form-item>
          <template #label><span class="dlg-lbl">API 地址</span></template>
          <el-input v-model="modelForm.apiUrl" placeholder="自动填入，可手动修改" />
          <div class="field-tip">选择提供商后自动填入官方端点，转发/代理地址可手动覆盖</div>
        </el-form-item>

        <!-- ⑤ API Key -->
        <el-form-item required>
          <template #label><span class="dlg-lbl">API Key</span></template>
          <el-input
            v-model="modelForm.apiKey"
            type="password"
            show-password
            :placeholder="editingModel ? '留空则不更新密钥' : '粘贴 API Key'"
            autocomplete="new-password"
          />
        </el-form-item>

        <!-- ⑥ 测试连接 -->
        <el-form-item>
          <template #label><span class="dlg-lbl"> </span></template>
          <div class="test-row">
            <el-button
              type="primary" plain
              :loading="testingInDialog"
              @click="handleTestInDialog"
            >
              <el-icon v-if="!testingInDialog"><Connection /></el-icon>
              {{ testingInDialog ? '测试中…' : '测试连接' }}
            </el-button>
            <el-tag v-if="dialogTestResult === 'success'" type="success" effect="light">
              ✓ 连接正常{{ dialogTestLatency ? `，延迟 ${dialogTestLatency}ms` : '' }}
            </el-tag>
            <el-tag v-else-if="dialogTestResult === 'fail'" type="danger" effect="light">
              ✗ 连接失败：{{ dialogTestError }}
            </el-tag>
            <span v-else class="field-tip" style="margin:0">
              {{ editingModel ? '点击测试已保存模型的连通性' : '保存后可从列表测试连接' }}
            </span>
          </div>
        </el-form-item>

        <el-divider content-position="left">Token 成本（元 / 1K tokens，已自动填入参考价，可手动修改）</el-divider>

        <el-form-item>
          <template #label><span class="dlg-lbl">输入 Token 成本</span></template>
          <div class="cost-row">
            <el-input-number v-model="modelForm.inputCostPer1k" :min="0" :precision="6" :step="0.001" style="width:160px" />
            <span class="cost-unit">元 / 1K tokens</span>
            <span v-if="modelForm.inputCostPer1k" class="cost-equiv">
              ≈ ¥{{ (modelForm.inputCostPer1k * 1000).toFixed(3) }} / 1M tokens
            </span>
          </div>
        </el-form-item>

        <el-form-item>
          <template #label><span class="dlg-lbl">输出 Token 成本</span></template>
          <div class="cost-row">
            <el-input-number v-model="modelForm.outputCostPer1k" :min="0" :precision="6" :step="0.001" style="width:160px" />
            <span class="cost-unit">元 / 1K tokens</span>
            <span v-if="modelForm.outputCostPer1k" class="cost-equiv">
              ≈ ¥{{ (modelForm.outputCostPer1k * 1000).toFixed(3) }} / 1M tokens
            </span>
          </div>
          <div class="field-tip">成本用于计算每次调用利润，不对租户展示</div>
        </el-form-item>

        <el-divider content-position="left">其他设置</el-divider>

        <el-form-item>
          <template #label><span class="dlg-lbl">对租户可见</span></template>
          <el-switch v-model="modelForm.visibleToTenant" active-text="可见" inactive-text="仅内部" />
        </el-form-item>
        <el-form-item>
          <template #label><span class="dlg-lbl">设为平台默认</span></template>
          <el-switch v-model="modelForm.isDefault" active-text="是" inactive-text="否" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showModelDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleSaveModel"
          :loading="savingModel"
          :disabled="dialogTestResult === '' && !editingModel && false"
        >
          {{ dialogTestResult === 'success' ? '✓ 保存模型' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 调整额度弹窗 -->
    <el-dialog v-model="showQuotaDialog" title="调整AI额度" width="450px" destroy-on-close>
      <div v-if="quotaTarget">
        <el-descriptions :column="1" border size="small" style="margin-bottom: 16px">
          <el-descriptions-item label="租户">{{ quotaTarget.tenantName }}</el-descriptions-item>
          <el-descriptions-item label="当前额度">{{ quotaTarget.totalQuota?.toLocaleString() }}次</el-descriptions-item>
          <el-descriptions-item label="已用">{{ quotaTarget.usedQuota?.toLocaleString() }}次</el-descriptions-item>
          <el-descriptions-item label="剩余">{{ quotaTarget.remainingQuota?.toLocaleString() }}次</el-descriptions-item>
        </el-descriptions>
        <el-form label-width="100px">
          <el-form-item label="调整方式">
            <el-radio-group v-model="quotaAdjust.type">
              <el-radio label="add">增加额度</el-radio>
              <el-radio label="reduce">减少额度</el-radio>
              <el-radio label="set">设置总量</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="数量">
            <el-input-number v-model="quotaAdjust.amount" :min="0" :max="999999" style="width: 200px" /> 次
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showQuotaDialog = false">取消</el-button>
        <el-button v-permission="'wecom-management:ai:edit'" type="primary" @click="handleAdjustQuota" :loading="adjusting">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 批量分配弹窗 -->
    <el-dialog v-model="showBatchDialog" title="批量分配AI额度" width="400px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="目标租户">
          <el-radio-group v-model="batchForm.target">
            <el-radio label="all">所有租户</el-radio>
            <el-radio label="no_quota">未分配额度的租户</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分配额度">
          <el-input-number v-model="batchForm.quota" :min="0" :max="100000" /> 次
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button v-permission="'wecom-management:ai:edit'" type="primary" @click="handleBatchAssign" :loading="batchAssigning">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import {
  getAdminAiModels, createAdminAiModel, updateAdminAiModel, deleteAdminAiModel, testAdminAiModel,
  getTenantAiQuotas, adjustTenantAiQuota, batchAssignAiQuota,
  getAiBillingConfig, saveAiBillingConfig,
  getAiUsageStats, getAiUsageTop,
  getAiGlobalSettings, saveAiGlobalSettings
} from '@/api/wecomManagement'

// ===== 模型目录（市场参考价，CNY/1K tokens） =====
// 价格来源：各官网公开定价，USD 按 7.2 汇率换算
const MODEL_CATALOG: Record<string, { name: string; apiUrl: string; models: { id: string; name: string; inputCost: number; outputCost: number; note?: string }[] }> = {
  openai: {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-5.4-medium',     name: 'GPT-5.4 Medium',      inputCost: 0.036,  outputCost: 0.144,  note: '$5/$20 /1M · 2026.3' },
      { id: 'gpt-5.3-codex',      name: 'GPT-5.3 Codex',       inputCost: 0.054,  outputCost: 0.216,  note: '$7.5/$30 /1M · 编程增强' },
      { id: 'gpt-5.2',            name: 'GPT-5.2',             inputCost: 0.072,  outputCost: 0.288,  note: '$10/$40 /1M · 2025.12' },
      { id: 'gpt-4o',             name: 'GPT-4o',              inputCost: 0.018,  outputCost: 0.072,  note: '$2.5/$10 /1M' },
      { id: 'gpt-4o-mini',        name: 'GPT-4o Mini',         inputCost: 0.00108,outputCost: 0.00432,note: '$0.15/$0.6 /1M' },
      { id: 'o3',                 name: 'o3（推理）',           inputCost: 0.072,  outputCost: 0.288,  note: '$10/$40 /1M' },
      { id: 'o3-mini',            name: 'o3-mini',             inputCost: 0.00792,outputCost: 0.03168,note: '$1.1/$4.4 /1M' },
      { id: 'o1',                 name: 'o1（推理）',           inputCost: 0.108,  outputCost: 0.432,  note: '$15/$60 /1M' },
    ]
  },
  anthropic: {
    name: 'Anthropic',
    apiUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-opus-4-7',             name: 'Claude Opus 4.7',      inputCost: 0.036, outputCost: 0.18,  note: '$5/$25 /1M · 2026.4最新' },
      { id: 'claude-opus-4-6',             name: 'Claude Opus 4.6',      inputCost: 0.036, outputCost: 0.18,  note: '$5/$25 /1M · 2026.2' },
      { id: 'claude-sonnet-4-6',           name: 'Claude Sonnet 4.6',    inputCost: 0.0216,outputCost: 0.108, note: '$3/$15 /1M' },
      { id: 'claude-opus-4-5',             name: 'Claude Opus 4.5',      inputCost: 0.108, outputCost: 0.54,  note: '$15/$75 /1M' },
      { id: 'claude-sonnet-4-5',           name: 'Claude Sonnet 4.5',    inputCost: 0.0216,outputCost: 0.108, note: '$3/$15 /1M' },
      { id: 'claude-3-5-haiku-20241022',   name: 'Claude 3.5 Haiku',     inputCost: 0.00576,outputCost:0.0288,note: '$0.8/$4 /1M' },
    ]
  },
  google: {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-3.1-pro',         name: 'Gemini 3.1 Pro',         inputCost: 0.0126, outputCost: 0.0504, note: '2026.2最新' },
      { id: 'gemini-2.5-pro',         name: 'Gemini 2.5 Pro',         inputCost: 0.009,  outputCost: 0.036  },
      { id: 'gemini-2.0-flash',       name: 'Gemini 2.0 Flash',       inputCost: 0.000504,outputCost:0.002016 },
      { id: 'gemini-2.0-flash-lite',  name: 'Gemini 2.0 Flash Lite',  inputCost: 0.000054,outputCost:0.000216 },
      { id: 'gemini-1.5-pro',         name: 'Gemini 1.5 Pro',         inputCost: 0.009,  outputCost: 0.036  },
      { id: 'gemini-1.5-flash',       name: 'Gemini 1.5 Flash',       inputCost: 0.00054,outputCost: 0.00216},
    ]
  },
  meta: {
    name: 'Meta (via Fireworks/together)',
    apiUrl: 'https://api.fireworks.ai/inference/v1',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B Instruct', inputCost: 0.00576, outputCost: 0.00576 },
      { id: 'accounts/fireworks/models/llama-v3p1-405b-instruct',name: 'Llama 3.1 405B Instruct',inputCost: 0.0216,  outputCost: 0.0216  },
      { id: 'accounts/fireworks/models/llama-v3p1-8b-instruct',  name: 'Llama 3.1 8B Instruct',  inputCost: 0.00144, outputCost: 0.00144 },
    ]
  },
  mistral: {
    name: 'Mistral AI',
    apiUrl: 'https://api.mistral.ai/v1',
    models: [
      { id: 'mistral-large-latest',  name: 'Mistral Large',  inputCost: 0.01728, outputCost: 0.05184 },
      { id: 'mistral-small-latest',  name: 'Mistral Small',  inputCost: 0.001440,outputCost: 0.00432 },
      { id: 'codestral-latest',      name: 'Codestral',      inputCost: 0.002160,outputCost: 0.006480},
      { id: 'open-mistral-nemo',     name: 'Mistral Nemo',   inputCost: 0.000216,outputCost: 0.000216},
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat-v3.2', name: 'DeepSeek-V3.2',      inputCost: 0.00027,outputCost: 0.0011, note: '2026最新' },
      { id: 'deepseek-chat',      name: 'DeepSeek-V3',         inputCost: 0.00027,outputCost: 0.0011 },
      { id: 'deepseek-reasoner',  name: 'DeepSeek-R1（推理）',  inputCost: 0.00055,outputCost: 0.00219},
    ]
  },
  aliyun: {
    name: '阿里云通义千问',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-max',        name: 'Qwen-Max',            inputCost: 0.04,   outputCost: 0.12  },
      { id: 'qwen-plus',       name: 'Qwen-Plus',           inputCost: 0.0008, outputCost: 0.002 },
      { id: 'qwen-turbo',      name: 'Qwen-Turbo',          inputCost: 0.0003, outputCost: 0.0006},
      { id: 'qwen-long',       name: 'Qwen-Long（长文本）', inputCost: 0.0005, outputCost: 0.002 },
      { id: 'qwq-plus',        name: 'QwQ-Plus（推理）',    inputCost: 0.0016, outputCost: 0.0016},
      { id: 'qwen2.5-72b-instruct', name: 'Qwen2.5 72B',   inputCost: 0.004,  outputCost: 0.012 },
      { id: 'qwen2.5-7b-instruct',  name: 'Qwen2.5 7B',    inputCost: 0.001,  outputCost: 0.002 },
    ]
  },
  zhipu: {
    name: '智谱AI (GLM)',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-5.1',      name: 'GLM-5.1',            inputCost: 0.05,  outputCost: 0.05,  note: '2026最新' },
      { id: 'glm-5',        name: 'GLM-5',              inputCost: 0.05,  outputCost: 0.05,  note: '2026' },
      { id: 'glm-4-plus',   name: 'GLM-4-Plus',          inputCost: 0.05,  outputCost: 0.05  },
      { id: 'glm-4-air',    name: 'GLM-4-Air',            inputCost: 0.001, outputCost: 0.001 },
      { id: 'glm-4-flash',  name: 'GLM-4-Flash（免费）',  inputCost: 0,     outputCost: 0     },
      { id: 'glm-z1-plus',  name: 'GLM-Z1-Plus（推理）',  inputCost: 0.05,  outputCost: 0.05  },
      { id: 'glm-z1-flash', name: 'GLM-Z1-Flash（推理免费）',inputCost:0,  outputCost: 0     },
    ]
  },
  doubao: {
    name: '字节跳动豆包',
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      { id: 'doubao-2-0-pro',              name: 'Doubao 2.0 Pro',       inputCost: 0.0008, outputCost: 0.002, note: '2026.2最新旗舰' },
      { id: 'doubao-2-0-lite',             name: 'Doubao 2.0 Lite',      inputCost: 0.0003, outputCost: 0.0006,note: '2026.2' },
      { id: 'doubao-2-0-mini',             name: 'Doubao 2.0 Mini',      inputCost: 0.0001, outputCost: 0.0003,note: '低时延高并发' },
      { id: 'doubao-2-0-code',             name: 'Doubao 2.0 Code',      inputCost: 0.0005, outputCost: 0.001, note: '编程专用' },
      { id: 'doubao-1-5-pro-32k-250115',   name: 'Doubao 1.5 Pro 32K',   inputCost: 0.0008, outputCost: 0.002 },
      { id: 'doubao-1-5-lite-32k-250115',  name: 'Doubao 1.5 Lite 32K',  inputCost: 0.0003, outputCost: 0.0006},
    ]
  },
  baidu: {
    name: '百度文心',
    apiUrl: 'https://qianfan.baidubce.com/v2',
    models: [
      { id: 'ernie-4.0-8k',       name: 'ERNIE 4.0',        inputCost: 0.04,    outputCost: 0.12   },
      { id: 'ernie-3.5-8k',       name: 'ERNIE 3.5',        inputCost: 0.0008,  outputCost: 0.002  },
      { id: 'ernie-speed-8k',     name: 'ERNIE Speed',       inputCost: 0.00004, outputCost: 0.00008},
      { id: 'ernie-lite-8k',      name: 'ERNIE Lite',        inputCost: 0.00003, outputCost: 0.00006},
      { id: 'ernie-4.5-8k-preview',name: 'ERNIE 4.5（预览）',inputCost: 0.004,  outputCost: 0.016  },
    ]
  },
  moonshot: {
    name: 'Moonshot (Kimi)',
    apiUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-8k',   name: 'Kimi V1 8K',    inputCost: 0.012, outputCost: 0.012 },
      { id: 'moonshot-v1-32k',  name: 'Kimi V1 32K',   inputCost: 0.024, outputCost: 0.024 },
      { id: 'moonshot-v1-128k', name: 'Kimi V1 128K',  inputCost: 0.06,  outputCost: 0.06  },
    ]
  },
  xunfei: {
    name: '讯飞星火',
    apiUrl: 'https://spark-api-open.xf-yun.com/v1',
    models: [
      { id: '4.0Ultra',    name: 'Spark Ultra 4.0',  inputCost: 0.035, outputCost: 0.035 },
      { id: 'max-32k',     name: 'Spark Max 32K',    inputCost: 0.021, outputCost: 0.021 },
      { id: 'pro-128k',    name: 'Spark Pro 128K',   inputCost: 0.005, outputCost: 0.005 },
      { id: 'lite',        name: 'Spark Lite（免费）',inputCost: 0,     outputCost: 0     },
    ]
  },
  minimax: {
    name: 'MiniMax',
    apiUrl: 'https://api.minimax.chat/v1',
    models: [
      { id: 'MiniMax-Text-01',    name: 'MiniMax Text-01', inputCost: 0.001, outputCost: 0.008 },
      { id: 'abab6.5s-chat',      name: 'MiniMax 6.5s',    inputCost: 0.001, outputCost: 0.001 },
    ]
  },
  ollama: {
    name: 'Ollama (本地)',
    apiUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'llama3.3:latest',       name: 'Llama 3.3',          inputCost: 0, outputCost: 0 },
      { id: 'qwen2.5:latest',        name: 'Qwen 2.5',           inputCost: 0, outputCost: 0 },
      { id: 'deepseek-r1:latest',    name: 'DeepSeek R1',        inputCost: 0, outputCost: 0 },
      { id: 'mistral:latest',        name: 'Mistral',            inputCost: 0, outputCost: 0 },
    ]
  },
  custom: {
    name: '自定义',
    apiUrl: '',
    models: []
  }
}

const activeTab = ref('models')

// Models
const modelsLoading = ref(false)
const models = ref<any[]>([])
const showModelDialog = ref(false)
const editingModel = ref<any>(null)
const savingModel = ref(false)
const testingModelId = ref<number | null>(null)

// 弹窗内测试连接状态
const testingInDialog = ref(false)
const dialogTestResult = ref<'' | 'success' | 'fail'>('')
const dialogTestLatency = ref(0)
const dialogTestError = ref('')

const defaultModelForm = () => ({
  modelName: '', provider: 'openai', apiUrl: 'https://api.openai.com/v1', apiKey: '',
  modelId: 'gpt-4o', inputCostPer1k: 0.018, outputCostPer1k: 0.072,
  visibleToTenant: true, isDefault: false
})
const modelForm = ref<any>(defaultModelForm())

// 当前提供商可选模型列表
const providerModels = computed(() => {
  return MODEL_CATALOG[modelForm.value.provider]?.models || []
})

// 切换提供商 → 自动填 apiUrl，重置 modelId
const onProviderChange = (provider: string) => {
  const catalog = MODEL_CATALOG[provider]
  if (catalog) {
    modelForm.value.apiUrl = catalog.apiUrl
    if (catalog.models.length > 0) {
      onModelChange(catalog.models[0].id)
    } else {
      modelForm.value.modelId = ''
      modelForm.value.modelName = ''
    }
  }
  dialogTestResult.value = ''
}

// 切换模型 → 自动填 modelName 和成本
const onModelChange = (modelId: string) => {
  const catalog = MODEL_CATALOG[modelForm.value.provider]
  const found = catalog?.models.find(m => m.id === modelId)
  if (found) {
    modelForm.value.modelId = found.id
    modelForm.value.modelName = found.name
    modelForm.value.inputCostPer1k = found.inputCost
    modelForm.value.outputCostPer1k = found.outputCost
  } else {
    // allow-create 自定义输入
    modelForm.value.modelId = modelId
  }
  dialogTestResult.value = ''
}

// 弹窗内测试连接
const handleTestInDialog = async () => {
  if (!editingModel.value) {
    ElMessage.info('请先保存模型，再从列表点击「测试」验证连接')
    return
  }
  testingInDialog.value = true
  dialogTestResult.value = ''
  dialogTestError.value = ''
  try {
    const res: any = await testAdminAiModel(editingModel.value.id)
    dialogTestLatency.value = res?.latency || 0
    dialogTestResult.value = 'success'
    ElMessage.success(`连接成功${dialogTestLatency.value ? `，延迟 ${dialogTestLatency.value}ms` : ''}`)
  } catch (e: any) {
    dialogTestResult.value = 'fail'
    dialogTestError.value = e?.message || '网络错误'
    ElMessage.error('连接失败：' + dialogTestError.value)
  }
  testingInDialog.value = false
}

// Quotas
const quotasLoading = ref(false)
const quotas = ref<any[]>([])
const quotaSearch = ref('')
const quotaPage = ref(1)
const quotaPageSize = ref(15)
const quotaTotal = ref(0)
const showQuotaDialog = ref(false)
const quotaTarget = ref<any>(null)
const quotaAdjust = ref({ type: 'add', amount: 5000 })
const adjusting = ref(false)
const showBatchDialog = ref(false)
const batchForm = ref({ target: 'no_quota', quota: 100 })
const batchAssigning = ref(false)

// Billing
const billingLoading = ref(false)
const savingBilling = ref(false)
const billing = ref<any>({
  mode: 'per_call',
  overQuotaAction: 'stop',
  tokenPerCall: 2000
})

// Usage
const usageLoading = ref(false)
const usagePeriod = ref('30d')
const usageTenantId = ref('')
const usageModelFilter = ref('')
const usageDateRange = ref<[string, string] | null>(null)
const usageStats = ref<any>({})
const usageTop = ref<any[]>([])
const tenantList = ref<any[]>([])

const onPeriodChange = () => {
  if (usagePeriod.value !== 'custom') {
    usageDateRange.value = null
    fetchUsageStats()
  }
}

const operationTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    'chat_reply': '智能客服',
    'quality_inspect': '智能质检',
    'tag_auto': '标签AI',
    'knowledge_qa': '知识库问答',
    'script_rewrite': '话术改写',
    'customer_profile': '客户画像',
    'sentiment_analysis': '情感分析'
  }
  return map[type] || type || '其他'
}

// Settings
const settingsLoading = ref(false)
const savingSettings = ref(false)
const globalSettings = ref<any>({
  allowSelfConfig: false, defaultQuota: 100, defaultModelId: null,
  rateLimitPerMinute: 30, rateLimitPerDay: 500, platformRateLimitPerMinute: 300,
  encryptApiKey: true, maskLogData: true, stopOnQuotaExhaust: true
})

const formatTokens = (n: number) => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// Model operations
const fetchModels = async () => {
  modelsLoading.value = true
  try {
    const res: any = await getAdminAiModels()
    models.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { models.value = [] }
  modelsLoading.value = false
}

const openModelDialog = (model?: any) => {
  editingModel.value = model || null
  dialogTestResult.value = ''
  dialogTestError.value = ''
  dialogTestLatency.value = 0
  if (model) {
    modelForm.value = { ...model, apiKey: '' }
  } else {
    modelForm.value = defaultModelForm()
  }
  showModelDialog.value = true
}

const handleSaveModel = async () => {
  savingModel.value = true
  try {
    if (editingModel.value) {
      const data = { ...modelForm.value }
      if (!data.apiKey) delete data.apiKey
      await updateAdminAiModel(editingModel.value.id, data)
      ElMessage.success('模型已更新')
    } else {
      await createAdminAiModel(modelForm.value)
      ElMessage.success('模型已添加')
    }
    showModelDialog.value = false
    fetchModels()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingModel.value = false
}

const handleTestModel = async (row: any) => {
  testingModelId.value = row.id
  try {
    const res: any = await testAdminAiModel(row.id)
    ElMessage.success(`连接成功${res?.latency ? `，延迟${res.latency}ms` : ''}`)
    fetchModels()
  } catch (e: any) { ElMessage.error(e?.message || '连接失败') }
  testingModelId.value = null
}

const handleDeleteModel = async (row: any) => {
  await ElMessageBox.confirm(`确定删除模型"${row.modelName}"？`, '删除确认', { type: 'warning' })
  try {
    await deleteAdminAiModel(row.id)
    ElMessage.success('已删除')
    fetchModels()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

// Quota operations
const fetchQuotas = async () => {
  quotasLoading.value = true
  try {
    const res: any = await getTenantAiQuotas({
      keyword: quotaSearch.value || undefined,
      page: quotaPage.value,
      pageSize: quotaPageSize.value
    })
    quotas.value = Array.isArray(res) ? res : (res?.data || [])
    quotaTotal.value = res?.total || quotas.value.length
  } catch { quotas.value = []; quotaTotal.value = 0 }
  quotasLoading.value = false
}

const openQuotaDialog = (row: any) => {
  quotaTarget.value = row
  quotaAdjust.value = { type: 'add', amount: 5000 }
  showQuotaDialog.value = true
}

const handleAdjustQuota = async () => {
  if (!quotaTarget.value) return
  adjusting.value = true
  try {
    await adjustTenantAiQuota(quotaTarget.value.tenantId, quotaAdjust.value)
    ElMessage.success('额度已调整')
    showQuotaDialog.value = false
    fetchQuotas()
  } catch (e: any) { ElMessage.error(e?.message || '调整失败') }
  adjusting.value = false
}

const handleBatchAssign = async () => {
  batchAssigning.value = true
  try {
    await batchAssignAiQuota(batchForm.value)
    ElMessage.success('批量分配成功')
    showBatchDialog.value = false
    fetchQuotas()
  } catch (e: any) { ElMessage.error(e?.message || '分配失败') }
  batchAssigning.value = false
}

// Billing
const fetchBilling = async () => {
  billingLoading.value = true
  try {
    const res: any = await getAiBillingConfig()
    if (res) Object.assign(billing.value, res)
  } catch { /* use defaults */ }
  billingLoading.value = false
}

const handleSaveBilling = async () => {
  savingBilling.value = true
  try {
    await saveAiBillingConfig(billing.value)
    ElMessage.success('计费配置已保存')
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingBilling.value = false
}


// Usage
const fetchUsageStats = async () => {
  usageLoading.value = true
  try {
    const params: any = { period: usagePeriod.value }
    if (usageTenantId.value) params.tenantId = usageTenantId.value
    if (usageModelFilter.value) params.modelName = usageModelFilter.value
    if (usagePeriod.value === 'custom' && usageDateRange.value) {
      params.startDate = usageDateRange.value[0]
      params.endDate = usageDateRange.value[1]
    }
    const [statsRes, topRes] = await Promise.all([
      getAiUsageStats(params),
      getAiUsageTop({ period: usagePeriod.value, ...(usagePeriod.value === 'custom' && usageDateRange.value ? { startDate: usageDateRange.value[0], endDate: usageDateRange.value[1] } : {}) })
    ])
    usageStats.value = (statsRes as any)?.data || statsRes || {}
    usageTop.value = Array.isArray(topRes) ? topRes : ((topRes as any)?.data || [])
  } catch { usageStats.value = {}; usageTop.value = [] }
  usageLoading.value = false
}

const fetchTenantList = async () => {
  try {
    const res: any = await getTenantAiQuotas()
    tenantList.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { tenantList.value = [] }
}

// Settings
const fetchSettings = async () => {
  settingsLoading.value = true
  try {
    const res: any = await getAiGlobalSettings()
    if (res) Object.assign(globalSettings.value, res)
  } catch { /* use defaults */ }
  settingsLoading.value = false
}

const handleSaveSettings = async () => {
  savingSettings.value = true
  try {
    await saveAiGlobalSettings(globalSettings.value)
    ElMessage.success('设置已保存')
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingSettings.value = false
}

onMounted(() => {
  fetchModels()
  fetchQuotas()
  fetchBilling()
  fetchUsageStats()
  fetchSettings()
  fetchTenantList()
})
</script>

<style scoped>
.page-container { padding: 0; }
.card-header { font-size: 16px; font-weight: 600; }
.tab-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; }
.stats-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.stat-card { background: #f5f7fa; border-radius: 10px; padding: 16px 12px; text-align: center; transition: box-shadow 0.2s; }
.stat-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.stat-icon { font-size: 20px; margin-bottom: 4px; }
.stat-value { font-size: 22px; font-weight: 700; color: #409eff; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }
.stat-primary .stat-value { color: #409eff; }
.stat-success .stat-value { color: #67c23a; }
.stat-info .stat-value { color: #303133; }
.stat-warning .stat-value { color: #e6a23c; }
.stat-danger .stat-value { color: #f56c6c; }

.pagination-bar { display: flex; justify-content: flex-end; margin-top: 16px; padding: 8px 0; }

.billing-mode-desc { font-size: 13px; color: #606266; line-height: 1.8; background: #f5f7fa; border-radius: 8px; padding: 12px 16px; }
.billing-mode-desc p { margin: 0 0 4px; }

.usage-filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; background: #f5f7fa; border-radius: 8px; padding: 12px 16px; }
.filter-left, .filter-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ===== 模型弹窗 ===== */
.dlg-lbl { font-size: 13px; color: #4e5969; font-weight: 500; }

.model-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  overflow: hidden;
}
.model-opt-name { font-weight: 500; color: #303133; flex-shrink: 0; }
.model-opt-id   { font-size: 11px; color: #909399; flex: 1; overflow: hidden; text-overflow: ellipsis; }
.model-opt-cost { font-size: 11px; color: #e6a23c; flex-shrink: 0; margin-left: auto; white-space: nowrap; }

.field-tip { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.5; }

.test-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.cost-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cost-unit { font-size: 12px; color: #606266; white-space: nowrap; }
.cost-equiv { font-size: 12px; color: #909399; white-space: nowrap; }
</style>

