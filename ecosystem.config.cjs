module.exports = {
  apps: [
    {
      name: "polyland-api",
      script: "backend/src/app.ts",
      interpreter: "npx",
      args: "tsx",
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
    },
  ],
};
