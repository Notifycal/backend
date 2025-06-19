locals {
  common_lambda_env_vars = {
    # This is required for sourcemaps to work
    NODE_OPTIONS            = "--enable-source-maps"
    ENVIRONMENT             = var.environment
    APP_VERSION             = var.app_version
    AWS_LAMBDA_EXEC_WRAPPER = "/opt/otel-instrument"
  }
  common_api_lambda_env_vars = {
    FRONTEND_DOMAIN = var.frontend_domain
  }
  users_persistance_env_vars = {
    USERS_TABLE_NAME = aws_dynamodb_table.users.name
  }
  live_users_index_persistance_env_vars = {
    LIVE_USERS_INDEX_NAME = local.live_users_index_name
  }
  refresh_token_persistance_env_vars = {
    REFRESH_TOKENS_TABLE_NAME = aws_dynamodb_table.refresh_tokens.name
  }
  decode_access_jwt_env_vars = {
    ACCESS_JWT_PUBLIC_KEY = var.jwt_keys.access.public_key
    ACCESS_JWT_ALGORITHM  = var.jwt_config.access.algorithm
    ACCESS_JWT_ISSUER     = var.jwt_config.access.issuer
    ACCESS_JWT_AUDIENCE   = var.jwt_config.access.audience
    ACCESS_JWT_EXPIRATION = var.jwt_config.access.expiration
  }
  protected_endpoint_env_vars = local.decode_access_jwt_env_vars

  login_and_refresh_env_vars = merge({
    ACCESS_JWT_PRIVATE_KEY  = var.jwt_keys.access.private_key
    REFRESH_JWT_PUBLIC_KEY  = var.jwt_keys.refresh.public_key
    REFRESH_JWT_PRIVATE_KEY = var.jwt_keys.refresh.private_key
    REFRESH_JWT_ALGORITHM   = var.jwt_config.refresh.algorithm
    REFRESH_JWT_ISSUER      = var.jwt_config.refresh.issuer
    REFRESH_JWT_AUDIENCE    = var.jwt_config.refresh.audience
    REFRESH_JWT_EXPIRATION  = var.jwt_config.refresh.expiration
  }, local.decode_access_jwt_env_vars, local.users_persistance_env_vars, local.refresh_token_persistance_env_vars)

  messaging_topic_env_vars = {
    MESSAGING_TOPIC_ARN = module.messaging_topic.sns_topic_arn
  }

  emailing_topic_env_vars = {
    EMAILING_TOPIC_ARN = module.emailing_topic.sns_topic_arn
  }

  email_to_be_sent_topic_env_vars = {
    EMAIL_TO_BE_SENT_TOPIC_ARN = module.email_to_be_sent_topic.sns_topic_arn
  }
  api_rest_topic_env_vars = {
    API_REST_TOPIC_ARN = module.api_rest_topic.sns_topic_arn
  }

  idempotency_persistance_env_vars = {
    IDEMPOTENCY_PERSISTENCE_CONFIG = local.lambda_idempotency_table_config
  }

  business_alerts_persistance_env_vars = {
    BUSINESS_ALERTS_TABLE_NAME = aws_dynamodb_table.business_alerts.name
  }

  google_idp_config_env_vars = {
    GOOGLE_OAUTH_CLIENT_ID                = var.google_oauth_config.client_id
    GOOGLE_OAUTH_CLIENT_SECRET            = var.google_oauth_config.client_secret
    GOOGLE_OAUTH_CLIENT_REDIRECT_URI_LIST = jsonencode(var.google_oauth_config.redirect_url_list)
  }
  idps_configs_env_vars = local.google_idp_config_env_vars

  payment_plans_env_vars = {
    PAYMENT_PLANS = jsonencode(local.payment_plans)
  }

  common_tags = {}

  # Timeout for API Lambdas. API Gateway will timeout after 30s in any case
  api_lambdas_timeout           = 30
  lambdas_publish               = true
  lambdas_create_package        = false
  lambdas_attach_tracing_policy = var.enable_xray_active_tracing
  lambdas_tracing_mode          = var.enable_xray_active_tracing ? "Active" : "PassThrough"

  lambdas_shared_iam_policies = [
    data.aws_iam_policy.insights.arn,
    data.aws_iam_policy.appsignals.arn
  ]

  otel_lambda_layer     = "arn:aws:lambda:${var.aws_region}:615299751070:layer:AWSOpenTelemetryDistroJs:6"
  insights_lambda_layer = "arn:aws:lambda:${var.aws_region}:580247275435:layer:LambdaInsightsExtension:55"

  lambdas_layers = var.observability != null ? [
    local.insights_lambda_layer,
    local.otel_lambda_layer
  ] : []

  all_lambdas = {
    get_idp_user_calendars               = module.get_idp_user_calendars_lambda,
    get_user_profile                     = module.get_user_profile_lambda,
    patch_user_profile                   = module.patch_user_profile_lambda,
    post_login                           = module.post_login_lambda,
    post_refresh                         = module.post_refresh_lambda,
    post_demo_reminder                   = module.post_demo_reminder_lambda,
    event_reminder_status_change_webhook = module.event_reminder_status_change_webhook_lambda,
    fetch_user_calendars                 = module.fetch_user_calendars_lambda,
    audit_trail                          = module.audit_trail_lambda,
    find_actionable_events               = module.find_actionable_events_lambda,
    send_event_reminder                  = module.send_event_reminder_lambda
    send_email                           = module.send_email_lambda
    alert_for_missing_phone_number       = module.alert_for_missing_phone_number_lambda
    post_payment_session                 = module.post_payment_session_lambda
    post_customer_portal_session         = module.post_customer_portal_session_lambda
    stripe_webhook                       = module.stripe_webhook_lambda
    # TODO: Add new lambdas here
  }
}

# appsignals/otel AWS Managed Policy
data "aws_iam_policy" "appsignals" {
  name = "CloudWatchLambdaApplicationSignalsExecutionRolePolicy"
}

# lambda insights AWS Managed Policy
data "aws_iam_policy" "insights" {
  name = "CloudWatchLambdaInsightsExecutionRolePolicy"
}
