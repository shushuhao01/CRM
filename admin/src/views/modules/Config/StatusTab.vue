<template>
  <el-form :model="form" label-width="160px" class="config-form">
    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <template #title>
        启用后，对应配置将覆盖所有租户和私有部署的设置。未启用的配置项将使用各自的本地设置。
      </template>
    </el-alert>

    <el-form-item label="启用基本信息覆盖">
      <el-switch v-model="form.enableBasicOverride" />
      <span class="form-tip">系统名称、公司信息、Logo等</span>
    </el-form-item>
    <el-form-item label="启用版权信息覆盖">
      <el-switch v-model="form.enableCopyrightOverride" />
      <span class="form-tip">版权文字、备案号等</span>
    </el-form-item>
    <el-form-item label="启用用户协议覆盖">
      <el-switch v-model="form.enableAgreementOverride" />
      <span class="form-tip">用户协议、隐私政策</span>
    </el-form-item>

    <el-divider content-position="left">安全配置</el-divider>

    <el-form-item label="强制控制台加密">
      <el-switch v-model="form.enableConsoleEncryption" />
      <span class="form-tip">
        <strong>启用</strong>：强制所有CRM端控制台日志加密，租户无法自行关闭（开关锁定）。
        <strong>关闭</strong>：CRM端仍默认启用加密，但租户可在超管面板中自行选择关闭。
      </span>
    </el-form-item>

    <el-divider content-position="left">日志管理</el-divider>

    <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        统一控制所有 SaaS 租户的日志清理策略。私有部署客户可在各自的系统设置中自行管理。
      </template>
    </el-alert>

    <el-form-item label="业务操作日志">
      <el-switch v-model="form.enableOpLog" active-text="启用" inactive-text="禁用" />
      <span class="form-tip">启用后，租户的订单审核、发货、状态更新等操作将记录审计日志</span>
    </el-form-item>
    <el-form-item label="操作日志自动清理">
      <el-switch v-model="form.opLogAutoCleanup" :disabled="!form.enableOpLog" />
      <span class="form-tip">启用后将自动清理过期的业务操作日志</span>
    </el-form-item>
    <el-form-item label="操作日志保留天数">
      <el-input-number v-model="form.opLogRetentionDays" :min="7" :max="730" :step="30" :disabled="!form.opLogAutoCleanup" />
      <span class="form-tip">天（超过此天数的操作日志将被清理，建议 90-365 天）</span>
    </el-form-item>

    <el-form-item label="系统日志">
      <el-switch v-model="form.enableSysLog" active-text="启用" inactive-text="禁用" />
      <span class="form-tip">启用后，租户可在系统设置中查看和管理系统运行日志</span>
    </el-form-item>
    <el-form-item label="系统日志自动清理">
      <el-switch v-model="form.sysLogAutoCleanup" :disabled="!form.enableSysLog" />
      <span class="form-tip">启用后将自动清理过期的系统运行日志文件</span>
    </el-form-item>
    <el-form-item label="系统日志保留天数">
      <el-input-number v-model="form.sysLogRetentionDays" :min="1" :max="365" :step="7" :disabled="!form.sysLogAutoCleanup" />
      <span class="form-tip">天（超过此天数的日志文件将被清理）</span>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>

<style scoped>
.config-form { max-width: 900px; padding: 20px 0; }
.form-tip { margin-left: 12px; font-size: 12px; color: #909399; }
</style>

