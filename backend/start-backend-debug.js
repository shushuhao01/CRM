/**
 * 后端服务调试启动脚本
 */

// 设置环境变量
process.env.NODE_ENV = 'development';

console.log('🚀 开始启动后端服务（调试模式）...\n');

// 加载并运行app.ts
require('ts-node/register');

try {
  require('./src/app.ts');
  console.log('✅ 后端服务启动脚本加载成功');
} catch (error) {
  console.error('❌ 后端服务启动失败:');
  console.error(error);
  process.exit(1);
}
