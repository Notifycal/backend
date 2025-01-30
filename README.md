# Backend

This is meant to include all backend related stuff for now.

## Features

- Defines a REST API using an OpenAPI 3.0 spec :white_check_mark:.
  - This spec is used to setup API Gateway in AWS.
- Uses Typescript to define Lambda code. Also includes:
  - [esbuild](https://esbuild.github.io/)
  - Common build process and libraries for all lambdas within the repository.
  - Source-maps (ensure `NODE_OPTIONS=--enable-source-maps` in the Lambda env vars).
  - Watches changes and rebuilds automatically.
- Structured JSON logging format

## Requirements

- [yq](https://github.com/mikefarah/yq?tab=readme-ov-file#install)

## How to run

For local development:

```bash
# This only watches changes in Lambdas source files and bundles them. WIP
$ npm run dev
```

From the repo root:

```bash
$ npm run build
$ cd tf
$ tofu apply
```

## Unit testing

Useful commands to run your tests:

```bash
npm run test -- -t 'your text'
```

in order to run tests matching describe('your text') or it('your text').

```bash
npm run test -- --watch
```

in order to run tests as changes are made to files.

Further info can be found at: https://vitest.dev/guide/cli.html#command-line-interface

It is highly recommended Typescript compiler runs before executing the tests because test failures could waste your time. In order to do that you could:
```bash
npm run types && npm run test
```
or alternatively sourcing a shell function in your workstation like:
```bash
npmts() {
  npm run types && npm "$@"
}
```
Usage: `npmts run test`

## Watch mode

Chosen option for fast development:

1. Run a REST server (express) where we define the routes and the target function (already built).

   - Need to tie it together with the esbuild process to stop and restart the express server when changes are made to a function.

Options discarded (for now):

2. Use [AWS Official Node JS Lambda Docker image](https://gallery.ecr.aws/lambda/nodejs). This would be definitely closer to reality. Check [Dockerfile](./Dockerfile). Potential workflow:
   1. esbuild bundles the lambdas
   2. spin up 1 docker container per Lambda (programatically)
   3. have something that maps each Lambda to an endpoint and method and... this brings me back to #1.
3. [LocalStack hot reloading](https://docs.localstack.cloud/user-guide/lambda-tools/hot-reloading/#creating-the-lambda-function-1): This looks cool, but requires us to build the .zip file outside of the lambda module (currently done within) and to push it to a specific bucket (`hot-reload`) and path. I don't want to add any local-related stuff inside the actual modules, so I wonder how we could control this... Push the code to S3 for non-local too? Control it with a variable?

## Local env setup

Most of the needed configuration for local development - lambdas running on express server - live in resources/config/.env.dev. However, there are certain intergrations that need a real secret. For instance:

- google login. Set up the following env var on your workstation in your preferred way. eg: ~/.bashrc:

```bash
export GOOGLE_OAUTH_CLIENT_SECRET="the value lives in notifycal@gmail.com GCP console. Hint: https://console.cloud.google.com/apis/credentials"
```

## Bonus

### Create key pair for JWT signing

```
ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
# Don't add passphrase
openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
```

### TODO

- Tree-shaking to minimize lambda size
- X-Ray tracing
- CloudWatch App Insights
- CI
