<template>
  <div class="page-container">
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="card-header">
          <span>上传新版本</span>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="form">
        <el-form-item label="版本号" prop="version">
          <el-input v-model="form.version" placeholder="如：1.8.0" />
        </el-form-item>
        <el-form-item label="版本名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入版本名称" />
        </el-form-item>
        <el-form-item label="版本类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="正式版" />
            <el-radio label="补丁" />
            <el-radio label="测试版" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="版本文件" prop="file">
          <el-upload class="upload-area" drag action="#" :auto-upload="false" :on-change="handleFileChange">
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处或<em>点击上传</em></div>
            <template #tip><div class="el-upload__tip">支持 .zip .tar.gz 格式，最大 500MB</div></template>
          </el-upload>
        </el-form-item>
        <el-form-item label="更新说明" prop="changelog">
          <el-input v-model="form.changelog" type="textarea" :rows="6" placeholder="请输入更新说明（支持Markdown）" />
        </el-form-item>
        <el-form-item label="强制更新">
          <el-switch v-model="form.forceUpdate" />
          <span class="form-tip">开启后客户端必须更新到此版本</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">上传发布</el-button>
          <el-button @click="handleSaveDraft" :loading="loading">保存草稿</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  version: '', name: '', type: '正式版', file: null as File | null,
  changelog: '', forceUpdate: false
})

const rules: FormRules = {
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入版本名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择版本类型', trigger: 'change' }]
}

const handleFileChange = (file: UploadFile) => { form.file = file.raw || null }

const handleSubmit = async () => {
  await formRef.value?.validate()
  loading.value = true
  setTimeout(() => { loading.value = false; ElMessage.success('发布成功'); router.push('/versions/list') }, 1500)
}

const handleSaveDraft = () => {
  loading.value = true
  setTimeout(() => { loading.value = false; ElMessage.success('草稿已保存') }, 500)
}
</script>

<style scoped lang="scss">
.page-container { max-width: 800px; }
.form-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 600px; }
.upload-area { width: 100%; }
.form-tip { margin-left: 12px; font-size: 12px; color: #909399; }
</style>
