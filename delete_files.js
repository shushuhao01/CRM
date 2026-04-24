const fs = require('fs');
const path = require('path');

const files = [
    'D:\\kaifa\\CRM - 1.8.0\\admin\\src\\views\\wecom\\VasConfig.vue',
    'D:\\kaifa\\CRM - 1.8.0\\admin\\src\\views\\wecom\\PackageTemplate.vue',
    'D:\\kaifa\\CRM - 1.8.0\\admin\\src\\views\\wecom\\ChatArchiveManagement.vue'
];

console.log('Deleting files...\n');

files.forEach((file, index) => {
    try {
        fs.unlinkSync(file);
        console.log(`✓ File ${index + 1} deleted: ${file}`);
    } catch (error) {
        console.error(`✗ Error deleting file ${index + 1}: ${error.message}`);
    }
});

console.log('\nVerifying deletions...\n');

files.forEach((file, index) => {
    const exists = fs.existsSync(file);
    console.log(`File ${index + 1} exists: ${exists} - ${file}`);
});
