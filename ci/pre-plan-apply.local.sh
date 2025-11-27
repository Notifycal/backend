#!/usr/bin/env bash

if [[ "$DEBUG" == true ]]; then
  set -ex
fi
STACK_NAME="$1"
REPOSITORY="${STACK_NAME//_/-}"
STACK_VERSION="$2"
REPO_PATH="$(realpath "$(dirname "$(dirname "$0")")")"

# running path is the working dir as this script makes "changes" in the
# actual TF "execution folder"
RUNNING_PATH="$(pwd)"

echo
echo "Running $0..."
echo "==================================="
echo "STACK NAME: ${STACK_NAME}"
echo "REPOSITORY: ${REPOSITORY}"
echo "STACK_VERSION: ${STACK_VERSION}"    # Assumes STACK_NAME == repository name
echo "PWD: $RUNNING_PATH"
echo "REPO_PATH: $REPO_PATH"
echo "==================================="
echo

echo "Creating adhoc build..."
pushd "${REPO_PATH}" > /dev/null
npm install
npm run build && npm run package && pushd dist && unzip -o build.zip && popd
popd > /dev/null

exit 0;
