const fs = require('fs');
const dst = __dirname + '/src/views/modules/Distribute.vue';
const t = [];
const a = (s) => t.push(s);
const b = () => t.push('');

// TEMPLATE
a('<template>');
a('  <div class="page-container">');
a('    <div class="page-header">');
a('      <h2>\u914D\u7F6E\u4E0B\u53D1\u7BA1\u7406</h2>');
a('      <p class="page-desc">\u7EDF\u4E00\u7BA1\u7406\u5404\u6A21\u5757\u914D\u7F6E\uFF0C\u5F00\u542F\u540E\u5C06\u8986\u76D6\u79DF\u6237\u672C\u5730\u8BBE\u7F6E</p>');
a('    </div>');
b();
a('    <el-alert v-if="saveSuccess" title="\u914D\u7F6E\u5DF2\u4FDD\u5B58\u5E76\u4E0B\u53D1" type="success" show-icon :closable="true" style="margin-bottom:16px" />');
b();
a('    <el-collapse v-model="activeModules">');

// Helper functions
function ms(name, icon, label, desc) {
  b();
  a('      <el-collapse-item name="' + name + '">');
  a('        <template #title>');
  a('          <div class="module-header">');
  a('            <div class="module-info">');
  a('              <el-icon class="module-icon"><' + icon + ' /></el-icon>');
  a('              <div class="module-text">');
  a('                <span class="module-name">' + label + '</span>');
  a('                <span class="module-desc">' + desc + '</span>');
  a('              </div>');
  a('            </div>');
  a('            <el-switch');
  a('              :model-value="distributedConfig.' + name + ' !== null"');
  a("              @change=" + '"' + "(val) => toggleDistribute('" + name + "', val)" + '"');
  a('              @click.stop');
  a('            />');
  a('          </div>');
  a('        </template>');
  a('        <div v-if="distributedConfig.' + name + '" class="module-form-area">');
  a('          <el-form :model="distributedConfig.' + name + '" label-width="140px" class="module-form">');
}
