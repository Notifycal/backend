#!/usr/bin/env bash

if [[ "$DEBUG" == true ]]; then
  set -ex
fi

_GH_ORG="Notifycal"

# Default TF_TOOL is terragrunt
TF_TOOL="${TF_TOOL:-terragrunt}"

STACK_NAME=$1
STACK_VERSION="v1.0.0"
# STACK_VERSION=$2

# current path is working dir unless there is an argument
RUNNING_PATH="$(pwd)"
if [[ $# -eq 3 ]] ; then
  RUNNING_PATH=$3
fi

echo
echo "Running $0..."
echo "==================================="
echo "STACK NAME: ${STACK_NAME}"
echo "STACK_VERSION: ${STACK_VERSION}"    # Assumes STACK_NAME == repository name
echo "PATH: $RUNNING_PATH"
echo "==================================="
echo

pushd $RUNNING_PATH > /dev/null


# echo "Retrieving outputs from ${TF_TOOL}..."
# JSON_OUTPUT=$(${TF_TOOL} output -json 2>/dev/null | jq -r '.')
# BUCKET_NAME=$(jq -r '.bucket_name.value' <<< "$JSON_OUTPUT")
# SITE_URL=$(jq -r '.site_url.value' <<< "$JSON_OUTPUT")
# echo

echo "Retrieving release from Github..."
TMP_DIR=$(mktemp -d "/tmp/${STACK_NAME}.XXXXX")
pushd "${TMP_DIR}" > /dev/null
gh release download "${STACK_VERSION}" --repo "${_GH_ORG}/${STACK_NAME}"
unzip build.zip
ls -laR
echo

# echo "Uploading to S3 static site bucket..."
# aws s3 sync --delete ./dist/ "s3://${BUCKET_NAME}"
# echo

# Display site URL
# echo "Site deployed at: ${SITE_URL}"
# echo

popd > /dev/null
popd > /dev/null

echo "Removing temp folder..."
rm -rf "${TMP_DIR}"
exit 0;
