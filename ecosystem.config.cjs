module.exports = {
  apps: [
    {
      name: "flexdesk",
      script: "./dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production"
      },
      // output: "./logs/out.log",
      // error: "./logs/error.log",
      // merge_logs: true,
      // time: true
    }
  ]
};
