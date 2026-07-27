module.exports = {
  apps: [
    {
      name: "api",
      cwd: __dirname,
      script: "./backend/src/a.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
    },
  ],
};
