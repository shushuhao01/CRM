const fs = require('fs');
const path = 'd:/kaifa/CRM - 1.8.0/admin/src/views/modules/Config.vue';
let c = fs.readFileSync(path, 'utf8');

// Read new template and CSS from b64 files
const newTpl = Buffer.from(fs.readFileSync('d:/kaifa/CRM - 1.8.0/tpl_new.b64', 'utf8'), 'base64').toString('utf8');
const newCss = Buffer.from(fs.readFileSync('d:/kaifa/CRM - 1.8.0/css_new.b64', 'utf8'), 'base64').toString('utf8');

// Step 1: Replace template section
const marker = 'name=' + String.fromCharCode(34) + 'features' + String.fromCharCode(34);
const featIdx = c.indexOf(marker);
if (featIdx === -1) { console.log('ERR: features marker not found'); process.exit(1); }
const tplStart = c.lastIndexOf('\n', featIdx) + 1;
const tabEndTag = '</el-tab-pane>';
const tplEnd = c.indexOf(tabEndTag, featIdx) + tabEndTag.length;
c = c.substring(0, tplStart) + newTpl + c.substring(tplEnd);
console.log('TPL replaced OK');

// Step 2: Replace CSS
const cssStartMarker = '.feature-flags-alert {';
const cssEndMarker = '.feature-save-area {';
const cssStart = c.indexOf(cssStartMarker);
if (cssStart === -1) { console.log('ERR: CSS start not found'); process.exit(1); }
const cssEndIdx = c.indexOf(cssEndMarker, cssStart);
if (cssEndIdx === -1) { console.log('ERR: CSS end not found'); process.exit(1); }
// Find the closing } of .feature-save-area
const cssEndBrace = c.indexOf('}', cssEndIdx) + 1;
c = c.substring(0, cssStart) + newCss + c.substring(cssEndBrace);
console.log('CSS replaced OK');

fs.writeFileSync(path, c, 'utf8');
console.log('File saved, size:', c.length);