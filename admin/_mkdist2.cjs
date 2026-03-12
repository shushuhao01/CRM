// Generate Distribute.vue with full config forms
const fs = require('fs');
const dst = 'd:/kaifa/CRM - 1.8.0/admin/src/views/modules/Distribute.vue';

// We build the content using hex-encoded segments decoded at runtime
// First segment: template section
const parts = [];

// Read base64 encoded content from companion file
const b64 = fs.readFileSync('d:/kaifa/CRM - 1.8.0/admin/_dist_b64.txt', 'utf8').trim();
const content = Buffer.from(b64, 'base64').toString('utf8');
fs.writeFileSync(dst, content, 'utf8');
console.log('Distribute.vue written, size:', content.length);
