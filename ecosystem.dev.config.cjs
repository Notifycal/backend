// Config file for PM2 for local development
module.exports = {
  apps: [
    {
      name: 'express-local-server',
      script: './express-local/index.js',
      node_args: '--env-file=src/resources/config/.env.dev --enable-source-maps',
      watch: ['dist/lambdas/**/*']
    },
    {
      name: 'esbuild',
      script: './esbuild.js',
      args: '--watch'
    }
  ]
};
