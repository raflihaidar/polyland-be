module.exports = {
  apps: [
    {
      name: "api",
      cwd: __dirname,
      script: "./dist/backend/src/app.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
    },
  ],
};
