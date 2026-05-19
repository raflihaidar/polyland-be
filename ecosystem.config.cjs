module.exports = {
  apps: [
    {
      name: "polyland-api",

      script: "./backend/src/app.ts",

      interpreter: "node",

      interpreter_args:
        "--experimental-transform-types --max_old_space_size=1400 --env-file=.env",

      watch: false,

      autorestart: true,

      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
