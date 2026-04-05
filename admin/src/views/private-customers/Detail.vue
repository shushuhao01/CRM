<template>
  <div class="page-container" v-loading="loading">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()" text><el-icon><ArrowLeft /></el-icon>返回</el-button>
        <span class="page-title">私有客户详情</span>
        <el-tag :type="getStatusType(detail.status)" v-if="detail.status" size="large" effect="dark" class="status-badge">
          {{ getStatusText(detail.status) }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-button v-if="detail.status === 'active' || detail.status === 'expired'" type="primary" @click="handleRenew">
          <el-icon><Clock /></el-icon>续期
        </el-button>
        <el-button v-if="detail.status === 'active'" type="warning" @click="handleSuspend">
          <el-icon><VideoPause /></el-icon>吊销
        </el-button>
        <el-button v-if="detail.status === 'revoked'" type="success" @click="handleReactivate">
          <el-icon><VideoPlay /></el-icon>重新激活
        </el-button>
        <el-dropdown trigger="click" @command="handleHeaderCommand">
          <el-button><el-icon><MoreFilled /></el-icon>更多操作</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="regenerate"><el-icon><RefreshRight /></el-icon>重新生成授权码</el-dropdown-item>
              <el-dropdown-item command="export"><el-icon><Download /></el-icon>导出客户资料</el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <span style="color: #f56c6c"><el-icon><Delete /></el-icon>删除客户</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 基本信息 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><User /></el-icon> 基本信息</span>
          <div class="card-header-actions">
            <template v-if="isEditing">
              <el-button size="small" @click="cancelEdit">取消</el-button>
              <el-button size="small" type="primary" :loading="saving" @click="saveEdit">保存</el-button>
            </template>
            <el-button v-else type="primary" link @click="startEdit">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
          </div>
        </div>
      </template>

      <el-descriptions v-if="!isEditing" :column="3" border size="default">
        <el-descriptions-item label="客户名称">
          <span class="text-bold">{{ detail.customerName || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.customerContact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">
          <span v-if="detail.customerPhone">
            {{ detail.customerPhone }}
            <el-button link size="small" @click="copyText(detail.customerPhone)"><el-icon><CopyDocument /></el-icon></el-button>
          </span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          <span v-if="detail.customerEmail">
            {{ detail.customerEmail }}
            <el-button link size="small" @click="copyText(detail.customerEmail)"><el-icon><CopyDocument /></el-icon></el-button>
          </span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updatedAt) }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ detail.createdByName || detail.createdBy || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.notes || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-form v-else ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px" class="edit-form">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="客户名称" prop="customerName">
              <el-input v-model="editForm.customerName" placeholder="请输入客户名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="editForm.contact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="editForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="editForm.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最大用户数">
              <el-input-number v-model="editForm.maxUsers" :min="1" :max="99999" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 授权信息 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Key /></el-icon> 授权信息</span>
        </div>
      </template>
      <el-descriptions :column="3" border size="default">
        <el-descriptions-item label="授权码">
          <div class="license-key-cell">
            <code>{{ showFullKey ? detail.licenseKey : maskKey(detail.licenseKey) }}</code>
            <el-button link size="small" @click="showFullKey = !showFullKey">
              <el-icon><View v-if="!showFullKey" /><Hide v-else /></el-icon>
            </el-button>
            <el-button link size="small" @click="copyText(detail.licenseKey)">
              <el-icon><CopyDocument /></el-icon>复制
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="授权类型">
          <el-tag :type="getLicenseTypeTag(detail.licenseType)" size="small">
            {{ getLicenseTypeText(detail.licenseType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detail.status)" size="small" effect="dark">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="付费方式">
          <el-tag v-if="detail.licenseType === 'perpetual'" type="success" size="small" effect="dark">永久买断</el-tag>
          <el-tag v-else-if="detail.licenseType === 'annual'" type="warning" size="small" effect="dark">按年付费</el-tag>
          <el-tag v-else size="small">一次性付费</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前套餐">
          <template v-if="detail.packageName || detail.packageInfo">
            <div class="package-info-cell">
              <el-tag type="primary" effect="plain" size="small">{{ detail.packageName || detail.packageInfo?.name || '-' }}</el-tag>
              <template v-if="detail.packageInfo">
                <span class="package-price">¥{{ detail.packageInfo.price }}/{{ billingCycleText(detail.packageInfo.billing_cycle) }}</span>
              </template>
              <el-button link type="primary" size="small" @click="openChangePackage">更换套餐</el-button>
            </div>
          </template>
          <template v-else>
            <span class="text-muted">未绑定套餐</span>
            <el-button link type="primary" size="small" @click="openChangePackage" style="margin-left: 8px">绑定套餐</el-button>
          </template>
        </el-descriptions-item>
        <el-descriptions-item label="用户数">
          <span class="text-bold text-primary">{{ detail.userCount || 0 }}</span> / {{ detail.maxUsers || 0 }} 人
          <el-tag v-if="detail.maxUsers && (detail.userCount || 0) >= detail.maxUsers" type="danger" size="small" style="margin-left: 6px">已达上限</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="到期时间">
          <template v-if="detail.licenseType === 'perpetual'">
            <el-tag type="success" size="small">永久有效</el-tag>
          </template>
          <template v-else>
            <span :class="{ 'text-danger': isExpired(detail.expiresAt), 'text-success': !isExpired(detail.expiresAt) }">
              {{ formatDate(detail.expiresAt) }}
            </span>
            <el-tag v-if="isExpired(detail.expiresAt)" type="danger" size="small" style="margin-left: 6px">已过期</el-tag>
            <el-tag v-else-if="isExpiringSoon(detail.expiresAt)" type="warning" size="small" style="margin-left: 6px">即将到期</el-tag>
          </template>
        </el-descriptions-item>
        <el-descriptions-item label="激活时间">
          {{ detail.activatedAt ? formatDateTime(detail.activatedAt) : '未激活' }}
        </el-descriptions-item>
        <el-descriptions-item label="机器标识">
          <template v-if="detail.machineId">
            <code class="machine-id">{{ detail.machineId }}</code>
            <el-button link size="small" @click="copyText(detail.machineId)"><el-icon><CopyDocument /></el-icon></el-button>
          </template>
          <span v-else class="text-muted">未绑定</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{ detail.createdByName || detail.createdBy || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 功能模块授权 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>
            <el-icon><Grid /></el-icon> 功能模块授权
            <el-tag size="small" type="info" style="margin-left: 8px">
              已启用 {{ enabledModulesCount }}/{{ crmModuleOptions.length }}
            </el-tag>
          </span>
          <div class="card-header-actions">
            <template v-if="isEditingModules">
              <el-button size="small" @click="cancelEditModules">取消</el-button>
              <el-button size="small" type="primary" :loading="saving" @click="saveModules">保存</el-button>
            </template>
            <el-button v-else link type="primary" @click="startEditModules">
              <el-icon><Edit /></el-icon>配置模块
            </el-button>
          </div>
        </div>
      </template>

      <!-- 查看模式 - 网格卡片 -->
      <div v-if="!isEditingModules" class="modules-grid">
        <div
          v-for="mod in crmModuleOptions"
          :key="mod.id"
          class="module-card"
          :class="{ enabled: isModuleEnabled(mod.id), disabled: !isModuleEnabled(mod.id) }"
        >
          <div class="module-card-icon" :class="{ enabled: isModuleEnabled(mod.id) }">
            <el-icon :size="22"><component :is="mod.icon" /></el-icon>
          </div>
          <div class="module-card-name">{{ mod.title }}</div>
          <div class="module-card-status">
            <el-icon v-if="isModuleEnabled(mod.id)" class="status-icon on"><CircleCheck /></el-icon>
            <el-icon v-else class="status-icon off"><CircleClose /></el-icon>
          </div>
        </div>
      </div>

      <!-- 编辑模式 -->
      <div v-else class="modules-edit">
        <div class="edit-toolbar">
          <el-button size="small" link type="primary" @click="selectAllModules">全选</el-button>
          <el-button size="small" link @click="deselectAllModules">全不选</el-button>
        </div>
        <el-checkbox-group v-model="editModules">
          <div class="modules-grid edit-mode">
            <label
              v-for="mod in crmModuleOptions"
              :key="mod.id"
              class="module-card-check"
              :class="{ checked: editModules.includes(mod.id), locked: mod.id === 'dashboard' }"
            >
              <el-checkbox :value="mod.id" :disabled="mod.id === 'dashboard'" class="hidden-checkbox" />
              <div class="module-card-icon" :class="{ enabled: editModules.includes(mod.id) }">
                <el-icon :size="22"><component :is="mod.icon" /></el-icon>
              </div>
              <div class="module-card-name">{{ mod.title }}</div>
              <div class="module-card-check-mark">
                <el-icon v-if="editModules.includes(mod.id)" color="#409eff"><CircleCheck /></el-icon>
                <el-icon v-else color="#dcdfe6"><CircleClose /></el-icon>
              </div>
            </label>
          </div>
        </el-checkbox-group>
        <el-alert type="info" :closable="false" style="margin-top: 12px" show-icon>
          勾选的模块对应 CRM 客户端左侧一级菜单，未勾选的模块在客户端登录后将不可见。「数据看板」默认启用不可取消。
        </el-alert>
      </div>
    </el-card>

    <!-- 激活/操作记录 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Document /></el-icon> 激活/操作记录</span>
          <div class="card-header-actions">
            <el-button type="danger" link @click="handleClearLogs" :loading="logsLoading" size="small">
              <el-icon><Delete /></el-icon>清空日志
            </el-button>
            <el-button link type="primary" @click="fetchLogs" :loading="logsLoading" size="small">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="activationLogs" v-loading="logsLoading" stripe size="small">
        <el-table-column prop="action" label="操作类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getLogActionType(row.action)" size="small">{{ getLogActionText(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="结果" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作人" width="100">
          <template #default="{ row }">{{ extractOperator(row) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="操作时间" width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ formatDateTime(row.createdAt || row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <template v-if="!logsLoading && activationLogs.length === 0">
        <el-empty description="暂无操作记录" :image-size="48" />
      </template>
      <div class="pagination-wrapper" v-if="logsTotal > 10">
        <el-pagination v-model:current-page="logsPage" :page-size="10" :total="logsTotal"
          layout="total, prev, pager, next" @current-change="fetchLogs" small />
      </div>
    </el-card>

    <!-- 账单记录 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Wallet /></el-icon> 账单记录</span>
          <el-button link type="primary" @click="fetchBills" :loading="billsLoading" size="small">
            <el-icon><Refresh /></el-icon>刷新
          </el-button>
        </div>
      </template>
      <el-table :data="bills" v-loading="billsLoading" stripe size="small">
        <el-table-column prop="order_no" label="订单号" min-width="180" show-overflow-tooltip />
        <el-table-column prop="package_name" label="套餐" width="120" show-overflow-tooltip />
        <el-table-column prop="amount" label="金额" width="100" align="right">
          <template #default="{ row }">
            <span class="text-price">¥{{ Number(row.amount || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="pay_type" label="支付方式" width="100">
          <template #default="{ row }">{{ payTypeMap[row.pay_type] || row.pay_type || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getBillStatusType(row.status)" size="small">{{ getBillStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ formatDateTime(row.created_at || row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <template v-if="!billsLoading && bills.length === 0">
        <el-empty description="暂无账单记录" :image-size="48" />
      </template>
      <div class="pagination-wrapper" v-if="billsTotal > 10">
        <el-pagination v-model:current-page="billsPage" :page-size="10" :total="billsTotal"
          layout="total, prev, pager, next" @current-change="fetchBills" small />
      </div>
    </el-card>

    <!-- 数据清理说明 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Delete /></el-icon> 数据清理</span>
        </div>
      </template>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 12px;"
      >
        <template #title>
          <span style="font-weight: 600;">私有部署客户 — 数据存储在客户自有服务器</span>
        </template>
        <template #default>
          <div style="margin-top: 8px; line-height: 1.8; font-size: 13px;">
            <p style="margin: 0;">私有部署客户的所有数据（数据库记录、上传文件等）均存储在客户自己的服务器和数据库中，管理后台无法远程访问或清理这些数据。</p>
            <p style="margin: 8px 0 0 0;">如需清理客户本地数据，请参考以下方式：</p>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              <li>联系客户的运维人员，在其服务器上直接操作数据库</li>
              <li>使用私有部署交付包中的维护工具（如有提供）</li>
              <li>通过吊销授权码使客户系统停用，待客户确认后由其自行清理</li>
            </ul>
          </div>
        </template>
      </el-alert>
      <div style="display: flex; align-items: center; gap: 12px;">
        <el-button type="danger" disabled>
          <el-icon><Delete /></el-icon>清理过期数据
        </el-button>
        <span style="font-size: 12px; color: #909399;">私有部署客户不支持远程清理数据</span>
      </div>
    </el-card>

    <!-- 续期对话框 -->
    <el-dialog v-model="showRenewDialog" title="授权续期" width="440px">
      <el-form label-width="100px">
        <el-form-item label="客户名称">
          <span class="text-bold">{{ detail.customerName }}</span>
        </el-form-item>
        <el-form-item label="当前到期">
          <span :class="{ 'text-danger': isExpired(detail.expiresAt) }">
            {{ detail.licenseType === 'perpetual' ? '永久' : formatDate(detail.expiresAt) }}
          </span>
        </el-form-item>
        <el-form-item label="续期方式">
          <el-radio-group v-model="renewMode">
            <el-radio value="quick">快捷续期</el-radio>
            <el-radio value="custom">自定义日期</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="renewMode === 'quick'" label="续期时长">
          <el-select v-model="renewMonths" placeholder="请选择续期时长" style="width: 100%">
            <el-option label="1个月" :value="1" />
            <el-option label="3个月" :value="3" />
            <el-option label="6个月" :value="6" />
            <el-option label="12个月（1年）" :value="12" />
            <el-option label="24个月（2年）" :value="24" />
            <el-option label="36个月（3年）" :value="36" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="新到期时间" required>
          <el-date-picker v-model="renewExpireDate" type="date" placeholder="请选择新的到期时间" style="width: 100%"
            :disabled-date="(date: Date) => date < new Date()" />
        </el-form-item>
        <el-form-item label="续期后到期">
          <span style="color: #409eff; font-weight: 600; font-size: 15px;">{{ computedRenewDate }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>

    <!-- 授权码重新生成弹窗 -->
    <el-dialog v-model="showLicenseDialog" title="授权码已重新生成" width="500px">
      <el-result icon="success" title="授权码已重新生成">
        <template #sub-title>
          <div class="license-result">
            <p>请将以下新授权码发送给客户：</p>
            <div class="license-key-box">
              <span class="key">{{ newLicenseKey }}</span>
              <el-button type="primary" size="small" @click="copyText(newLicenseKey)">复制</el-button>
            </div>
            <p class="tip">原授权码已失效，请及时通知客户更新</p>
          </div>
        </template>
      </el-result>
      <template #footer>
        <el-button type="primary" @click="showLicenseDialog = false">我知道了</el-button>
      </template>
    </el-dialog>

    <!-- 更换套餐对话框 -->
    <el-dialog v-model="showPackageDialog" title="更换套餐" width="720px">
      <div v-loading="packagesLoading" class="package-picker">
        <el-tabs v-model="packageTab">
          <el-tab-pane label="私有部署版" name="private" />
          <el-tab-pane label="SaaS云端版" name="saas" />
        </el-tabs>
        <div class="package-picker-grid">
          <div
            v-for="pkg in filteredPackages"
            :key="pkg.id"
            class="package-picker-item"
            :class="{
              selected: selectedPackageId === pkg.id,
              current: detail.packageId === pkg.id,
              recommended: pkg.is_recommended
            }"
            @click="selectedPackageId = pkg.id"
          >
            <div class="pkg-badge" v-if="detail.packageId === pkg.id">当前</div>
            <div class="pkg-badge recommend" v-else-if="pkg.is_recommended">推荐</div>
            <div class="pkg-name">{{ pkg.name }}</div>
            <div class="pkg-price">
              <span v-if="pkg.price == 0" class="free">免费</span>
              <template v-else>
                <span class="amount">¥{{ pkg.price }}</span>
                <span class="unit">/{{ billingCycleText(pkg.billing_cycle) }}</span>
              </template>
            </div>
            <div class="pkg-specs">
              <span>{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }} 用户</span>
            </div>
            <div class="pkg-features" v-if="pkg.features?.length">
              <div v-for="f in (pkg.features || []).slice(0, 4)" :key="f" class="pkg-feature">
                <el-icon color="#67c23a" :size="12"><CircleCheck /></el-icon> {{ f }}
              </div>
              <div v-if="pkg.features.length > 4" class="pkg-feature more">
                +{{ pkg.features.length - 4 }} 项更多功能
              </div>
            </div>
            <div class="pkg-select-mark" v-if="selectedPackageId === pkg.id">
              <el-icon :size="20"><CircleCheck /></el-icon>
            </div>
          </div>
        </div>
        <el-empty v-if="!packagesLoading && filteredPackages.length === 0" description="暂无可用套餐" :image-size="48" />
        <el-checkbox v-model="syncPackageModules" style="margin-top: 12px">
          同步套餐的功能模块到授权（将覆盖当前的功能模块配置）
        </el-checkbox>
      </div>
      <template #footer>
        <el-button @click="showPackageDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmChangePackage" :loading="submitting"
          :disabled="!selectedPackageId">确认更换</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Edit, ArrowLeft, Clock, VideoPause, VideoPlay, MoreFilled, RefreshRight,
  Download, Delete, CopyDocument, View, Hide, Refresh, User, Key, Grid,
  Document, Wallet, CircleCheck, CircleClose,
  Odometer, ShoppingCart, Phone, TrendCharts, Van, Headset, Files, Money, Box, Setting
} from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'
import type { Package } from '@/api/packages'
import { getPackages } from '@/api/packages'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const saving = ref(false)
const showFullKey = ref(false)
const showRenewDialog = ref(false)
const showLicenseDialog = ref(false)
const showPackageDialog = ref(false)
const renewExpireDate = ref<Date | null>(null)
const renewMode = ref<'quick' | 'custom'>('quick')
const renewMonths = ref<number>(12)
const isEditing = ref(false)
const isEditingModules = ref(false)
const newLicenseKey = ref('')
const detail = ref<any>({})

// 日志和账单
const activationLogs = ref<any[]>([])
const logsPage = ref(1)
const logsTotal = ref(0)
const logsLoading = ref(false)
const bills = ref<any[]>([])
const billsPage = ref(1)
const billsTotal = ref(0)
const billsLoading = ref(false)

// 套餐相关
const allPackages = ref<Package[]>([])
const packagesLoading = ref(false)
const packageTab = ref('private')
const selectedPackageId = ref<number | null>(null)
const syncPackageModules = ref(true)

const filteredPackages = computed(() => {
  return allPackages.value.filter(p => p.type === packageTab.value && p.status)
})

const billingCycleText = (cycle: string) => {
  return ({ monthly: '月', yearly: '年', once: '永久' }[cycle] || cycle)
}

// ============================================================
// CRM 一级菜单模块列表，带图标
// ============================================================
const crmModuleOptions = [
  { id: 'dashboard', title: '数据看板', icon: Odometer },
  { id: 'customer', title: '客户管理', icon: User },
  { id: 'order', title: '订单管理', icon: ShoppingCart },
  { id: 'service-management', title: '服务管理', icon: Phone },
  { id: 'performance', title: '业绩统计', icon: TrendCharts },
  { id: 'logistics', title: '物流管理', icon: Van },
  { id: 'service', title: '售后管理', icon: Headset },
  { id: 'data', title: '资料管理', icon: Files },
  { id: 'finance', title: '财务管理', icon: Money },
  { id: 'product', title: '商品管理', icon: Box },
  { id: 'system', title: '系统管理', icon: Setting }
]

const allModuleIds = crmModuleOptions.map(m => m.id)

const isModuleEnabled = (id: string) => {
  return (detail.value.features || []).includes(id)
}

const enabledModulesCount = computed(() => {
  return (detail.value.features || []).filter((f: string) => allModuleIds.includes(f)).length
})

// 编辑模块
const editModules = ref<string[]>([])

const startEditModules = () => {
  editModules.value = [...(detail.value.features || [])]
  if (!editModules.value.includes('dashboard')) editModules.value.push('dashboard')
  isEditingModules.value = true
}
const cancelEditModules = () => { isEditingModules.value = false }
const selectAllModules = () => { editModules.value = [...allModuleIds] }
const deselectAllModules = () => { editModules.value = ['dashboard'] }

const saveModules = async () => {
  if (!editModules.value.includes('dashboard')) editModules.value.push('dashboard')
  saving.value = true
  try {
    const res = await adminApi.updateLicense(route.params.id as string, { modules: editModules.value })
    if (res.success) {
      ElMessage.success('模块配置已更新')
      isEditingModules.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
  } finally {
    saving.value = false
  }
}

// ============================================================
// 编辑表单
// ============================================================
const editFormRef = ref<FormInstance>()
const editForm = ref({
  customerName: '', contact: '', phone: '', email: '',
  maxUsers: 1, remark: ''
})
const editRules: FormRules = {
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

const payTypeMap: Record<string, string> = {
  wechat: '微信支付', alipay: '支付宝', bank: '银行转账', manual: '人工'
}

// ============================================================
// 工具方法
// ============================================================
const maskKey = (key: string) => {
  if (!key) return ''
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 12) + '****'
}

const copyText = async (text: string) => {
  if (!text) return
  try { await navigator.clipboard.writeText(text); ElMessage.success('已复制到剪贴板') }
  catch { ElMessage.error('复制失败') }
}

const isExpired = (date: string) => date && new Date(date) < new Date()
const isExpiringSoon = (date: string) => {
  if (!date) return false
  const diff = new Date(date).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'
const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'

const getLicenseTypeTag = (type: string) => ({ trial: 'info', annual: '', perpetual: 'success', monthly: 'warning' }[type] || 'info') as any
const getLicenseTypeText = (type: string) => ({ trial: '试用', annual: '年度', perpetual: '永久', monthly: '月付' }[type] || type)
const getStatusType = (status: string) => ({ pending: 'warning', active: 'success', expired: 'info', revoked: 'danger' }[status] || 'info') as any
const getStatusText = (status: string) => ({ pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' }[status] || status)
const getBillStatusType = (s: string) => ({ pending: 'warning', paid: 'success', expired: 'info', refunded: 'danger', closed: 'info' }[s] || 'info') as any
const getBillStatusText = (s: string) => ({ pending: '待支付', paid: '已支付', expired: '已过期', refunded: '已退款', closed: '已关闭' }[s] || s)
const getLogActionType = (a: string) => ({ activate: 'success', renew: 'primary', revoke: 'danger', expire: 'warning', heartbeat: 'info', verify: '', generate: 'success', unlock_admin: 'warning', update: 'primary' }[a] || 'info') as any
const getLogActionText = (a: string) => ({ activate: '激活', renew: '续期', revoke: '吊销', expire: '到期', heartbeat: '心跳', verify: '验证', generate: '生成授权码', unlock_admin: '解锁账号', update: '更新' }[a] || a)

// 从日志 message 中提取操作人
const extractOperator = (row: any): string => {
  const msg = row.message || ''
  const match = msg.match(/^管理员\s*(\S+)/)
  if (match) return match[1]
  return row.operatorName || row.operator_name || '-'
}

// 清空操作日志
const handleClearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空该客户的所有操作日志吗？此操作不可恢复。',
      '清空日志', { type: 'warning', confirmButtonText: '确定清空', cancelButtonText: '取消' }
    )
    const res = await adminApi.clearLicenseLogs(route.params.id as string)
    if (res.success) {
      ElMessage.success(res.message || '日志已清空')
      activationLogs.value = []
      logsTotal.value = 0
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '清空日志失败')
  }
}

// ============================================================
// 编辑基本信息
// ============================================================
const startEdit = () => {
  editForm.value = {
    customerName: detail.value.customerName || '',
    contact: detail.value.customerContact || '',
    phone: detail.value.customerPhone || '',
    email: detail.value.customerEmail || '',
    maxUsers: detail.value.maxUsers || 1,
    remark: detail.value.notes || ''
  }
  isEditing.value = true
}
const cancelEdit = () => { isEditing.value = false }

const saveEdit = async () => {
  if (!editFormRef.value) return
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const res = await adminApi.updateLicense(route.params.id as string, editForm.value)
    if (res.success) { ElMessage.success('保存成功'); isEditing.value = false; fetchDetail() }
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally { saving.value = false }
}

// ============================================================
// 更换套餐
// ============================================================
const openChangePackage = async () => {
  selectedPackageId.value = detail.value.packageId || null
  syncPackageModules.value = true
  showPackageDialog.value = true
  if (allPackages.value.length === 0) {
    packagesLoading.value = true
    try {
      const res = await getPackages()
      allPackages.value = res.data || []
    } catch { ElMessage.error('获取套餐列表失败') }
    finally { packagesLoading.value = false }
  }
}

const confirmChangePackage = async () => {
  if (!selectedPackageId.value) return
  const pkg = allPackages.value.find(p => p.id === selectedPackageId.value)
  if (!pkg) return

  // 如果选的是当前套餐
  if (selectedPackageId.value === detail.value.packageId && !syncPackageModules.value) {
    ElMessage.info('当前已是该套餐')
    return
  }

  submitting.value = true
  try {
    const updateData: any = {
      packageId: pkg.id,
      packageName: pkg.name,
      maxUsers: pkg.max_users
    }
    // 同步套餐功能模块（modules是授权模块ID列表，features是功能特性文本）
    if (syncPackageModules.value && pkg.modules?.length) {
      updateData.modules = pkg.modules
    }
    const res = await adminApi.updateLicense(route.params.id as string, updateData)
    if (res.success) {
      ElMessage.success(`已更换为「${pkg.name}」套餐`)
      showPackageDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '更换套餐失败')
  } finally { submitting.value = false }
}

// ============================================================
// 续期
// ============================================================
const computedRenewDate = computed(() => {
  if (renewMode.value === 'custom') {
    return renewExpireDate.value ? renewExpireDate.value.toLocaleDateString('zh-CN') : '请选择日期'
  }
  if (!renewMonths.value) return '-'
  const base = detail.value.expiresAt ? new Date(detail.value.expiresAt) : new Date()
  const now = new Date()
  const effectiveBase = base < now ? now : base
  const target = new Date(effectiveBase)
  target.setMonth(target.getMonth() + renewMonths.value)
  return target.toLocaleDateString('zh-CN')
})

const handleRenew = () => {
  renewExpireDate.value = null; renewMode.value = 'quick'; renewMonths.value = 12
  showRenewDialog.value = true
}

const confirmRenew = async () => {
  let dateISO = ''
  if (renewMode.value === 'custom') {
    if (!renewExpireDate.value) { ElMessage.warning('请选择新的到期时间'); return }
    dateISO = renewExpireDate.value.toISOString()
  } else {
    if (!renewMonths.value) { ElMessage.warning('请选择续期时长'); return }
    const base = detail.value.expiresAt ? new Date(detail.value.expiresAt) : new Date()
    const now = new Date(); const effectiveBase = base < now ? now : base
    const target = new Date(effectiveBase); target.setMonth(target.getMonth() + renewMonths.value)
    dateISO = target.toISOString()
  }
  submitting.value = true
  try {
    const res = await adminApi.renewLicense(route.params.id as string, dateISO)
    if (res.success) { ElMessage.success('续期成功'); showRenewDialog.value = false; fetchDetail() }
  } catch (e: any) {
    ElMessage.error(e.message || '续期失败')
  } finally { submitting.value = false }
}

// ============================================================
// 吊销 / 重新激活
// ============================================================
const handleSuspend = async () => {
  try {
    await ElMessageBox.confirm(`确定要吊销 "${detail.value.customerName}" 的授权吗？吊销后该授权将无法使用。`, '吊销授权', { type: 'warning', confirmButtonText: '确定吊销' })
    const res = await adminApi.revokeLicense(route.params.id as string)
    if (res.success) { ElMessage.success('已吊销'); fetchDetail() }
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '操作失败') }
}

const handleReactivate = async () => {
  try {
    await ElMessageBox.confirm(`确定要重新激活 "${detail.value.customerName}" 的授权吗？`, '重新激活', { type: 'info' })
    const res = await adminApi.updateLicense(route.params.id as string, { status: 'active' })
    if (res.success) { ElMessage.success('已重新激活'); fetchDetail() }
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '操作失败') }
}

// ============================================================
// 更多操作
// ============================================================
const handleHeaderCommand = async (cmd: string) => {
  switch (cmd) {
    case 'regenerate':
      try {
        await ElMessageBox.confirm('重新生成授权码后，原授权码将立即失效，客户需要使用新授权码激活系统。确定继续？', '重新生成授权码', { type: 'warning' })
        const res = await adminApi.updateLicense(route.params.id as string, { regenerateKey: true })
        if (res.success && res.data?.licenseKey) { newLicenseKey.value = res.data.licenseKey; showLicenseDialog.value = true; fetchDetail() }
        else { ElMessage.success('操作完成'); fetchDetail() }
      } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '操作失败') }
      break
    case 'export': {
      try {
        const d = detail.value
        const BOM = '\uFEFF'
        const headers = ['客户名称','联系人','联系电话','邮箱','授权码','授权类型','最大用户数','状态','到期时间','激活时间','创建时间','备注']
        const typeMap: Record<string, string> = { trial: '试用', annual: '年度', perpetual: '永久' }
        const statusMap: Record<string, string> = { pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' }
        const vals = [
          d.customerName, d.customerContact || '', d.customerPhone || '', d.customerEmail || '',
          d.licenseKey, typeMap[d.licenseType] || d.licenseType, d.maxUsers,
          statusMap[d.status] || d.status,
          d.licenseType === 'perpetual' ? '永久' : formatDate(d.expiresAt),
          d.activatedAt ? formatDateTime(d.activatedAt) : '未激活',
          formatDateTime(d.createdAt), d.notes || ''
        ]
        const csv = BOM + headers.map(h => `"${h}"`).join(',') + '\n' + vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `私有客户_${d.customerName}_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
        ElMessage.success('导出成功')
      } catch { ElMessage.error('导出失败') }
      break
    }
    case 'delete':
      try {
        await ElMessageBox.confirm('删除客户将同时删除所有授权数据，此操作不可恢复！', '删除客户', { type: 'error', confirmButtonText: '确定删除', confirmButtonClass: 'el-button--danger' })
        const res = await adminApi.deleteLicense(route.params.id as string)
        if (res.success) { ElMessage.success('已删除'); router.push('/private-customers') }
      } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '删除失败') }
      break
  }
}

// ============================================================
// 数据获取
// ============================================================
const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await adminApi.getLicenseDetail(route.params.id as string)
    if (res.success) detail.value = res.data
  } catch (e: any) {
    const status = e?.response?.status
    if (status === 404) {
      ElMessage.warning('该客户授权记录不存在或已被删除')
      setTimeout(() => router.push('/private-customers/list'), 1500)
    } else {
      ElMessage.error('获取详情失败')
    }
  }
  finally { loading.value = false }
}

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    const res = await adminApi.getLicenseLogs(route.params.id as string, { page: logsPage.value, pageSize: 10 })
    if (res.success) { activationLogs.value = res.data.list || []; logsTotal.value = res.data.total || 0 }
  } catch { activationLogs.value = [] }
  finally { logsLoading.value = false }
}

const fetchBills = async () => {
  billsLoading.value = true
  try {
    const res = await adminApi.getLicenseBills(route.params.id as string, { page: billsPage.value, pageSize: 10 })
    if (res.success) { bills.value = res.data.list || []; billsTotal.value = res.data.total || 0 }
  } catch { bills.value = [] }
  finally { billsLoading.value = false }
}

onMounted(() => { fetchDetail(); fetchLogs(); fetchBills() })
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }

.page-header {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; padding: 12px 20px; border-radius: 8px;
  .header-left { display: flex; align-items: center; gap: 12px; }
  .header-actions { display: flex; gap: 8px; }
}
.page-title { font-size: 18px; font-weight: 600; }
.status-badge { margin-left: 4px; }

.info-card {
  border-radius: 8px; border: none;
  :deep(.el-card__header) { padding: 12px 20px; }
}
.card-header {
  display: flex; justify-content: space-between; align-items: center; font-weight: 500;
  .el-icon { margin-right: 4px; vertical-align: -2px; }
}
.card-header-actions { display: flex; gap: 8px; }

.text-danger { color: #f56c6c; }
.text-success { color: #67c23a; }
.text-muted { color: #909399; }
.text-bold { font-weight: 600; }
.text-primary { color: #409eff; }
.text-price { color: #e6a23c; font-weight: 600; }
.edit-form :deep(.el-form-item) { margin-bottom: 16px; }

/* 授权码 */
.license-key-cell {
  display: flex; align-items: center; gap: 6px;
  code { font-family: 'Monaco', 'Menlo', monospace; font-size: 13px; background: #f5f7fa; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px; }
}
.machine-id { font-family: monospace; background: #f5f7fa; padding: 2px 6px; border-radius: 4px; font-size: 12px; }

/* 套餐信息单元格 */
.package-info-cell { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.package-price { font-size: 13px; color: #e6a23c; font-weight: 500; }

/* ====== 功能模块 - 网格卡片 ====== */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.module-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 8px 12px; border-radius: 10px; cursor: default;
  position: relative; transition: all 0.25s;

  &.enabled {
    background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
    border: 1px solid #d9ecff;
    .module-card-name { color: #303133; font-weight: 500; }
  }
  &.disabled {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    .module-card-name { color: #c0c4cc; }
    .module-card-icon { opacity: 0.4; }
  }
}

.module-card-icon {
  width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  transition: all 0.25s;
  &.enabled { background: #409eff; color: #fff; box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25); }
  &:not(.enabled) { background: #e8e8e8; color: #999; }
}

.module-card-name { font-size: 13px; text-align: center; line-height: 1.3; }

.module-card-status {
  .status-icon {
    font-size: 14px;
    &.on { color: #67c23a; }
    &.off { color: #dcdfe6; }
  }
}

/* ====== 编辑模式 ====== */
.modules-edit {
  .edit-toolbar { margin-bottom: 12px; display: flex; gap: 12px; }
  .modules-grid.edit-mode { gap: 10px; }
}

.module-card-check {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px 10px; border-radius: 10px; cursor: pointer;
  position: relative; transition: all 0.2s; border: 2px solid #e4e7ed;
  background: #fafafa;

  &:hover { border-color: #c6e2ff; background: #f5f9ff; }
  &.checked {
    border-color: #409eff; background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
    .module-card-name { color: #303133; font-weight: 500; }
  }
  &.locked { cursor: not-allowed; opacity: 0.75; }
  .hidden-checkbox { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
}

.module-card-check-mark {
  position: absolute; top: 4px; right: 4px; font-size: 16px;
}

/* ====== 分页 ====== */
.pagination-wrapper { margin-top: 12px; display: flex; justify-content: flex-end; }

/* ====== 授权码弹窗 ====== */
.license-result {
  text-align: center;
  p { margin: 8px 0; color: #606266; }
  .tip { font-size: 12px; color: #909399; }
}
.license-key-box {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px; margin: 16px 0; background: #f5f7fa; border-radius: 8px;
  .key { font-family: monospace; font-size: 18px; font-weight: bold; color: #409eff; letter-spacing: 1px; }
}

/* ====== 更换套餐弹窗 ====== */
.package-picker-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(195px, 1fr)); gap: 12px;
  max-height: 420px; overflow-y: auto; padding: 4px 2px;
}

.package-picker-item {
  position: relative; padding: 16px 14px; border: 2px solid #e4e7ed; border-radius: 10px;
  cursor: pointer; transition: all 0.2s; background: #fff;

  &:hover { border-color: #c6e2ff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  &.selected { border-color: #409eff; background: #f0f7ff; box-shadow: 0 2px 12px rgba(64,158,255,0.15); }
  &.current { border-color: #e6a23c; }
  &.recommended { border-color: #67c23a; }

  .pkg-badge {
    position: absolute; top: -1px; right: 10px; font-size: 11px; padding: 1px 8px;
    background: #e6a23c; color: #fff; border-radius: 0 0 6px 6px; font-weight: 500;
    &.recommend { background: #67c23a; }
  }
  .pkg-name { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 6px; }
  .pkg-price {
    margin-bottom: 8px;
    .free { color: #67c23a; font-weight: 600; font-size: 16px; }
    .amount { color: #e6a23c; font-weight: 700; font-size: 20px; }
    .unit { color: #909399; font-size: 12px; }
  }
  .pkg-specs {
    display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: #909399;
  }
  .pkg-features {
    border-top: 1px solid #f0f0f0; padding-top: 8px;
    .pkg-feature { font-size: 12px; color: #606266; line-height: 1.8; display: flex; align-items: center; gap: 4px; }
    .pkg-feature.more { color: #909399; font-style: italic; }
  }
  .pkg-select-mark {
    position: absolute; bottom: 8px; right: 8px; color: #409eff;
  }
}

/* ====== 响应式 ====== */
@media screen and (max-width: 768px) {
  .page-header {
    flex-direction: column; gap: 12px; align-items: flex-start;
    .header-actions { width: 100%; flex-wrap: wrap; .el-button { flex: 1; min-width: 80px; } }
  }
  .edit-form :deep(.el-col) { flex: 0 0 100% !important; max-width: 100% !important; }
  .modules-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
  .module-card { padding: 12px 6px 8px; }
  .module-card-icon { width: 36px; height: 36px; }
}
</style>
