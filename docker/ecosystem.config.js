module.exports = {
    apps: [{
      name: 'jimbot',
      script: 'bin/jimbot.js',
      instances: "max",
      autorestart: true,
      watch: 'bin/**/*.js',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'jimbot-watcher',
      script: 'npm start',
      instances: 1,
      autorestart: true,
      watch: 'tsconfig.json',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }]
  };