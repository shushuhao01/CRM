module.exports = {
  apps: [{
    name: 'abc789.cn-backend',
    script: './dist/app.js',
    instances: 1,
    exec_mode: 'fork',
    node_args: '--max-old-space-size=512',
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
    max_memory_restart: '512M',
    restart_delay: 3000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 8000,
    max_size: '20M',
    retain: 3,
    compress: true
  }]
};
