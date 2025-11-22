// PM2 配置文件 - 宝塔面板生产环境
module.exports = {
  apps: [{
    name: 'crm-backend',
    script: './dist/app.js',
    cwd: '/www/wwwroot/abc789.cn/backend',
    instances: 1,
    exec_mode: 'fork',
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      API_PREFIX: '/api/v1'
    },
    
    // 自动重启配置
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // 日志配置
    log_file: '/www/wwwlogs/crm-backend.log',
    out_file: '/www/wwwlogs/crm-backend-out.log',
    error_file: '/www/wwwlogs/crm-backend-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 内存和CPU限制
    max_memory_restart: '500M',
    
    // 启动延迟
    wait_ready: true,
    listen_timeout: 10000,
    
    // 进程管理
    kill_timeout: 5000,
    restart_delay: 4000,
    
    // 健康检查
    health_check_grace_period: 3000
  }],
  
  // 部署配置（可选）
  deploy: {
    production: {
      user: 'www',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/crm.git',
      path: '/www/wwwroot/abc789.cn',
      'post-deploy': 'cd backend && npm install --production && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};  error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    autorestart: true
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: 'abc789.cn',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/crm-system.git',
      path: '/var/www/crm-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};