module.exports = {
  apps: [
    {
      name: "polyland-api",
      script: "./dist/backend/src/app.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
