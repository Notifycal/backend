#!/usr/bin/env bash

set -e  # Exit on any command failure

# Function to handle errors
error_handler() {
  echo "Error: yq failed to process the OpenAPI spec." >&2
  exit 1
}

# Trap to catch any failure from yq command
trap 'error_handler' ERR

npm run clean
NODE_ENV=production node esbuild.js

# simplifying OpenAPI spec to something API Gateway understands
# ie: no yaml anchors
yq -o=yaml 'explode(.)' openapi/spec.yaml > dist/spec.rendered.yaml

exit 0;
