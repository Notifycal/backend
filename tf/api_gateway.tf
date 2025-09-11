data "aws_caller_identity" "current" {}

locals {
  aws_account_id = data.aws_caller_identity.current.account_id
  rendered_openapi_spec = templatefile("${path.root}/../dist/${var.openapi_spec_file}", {
    version    = var.app_version
    aws_region = var.aws_region
    lambda_functions = {
      post_login_arn                   = module.post_login_lambda_alias.lambda_alias_arn
      post_refresh_arn                 = module.post_refresh_lambda_alias.lambda_alias_arn
      get_user_profile_arn             = module.get_user_profile_lambda_alias.lambda_alias_arn
      patch_user_profile_arn           = module.patch_user_profile_lambda_alias.lambda_alias_arn
      get_idp_user_calendars_arn       = module.get_idp_user_calendars_lambda_alias.lambda_alias_arn
      post_demo_reminder_arn           = module.post_demo_reminder_lambda_alias.lambda_alias_arn
      webhook_reminder_status_arn      = module.event_reminder_status_change_webhook_lambda_alias.lambda_alias_arn
      post_payment_session_arn         = module.post_payment_session_lambda_alias.lambda_alias_arn
      post_customer_portal_session_arn = module.post_customer_portal_session_lambda_alias.lambda_alias_arn
    }
  })
}

resource "aws_api_gateway_rest_api" "rest_api" {
  name = "backend-api-${var.environment}"

  # OpenAPI spec file
  body = local.rendered_openapi_spec

  fail_on_warnings = "true"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  # Don't serve requests through the default API GW url (we're using a custom domain)
  disable_execute_api_endpoint = var.api_gateway_custom_domain_enabled ? var.disable_execute_api_endpoint : false
  tags = var.api_gateway_custom_domain_enabled ? {} : {
    "_custom_id_" : "my-api" // This is used to stabilize APIGW id when APIGW is deployed on Localstack
  }
}

resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  triggers = {
    # As in the example: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment#openapi-specification
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.rest_api.body))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_cloudwatch_log_group" "api_execution_logs" {
  // Gotcha: name needs to match the log group name that API GW would use if log group is not created explitly so it picks it up
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.rest_api.id}/${var.api_stage_name}"
  retention_in_days = var.api_gateway_logging.execution_logs_retention
  tags = {
    Service = "API Gateway"
    LogType = "execution"
  }
}

resource "aws_cloudwatch_log_group" "api_access_logs" {
  name              = "/aws/apigateway/access-logs-${aws_api_gateway_rest_api.rest_api.id}/${var.api_stage_name}"
  retention_in_days = var.api_gateway_logging.access_logs_retention

  tags = {
    Service = "API Gateway"
    LogType = "access"
  }
}

resource "aws_api_gateway_stage" "stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  stage_name    = var.api_stage_name
  # Need this to force a deployment on a change to the file as tf
  # doesn't always seem to pick it up
  description = md5(local.rendered_openapi_spec)

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access_logs.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$sourceIp"
      caller           = "$context.caller"
      user             = "$context.user"
      requestTime      = "$requestTime"
      httpMethod       = "$httpMethod"
      resourcePath     = "$resourcePath"
      status           = "$status"
      protocol         = "$protocol"
      responseLength   = "$responseLength"
      responseTime     = "$responseTime"
      error            = "$error.message"
      integrationError = "$integration.error"
    })
  }

  depends_on = [
    aws_cloudwatch_log_group.api_execution_logs,
    aws_cloudwatch_log_group.api_access_logs
  ]
}

resource "aws_api_gateway_method_settings" "method_settings" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  stage_name  = aws_api_gateway_stage.stage.stage_name

  # this means it's enabled for all paths
  method_path = "*/*"

  settings {
    data_trace_enabled = var.api_gateway_logging.data_trace_enabled
    metrics_enabled    = true
    logging_level      = var.api_gateway_logging.logging_level
  }
}
