module.exports = {
  apps: [
    {
      name: 'legalflow',
      script: 'backend/server.js',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/legalflow',
        JWT_SECRET: 'legalflow_super_secret_jwt_key_2026_india',
        FRONTEND_URL: '*'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
