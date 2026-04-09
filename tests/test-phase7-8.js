/**
 * 第7阶段(售后与物流) + 第8阶段(通讯与消息) 测试脚本
 * 使用方法: cd backend && node ../tests/test-phase7-8.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
const API_PREFIX = '/api/v1';
const results = [];

const TIANHUAN_TENANT_ID = '8a5fbe74-e0ff-4cd4-8403-b80ea748ae10';

let crmToken = '';
let currentUserId = '';
let otherUserId = '';
let orderId = '';
let customerId = '';
let serviceId = '';

function request(method, urlPath, body, token) {
  return new Promise(function(resolve, reject) {
    var fullPath = urlPath.startsWith('/api/') || urlPath.startsWith('/health') ? urlPath : API_PREFIX + urlPath;
    var url = new URL(API_BASE + fullPath);
    var options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    var req = http.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', function(e) { reject(e); });
    req.on('timeout', function() { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function log(id, name, status, detail) {
  var entry = {
    id: id,
    name: name,
    status: status,
    detail: String(detail).substring(0, 300),
    time: new Date().toISOString()
  };
  results.push(entry);
  var icon = status === 'PASS' ? '[OK]' : status === 'FAIL' ? '[XX]' : '[--]';
  console.log(icon + ' ' + id + ' ' + name + ': ' + String(detail).substring(0, 120));
}

function isOk(res) {
  return (res.status >= 200 && res.status < 300) && (res.data.success !== false);
}

async function prepare() {
  console.log('[PREP] CRM login...');
  var res = await request('POST', '/auth/login', {
    username: '13800138001',
    password: 'Aa123456',
    tenantId: TIANHUAN_TENANT_ID
  });
  var d = res.data.data || res.data;
  var tokens = d.tokens || {};
  crmToken = d.token || tokens.accessToken || tokens.token || '';
  if (!crmToken) {
    console.log('CRM login failed:', JSON.stringify(res.data).substring(0, 200));
    return false;
  }
  currentUserId = (d.user || {}).id || '';
  console.log('[PREP] CRM OK, userId=' + currentUserId);

  // get users
  var usersRes = await request('GET', '/users', null, crmToken);
  if (usersRes.data.success) {
    var users = usersRes.data.data || [];
    var arr = Array.isArray(users) ? users : (users.items || []);
    var other = arr.find(function(u) { return u.username !== '13800138001'; });
    if (other) otherUserId = other.id;
    console.log('[PREP] users=' + arr.length + ', other=' + (otherUserId || 'N/A'));
  }

  // get order
  var ordersRes = await request('GET', '/orders?page=1&pageSize=5', null, crmToken);
  if (ordersRes.data.success) {
    var od = ordersRes.data.data || {};
    var items = od.items || od.list || (Array.isArray(od) ? od : []);
    if (items.length > 0) {
      orderId = items[0].id;
      console.log('[PREP] order=' + orderId);
    }
  }

  // get customer
  var custRes = await request('GET', '/customers?page=1&pageSize=5', null, crmToken);
  if (custRes.data.success) {
    var cd = custRes.data.data || {};
    var citems = cd.items || cd.list || (Array.isArray(cd) ? cd : []);
    if (citems.length > 0) {
      customerId = citems[0].id;
      console.log('[PREP] customer=' + customerId);
    }
  }
  return true;
}

// ==================== PHASE 7: After-sales & Logistics ====================

async function test_C108_createService() {
  try {
    var res = await request('POST', '/services', {
      type: 'complaint',
      title: 'Phase7 test service ticket',
      description: 'Phase 7 test after-sales service ticket',
      customerId: customerId || null,
      orderId: orderId || null,
      priority: 'normal',
      serviceType: 'complaint'
    }, crmToken);
    if (isOk(res)) {
      var s = res.data.data || {};
      serviceId = s.id || s.serviceNumber || '';
      log('C-108', 'Create service ticket', 'PASS', 'id=' + serviceId);
    } else {
      log('C-108', 'Create service ticket', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-108', 'Create service ticket', 'FAIL', e.message); }
}

async function test_C109_serviceList() {
  try {
    var res = await request('GET', '/services?page=1&limit=20', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      var items = d.items || d.list || (Array.isArray(d) ? d : []);
      var total = d.total || items.length;
      if (!serviceId && items.length > 0) serviceId = items[0].id;
      log('C-109', 'Service list', 'PASS', 'total=' + total + ', items=' + items.length);
    } else {
      log('C-109', 'Service list', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-109', 'Service list', 'FAIL', e.message); }
}

async function test_C110_serviceDetail() {
  if (!serviceId) { log('C-110', 'Service detail', 'SKIP', 'no serviceId'); return; }
  try {
    var res = await request('GET', '/services/' + serviceId, null, crmToken);
    if (isOk(res)) {
      var s = res.data.data || {};
      log('C-110', 'Service detail', 'PASS', 'title=' + (s.title || 'N/A') + ', status=' + (s.status || 'N/A'));
    } else {
      log('C-110', 'Service detail', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-110', 'Service detail', 'FAIL', e.message); }
}

async function test_C111_editService() {
  if (!serviceId) { log('C-111', 'Edit service', 'SKIP', 'no serviceId'); return; }
  try {
    var res = await request('PUT', '/services/' + serviceId, {
      description: 'Updated by phase 7 test',
      remark: 'test update'
    }, crmToken);
    if (isOk(res)) {
      log('C-111', 'Edit service', 'PASS', 'updated');
    } else {
      log('C-111', 'Edit service', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-111', 'Edit service', 'FAIL', e.message); }
}

async function test_C112_serviceFollowUp() {
  if (!serviceId) { log('C-112', 'Service follow-up', 'SKIP', 'no serviceId'); return; }
  try {
    var res = await request('POST', '/services/' + serviceId + '/follow-ups', {
      content: 'Phase 7 follow-up note',
      followUpTime: new Date().toISOString(),
      type: 'note'
    }, crmToken);
    if (isOk(res)) {
      log('C-112', 'Service follow-up', 'PASS', 'follow-up created');
    } else {
      log('C-112', 'Service follow-up', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-112', 'Service follow-up', 'FAIL', e.message); }
}

async function test_C112b_getFollowUps() {
  if (!serviceId) { log('C-112b', 'Get follow-ups', 'SKIP', 'no serviceId'); return; }
  try {
    var res = await request('GET', '/services/' + serviceId + '/follow-ups', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || [];
      log('C-112b', 'Get follow-ups', 'PASS', 'count=' + (Array.isArray(d) ? d.length : 0));
    } else {
      log('C-112b', 'Get follow-ups', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-112b', 'Get follow-ups', 'FAIL', e.message); }
}

async function test_C113_serviceStats() {
  try {
    var res = await request('GET', '/services/stats/summary', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-113', 'Service stats summary', 'PASS', JSON.stringify(d).substring(0, 120));
    } else {
      // try /services/stats
      var res2 = await request('GET', '/services/stats', null, crmToken);
      if (isOk(res2)) {
        log('C-113', 'Service stats', 'PASS', JSON.stringify(res2.data.data || {}).substring(0, 120));
      } else {
        log('C-113', 'Service stats', 'FAIL', 'summary:' + res.status + ', stats:' + res2.status);
      }
    }
  } catch (e) { log('C-113', 'Service stats', 'FAIL', e.message); }
}

async function test_C114_serviceStatusChange() {
  if (!serviceId) { log('C-114', 'Service status change', 'SKIP', 'no serviceId'); return; }
  try {
    var res = await request('PATCH', '/services/' + serviceId + '/status', {
      status: 'processing',
      remark: 'start processing'
    }, crmToken);
    if (isOk(res)) {
      log('C-114', 'Service status->processing', 'PASS', 'status changed');
    } else {
      log('C-114', 'Service status->processing', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-114', 'Service status->processing', 'FAIL', e.message); }
}

async function test_C114b_operationLogs() {
  if (!serviceId) { log('C-114b', 'Operation logs', 'SKIP', 'no serviceId'); return; }
  try {
    var res = await request('GET', '/services/' + serviceId + '/operation-logs', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || [];
      log('C-114b', 'Operation logs', 'PASS', 'count=' + (Array.isArray(d) ? d.length : 0));
    } else {
      log('C-114b', 'Operation logs', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-114b', 'Operation logs', 'FAIL', e.message); }
}

// --- Logistics ---

async function test_C115_logisticsList() {
  try {
    var res = await request('GET', '/logistics/list', null, crmToken);
    if (res.status < 500) {
      log('C-115', 'Logistics list', 'PASS', 'status=' + res.status);
    } else {
      log('C-115', 'Logistics list', 'FAIL', 'status=' + res.status);
    }
  } catch (e) { log('C-115', 'Logistics list', 'FAIL', e.message); }
}

async function test_C116_logisticsSummary() {
  try {
    var res = await request('GET', '/logistics/summary', null, crmToken);
    if (isOk(res)) {
      log('C-116', 'Logistics summary', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 120));
    } else {
      log('C-116', 'Logistics summary', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-116', 'Logistics summary', 'FAIL', e.message); }
}

async function test_C117_logisticsStatusUpdateOrders() {
  try {
    var res = await request('GET', '/logistics/status-update/orders?page=1&pageSize=10', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-117', 'Status update orders', 'PASS', 'total=' + (d.total || 0));
    } else {
      log('C-117', 'Status update orders', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-117', 'Status update orders', 'FAIL', e.message); }
}

async function test_C117b_statusUpdateSummary() {
  try {
    var res = await request('GET', '/logistics/status-update/summary', null, crmToken);
    if (isOk(res)) {
      log('C-117b', 'Status update summary', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 120));
    } else {
      log('C-117b', 'Status update summary', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-117b', 'Status update summary', 'FAIL', e.message); }
}

async function test_C118_logisticsCompanies() {
  try {
    var res = await request('GET', '/logistics/companies/list', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      var items = d.items || d.list || (Array.isArray(d) ? d : []);
      log('C-118', 'Logistics companies', 'PASS', 'count=' + items.length);
    } else {
      log('C-118', 'Logistics companies', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-118', 'Logistics companies', 'FAIL', e.message); }
}

async function test_C118b_activeCompanies() {
  try {
    var res = await request('GET', '/logistics/companies/active', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || [];
      log('C-118b', 'Active companies', 'PASS', 'count=' + (Array.isArray(d) ? d.length : 0));
    } else {
      log('C-118b', 'Active companies', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-118b', 'Active companies', 'FAIL', e.message); }
}

async function test_C119_logisticsLog() {
  try {
    var res = await request('GET', '/logistics/log?page=1&pageSize=10', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-119', 'Logistics log', 'PASS', 'total=' + (d.total || 0));
    } else {
      log('C-119', 'Logistics log', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-119', 'Logistics log', 'FAIL', e.message); }
}

async function test_C119b_logisticsPermission() {
  try {
    var res = await request('GET', '/logistics/permission', null, crmToken);
    if (isOk(res)) {
      log('C-119b', 'Logistics permission', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 100));
    } else {
      log('C-119b', 'Logistics permission', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-119b', 'Logistics permission', 'FAIL', e.message); }
}

async function test_C120_sfExpress() {
  try {
    var res = await request('GET', '/sf-express/query?trackingNumber=SF0000000001', null, crmToken);
    if (res.status < 500) {
      log('C-120', 'SF Express query', 'PASS', 'reachable, status=' + res.status);
    } else {
      log('C-120', 'SF Express query', 'FAIL', 'status=' + res.status);
    }
  } catch (e) { log('C-120', 'SF Express query', 'FAIL', e.message); }
}

async function test_C120b_apiConfigs() {
  try {
    var res = await request('GET', '/logistics/api-configs', null, crmToken);
    if (isOk(res)) {
      log('C-120b', 'Logistics API configs', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 120));
    } else {
      log('C-120b', 'Logistics API configs', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-120b', 'Logistics API configs', 'FAIL', e.message); }
}

// ==================== PHASE 8: Communication & Messages ====================

async function test_C121_callStatistics() {
  try {
    var res = await request('GET', '/calls/statistics', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-121', 'Call statistics', 'PASS',
        'total=' + (d.totalCalls || 0) + ', connected=' + (d.connectedCalls || 0));
    } else {
      log('C-121', 'Call statistics', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-121', 'Call statistics', 'FAIL', e.message); }
}

async function test_C122_callRecords() {
  try {
    var res = await request('GET', '/calls/records?page=1&limit=10', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      var items = d.items || d.records || (Array.isArray(d) ? d : []);
      log('C-122', 'Call records list', 'PASS', 'count=' + items.length);
    } else {
      log('C-122', 'Call records list', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-122', 'Call records list', 'FAIL', e.message); }
}

async function test_C123_createCallRecord() {
  try {
    var res = await request('POST', '/calls/records', {
      customerPhone: '15800000001',
      callType: 'outbound',
      callStatus: 'connected',
      duration: 120,
      startTime: new Date().toISOString(),
      customerId: customerId || null,
      customerName: 'Test Customer',
      notes: 'Phase 8 test call'
    }, crmToken);
    if (isOk(res)) {
      log('C-123', 'Create call record', 'PASS', 'id=' + ((res.data.data || {}).id || 'created'));
    } else {
      log('C-123', 'Create call record', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-123', 'Create call record', 'FAIL', e.message); }
}

async function test_C124_followups() {
  try {
    var res = await request('GET', '/calls/followups?page=1&limit=10', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-124', 'Call followups', 'PASS', 'count=' + ((d.items || d.list || []).length || 0));
    } else {
      log('C-124', 'Call followups', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-124', 'Call followups', 'FAIL', e.message); }
}

async function test_C125_callConfig() {
  try {
    var res = await request('GET', '/calls/config', null, crmToken);
    if (isOk(res)) {
      log('C-125', 'Call config', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 120));
    } else {
      log('C-125', 'Call config', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-125', 'Call config', 'FAIL', e.message); }
}

async function test_C126_recordings() {
  try {
    var res = await request('GET', '/calls/recordings?page=1&limit=10', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-126', 'Call recordings', 'PASS', 'count=' + ((d.items || d.recordings || []).length || 0));
    } else {
      log('C-126', 'Call recordings', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-126', 'Call recordings', 'FAIL', e.message); }
}

async function test_C127_outboundTasks() {
  try {
    var res = await request('GET', '/calls/outbound-tasks?page=1&limit=10', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-127', 'Outbound tasks', 'PASS', 'count=' + ((d.items || d.tasks || []).length || 0));
    } else {
      log('C-127', 'Outbound tasks', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-127', 'Outbound tasks', 'FAIL', e.message); }
}

async function test_C128_callLines() {
  try {
    var res = await request('GET', '/calls/lines', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || [];
      log('C-128', 'Call lines', 'PASS', 'count=' + (Array.isArray(d) ? d.length : 0));
    } else {
      log('C-128', 'Call lines', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-128', 'Call lines', 'FAIL', e.message); }
}

// --- SMS ---

async function test_C129_smsTemplates() {
  try {
    var res = await request('GET', '/sms/templates', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      var templates = d.templates || (Array.isArray(d) ? d : []);
      log('C-129', 'SMS templates', 'PASS', 'count=' + templates.length);
    } else {
      log('C-129', 'SMS templates', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-129', 'SMS templates', 'FAIL', e.message); }
}

async function test_C130_smsRecords() {
  try {
    var res = await request('GET', '/sms/records?page=1&limit=10', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      log('C-130', 'SMS records', 'PASS', 'data=' + JSON.stringify(d).substring(0, 100));
    } else {
      log('C-130', 'SMS records', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-130', 'SMS records', 'FAIL', e.message); }
}

async function test_C131_smsStatistics() {
  try {
    var res = await request('GET', '/sms/statistics', null, crmToken);
    if (isOk(res)) {
      log('C-131', 'SMS statistics', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 120));
    } else {
      log('C-131', 'SMS statistics', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-131', 'SMS statistics', 'FAIL', e.message); }
}

// --- Messages ---

async function test_C133_systemMessages() {
  try {
    var res = await request('GET', '/message/system-messages', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || {};
      var msgs = d.messages || d.items || (Array.isArray(d) ? d : []);
      log('C-133', 'System messages', 'PASS', 'count=' + msgs.length);
    } else {
      log('C-133', 'System messages', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-133', 'System messages', 'FAIL', e.message); }
}

async function test_C134_messageStats() {
  try {
    var res = await request('GET', '/message/stats', null, crmToken);
    if (isOk(res)) {
      log('C-134', 'Message stats', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 120));
    } else {
      log('C-134', 'Message stats', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-134', 'Message stats', 'FAIL', e.message); }
}

async function test_C135_markAllRead() {
  try {
    var res = await request('PUT', '/message/system-messages/read-all', {}, crmToken);
    if (isOk(res)) {
      log('C-135', 'Mark all read', 'PASS', 'all messages marked as read');
    } else {
      log('C-135', 'Mark all read', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-135', 'Mark all read', 'FAIL', e.message); }
}

async function test_C136_announcements() {
  try {
    var res = await request('GET', '/message/announcements/published', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || [];
      log('C-136', 'Published announcements', 'PASS', 'count=' + (Array.isArray(d) ? d.length : (d.items || []).length));
    } else {
      log('C-136', 'Published announcements', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-136', 'Published announcements', 'FAIL', e.message); }
}

async function test_C137_subscriptions() {
  try {
    var res = await request('GET', '/message/subscriptions', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || (Array.isArray(res.data) ? res.data : []);
      log('C-137', 'Message subscriptions', 'PASS', 'count=' + (Array.isArray(d) ? d.length : 0));
    } else {
      log('C-137', 'Message subscriptions', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-137', 'Message subscriptions', 'FAIL', e.message); }
}

async function test_C138_notificationConfigs() {
  try {
    var res = await request('GET', '/message/notification-configs', null, crmToken);
    if (isOk(res)) {
      var d = res.data.data || [];
      log('C-138', 'Notification configs', 'PASS', 'count=' + (Array.isArray(d) ? d.length : 0));
    } else {
      log('C-138', 'Notification configs', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-138', 'Notification configs', 'FAIL', e.message); }
}

// ========== Main ==========
async function main() {
  console.log('='.repeat(60));
  console.log('CRM Test - Phase 7 (After-sales & Logistics) + Phase 8 (Communication & Messages)');
  console.log('Time: ' + new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(60));

  var ok = await prepare();
  if (!ok) { saveResults(); return; }

  console.log('\n--- Phase 7: After-sales ---');
  await test_C108_createService();
  await test_C109_serviceList();
  await test_C110_serviceDetail();
  await test_C111_editService();
  await test_C112_serviceFollowUp();
  await test_C112b_getFollowUps();
  await test_C113_serviceStats();
  await test_C114_serviceStatusChange();
  await test_C114b_operationLogs();

  console.log('\n--- Phase 7: Logistics ---');
  await test_C115_logisticsList();
  await test_C116_logisticsSummary();
  await test_C117_logisticsStatusUpdateOrders();
  await test_C117b_statusUpdateSummary();
  await test_C118_logisticsCompanies();
  await test_C118b_activeCompanies();
  await test_C119_logisticsLog();
  await test_C119b_logisticsPermission();
  await test_C120_sfExpress();
  await test_C120b_apiConfigs();

  console.log('\n--- Phase 8: Calls ---');
  await test_C121_callStatistics();
  await test_C122_callRecords();
  await test_C123_createCallRecord();
  await test_C124_followups();
  await test_C125_callConfig();
  await test_C126_recordings();
  await test_C127_outboundTasks();
  await test_C128_callLines();

  console.log('\n--- Phase 8: SMS ---');
  await test_C129_smsTemplates();
  await test_C130_smsRecords();
  await test_C131_smsStatistics();

  console.log('\n--- Phase 8: Messages ---');
  await test_C133_systemMessages();
  await test_C134_messageStats();
  await test_C135_markAllRead();
  await test_C136_announcements();
  await test_C137_subscriptions();
  await test_C138_notificationConfigs();

  // Summary
  var passed = results.filter(function(r) { return r.status === 'PASS'; }).length;
  var failed = results.filter(function(r) { return r.status === 'FAIL'; }).length;
  var skipped = results.filter(function(r) { return r.status === 'SKIP'; }).length;
  console.log('\n' + '='.repeat(60));
  console.log('Summary: pass=' + passed + ' fail=' + failed + ' skip=' + skipped + ' total=' + results.length);
  console.log('Pass rate: ' + Math.round(passed / results.length * 100) + '%');
  if (failed > 0) {
    console.log('\nFailed:');
    results.filter(function(r) { return r.status === 'FAIL'; }).forEach(function(r) {
      console.log('  X ' + r.id + ' ' + r.name + ': ' + r.detail.substring(0, 100));
    });
  }
  saveResults();
}

function saveResults() {
  var dir = __dirname;
  var resultFile = path.join(dir, 'test-phase7-8-result.json');
  var resultData = {
    phases: '7-8',
    time: new Date().toISOString(),
    results: results
  };
  fs.writeFileSync(resultFile, JSON.stringify(resultData, null, 2), 'utf-8');

  var reportFile = path.join(dir, 'test-phase7-8-report.md');
  var passed = results.filter(function(r) { return r.status === 'PASS'; }).length;
  var failed = results.filter(function(r) { return r.status === 'FAIL'; }).length;
  var skipped = results.filter(function(r) { return r.status === 'SKIP'; }).length;

  var md = '# Phase 7-8 Test Report\n\n';
  md += '> Time: ' + new Date().toLocaleString('zh-CN') + '\n';
  md += '> Env: localhost:3000 (development)\n\n';
  md += '## Summary\n\n| Item | Count |\n|------|-------|\n';
  md += '| Pass | ' + passed + ' |\n';
  md += '| Fail | ' + failed + ' |\n';
  md += '| Skip | ' + skipped + ' |\n';
  md += '| Total | ' + results.length + ' |\n\n';
  md += '**Pass rate: ' + Math.round(passed / results.length * 100) + '%**\n\n';

  var groups = [
    { title: '7.1 After-sales', prefix: ['C-108', 'C-109', 'C-110', 'C-111', 'C-112', 'C-112b', 'C-113', 'C-114', 'C-114b'] },
    { title: '7.2 Logistics', prefix: ['C-115', 'C-116', 'C-117', 'C-117b', 'C-118', 'C-118b', 'C-119', 'C-119b', 'C-120', 'C-120b'] },
    { title: '8.1 Calls', prefix: ['C-121', 'C-122', 'C-123', 'C-124', 'C-125', 'C-126', 'C-127', 'C-128'] },
    { title: '8.2 SMS', prefix: ['C-129', 'C-130', 'C-131'] },
    { title: '8.3 Messages', prefix: ['C-133', 'C-134', 'C-135', 'C-136', 'C-137', 'C-138'] }
  ];

  groups.forEach(function(g) {
    md += '### ' + g.title + '\n\n';
    md += '| ID | Name | Status | Detail |\n|------|------|------|------|\n';
    g.prefix.forEach(function(id) {
      var r = results.find(function(x) { return x.id === id; });
      if (r) {
        var icon = r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? 'FAIL' : 'SKIP';
        md += '| ' + r.id + ' | ' + r.name + ' | ' + icon + ' | ' + r.detail.substring(0, 80) + ' |\n';
      }
    });
    md += '\n';
  });

  if (failed > 0) {
    md += '## Failure Analysis\n\n';
    results.filter(function(r) { return r.status === 'FAIL'; }).forEach(function(r) {
      md += '### ' + r.id + ' - ' + r.name + '\n- ' + r.detail + '\n\n';
    });
  }

  fs.writeFileSync(reportFile, md, 'utf-8');
  console.log('\nResult: ' + resultFile);
  console.log('Report: ' + reportFile);
}

main().catch(function(e) { console.error('Error:', e); saveResults(); });



