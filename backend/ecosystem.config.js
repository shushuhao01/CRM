module.exports = {
  apps: [{
    name: 'abc789.cn-backend',
    script: './dist/app.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.local',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // 日志大小限制：超过 50MB 自动轮转
    max_size: '50M',
    // 最多保留 3 个旧日志文件
    retain: 3,
    // 旧日志压缩
    compress: true
  }]
};
