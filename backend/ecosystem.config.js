module.exports = {
  apps: [{
    name: 'crm-api',
    script: './dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    // 生产环境配置
    env_file: '.env.production',
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