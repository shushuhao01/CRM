const fs = require('fs');
const Q = String.fromCharCode(34);
const B = String.fromCharCode(96);

// Helper: build feature item HTML
function fi(type, key, icon, name, tip) {
  return '                    <div class='+Q+'ff-item'+Q+'><div class='+Q+'ff-item-info'+Q+'><span class='+Q+'ff-item-icon'+Q+'>'+icon+'</span><div><div class='+Q+'ff-item-name'+Q+'>'+name+'</div><div class='+Q+'ff-item-tip'+Q+'>'+tip+'</div></div></div><el-switch v-model='+Q+'form.featureFlags.'+type+'.'+key+' '+Q+'/></div>';
}

function fg(type, color, title, items) {
  let html = '                  <div class='+Q+'ff-group'+Q+'>\n';
  html += '                    <div class='+Q+'ff-group-title'+Q+'><span class='+Q+'ff-group-dot ff-group-dot--'+color+Q+'></span>'+title+'</div>\n';
  items.forEach(i=>{ html += fi(type, i[0], i[1], i[2], i[3]) + '\n'; });
  html += '                  </div>';
  return html;
}

console.log('Helpers loaded');
// Define feature items with unicode escapes for Chinese
const coreItems = [
  ['security', '\ud83d\udd12', '\u5B89\u5168\u8BBE\u7F6E', '\u767B\u5F55\u5B89\u5168\u3001\u6743\u9650\u63A7\u5236\u7B49'],
  ['storage', '\ud83d\udcbe', '\u5B58\u50A8\u8BBE\u7F6E', '\u6587\u4EF6\u5B58\u50A8\u3001\u4E91\u76D8\u914D\u7F6E'],
  ['product', '\ud83d\udce6', '\u5546\u54C1\u8BBE\u7F6E', '\u5546\u54C1\u7BA1\u7406\u3001\u5206\u7C7B\u914D\u7F6E'],
  ['order', '\ud83d\uded2', '\u8BA2\u5355\u8BBE\u7F6E', '\u8BA2\u5355\u6D41\u7A0B\u3001\u72B6\u6001\u7BA1\u7406']
];

const commItems = [
  ['call', '\ud83d\udcde', '\u901A\u8BDD\u8BBE\u7F6E', 'IP\u7535\u8BDD\u3001\u901A\u8BDD\u8BB0\u5F55'],
  ['email', '\u2709\ufe0f', '\u90AE\u4EF6\u8BBE\u7F6E', '\u90AE\u4EF6\u6536\u53D1\u3001\u6A21\u677F\u7BA1\u7406'],
  ['sms', '\ud83d\udcac', '\u77ED\u4FE1\u8BBE\u7F6E', '\u77ED\u4FE1\u7F51\u5173\u3001\u53D1\u9001\u8BB0\u5F55'],
  ['notification', '\ud83d\udd14', '\u901A\u77E5\u8BBE\u7F6E', '\u7AD9\u5185\u4FE1\u3001\u6D88\u606F\u63A8\u9001']
];

const dataItems = [
  ['backup', '\ud83d\uddc4\ufe0f', '\u6570\u636E\u5907\u4EFD', '\u81EA\u52A8\u5907\u4EFD\u3001\u6062\u590D\u7B56\u7565'],
  ['logs', '\ud83d\udccb', '\u7CFB\u7EDF\u65E5\u5FD7', '\u64CD\u4F5C\u65E5\u5FD7\u3001\u5BA1\u8BA1\u8FFD\u8E2A'],
  ['monitor', '\ud83d\udcca', '\u7CFB\u7EDF\u76D1\u63A7', '\u6027\u80FD\u76D1\u63A7\u3001\u544A\u8B66\u914D\u7F6E']
];

const extItems = [
  ['agreement', '\ud83d\udcc4', '\u7528\u6237\u534F\u8BAE', '\u670D\u52A1\u6761\u6B3E\u3001\u9690\u79C1\u653F\u7B56'],
  ['mobile', '\ud83d\udcf1', '\u79FB\u52A8\u5E94\u7528', 'APP\u4E0B\u8F7D\u3001\u79FB\u52A8\u7AEF\u8BBE\u7F6E'],
  ['apiManagement', '\ud83d\udd17', '\u63A5\u53E3\u7BA1\u7406', 'API\u5BC6\u94A5\u3001\u8C03\u7528\u7EDF\u8BA1']
];

console.log('Items defined');
// Build card HTML for a deploy type
function buildCard(type, cssType, icon, title, desc) {
  let h = '';
  h += '            <el-col :span="12">\n';
  h += '              <div class='+Q+'ff-card ff-card--'+cssType+Q+'>\n';
  h += '                <div class='+Q+'ff-card-head'+Q+'>\n';
  h += '                  <div class='+Q+'ff-card-head-left'+Q+'>\n';
  h += '                    <div class='+Q+'ff-card-icon ff-card-icon--'+cssType+Q+'>'+icon+'</div>\n';
  h += '                    <div>\n';
  h += '                      <div class='+Q+'ff-card-title'+Q+'>'+title+'</div>\n';
  h += '                      <div class='+Q+'ff-card-desc'+Q+'>'+desc+'</div>\n';
  h += '                    </div>\n';
  h += '                  </div>\n';
  h += '                  <div class='+Q+'ff-card-actions'+Q+'>\n';
  h += '                    <el-button size='+Q+'small'+Q+' round @click='+Q+'toggleAll(\\''+type+'\\', true)'+Q+'>\u5168\u90E8\u542F\u7528</el-button>\n';
  h += '                    <el-button size='+Q+'small'+Q+' round @click='+Q+'toggleAll(\\''+type+'\\', false)'+Q+'>\u5168\u90E8\u7981\u7528</el-button>\n';
  h += '                  </div>\n';
  h += '                </div>\n';
  h += '                <div class='+Q+'ff-card-body'+Q+'>\n';
  h += fg(type, 'blue', '\u6838\u5FC3\u529F\u80FD', coreItems) + '\n';
  h += fg(type, 'green', '\u901A\u4FE1\u8BBE\u7F6E', commItems) + '\n';
  h += fg(type, 'orange', '\u6570\u636E\u7BA1\u7406', dataItems) + '\n';
  h += fg(type, 'purple', '\u6269\u5C55\u529F\u80FD', extItems) + '\n';
  h += '                </div>\n';
  h += '              </div>\n';
  h += '            </el-col>';
  return h;
}

// Build full template
let tpl = '';
tpl += '        <el-tab-pane label='+Q+'\u529F\u80FD\u5F00\u5173'+Q+' name='+Q+'features'+Q+'>\n';
tpl += '          <div class='+Q+'ff-header'+Q+'>\n';
tpl += '            <div class='+Q+'ff-header-text'+Q+'>\n';
tpl += '              <h3>\u529F\u80FD\u6A21\u5757\u5F00\u5173</h3>\n';
tpl += '              <p>\u63A7\u5236CRM\u7CFB\u7EDF\u4E2D\u5404\u529F\u80FD\u6A21\u5757\u7684\u53EF\u89C1\u6027\u3002SaaS\u79DF\u6237\u548C\u79C1\u6709\u90E8\u7F72\u53EF\u72EC\u7ACB\u914D\u7F6E\uFF0C\u5173\u95ED\u540E\u5BF9\u5E94\u529F\u80FD\u5165\u53E3\u5C06\u88ABu9690\u85CF\u3002</p>\n';
tpl += '            </div>\n';
tpl += '            <el-button type='+Q+'primary'+Q+' @click='+Q+'handleSave'+Q+' :loading='+Q+'saving'+Q+' round>\n';
tpl += '              <el-icon><Check /></el-icon>\u4FDD\u5B58\u914D\u7F6E\n';
tpl += '            </el-button>\n';
tpl += '          </div>\n\n';
tpl += '          <el-row :gutter="24" class='+Q+'ff-container'+Q+'>\n';
tpl += '            <!-- SaaS \u79DF\u6237 -->\n';
tpl += buildCard('saas', 'saas', '\u2601\ufe0f', 'SaaS \u79DF\u6237', '\u591A\u79DF\u6237\u4E91\u7AEF\u90E8\u7F72\u6A21\u5F0F') + '\n';
tpl += '            <!-- \u79C1\u6709\u90E8\u7F72 -->\n';
tpl += buildCard('private', 'private', '\ud83c\udfe2', '\u79C1\u6709\u90E8\u7F72', '\u72EC\u7ACB\u90E8\u7F72\u672C\u5730\u5316\u6A21\u5F0F') + '\n';
tpl += '          </el-row>\n';
tpl += '        </el-tab-pane>';

// Write template b64
const tplB64 = Buffer.from(tpl, 'utf8').toString('base64');
fs.writeFileSync('d:/kaifa/CRM - 1.8.0/tpl_new.b64', tplB64, 'utf8');
console.log('TPL b64 written, len:', tplB64.length);
// Build new CSS
const css = [
'/* ===== Feature Flags Styles ===== */',
'.ff-header {',
'  display: flex;',
'  justify-content: space-between;',
'  align-items: flex-start;',
'  margin-bottom: 24px;',
'  padding: 20px 24px;',
'  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
'  border-radius: 12px;',
'  color: #fff;',
'}',
'.ff-header h3 {',
'  font-size: 18px;',
'  font-weight: 700;',
'  margin: 0 0 6px;',
'  color: #fff;',
'}',
'.ff-header p {',
'  font-size: 13px;',
'  margin: 0;',
'  color: rgba(255, 255, 255, 0.85);',
'  line-height: 1.5;',
'}',
'.ff-header .el-button {',
'  background: rgba(255, 255, 255, 0.2);',
'  border-color: rgba(255, 255, 255, 0.4);',
'  color: #fff;',
'  backdrop-filter: blur(4px);',
'}',
'.ff-header .el-button:hover {',
'  background: rgba(255, 255, 255, 0.35);',
'  border-color: rgba(255, 255, 255, 0.6);',
'}',
'.ff-container { margin-top: 0; }',
'.ff-card {',
'  border-radius: 12px;',
'  border: 1px solid #e8ecf1;',
'  background: #fff;',
'  overflow: hidden;',
'  transition: box-shadow 0.3s, transform 0.2s;',
'}',
'.ff-card:hover {',
'  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);',
'  transform: translateY(-2px);',
'}',
'.ff-card--saas .ff-card-head {',
'  background: linear-gradient(135deg, #e8f4fd 0%, #d4ecfd 100%);',
'  border-bottom: 2px solid #409eff;',
'}',
'.ff-card--private .ff-card-head {',
'  background: linear-gradient(135deg, #e8f8ea 0%, #d4f0d6 100%);',
'  border-bottom: 2px solid #67c23a;',
'}',
'.ff-card-head {',
'  display: flex;',
'  justify-content: space-between;',
'  align-items: center;',
'  padding: 16px 20px;',
'}',
'.ff-card-head-left {',
'  display: flex;',
'  align-items: center;',
'  gap: 12px;',
'}',
'.ff-card-icon {',
'  width: 42px;',
'  height: 42px;',
'  border-radius: 10px;',
'  display: flex;',
'  align-items: center;',
'  justify-content: center;',
'  font-size: 22px;',
'}',
'.ff-card-icon--saas {',
'  background: linear-gradient(135deg, #409eff, #337ecc);',
'  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);',
'}',
'.ff-card-icon--private {',
'  background: linear-gradient(135deg, #67c23a, #529b2e);',
'  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);',
'}',
'.ff-card-title {',
'  font-size: 16px;',
'  font-weight: 700;',
'  color: #1d2129;',
'  line-height: 1.4;',
'}',
'.ff-card-desc {',
'  font-size: 12px;',
'  color: #86909c;',
'  margin-top: 2px;',
'}',
'.ff-card-actions {',
'  display: flex;',
'  gap: 6px;',
'}',
'.ff-card-actions .el-button { font-size: 12px; }',
'.ff-card-body { padding: 12px 20px 20px; }',
'.ff-group { margin-bottom: 16px; }',
'.ff-group:last-child { margin-bottom: 0; }',
'.ff-group-title {',
'  display: flex;',
'  align-items: center;',
'  gap: 8px;',
'  font-size: 13px;',
'  font-weight: 600;',
'  color: #4e5969;',
'  padding: 10px 0 6px;',
'  margin-bottom: 2px;',
'  letter-spacing: 0.5px;',
'}',
'.ff-group-dot {',
'  width: 8px;',
'  height: 8px;',
'  border-radius: 50%;',
'  display: inline-block;',
'  flex-shrink: 0;',
'}',
'.ff-group-dot--blue { background: #409eff; }',
'.ff-group-dot--green { background: #67c23a; }',
'.ff-group-dot--orange { background: #e6a23c; }',
'.ff-group-dot--purple { background: #9b59b6; }',
'.ff-item {',
'  display: flex;',
'  justify-content: space-between;',
'  align-items: center;',
'  padding: 10px 12px;',
'  border-radius: 8px;',
'  transition: all 0.2s;',
'  margin-bottom: 2px;',
'}',
'.ff-item:hover { background: #f7f8fa; }',
'.ff-item-info {',
'  display: flex;',
'  align-items: center;',
'  gap: 10px;',
'}',
'.ff-item-icon {',
'  width: 32px;',
'  height: 32px;',
'  border-radius: 8px;',
'  background: #f2f3f5;',
'  display: flex;',
'  align-items: center;',
'  justify-content: center;',
'  font-size: 16px;',
'  flex-shrink: 0;',
'}',
'.ff-item-name {',
'  font-size: 13px;',
'  font-weight: 500;',
'  color: #1d2129;',
'  line-height: 1.4;',
'}',
'.ff-item-tip {',
'  font-size: 11px;',
'  color: #c0c4cc;',
'  line-height: 1.3;',
'  margin-top: 1px;',
'}'
].join('\n');

const cssB64 = Buffer.from(css, 'utf8').toString('base64');
fs.writeFileSync('d:/kaifa/CRM - 1.8.0/css_new.b64', cssB64, 'utf8');
console.log('CSS b64 written, len:', cssB64.length);