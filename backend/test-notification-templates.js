/**
 * 通知模板功能测试
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// 测试用的管理员token(需要先登录获取)
let adminToken = '';

async function login() {
  console.log('\n=== 1. 管理员登录 ===');
  try {
    const res = await axios.post(`${API_BASE}/admin/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (res.data.success) {
      adminToken = res.data.data.token;
      console.log('✅ 登录成功');
      console.log('Token:', adminToken.substring(0, 20) + '...');
      return true;
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

async function getAllTemplates() {
  console.log('\n=== 2. 获取所有模板 ===');
  try {
    const res = await axios.get(`${API_BASE}/admin/notification-templates`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.data.success) {
      console.log(`✅ 获取成功，共 ${res.data.data.length} 个模板`);
      res.data.data.forEach(t => {
        console.log(`  - ${t.templateCode}: ${t.templateName} (${t.category})`);
      });
      return res.data.data;
    }
  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
    return [];
  }
}

async function getTemplatesByCategory(category) {
  console.log(`\n=== 3. 获取${category}分类模板 ===`);
  try {
    const res = await axios.get(`${API_BASE}/admin/notification-templates`, {
      params: { category },
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.data.success) {
      console.log(`✅ 获取成功，共 ${res.data.data.length} 个模板`);
      res.data.data.forEach(t => {
        console.log(`  - ${t.templateCode}: ${t.templateName}`);
      });
      return res.data.data;
    }
  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
    return [];
  }
}

async function getTemplate(code) {
  console.log(`\n=== 4. 获取模板详情: ${code} ===`);
  try {
    const res = await axios.get(`${API_BASE}/admin/notification-templates/${code}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.data.success) {
      const t = res.data.data;
      console.log('✅ 获取成功');
      console.log('  模板名称:', t.templateName);
      console.log('  模板类型:', t.templateType);
      console.log('  业务分类:', t.category);
      console.log('  使用场景:', t.scene);
      console.log('  邮件主题:', t.emailSubject);
      console.log('  可用变量:', Object.keys(t.variables || {}).join(', '));
      return t;
    }
  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
    return null;
  }
}

async function testTemplate(code) {
  console.log(`\n=== 5. 测试模板渲染: ${code} ===`);
  try {
    const variables = {
      systemName: '云客CRM',
      tenantName: '测试公司',
      adminUsername: 'admin',
      adminPassword: 'test123',
      packageName: '专业版',
      expireDate: '2027-03-06'
    };

    const res = await axios.post(
      `${API_BASE}/admin/notification-templates/${code}/test`,
      { variables },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (res.data.success) {
      console.log('✅ 渲染成功');
      if (res.data.data.emailSubject) {
        console.log('\n邮件主题:');
        console.log(res.data.data.emailSubject);
      }
      if (res.data.data.emailContent) {
        console.log('\n邮件内容(前200字):');
        console.log(res.data.data.emailContent.substring(0, 200) + '...');
      }
      if (res.data.data.smsContent) {
        console.log('\n短信内容:');
        console.log(res.data.data.smsContent);
      }
      return res.data.data;
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return null;
  }
}

async function updateTemplate(code) {
  console.log(`\n=== 6. 更新模板: ${code} ===`);
  try {
    const res = await axios.put(
      `${API_BASE}/admin/notification-templates/${code}`,
      {
        isEnabled: 1,
        priority: 'high'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (res.data.success) {
      console.log('✅ 更新成功');
      return true;
    }
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
    return false;
  }
}

async function createCustomTemplate() {
  console.log('\n=== 7. 创建自定义模板 ===');
  try {
    const template = {
      templateCode: 'test_custom_template',
      templateName: '测试自定义模板',
      templateType: 'email',
      category: 'tenant',
      scene: '测试场景',
      emailSubject: '测试邮件 - {{testVar}}',
      emailContent: '<p>这是测试邮件内容: {{testVar}}</p>',
      variables: { testVar: '测试变量' },
      variableDescription: '测试变量说明',
      isEnabled: 1,
      isSystem: 0,
      priority: 'normal',
      sendEmail: 1,
      sendSms: 0
    };

    const res = await axios.post(
      `${API_BASE}/admin/notification-templates`,
      template,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (res.data.success) {
      console.log('✅ 创建成功');
      return res.data.data;
    }
  } catch (error) {
    console.error('❌ 创建失败:', error.response?.data || error.message);
    return null;
  }
}

async function deleteCustomTemplate(code) {
  console.log(`\n=== 8. 删除自定义模板: ${code} ===`);
  try {
    const res = await axios.delete(
      `${API_BASE}/admin/notification-templates/${code}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (res.data.success) {
      console.log('✅ 删除成功');
      return true;
    }
  } catch (error) {
    console.error('❌ 删除失败:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('通知模板功能测试');
  console.log('========================================');

  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，测试终止');
    return;
  }

  // 2. 获取所有模板
  const allTemplates = await getAllTemplates();

  // 3. 按分类获取
  await getTemplatesByCategory('tenant');
  await getTemplatesByCategory('payment');

  // 4. 获取单个模板
  if (allTemplates.length > 0) {
    await getTemplate(allTemplates[0].templateCode);
  }

  // 5. 测试模板渲染
  await testTemplate('tenant_register_success');

  // 6. 更新模板
  if (allTemplates.length > 0) {
    await updateTemplate(allTemplates[0].templateCode);
  }

  // 7. 创建自定义模板
  const customTemplate = await createCustomTemplate();

  // 8. 删除自定义模板
  if (customTemplate) {
    await deleteCustomTemplate(customTemplate.templateCode);
  }

  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试出错:', error);
  process.exit(1);
});
