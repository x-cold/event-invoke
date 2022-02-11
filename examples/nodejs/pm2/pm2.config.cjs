// pm2.config.cjs
module.exports = {
  apps: [
    {
      script: 'invoker.js',
      name: 'invoker',
      exec_mode: 'fork',
    },
    {
      script: 'callee.js',
      name: 'callee',
      exec_mode: 'fork',
    }
  ],
};
