// Node.js 16 crypto 兼容性修复脚本
// 解决 crypto.getRandomValues 不存在的问题

const crypto = require('crypto');

// 检查是否需要修复
if (!global.crypto) {
  console.log('🔧 正在修复 Node.js 16 crypto 兼容性问题...');
  
  // 创建 crypto 对象
  global.crypto = {
    getRandomValues: function(array) {
      // 使用 Node.js 的 crypto.randomBytes 来实现
      const bytes = crypto.randomBytes(array.length);
      for (let i = 0; i < array.length; i++) {
        array[i] = bytes[i];
      }
      return array;
    },
    
    // 添加其他可能需要的 crypto 方法
    randomUUID: function() {
      return crypto.randomUUID ? crypto.randomUUID() : 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }
  };
  
  console.log('✅ crypto 兼容性修复完成');
} else {
  console.log('✅ crypto 对象已存在，无需修复');
}

// 检查 globalThis
if (typeof globalThis === 'undefined') {
  console.log('🔧 正在修复 globalThis 兼容性问题...');
  global.globalThis = global;
  console.log('✅ globalThis 兼容性修复完成');
}

// 检查 TextEncoder/TextDecoder
if (!global.TextEncoder) {
  console.log('🔧 正在修复 TextEncoder/TextDecoder 兼容性问题...');
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
  console.log('✅ TextEncoder/TextDecoder 兼容性修复完成');
}

// 检查 fetch (Node.js 16 没有内置 fetch)
if (!global.fetch) {
  console.log('🔧 检测到缺少 fetch，建议安装 node-fetch');
  try {
    const fetch = require('node-fetch');
    global.fetch = fetch;
    console.log('✅ fetch 兼容性修复完成');
  } catch (e) {
    console.log('⚠️ node-fetch 未安装，可能需要手动安装: npm install node-fetch@2');
  }
}

console.log('🎉 Node.js 16 兼容性检查完成！');

module.exports = {
  setupNode16Compatibility: function() {
    // 这个函数可以在其他地方调用来确保兼容性
    return true;
  }
};