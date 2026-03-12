const fs=require('fs');
const p='d:/kaifa/CRM - 1.8.0/admin/src/views/modules/Distribute.vue';
fs.writeFileSync(p,'','utf8');
const w=(s)=>fs.appendFileSync(p,s+'\n','utf8');
const wr=(s)=>fs.appendFileSync(p,s,'utf8');

// Helper: generate a collapse module section
function writeModule(name,icon,label,desc,fields) {
  w('        <el-collapse-item name="'+name+'">');
  w('          <template #title>');
  w('            <div class="module-header">');
  w('              <div class="module-info">');
  w('                <el-icon class="module-icon"><'+icon+' /></el-icon>');
  w('                <div class="module-text">');
  w('                  <span class="module-name">'+label+'</span>');
  w('                  <span class="module-desc">'+desc+'</span>');
  w('                </div>');
  w('              </div>');
  w('              <el-switch :model-value="distributedConfig.'+name+' !== null" @change="toggleDistribute(\''+name+'\', )" @click.stop />');
  w('            </div>');
  w('          </template>');
  w('          <div class="module-form-area">');
  w('            <el-alert type="success" :closable="false" style="margin-bottom:16px">');
  w('              <template #title>已开启下发，以下配置将统一应用到所有CRM客户端</template>');
  w('            </el-alert>');
  w('            <el-form :model="distributedConfig.'+name+'" label-width="140px" class="module-form">');
  for(const f of fields) {
    writeField(name, f);
  }
  w('            </el-form>');
  w('          </div>');
  w('        </el-collapse-item>');
}

function writeField(mod, f) {
  const bind = 'distributedConfig.'+mod+'.'+f.key;
  if(f.type==='input') {
    w('              <el-form-item label="'+f.label+'">');
    w('                <el-input v-model="'+bind+'" placeholder="'+(f.placeholder||('请输入'+f.label))+'"'+(f.password?' type="password" show-password':'')+' />');
    if(f.tip) w('                <div class="form-tip">'+f.tip+'</div>');
    w('              </el-form-item>');
  } else if(f.type==='number') {
    w('              <el-form-item label="'+f.label+'">');
    w('                <el-input-number v-model="'+bind+'" :min="'+(f.min||0)+'" :max="'+(f.max||99999)+'" />');
    if(f.tip) w('                <span class="form-tip">'+f.tip+'</span>');
    w('              </el-form-item>');
  } else if(f.type==='switch') {
    w('              <el-form-item label="'+f.label+'">');
    w('                <el-switch v-model="'+bind+'" />');
    if(f.tip) w('                <span class="form-tip">'+f.tip+'</span>');
    w('              </el-form-item>');
  } else if(f.type==='select') {
    w('              <el-form-item label="'+f.label+'">');
    w('                <el-select v-model="'+bind+'" placeholder="'+(f.placeholder||'请选择')+'" style="width:100%">');
    for(const o of f.options) {
      w('                  <el-option label="'+o.label+'" value="'+o.value+'" />');
    }
    w('                </el-select>');
    if(f.tip) w('                <div class="form-tip">'+f.tip+'</div>');
    w('              </el-form-item>');
  } else if(f.type==='textarea') {
    w('              <el-form-item label="'+f.label+'">');
    w('                <el-input v-model="'+bind+'" type="textarea" :rows="3" placeholder="'+(f.placeholder||('请输入'+f.label))+'" />');
    if(f.tip) w('                <div class="form-tip">'+f.tip+'</div>');
    w('              </el-form-item>');
  } else if(f.type==='divider') {
    w('              <el-divider content-position="left">'+f.label+'</el-divider>');
  }
}

// ===== Write Template =====
w('<template>');
w('  <div class="page-container">');
w('    <el-card class="config-card" shadow="never">');
w('      <template #header>');
w('        <div class="card-header">');
w('          <div class="header-left">');
w('            <span class="title">配置下发管理</span>');
w('            <span class="subtitle">统一管控CRM客户端配置，开启后客户端将无法自行修改</span>');
w('          </div>');
w('          <el-button type="primary" @click="handleSave" :loading="saving">');
w('            <el-icon><Check /></el-icon>保存配置');
w('          </el-button>');
w('        </div>');
w('      </template>');
w('');
w('      <el-alert type="info" :closable="false" class="tip-alert">');
w('        <template #title>开启配置下发后，对应配置将统一应用到所有CRM客户端。未开启的配置由各租户自行管理。</template>');
w('      </el-alert>');
w('');
w('      <el-collapse v-model="activeModules" class="distribute-collapse">');

// ===== Module: security =====
writeModule('security', 'Lock', '安全策略', '密码策略、登录安全等配置统一下发', [
  {key:'passwordMinLength',type:'number',label:'密码最小长度',min:6,max:20,tip:'位（6-20）'},
  {key:'passwordExpireDays',type:'number',label:'密码有效期',min:0,max:365,tip:'天（0表示永不过期）'},
  {key:'loginFailLock',type:'switch',label:'登录失败锁定',tip:'启用后连续失败将锁定账户'},
  {key:'maxLoginFails',type:'number',label:'最大失败次数',min:3,max:10,tip:'次'},
  {key:'lockDuration',type:'number',label:'锁定时间',min:5,max:1440,tip:'分钟'},
  {key:'sessionTimeout',type:'number',label:'会话超时时间',min:30,max:1440,tip:'分钟'},
  {key:'forceHttps',type:'switch',label:'强制HTTPS',tip:'启用后强制使用HTTPS访问'},
  {key:'ipWhitelist',type:'textarea',label:'IP白名单',placeholder:'多个IP用换行分隔，留空不限制',tip:'留空表示不限制IP访问'},
]);

// ===== Module: storage =====
writeModule('storage', 'FolderOpened', '存储设置', '文件存储、OSS等配置统一下发', [
  {key:'storageType',type:'select',label:'存储类型',options:[{label:'本地存储',value:'local'},{label:'阿里云OSS',value:'oss'}]},
  {key:'accessKey',type:'input',label:'Access Key',placeholder:'请输入Access Key'},
  {key:'secretKey',type:'input',label:'Secret Key',password:true,placeholder:'请输入Secret Key'},
  {key:'bucketName',type:'input',label:'存储桶名称',placeholder:'请输入Bucket名称'},
  {key:'region',type:'select',label:'存储区域',options:[{label:'华东1（杭州）',value:'oss-cn-hangzhou'},{label:'华东2（上海）',value:'oss-cn-shanghai'},{label:'华北2（北京）',value:'oss-cn-beijing'},{label:'华南1（深圳）',value:'oss-cn-shenzhen'},{label:'中国（香港）',value:'oss-cn-hongkong'}]},
  {key:'customDomain',type:'input',label:'自定义域名',placeholder:'请输入自定义域名（可选）'},
  {key:'maxFileSize',type:'number',label:'最大文件大小',min:1,max:100,tip:'MB'},
  {key:'allowedTypes',type:'input',label:'允许文件类型',placeholder:'如：jpg,png,gif,pdf,doc',tip:'用逗号分隔'},
]);

// ===== Module: product =====
writeModule('product', 'Goods', '商品策略', '优惠折扣、价格管理、库存等配置统一下发', [
  {key:'maxDiscountPercent',type:'number',label:'全局最大优惠比例',min:0,max:100,tip:'%'},
  {key:'adminMaxDiscount',type:'number',label:'管理员最大优惠',min:0,max:100,tip:'%'},
  {key:'managerMaxDiscount',type:'number',label:'经理最大优惠',min:0,max:100,tip:'%'},
  {key:'salesMaxDiscount',type:'number',label:'销售员最大优惠',min:0,max:100,tip:'%'},
  {key:'discountApprovalThreshold',type:'number',label:'优惠审批阈值',min:0,max:100,tip:'%（超过此比例需审批）'},
  {type:'divider',label:'价格管理'},
  {key:'allowPriceModification',type:'switch',label:'允许价格修改',tip:'是否允许在订单中修改商品价格'},
  {key:'enablePriceHistory',type:'switch',label:'价格变动记录',tip:'记录商品价格变动历史'},
  {type:'divider',label:'库存管理'},
  {key:'enableInventory',type:'switch',label:'启用库存管理',tip:'是否启用商品库存管理功能'},
  {key:'lowStockThreshold',type:'number',label:'低库存预警阈值',min:0,max:1000,tip:'件'},
  {key:'allowNegativeStock',type:'switch',label:'允许负库存销售',tip:'库存不足时是否允许继续销售'},
]);

// ===== Module: call =====
writeModule('call', 'Phone', '通话设置', 'SIP服务器、通话录音等配置统一下发', [
  {key:'sipServer',type:'input',label:'SIP服务器地址',placeholder:'请输入SIP服务器地址'},
  {key:'sipPort',type:'number',label:'SIP端口',min:1,max:65535,tip:'默认5060'},
  {key:'sipUsername',type:'input',label:'SIP用户名',placeholder:'请输入SIP用户名'},
  {key:'sipPassword',type:'input',label:'SIP密码',password:true,placeholder:'请输入SIP密码'},
  {key:'sipTransport',type:'select',label:'传输协议',options:[{label:'UDP',value:'UDP'},{label:'TCP',value:'TCP'},{label:'TLS',value:'TLS'}]},
  {type:'divider',label:'通话功能'},
  {key:'autoAnswer',type:'switch',label:'自动接听',tip:'启用后将自动接听来电'},
  {key:'autoRecord',type:'switch',label:'自动录音',tip:'启用后将自动录制通话'},
  {key:'maxCallDuration',type:'number',label:'最大通话时长',min:0,max:7200,tip:'秒（0表示不限制）'},
  {type:'divider',label:'录音配置'},
  {key:'recordFormat',type:'select',label:'录音格式',options:[{label:'WAV',value:'wav'},{label:'MP3',value:'mp3'},{label:'AAC',value:'aac'}]},
  {key:'recordRetentionDays',type:'number',label:'录音保留时间',min:1,max:365,tip:'天'},
]);

// ===== Module: order =====
writeModule('order', 'Document', '订单设置', '订单流程、审批规则等配置统一下发', [
  {key:'autoOrderNumber',type:'switch',label:'自动生成订单号',tip:'启用后自动生成唯一订单编号'},
  {key:'orderPrefix',type:'input',label:'订单号前缀',placeholder:'如：OR、DD',tip:'订单编号的前缀字母'},
  {key:'requireApproval',type:'switch',label:'订单审批',tip:'启用后订单需要经过审批流程'},
  {key:'approvalThreshold',type:'number',label:'审批金额阈值',min:0,max:999999,tip:'元（超过此金额需审批）'},
  {type:'divider',label:'订单生命周期'},
  {key:'autoCancelDays',type:'number',label:'自动取消天数',min:0,max:30,tip:'天（未付款订单自动取消）0不自动取消'},
  {key:'autoCompleteDays',type:'number',label:'自动完成天数',min:0,max:30,tip:'天（发货后自动确认收货）'},
  {key:'allowCancel',type:'switch',label:'允许取消订单',tip:'是否允许客户取消订单'},
]);

// ===== Module: email =====
writeModule('email', 'Message', '邮件设置', 'SMTP服务器、发件配置等统一下发', [
  {key:'smtpHost',type:'input',label:'SMTP服务器',placeholder:'请输入SMTP服务器地址'},
  {key:'smtpPort',type:'number',label:'SMTP端口',min:1,max:65535,tip:'常用端口：25/465/587'},
  {key:'senderEmail',type:'input',label:'发件人邮箱',placeholder:'请输入发件人邮箱'},
  {key:'senderName',type:'input',label:'发件人名称',placeholder:'请输入发件人名称'},
  {key:'emailPassword',type:'input',label:'邮箱密码',password:true,placeholder:'请输入邮箱密码或授权码'},
  {key:'enableSsl',type:'switch',label:'启用SSL',tip:'启用SSL加密连接'},
  {key:'enableTls',type:'switch',label:'启用TLS',tip:'启用TLS加密连接'},
]);

// ===== Module: sms =====
writeModule('sms', 'ChatDotRound', '短信设置', '短信服务商、签名、模板等配置统一下发', [
  {key:'provider',type:'select',label:'短信服务商',options:[{label:'阿里云短信',value:'aliyun'},{label:'腾讯云短信',value:'tencent'},{label:'华为云短信',value:'huawei'}]},
  {key:'accessKey',type:'input',label:'AccessKey',placeholder:'请输入AccessKey'},
  {key:'secretKey',type:'input',label:'SecretKey',password:true,placeholder:'请输入SecretKey'},
  {key:'signName',type:'input',label:'短信签名',placeholder:'请输入短信签名',tip:'需在服务商平台申请并审核通过'},
  {key:'dailyLimit',type:'number',label:'每日发送限制',min:1,max:10000,tip:'条/用户'},
  {key:'enabled',type:'switch',label:'启用短信功能',tip:'是否启用短信发送功能'},
]);

// Close template
w('      </el-collapse>');
w('');
w('      <div class="save-area">');
w('        <el-button type="primary" size="large" round @click="handleSave" :loading="saving">');
w('          <el-icon><Check /></el-icon>保存配置下发设置');
w('        </el-button>');
w('      </div>');
w('    </el-card>');
w('  </div>');
w('</template>');

// ===== SCRIPT SECTION =====
b();
a('<script setup lang="ts">');
a('import { ref, reactive, onMounted } from \'vue\'');
a('import { ElMessage } from \'element-plus\'');
a('import { Check, Lock, FolderOpened, Goods, Phone, Document, Message, ChatDotRound } from \'@element-plus/icons-vue\'');
a('import request from \'@/api/request\'');
b();
a('const saving = ref(false)');
a('const activeModules = ref<string[]>([])');
b();
a('const distributedConfig = reactive<Record<string, any>>({');
a('  security: null,');
a('  storage: null,');
a('  product: null,');
a('  call: null,');
a('  order: null,');
a('  email: null,');
a('  sms: null,');
a('})');
b();
a('const defaultValues: Record<string, any> = {');
a('  security: { passwordMinLength: 8, passwordExpireDays: 0, loginFailLock: false, maxLoginFails: 5, lockDuration: 30, sessionTimeout: 120, forceHttps: false, ipWhitelist: \'\' },');
a('  storage: { storageType: \'local\', accessKey: \'\', secretKey: \'\', bucketName: \'\', region: \'\', customDomain: \'\', maxFileSize: 10, allowedTypes: \'jpg,png,gif,pdf,doc,docx\' },');
a('  product: { maxDiscountPercent: 50, adminMaxDiscount: 50, managerMaxDiscount: 30, salesMaxDiscount: 15, discountApprovalThreshold: 20, allowPriceModification: false, enablePriceHistory: true, enableInventory: true, lowStockThreshold: 10, allowNegativeStock: false },');
a('  call: { sipServer: \'\', sipPort: 5060, sipUsername: \'\', sipPassword: \'\', sipTransport: \'UDP\', autoAnswer: false, autoRecord: true, maxCallDuration: 3600, recordFormat: \'mp3\', recordRetentionDays: 90 },');
a('  order: { autoOrderNumber: true, orderPrefix: \'OR\', requireApproval: false, approvalThreshold: 10000, autoCancelDays: 7, autoCompleteDays: 15, allowCancel: true },');
a('  email: { smtpHost: \'\', smtpPort: 465, senderEmail: \'\', senderName: \'\', emailPassword: \'\', enableSsl: true, enableTls: false },');
a('  sms: { provider: \'aliyun\', accessKey: \'\', secretKey: \'\', signName: \'\', dailyLimit: 100, enabled: false },');
a('}');
b();
a('const toggleDistribute = (key: string, enabled: boolean) => {');
a('  if (enabled) {');
a('    distributedConfig[key] = { ...defaultValues[key] }');
a('    if (!activeModules.value.includes(key)) activeModules.value.push(key)');
a('  } else {');
a('    distributedConfig[key] = null');
a('    activeModules.value = activeModules.value.filter(m => m !== key)');
a('  }');
a('}');
b();
a('const loadConfig = async () => {');
a('  try {');
a('    const res = await request.get(\'/system-config\') as any');
a('    if (res.success && res.data) {');
a('      const dc = res.data.distributedConfig');
a('      if (dc && typeof dc === \'object\') {');
a('        const opened: string[] = []');
a('        Object.keys(distributedConfig).forEach(key => {');
a('          if (key in dc && dc[key] !== null) {');
a('            distributedConfig[key] = { ...defaultValues[key], ...dc[key] }');
a('            opened.push(key)');
a('          } else {');
a('            distributedConfig[key] = dc[key] !== undefined ? dc[key] : null');
a('          }');
a('        })');
a('        activeModules.value = opened');
a('      }');
a('    }');
a('  } catch (error) {');
a('    console.error(\'加载配置失败:\', error)');
a('  }');
a('}');
b();
a('const handleSave = async () => {');
a('  saving.value = true');
a('  try {');
a('    const current = await request.get(\'/system-config\') as any');
a('    const fullForm = current.success && current.data ? { ...current.data } : {}');
a('    fullForm.distributedConfig = { ...distributedConfig }');
a('    const res = await request.post(\'/system-config\', fullForm) as any');
a('    if (res.success) {');
a('      ElMessage.success(\'配置下发设置保存成功\')');
a('    } else {');
a('      ElMessage.error(res.message || \'保存失败\')');
a('    }');
a('  } catch (error: any) {');
a('    ElMessage.error(error.response?.data?.message || \'保存失败\')');
a('  } finally {');
a('    saving.value = false');
a('  }');
a('}');
b();
a('onMounted(() => {');
a('  loadConfig()');
a('})');
a('</scr'+'ipt>');

// ===== STYLE SECTION =====
b();
a('<style scoped lang="scss">');
a('.page-container { min-height: 100%; }');
a('.config-card {');
a('  border-radius: 12px; border: none;');
a('  :deep(.el-card__header) { border-bottom: 1px solid #f0f0f0; padding: 20px 24px; }');
a('}');
a('.card-header {');
a('  display: flex; justify-content: space-between; align-items: center;');
a('  .header-left { display: flex; flex-direction: column; }');
a('  .title { font-size: 18px; font-weight: 600; color: #303133; }');
a('  .subtitle { color: #909399; font-size: 13px; margin-top: 4px; }');
a('}');
a('.tip-alert { margin-bottom: 20px; }');
a('.distribute-collapse {');
a('  border: none;');
a('  :deep(.el-collapse-item__header) {');
a('    height: auto; padding: 16px 0; line-height: 1.4; border-bottom: 1px solid #f0f0f0;');
a('  }');
a('  :deep(.el-collapse-item__wrap) { border-bottom: none; }');
a('  :deep(.el-collapse-item__content) { padding-bottom: 0; }');
a('}');
a('.module-header {');
a('  display: flex; justify-content: space-between; align-items: center; width: 100%; padding-right: 12px;');
a('}');
a('.module-info {');
a('  display: flex; align-items: center; gap: 12px;');
a('}');
a('.module-icon {');
a('  font-size: 20px; color: #409eff; width: 40px; height: 40px;');
a('  display: flex; align-items: center; justify-content: center;');
a('  background: #ecf5ff; border-radius: 10px; flex-shrink: 0;');
a('}');
a('.module-text {');
a('  display: flex; flex-direction: column; gap: 2px;');
a('}');
a('.module-name { font-size: 15px; color: #303133; font-weight: 600; }');
a('.module-desc { font-size: 12px; color: #909399; }');
a('.module-form-area {');
a('  padding: 20px 0 24px;');
a('}');
a('.module-form {');
a('  max-width: 700px;');
a('}');
a('.form-tip { font-size: 12px; color: #909399; margin-left: 8px; }');
a('.save-area { margin-top: 24px; text-align: center; padding: 16px 0; }');
a('</style>');
a('');

// ===== WRITE FILE =====
const content = t.join(String.fromCharCode(10));
fs.writeFileSync(p, content, 'utf8');
console.log('Distribute.vue written, size:', content.length, 'lines:', t.length);
