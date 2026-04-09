const fs = require('fs');
const c = fs.readFileSync('D:/kaifa/CRM - 1.8.0/admin/src/views/tenant-customers/Detail/BasicInfoCard.vue', 'utf8');
console.log('has_more_info:', c.includes('collapse-title">更多信息'));
console.log('has_old_title:', c.includes('系统密码</span>'));
console.log('has_moreCollapse:', c.includes('moreCollapse'));
console.log('has_passwordCollapse:', c.includes('passwordCollapse'));
console.log('has_memberPasswordStatus:', c.includes('memberPasswordStatus'));

