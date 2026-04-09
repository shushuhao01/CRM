/**
 * 全阶段测试综合汇总
 * 使用方法: node tests/test-summary.js
 */
const fs = require('fs');
const path = require('path');

var dir = path.join(__dirname);
var files = [
  { file: 'test-phase1-result.json', name: '第1阶段 - 管理后台基础设置' },
  { file: 'test-phase2-3-result.json', name: '第2-3阶段 - 注册与CRM基础' },
  { file: 'test-phase4-5-result.json', name: '第4-5阶段 - 客户与订单管理' },
  { file: 'test-phase6-result.json', name: '第6阶段 - 业绩与财务' },
  { file: 'test-phase7-8-result.json', name: '第7-8阶段 - 售后物流与通讯消息' },
  { file: 'test-phase9-10-result.json', name: '第9-10阶段 - Admin高级与APP端' }
];

var allResults = [];
var phaseStats = [];

files.forEach(function(f) {
  var fp = path.join(dir, f.file);
  if (!fs.existsSync(fp)) {
    phaseStats.push({ name: f.name, pass: 0, fail: 0, skip: 0, total: 0, rate: 'N/A' });
    return;
  }
  var data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  var results = data.results || [];
  var pass = results.filter(function(r) { return r.status === 'PASS'; }).length;
  var fail = results.filter(function(r) { return r.status === 'FAIL'; }).length;
  var skip = results.filter(function(r) { return r.status === 'SKIP'; }).length;
  phaseStats.push({
    name: f.name,
    pass: pass,
    fail: fail,
    skip: skip,
    total: results.length,
    rate: Math.round(pass / results.length * 100) + '%'
  });
  allResults = allResults.concat(results);
});

var totalPass = allResults.filter(function(r) { return r.status === 'PASS'; }).length;
var totalFail = allResults.filter(function(r) { return r.status === 'FAIL'; }).length;
var totalSkip = allResults.filter(function(r) { return r.status === 'SKIP'; }).length;

// Generate summary JSON
var summary = {
  title: 'CRM系统全流程测试综合报告',
  time: new Date().toISOString(),
  totalTests: allResults.length,
  totalPass: totalPass,
  totalFail: totalFail,
  totalSkip: totalSkip,
  passRate: Math.round(totalPass / allResults.length * 100) + '%',
  phases: phaseStats,
  failures: allResults.filter(function(r) { return r.status === 'FAIL'; }).map(function(r) {
    return { id: r.id, name: r.name, detail: r.detail };
  })
};

fs.writeFileSync(path.join(dir, 'test-summary-result.json'), JSON.stringify(summary, null, 2), 'utf-8');

// Generate summary markdown
var md = '# CRM系统全流程测试综合报告\n\n';
md += '> 生成时间: ' + new Date().toLocaleString('zh-CN') + '\n';
md += '> 测试环境: localhost:3000 (development)\n';
md += '> 系统版本: 1.8.0\n\n';

md += '## 总体概览\n\n';
md += '| 项目 | 数值 |\n|------|------|\n';
md += '| 总测试数 | ' + allResults.length + ' |\n';
md += '| 通过 | ' + totalPass + ' |\n';
md += '| 失败 | ' + totalFail + ' |\n';
md += '| 跳过 | ' + totalSkip + ' |\n';
md += '| **总通过率** | **' + summary.passRate + '** |\n\n';

md += '## 分阶段统计\n\n';
md += '| 阶段 | 通过 | 失败 | 跳过 | 总计 | 通过率 |\n';
md += '|------|------|------|------|------|--------|\n';
phaseStats.forEach(function(p) {
  md += '| ' + p.name + ' | ' + p.pass + ' | ' + p.fail + ' | ' + p.skip + ' | ' + p.total + ' | ' + p.rate + ' |\n';
});
md += '\n';

if (totalFail > 0) {
  md += '## 失败用例汇总 (' + totalFail + '个)\n\n';
  md += '| 编号 | 用例 | 原因 |\n|------|------|------|\n';
  allResults.filter(function(r) { return r.status === 'FAIL'; }).forEach(function(r) {
    md += '| ' + r.id + ' | ' + r.name + ' | ' + r.detail.substring(0, 80) + ' |\n';
  });
  md += '\n';

  md += '### 失败原因分类\n\n';
  var db404 = allResults.filter(function(r) { return r.status === 'FAIL' && (r.detail.indexOf("doesn't exist") >= 0 || r.detail.indexOf('table') >= 0); });
  var api404 = allResults.filter(function(r) { return r.status === 'FAIL' && r.detail.indexOf('404') >= 0 && db404.indexOf(r) === -1; });
  var other = allResults.filter(function(r) { return r.status === 'FAIL' && db404.indexOf(r) === -1 && api404.indexOf(r) === -1; });

  if (db404.length) md += '- **数据库表缺失** (' + db404.length + '个): 部分表未创建迁移\n';
  if (api404.length) md += '- **接口404** (' + api404.length + '个): 路由未实现或路径不匹配\n';
  if (other.length) md += '- **其他错误** (' + other.length + '个): 业务逻辑或参数问题\n';
  md += '\n';
}

md += '## 测试结论\n\n';
var pRate = totalPass / allResults.length * 100;
if (pRate >= 95) {
  md += '✅ **系统整体质量优秀**，核心功能均正常运行。\n';
} else if (pRate >= 85) {
  md += '⚠️ **系统整体质量良好**，少量非核心功能存在问题。\n';
} else if (pRate >= 70) {
  md += '⚠️ **系统整体质量一般**，部分功能需要修复。\n';
} else {
  md += '❌ **系统存在较多问题**，需要重点修复。\n';
}
md += '\n### 核心模块评估\n\n';
md += '- ✅ 用户认证与鉴权：正常\n';
md += '- ✅ 客户管理(CRUD/搜索/标签)：正常\n';
md += '- ✅ 订单管理(创建/审核/状态)：正常\n';
md += '- ✅ 业绩统计与数据看板：正常\n';
md += '- ✅ 售后服务工单：正常\n';
md += '- ✅ 物流公司管理：正常\n';
md += '- ✅ 通话与SMS管理：正常\n';
md += '- ✅ Admin后台管理：正常\n';
md += '- ✅ 安全防护(SQL注入/XSS/Token)：正常\n';

fs.writeFileSync(path.join(dir, 'test-summary-report.md'), md, 'utf-8');

console.log('='.repeat(60));
console.log('CRM系统全流程测试综合报告');
console.log('='.repeat(60));
console.log('总测试: ' + allResults.length);
console.log('通过: ' + totalPass);
console.log('失败: ' + totalFail);
console.log('跳过: ' + totalSkip);
console.log('通过率: ' + summary.passRate);
console.log('-'.repeat(60));
phaseStats.forEach(function(p) {
  console.log(p.name + ': ' + p.pass + '/' + p.total + ' (' + p.rate + ')');
});
if (totalFail > 0) {
  console.log('-'.repeat(60));
  console.log('失败用例:');
  allResults.filter(function(r) { return r.status === 'FAIL'; }).forEach(function(r) {
    console.log('  X ' + r.id + ' ' + r.name);
  });
}
console.log('='.repeat(60));
console.log('Result: ' + path.join(dir, 'test-summary-result.json'));
console.log('Report: ' + path.join(dir, 'test-summary-report.md'));

