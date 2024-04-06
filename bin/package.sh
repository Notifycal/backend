#!/usr/bin/env bash

source_folder="dist"
target_folder="$(mktemp -d /tmp/dist.XXXXX)"
openapi_spec="openapi/spec.yaml"

# lambdas live in `dist/api/*` and `dist/*`. Need to search for `index.mjs`
# Create a zip file per lambda
find ${source_folder} -type f -name 'index.mjs' | while read -r file; do
  target_lambda_zip=$(dirname "${file}")
  source_folder=$target_lambda_zip
  target_lambda_zip="${target_folder}/${target_lambda_zip//dist\//}.zip"

  echo "Lambda function found: ${file}"
  echo "Target lambda zip: ${target_lambda_zip}"

  echo "Source folder: ${source_folder}"

  pushd "${source_folder}" > /dev/null || exit

  mkdir -p "$(dirname "${target_lambda_zip}")" > /dev/null
  zip --junk-paths "${target_lambda_zip}" ./index.*

  popd > /dev/null || exit
  echo
done

# copy openapi spec to the target folder
cp "${openapi_spec}" "${target_folder}"

# Now create a zip with all these zips + the OpenAPI YAML spec
echo "${target_folder}"
pushd "${target_folder}" > /dev/null || exit
zip -r build.zip .
popd > /dev/null || exit

# And copy it to the dist folder.
mv "${target_folder}/build.zip" "dist/"

# Cleanup
rm -rf "${target_folder}"

exit 0;
