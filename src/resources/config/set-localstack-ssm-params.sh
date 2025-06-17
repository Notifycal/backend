#!/bin/bash

set -e

trap 'echo "Error in line $LINENO. Exiting..."; exit 1' ERR

put_ssm_parameter() {
    local key="$1"
    local value="$2"
    local type="$3"

    aws ssm put-parameter \
        --name "$key" \
        --value "$value" \
        --type "$type" \
        --overwrite

    if [[ $? -eq 0 ]]; then
        echo "Parameter $key added successfully."
    else
        echo "Error to add the parameter $key."
    fi
}

ENV_FILE="./.env.dev"
if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: No se encontró el archivo $ENV_FILE"
    exit 1
fi
. $ENV_FILE
export AWS_PROFILE=notifycal-localstack

key_env_prefix="/notifycal/local"
key_stack_prefix="$key_env_prefix/backend"

put_ssm_parameter "$key_stack_prefix/access-jwt-private-key" "$ACCESS_JWT_PRIVATE_KEY" "SecureString"
put_ssm_parameter "$key_stack_prefix/access-jwt-algorithm" "$ACCESS_JWT_ALGORITHM" "String"
put_ssm_parameter "$key_stack_prefix/access-jwt-issuer" "$ACCESS_JWT_ISSUER" "String"
put_ssm_parameter "$key_stack_prefix/access-jwt-audience" "$ACCESS_JWT_AUDIENCE" "String"
put_ssm_parameter "$key_stack_prefix/access-jwt-public-key" "$ACCESS_JWT_PUBLIC_KEY" "SecureString"
put_ssm_parameter "$key_stack_prefix/access-jwt-expiration" "$ACCESS_JWT_EXPIRATION" "String"
put_ssm_parameter "$key_stack_prefix/refresh-jwt-private-key" "$REFRESH_JWT_PRIVATE_KEY" "SecureString"
put_ssm_parameter "$key_stack_prefix/refresh-jwt-algorithm" "$REFRESH_JWT_ALGORITHM" "String"
put_ssm_parameter "$key_stack_prefix/refresh-jwt-issuer" "$REFRESH_JWT_ISSUER" "String"
put_ssm_parameter "$key_stack_prefix/refresh-jwt-audience" "$REFRESH_JWT_AUDIENCE" "String"
put_ssm_parameter "$key_stack_prefix/refresh-jwt-expiration" "$REFRESH_JWT_EXPIRATION" "String"
put_ssm_parameter "$key_env_prefix/providers/google/oauth/client-id" "$GOOGLE_OAUTH_CLIENT_ID" "String"
# Although, this one isn't defined in $ENV_FILE it will pick it up from your workstation - in case you have it defined
put_ssm_parameter "$key_env_prefix/providers/google/oauth/client-secret" "$GOOGLE_OAUTH_CLIENT_SECRET" "SecureString"
put_ssm_parameter "$key_env_prefix/providers/google/oauth/redirect-url" "$GOOGLE_OAUTH_CLIENT_REDIRECT_URI_LIST" "String"
put_ssm_parameter "$key_stack_prefix/refresh-jwt-public-key" "$REFRESH_JWT_PUBLIC_KEY" "SecureString"
