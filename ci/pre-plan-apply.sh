#!/usr/bin/env bash

if [[ "$DEBUG" == true ]]; then
  set -ex
fi

_GH_ORG="Notifycal"
OUT_DIR=dist

# Default TF_TOOL is terragrunt
TF_TOOL="${TF_TOOL:-terragrunt}"

STACK_NAME=$1
STACK_VERSION=$2

# running path is the working dir as this script makes "changes" in the
# actual TF "execution folder"
RUNNING_PATH="$(pwd)"

echo
echo "Running $0..."
echo "==================================="
echo "STACK NAME: ${STACK_NAME}"
echo "STACK_VERSION: ${STACK_VERSION}"    # Assumes STACK_NAME == repository name
echo "PATH: $RUNNING_PATH"
echo "==================================="
echo


echo "Retrieving release from Github..."
TMP_DIR=$(mktemp -d "/tmp/${STACK_NAME}.XXXXX")
gh release download "${STACK_VERSION}" --repo "${_GH_ORG}/${STACK_NAME}" --dir "${TMP_DIR}"

rm -rf "${OUT_DIR}"
unzip "${TMP_DIR}/build.zip" -d "${OUT_DIR}/"
echo -e "Download finished!\n"

echo "Removing temp folder..."
rm -rf "${TMP_DIR}"
exit 0;
