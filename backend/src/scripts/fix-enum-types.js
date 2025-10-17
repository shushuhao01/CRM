const fs = require('fs');
const path = require('path');

// 实体文件目录
const entitiesDir = path.join(__dirname, '../entities');

// 需要修复的文件列表
const files = [
  'ProductCategory.ts',
  'OrderStatusHistory.ts', 
  'OperationLog.ts',
  'Product.ts',
  'User.ts',
  'Customer.ts',
  'Order.ts',
  'SystemConfig.ts'
];

// 修复enum类型的函数
function fixEnumTypes(content) {
  // 替换 type: 'enum' 为 type: 'varchar'
  // 并添加 length: 50 如果没有指定长度
  return content.replace(
    /(@Column\(\s*\{[^}]*?)type:\s*['"]enum['"][^}]*?enum:\s*\[[^\]]*\][^}]*?\}/gs,
    (match) => {
      // 移除 enum 属性并替换 type
      let fixed = match
        .replace(/type:\s*['"]enum['"]/, "type: 'varchar'")
        .replace(/,?\s*enum:\s*\[[^\]]*\]/, '');
      
      // 如果没有 length 属性，添加一个
      if (!fixed.includes('length:')) {
        fixed = fixed.replace(/type:\s*['"]varchar['"]/, "type: 'varchar',\n    length: 50");
      }
      
      return fixed;
    }
  );
}

// 处理每个文件
files.forEach(filename => {
  const filePath = path.join(entitiesDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`修复文件: ${filename}`);
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 修复enum类型
    const fixedContent = fixEnumTypes(content);
    
    // 写回文件
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    
    console.log(`✅ ${filename} 修复完成`);
  } else {
    console.log(`⚠️  文件不存在: ${filename}`);
  }
});

console.log('🎉 所有enum类型修复完成！');