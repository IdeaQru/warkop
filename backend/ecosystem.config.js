module.exports = {
  apps: [{
    name: 'warkop-babol',
    script: 'server.js',
    instances: 'max', // Gunakan semua CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    // Monitoring & Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto restart pada error
    autorestart: true,
    watch: false, // Jangan restart pada file changes di production
    max_memory_restart: '1G',
    
    // Restart options
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced features
    merge_logs: true,
    kill_timeout: 5000,
    
    // Instance settings
    increment_var: 'PORT',
    
    // Source map support
    source_map_support: true
  }],


};
