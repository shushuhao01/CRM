<template>
  <div class="notification-templates">
    <el-card>
      <!-- 顶部操作栏 -->
      <el-row :gutter="20" class="toolbar">
        <el-col :span="6">
          <el-select v-model="filterCategory" placeholder="选择分类" @change="loadTemplates">
            <el-option label="全部分类" value="" />
            <el-option label="租户注册" value="tenant" />
            <el-option label="支付相关" value="payment" />
            <el-option label="授权码" value="license" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板名称或代码"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6" style="text-align: right;">
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新建模板
          </el-button>
        </el-col>
      </el-row>

      <!-- 模板列表 -->
      <el-table
        :data="filteredTemplates"
        border
        style="margin-top: 20px;"
        v-loading="loading"
      >
        <el-table-column prop="templateCode" label="模板代码" width="180" />
        <el-table-column prop="templateName" label="模板名称" width="200" />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag>{{ getCategoryName(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="templateType" label="类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.templateType === 'email'" type="info">邮件</el-tag>
            <el-tag v-else-if="row.templateType === 'sms'" type="warning">短信</el-tag>
            <el-tag v-else type="success">邮件+短信</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scene" label="使用场景" min-width="150" show-overflow-tooltip />
        <el-table-column prop="isEnabled" label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.isEnabled"
              :active-value="1"
              :inactive-value="0"
              @change="handleToggleStatus(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="success" @click="handleTest(row)">测试</el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(row)"
              :disabled="row.isSystem === 1"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '新建模板'"
      width="80%"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="120px" :rules="formRules" ref="formRef">
        <el-form-item label="模板代码" prop="templateCode">
          <el-input
            v-model="formData.templateCode"
            :disabled="formData.isSystem === 1 || isEdit"
            placeholder="如: tenant_register_success"
          />
        </el-form-item>

        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="formData.templateName" placeholder="如: 租户注册成功" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="模板类型" prop="templateType">
              <el-select v-model="formData.templateType" style="width: 100%;">
                <el-option label="仅邮件" value="email" />
                <el-option label="仅短信" value="sms" />
                <el-option label="邮件+短信" value="both" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="业务分类" prop="category">
              <el-select v-model="formData.category" style="width: 100%;">
                <el-option label="租户注册" value="tenant" />
                <el-option label="支付相关" value="payment" />
                <el-option label="授权码" value="license" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="formData.priority" style="width: 100%;">
                <el-option label="低" value="low" />
                <el-option label="普通" value="normal" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="使用场景" prop="scene">
          <el-input v-model="formData.scene" placeholder="如: 租户注册成功后发送欢迎邮件和短信" />
        </el-form-item>

        <el-divider content-position="left">邮件配置</el-divider>

        <el-form-item label="邮件主题">
          <el-input v-model="formData.emailSubject" placeholder="支持变量: {{变量名}}" />
        </el-form-item>

        <el-form-item label="邮件内容">
          <el-input
            v-model="formData.emailContent"
            type="textarea"
            :rows="10"
            placeholder="支持HTML和变量: {{变量名}}"
          />
        </el-form-item>

        <el-divider content-position="left">短信配置</el-divider>

        <el-form-item label="短信内容">
          <el-input
            v-model="formData.smsContent"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="支持变量: {{变量名}}，建议70字以内"
          />
        </el-form-item>

        <el-divider content-position="left">变量说明</el-divider>

        <el-form-item label="变量说明">
          <el-input
            v-model="formData.variableDescription"
            type="textarea"
            :rows="3"
            placeholder="说明可用的变量及其含义"
          />
        </el-form-item>

        <el-form-item label="可用变量">
          <div v-if="formData.variables && Object.keys(formData.variables).length > 0" class="variables-display">
            <el-tag
              v-for="(desc, key) in formData.variables"
              :key="key"
              style="margin: 5px;"
            >
              {{key}}: {{desc}}
            </el-tag>
          </div>
          <el-text v-else type="info">暂无变量</el-text>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 测试对话框 -->
    <el-dialog
      v-model="testDialogVisible"
      title="测试模板"
      width="70%"
      :close-on-click-modal="false"
    >
      <el-form :model="testData" label-width="150px">
        <el-form-item
          v-for="(desc, key) in currentTemplate.variables"
          :key="key"
          :label="desc"
        >
          <el-input
            v-model="testData[key]"
            :placeholder="`请输入${desc}`"
          />
        </el-form-item>
      </el-form>

      <el-divider content-position="left">预览效果</el-divider>

      <div v-if="previewResult.emailSubject || previewResult.smsContent" class="preview-result">
        <div v-if="previewResult.emailSubject" class="email-preview">
          <h4>邮件主题</h4>
          <div class="preview-box">{{ previewResult.emailSubject }}</div>

          <h4>邮件内容</h4>
          <div class="preview-box" v-html="previewResult.emailContent"></div>
        </div>

        <div v-if="previewResult.smsContent" class="sms-preview">
          <h4>短信内容</h4>
          <div class="preview-box">{{ previewResult.smsContent }}</div>
        </div>
      </div>
      <el-empty v-else description="点击预览按钮查看渲染效果" />

      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handlePreview" :loading="previewing">预览</el-button>
        <el-button type="success" @click="handleSendTest" :loading="sending">发送测试</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';
import request from '@/api/request';

// 数据
const loading = ref(false);
const templates = ref<any[]>([]);
const filterCategory = ref('');
const searchKeyword = ref('');

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const formData = ref<any>({
  templateCode: '',
  templateName: '',
  templateType: 'both',
  category: 'tenant',
  scene: '',
  emailSubject: '',
  emailContent: '',
  smsContent: '',
  variables: {},
  variableDescription: '',
  isEnabled: 1,
  isSystem: 0,
  priority: 'normal',
  sendEmail: 1,
  sendSms: 0
});

const formRules = {
  templateCode: [{ required: true, message: '请输入模板代码', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  templateType: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择业务分类', trigger: 'change' }],
  scene: [{ required: true, message: '请输入使用场景', trigger: 'blur' }]
};

// 测试对话框
const testDialogVisible = ref(false);
const currentTemplate = ref<any>({});
const testData = ref<any>({});
const previewResult = ref<any>({});
const previewing = ref(false);
const sending = ref(false);

// 计算属性
const filteredTemplates = computed(() => {
  let result = templates.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(t =>
      t.templateCode.toLowerCase().includes(keyword) ||
      t.templateName.toLowerCase().includes(keyword)
    );
  }

  return result;
});

// 方法
const getCategoryName = (category: string) => {
  const map: any = {
    tenant: '租户注册',
    payment: '支付相关',
    license: '授权码'
  };
  return map[category] || category;
};

const loadTemplates = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterCategory.value) {
      params.category = filterCategory.value;
    }

    const res = await request.get('/notification-templates', { params });
    if (res.success) {
      templates.value = res.data;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  // 搜索由计算属性自动处理
};

const handleCreate = () => {
  isEdit.value = false;
  formData.value = {
    templateCode: '',
    templateName: '',
    templateType: 'both',
    category: 'tenant',
    scene: '',
    emailSubject: '',
    emailContent: '',
    smsContent: '',
    variables: {},
    variableDescription: '',
    isEnabled: 1,
    isSystem: 0,
    priority: 'normal',
    sendEmail: 1,
    sendSms: 0
  };
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = async () => {
  try {
    await formRef.value.validate();

    saving.value = true;

    if (isEdit.value) {
      await request.put(`/notification-templates/${formData.value.templateCode}`, formData.value);
      ElMessage.success('更新成功');
    } else {
      await request.post('/notification-templates', formData.value);
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    loadTemplates();
  } catch (error: any) {
    if (error.response) {
      ElMessage.error(error.response.data?.message || '保存失败');
    }
  } finally {
    saving.value = false;
  }
};

const handleToggleStatus = async (row: any) => {
  try {
    await request.put(`/notification-templates/${row.templateCode}`, {
      isEnabled: row.isEnabled
    });
    ElMessage.success('状态更新成功');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '更新失败');
    row.isEnabled = row.isEnabled === 1 ? 0 : 1;
  }
};

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模板吗？', '提示', {
      type: 'warning'
    });

    await request.delete(`/notification-templates/${row.templateCode}`);
    ElMessage.success('删除成功');
    loadTemplates();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
};

const handleTest = (row: any) => {
  currentTemplate.value = row;
  testData.value = {};
  previewResult.value = {};
  testDialogVisible.value = true;
};

const handlePreview = async () => {
  previewing.value = true;
  try {
    const res = await request.post(
      `/notification-templates/${currentTemplate.value.templateCode}/test`,
      { variables: testData.value }
    );

    if (res.success) {
      previewResult.value = res.data;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '预览失败');
  } finally {
    previewing.value = false;
  }
};

const handleSendTest = async () => {
  try {
    await ElMessageBox.confirm('确定要发送测试通知吗？', '提示', {
      type: 'info'
    });

    sending.value = true;

    const res = await request.post(
      `/notification-templates/${currentTemplate.value.templateCode}/send`,
      {
        variables: testData.value,
        options: { priority: 'normal' }
      }
    );

    if (res.success) {
      ElMessage.success('发送成功');
    } else {
      ElMessage.warning(res.message);
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '发送失败');
    }
  } finally {
    sending.value = false;
  }
};

// 生命周期
onMounted(() => {
  loadTemplates();
});
</script>

<style scoped lang="scss">
.notification-templates {
  .toolbar {
    margin-bottom: 20px;
  }

  .variables-display {
    display: flex;
    flex-wrap: wrap;
  }

  .preview-result {
    margin-top: 20px;

    h4 {
      margin: 15px 0 10px 0;
      color: #409eff;
    }

    .preview-box {
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      padding: 15px;
      background: #f5f7fa;
      min-height: 50px;
    }

    .email-preview {
      margin-bottom: 20px;
    }
  }
}
</style>
