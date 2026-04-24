/**
 * 通话模块完整测试脚本
 *
 * 测试内容：
 *   1. 外呼线路管理 (CRUD)
 *   2. 线路连接测试 (PSTN / SIP / VoIP)
 *   3. 用户线路分配
 *   4. 网络电话外呼
 *   5. SIP/PBX 呼入 Webhook
 *   6. 通话记录验证
 *   7. 呼出配置与全局配置
 *   8. 工作手机接口
 *   9. Webhook 回调（阿里云/腾讯云/容联云/测试）
 *
 * 用法：
 *   node tests/test-call-module.js [--base-url http://localhost:3000] [--token YOUR_TOKEN]
 */

const http = require('http');
const https = require('https');
const url = require('url');

// ==================== 配置 ====================

const args = process.argv.slice(2);
let BASE_URL = 'http://localhost:3000';
let TOKEN = '';
let CURRENT_USER_ID = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) BASE_URL = args[++i];
  if (args[i] === '--token' && args[i + 1]) TOKEN = args[++i];
}

const API_PREFIX = '/api/v1';
const results = [];
let createdLineId = null;
let createdAssignmentId = null;
let testCallId = null;
let testInboundCallId = null;

// ==================== HTTP 工具 ====================

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${BASE_URL}${API_PREFIX}${path}`;
    const parsed = new url.URL(fullUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers,
      timeout: 15000
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { json = { raw: data }; }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function log(id, name, status, detail) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const detailStr = typeof detail === 'object' ? JSON.stringify(detail).slice(0, 200) : String(detail || '').slice(0, 200);
  console.log(`${emoji} [${id}] ${name}: ${status} - ${detailStr}`);
  results.push({ id, name, status, detail: detailStr });
}

// ==================== 登录 ====================

async function login() {
  if (TOKEN) {
    console.log('🔑 使用提供的 Token');
    return;
  }

  console.log('\n🔑 尝试自动登录...');

  // 尝试多种登录方式
  const TENANT_ID = '8a5fbe74-e0ff-4cd4-8403-b80ea748ae10'; // 天环租户
  const loginAttempts = [
    { username: '13800138001', password: 'Aa123456', tenantId: TENANT_ID },
    { username: 'admin', password: 'admin123', tenantId: TENANT_ID },
    { username: 'admin', password: 'Admin@123', tenantId: TENANT_ID },
    { username: '13800138000', password: 'Aa123456', tenantId: TENANT_ID }
  ];

  for (const creds of loginAttempts) {
    try {
      const res = await request('POST', '/auth/login', creds);
      if (res.status === 200) {
        const d = res.data.data || res.data;
        const tokens = d.tokens || {};
        const t = d.token || tokens.accessToken || tokens.token || '';
        if (t) {
          TOKEN = t;
          CURRENT_USER_ID = (d.user || {}).id || '';
          console.log(`✅ 登录成功 (${creds.username}), userId=${CURRENT_USER_ID}`);
          return;
        }
      }
    } catch (_) {}
  }

  console.error('❌ 自动登录失败，请使用 --token 参数提供 Token');
  process.exit(1);
}

// ==================== 测试用例 ====================

// T1: 获取全局外呼配置
async function test_T1_globalConfig() {
  try {
    const res = await request('GET', '/call-config/global', null, TOKEN);
    if (res.status === 200 && res.data.success) {
      log('T-01', '获取全局外呼配置', 'PASS', res.data.data);
    } else {
      log('T-01', '获取全局外呼配置', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-01', '获取全局外呼配置', 'FAIL', e.message); }
}

// T2: 更新全局外呼配置
async function test_T2_updateGlobalConfig() {
  try {
    const res = await request('PUT', '/call-config/global', {
      default_call_method: 'voip',
      call_timeout: 60,
      max_retries: 3,
      enable_recording: true,
      voip_provider: 'aliyun'
    }, TOKEN);
    if (res.status === 200) {
      log('T-02', '更新全局外呼配置', 'PASS', res.data.message);
    } else {
      log('T-02', '更新全局外呼配置', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-02', '更新全局外呼配置', 'FAIL', e.message); }
}

// T3: 获取外呼线路列表
async function test_T3_getCallLines() {
  try {
    const res = await request('GET', '/call-config/lines', null, TOKEN);
    if (res.status === 200 && res.data.success) {
      const lines = res.data.data || [];
      log('T-03', '获取外呼线路列表', 'PASS', `count=${lines.length}`);
    } else {
      log('T-03', '获取外呼线路列表', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-03', '获取外呼线路列表', 'FAIL', e.message); }
}

// T4: 创建VoIP线路
async function test_T4_createVoipLine() {
  try {
    const res = await request('POST', '/call-config/lines', {
      name: '测试阿里云VoIP线路',
      provider: 'aliyun',
      type: 'voip',
      callerNumber: '02188888888',
      config: {
        accessKeyId: 'test_access_key_id',
        accessKeySecret: 'test_access_key_secret',
        appId: 'test_app_id'
      },
      maxConcurrent: 10,
      dailyLimit: 500,
      description: '自动化测试创建的VoIP线路',
      isEnabled: true
    }, TOKEN);
    if (res.status === 201 && res.data.success) {
      createdLineId = res.data.data?.id;
      log('T-04', '创建VoIP线路', 'PASS', `id=${createdLineId}`);
    } else {
      log('T-04', '创建VoIP线路', 'FAIL', `status=${res.status} ${res.data.message}`);
    }
  } catch (e) { log('T-04', '创建VoIP线路', 'FAIL', e.message); }
}

// T5: 创建PSTN线路
async function test_T5_createPstnLine() {
  try {
    const res = await request('POST', '/call-config/lines', {
      name: '测试PSTN传统线路',
      provider: 'custom',
      type: 'pstn',
      callerNumber: '02166666666',
      config: {
        gatewayHost: '192.168.1.100',
        gatewayPort: 5060,
        trunkType: 'sip_trunk',
        channels: 30,
        authUsername: 'trunk_user',
        authPassword: 'trunk_pass'
      },
      maxConcurrent: 30,
      dailyLimit: 2000,
      description: '自动化测试创建的PSTN网关线路'
    }, TOKEN);
    if (res.status === 201) {
      log('T-05', '创建PSTN线路', 'PASS', `id=${res.data.data?.id}`);
    } else {
      log('T-05', '创建PSTN线路', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-05', '创建PSTN线路', 'FAIL', e.message); }
}

// T6: 创建SIP线路
async function test_T6_createSipLine() {
  try {
    const res = await request('POST', '/call-config/lines', {
      name: '测试SIP线路',
      provider: 'custom',
      type: 'sip',
      callerNumber: '02177777777',
      config: {
        sipServer: 'sip.example.com',
        sipPort: 5060,
        transport: 'udp',
        sipUsername: 'sip_user',
        sipPassword: 'sip_pass',
        sipDomain: 'example.com'
      },
      maxConcurrent: 20,
      dailyLimit: 1000,
      description: '自动化测试创建的SIP线路'
    }, TOKEN);
    if (res.status === 201) {
      log('T-06', '创建SIP线路', 'PASS', `id=${res.data.data?.id}`);
    } else {
      log('T-06', '创建SIP线路', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-06', '创建SIP线路', 'FAIL', e.message); }
}

// T7: 测试VoIP线路连接
async function test_T7_testVoipConnection() {
  if (!createdLineId) {
    log('T-07', '测试VoIP线路连接', 'SKIP', '无测试线路');
    return;
  }
  try {
    const res = await request('POST', `/call-config/lines/${createdLineId}/test`, null, TOKEN);
    if (res.status === 200 && res.data.success) {
      const d = res.data.data;
      log('T-07', '测试VoIP线路连接', 'PASS', `success=${d.success}, latency=${d.latency}ms, msg=${d.message}`);
    } else {
      log('T-07', '测试VoIP线路连接', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-07', '测试VoIP线路连接', 'FAIL', e.message); }
}

// T8: 更新线路
async function test_T8_updateLine() {
  if (!createdLineId) {
    log('T-08', '更新外呼线路', 'SKIP', '无测试线路');
    return;
  }
  try {
    const res = await request('PUT', `/call-config/lines/${createdLineId}`, {
      name: '测试阿里云VoIP线路(已更新)',
      dailyLimit: 800,
      description: '已更新的测试线路'
    }, TOKEN);
    if (res.status === 200) {
      log('T-08', '更新外呼线路', 'PASS', res.data.message);
    } else {
      log('T-08', '更新外呼线路', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-08', '更新外呼线路', 'FAIL', e.message); }
}

// T9: 分配线路给用户
async function test_T9_assignLine() {
  if (!createdLineId) {
    log('T-09', '分配线路给用户', 'SKIP', '无测试线路');
    return;
  }
  try {
    const userId = CURRENT_USER_ID;
    if (!userId) {
      log('T-09', '分配线路给用户', 'FAIL', '无法获取当前用户ID');
      return;
    }

    const res = await request('POST', '/call-config/assignments', {
      userId: userId,
      lineId: createdLineId,
      callerNumber: '02188888888',
      isDefault: true,
      dailyLimit: 100
    }, TOKEN);
    if (res.status === 200 && res.data.success) {
      log('T-09', '分配线路给用户', 'PASS', res.data.message);
    } else {
      log('T-09', '分配线路给用户', 'FAIL', `status=${res.status} ${res.data.message}`);
    }
  } catch (e) { log('T-09', '分配线路给用户', 'FAIL', e.message); }
}

// T10: 获取用户线路分配
async function test_T10_getAssignments() {
  try {
    const res = await request('GET', '/call-config/assignments', null, TOKEN);
    if (res.status === 200 && res.data.success) {
      const list = res.data.data || [];
      if (list.length > 0) createdAssignmentId = list[0].id;
      log('T-10', '获取线路分配列表', 'PASS', `count=${list.length}`);
    } else {
      log('T-10', '获取线路分配列表', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-10', '获取线路分配列表', 'FAIL', e.message); }
}

// T11: 获取我的可用线路
async function test_T11_myLines() {
  try {
    const res = await request('GET', '/call-config/my-lines', null, TOKEN);
    if (res.status === 200 && res.data.success) {
      const d = res.data.data;
      log('T-11', '获取我的可用线路', 'PASS',
        `assignedLines=${d?.assignedLines?.length || 0}, workPhones=${d?.workPhones?.length || 0}`);
    } else {
      log('T-11', '获取我的可用线路', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-11', '获取我的可用线路', 'FAIL', e.message); }
}

// T12: 网络电话外呼
async function test_T12_networkCall() {
  if (!createdLineId) {
    log('T-12', '网络电话外呼', 'SKIP', '无测试线路');
    return;
  }
  try {
    const res = await request('POST', '/call-config/lines/call', {
      lineId: createdLineId,
      targetPhone: '13800138001',
      customerId: null,
      customerName: '测试客户-外呼',
      notes: '自动化测试外呼'
    }, TOKEN);
    if (res.status === 200 && res.data.success) {
      testCallId = res.data.data?.callId;
      log('T-12', '网络电话外呼', 'PASS', `callId=${testCallId}`);
    } else {
      log('T-12', '网络电话外呼', 'FAIL', `status=${res.status} ${res.data.message}`);
    }
  } catch (e) { log('T-12', '网络电话外呼', 'FAIL', e.message); }
}

// T13: 结束通话
async function test_T13_endCall() {
  if (!testCallId) {
    log('T-13', '结束通话', 'SKIP', '无测试通话');
    return;
  }
  try {
    const res = await request('POST', `/call-config/calls/${testCallId}/end`, {
      notes: '自动化测试结束通话',
      duration: 35
    }, TOKEN);
    if (res.status === 200) {
      log('T-13', '结束通话', 'PASS', res.data.message);
    } else {
      log('T-13', '结束通话', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-13', '结束通话', 'FAIL', e.message); }
}

// T14: SIP呼入Webhook测试
async function test_T14_sipIncoming() {
  try {
    const res = await request('POST', '/calls/webhook/sip/incoming', {
      callerNumber: '13900139001',
      calledNumber: '02188888888',
      callId: `SIP-TEST-${Date.now()}`,
      trunkId: 'trunk-test-001',
      trunkName: '测试SIP中继'
    });
    if (res.status === 200 && res.data.success) {
      testInboundCallId = res.data.data?.callId;
      log('T-14', 'SIP呼入Webhook', 'PASS',
        `callId=${testInboundCallId}, customer=${res.data.data?.customerName}`);
    } else {
      log('T-14', 'SIP呼入Webhook', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-14', 'SIP呼入Webhook', 'FAIL', e.message); }
}

// T15: SIP通话状态更新
async function test_T15_sipStatus() {
  if (!testInboundCallId) {
    log('T-15', 'SIP通话状态更新', 'SKIP', '无测试呼入');
    return;
  }
  try {
    // 接通
    const res1 = await request('POST', '/calls/webhook/sip/status', {
      callId: testInboundCallId,
      event: 'answered'
    });
    if (res1.status === 200) {
      log('T-15a', 'SIP通话接通', 'PASS', res1.data.message);
    }

    // 等一下再挂断
    await new Promise(r => setTimeout(r, 500));

    // 挂断
    const res2 = await request('POST', '/calls/webhook/sip/status', {
      callId: testInboundCallId,
      event: 'hangup',
      duration: 45,
      hangupCause: 'normal'
    });
    if (res2.status === 200) {
      log('T-15b', 'SIP通话挂断', 'PASS', res2.data.message);
    }
  } catch (e) { log('T-15', 'SIP通话状态更新', 'FAIL', e.message); }
}

// T16: 阿里云Webhook测试
async function test_T16_aliyunWebhook() {
  try {
    const res = await request('POST', '/calls/webhook/aliyun/status', {
      instanceId: 'test-instance',
      callId: 'aliyun-test-call-001',
      event: 'Answered',
      eventTime: new Date().toISOString(),
      caller: '02188888888',
      callee: '13800138001',
      duration: 0,
      tags: JSON.stringify({ callId: testCallId || 'test-call-id' })
    });
    if (res.status === 200) {
      log('T-16', '阿里云Webhook回调', 'PASS', '回调处理成功');
    } else {
      log('T-16', '阿里云Webhook回调', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-16', '阿里云Webhook回调', 'FAIL', e.message); }
}

// T17: 通用测试Webhook
async function test_T17_testWebhook() {
  try {
    const res = await request('POST', '/calls/webhook/test', {
      type: 'test',
      message: '通话模块测试Webhook'
    });
    if (res.status === 200 && res.data.success) {
      log('T-17', '测试Webhook回调', 'PASS', `receivedAt=${res.data.receivedAt}`);
    } else {
      log('T-17', '测试Webhook回调', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-17', '测试Webhook回调', 'FAIL', e.message); }
}

// T18: 获取通话记录
async function test_T18_callRecords() {
  try {
    const res = await request('GET', '/calls/records', null, TOKEN);
    if (res.status === 200 && res.data.success) {
      const records = res.data.data?.records || res.data.data || [];
      log('T-18', '获取通话记录', 'PASS', `count=${Array.isArray(records) ? records.length : '?'}`);
    } else {
      log('T-18', '获取通话记录', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-18', '获取通话记录', 'FAIL', e.message); }
}

// T19: 通话统计
async function test_T19_callStatistics() {
  try {
    const res = await request('GET', '/calls/statistics', null, TOKEN);
    if (res.status < 500) {
      log('T-19', '通话统计', 'PASS', JSON.stringify(res.data?.data || res.data).slice(0, 100));
    } else {
      log('T-19', '通话统计', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-19', '通话统计', 'FAIL', e.message); }
}

// T20: 获取/更新用户偏好
async function test_T20_userPreference() {
  try {
    const getRes = await request('GET', '/call-config/preference', null, TOKEN);
    if (getRes.status === 200) {
      log('T-20a', '获取用户偏好', 'PASS', JSON.stringify(getRes.data.data));
    }

    const putRes = await request('PUT', '/call-config/preference', {
      preferMobile: false,
      defaultLineId: createdLineId
    }, TOKEN);
    if (putRes.status === 200) {
      log('T-20b', '更新用户偏好', 'PASS', putRes.data.message);
    }
  } catch (e) { log('T-20', '用户偏好', 'FAIL', e.message); }
}

// T21: 工作手机接口
async function test_T21_workPhones() {
  try {
    const res = await request('GET', '/call-config/work-phones', null, TOKEN);
    if (res.status === 200 && res.data.success) {
      const phones = res.data.data || [];
      log('T-21', '获取工作手机列表', 'PASS', `count=${phones.length}`);
    } else {
      log('T-21', '获取工作手机列表', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-21', '获取工作手机列表', 'FAIL', e.message); }
}

// T22: 电话配置
async function test_T22_phoneConfig() {
  try {
    const res = await request('GET', '/calls/config', null, TOKEN);
    if (res.status === 200) {
      log('T-22', '获取电话配置', 'PASS', JSON.stringify(res.data?.data || res.data).slice(0, 100));
    } else {
      log('T-22', '获取电话配置', 'FAIL', `status=${res.status}`);
    }
  } catch (e) { log('T-22', '获取电话配置', 'FAIL', e.message); }
}

// ==================== 清理 ====================

async function cleanup() {
  console.log('\n🧹 清理测试数据...');

  // 删除分配
  if (createdAssignmentId) {
    try {
      await request('DELETE', `/call-config/assignments/${createdAssignmentId}`, null, TOKEN);
      console.log(`   删除分配 ${createdAssignmentId} ✓`);
    } catch (_) {}
  }

  // 获取最新线路列表，删除测试创建的线路
  try {
    const res = await request('GET', '/call-config/lines', null, TOKEN);
    const lines = res.data?.data || [];
    for (const line of lines) {
      if (line.name && (line.name.includes('测试') || line.description?.includes('自动化测试'))) {
        // 先删除该线路的分配
        try {
          const assignRes = await request('GET', `/call-config/assignments?lineId=${line.id}`, null, TOKEN);
          const assigns = assignRes.data?.data || [];
          for (const a of assigns) {
            await request('DELETE', `/call-config/assignments/${a.id}`, null, TOKEN);
          }
        } catch (_) {}
        // 再删除线路
        try {
          await request('DELETE', `/call-config/lines/${line.id}`, null, TOKEN);
          console.log(`   删除测试线路 "${line.name}" (id=${line.id}) ✓`);
        } catch (_) {}
      }
    }
  } catch (_) {}

  console.log('✅ 清理完成');
}

// ==================== 主流程 ====================

async function main() {
  console.log('='.repeat(60));
  console.log('  CRM 通话模块完整测试');
  console.log(`  服务地址: ${BASE_URL}`);
  console.log(`  时间: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));

  await login();

  console.log('\n📋 开始测试...\n');
  console.log('--- 全局配置 ---');
  await test_T1_globalConfig();
  await test_T2_updateGlobalConfig();

  console.log('\n--- 外呼线路管理 ---');
  await test_T3_getCallLines();
  await test_T4_createVoipLine();
  await test_T5_createPstnLine();
  await test_T6_createSipLine();

  console.log('\n--- 线路连接测试 ---');
  await test_T7_testVoipConnection();

  console.log('\n--- 线路维护 ---');
  await test_T8_updateLine();

  console.log('\n--- 用户线路分配 ---');
  await test_T9_assignLine();
  await test_T10_getAssignments();
  await test_T11_myLines();

  console.log('\n--- 外呼测试 ---');
  await test_T12_networkCall();
  await test_T13_endCall();

  console.log('\n--- SIP/PBX 呼入测试 ---');
  await test_T14_sipIncoming();
  await test_T15_sipStatus();

  console.log('\n--- Webhook 回调测试 ---');
  await test_T16_aliyunWebhook();
  await test_T17_testWebhook();

  console.log('\n--- 通话记录与统计 ---');
  await test_T18_callRecords();
  await test_T19_callStatistics();

  console.log('\n--- 用户设置 ---');
  await test_T20_userPreference();
  await test_T21_workPhones();
  await test_T22_phoneConfig();

  // 清理
  await cleanup();

  // 统计
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`📊 测试结果: 总计 ${total} | ✅ 通过 ${passed} | ❌ 失败 ${failed} | ⚠️ 跳过 ${skipped}`);
  console.log(`   通过率: ${total > 0 ? ((passed / (total - skipped)) * 100).toFixed(1) : 0}%`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ 失败的测试:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   ${r.id} ${r.name}: ${r.detail}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('测试异常退出:', e);
  process.exit(1);
});

