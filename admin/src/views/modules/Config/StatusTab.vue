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
  </el-form>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>

<style scoped>
.config-form { max-width: 900px; padding: 20px 0; }
.form-tip { margin-left: 12px; font-size: 12px; color: #909399; }
</style>

