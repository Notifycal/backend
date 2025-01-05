data "aws_caller_identity" "current" {}

locals {
  aws_account_id = data.aws_caller_identity.current.account_id
  rendered_openapi_spec = templatefile("${path.root}/../dist/${var.openapi_spec_file}", {
    version     = var.app_version
    aws_region  = var.aws_region
    cors_origin = var.frontend_domain
    lambda_functions = {
      post_login_arn       = module.post_login_lambda_alias.lambda_alias_arn
      post_refresh_arn     = module.post_refresh_lambda_alias.lambda_alias_arn
      get_user_profile_arn = module.get_user_profile_lambda_alias.lambda_alias_arn
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
  disable_execute_api_endpoint = true
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

resource "aws_api_gateway_stage" "stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  stage_name    = var.api_stage_name
  # Need this to force a deployment on a change to the file as tf
  # doesn't always seem to pick it up
  description = md5(local.rendered_openapi_spec)
}

resource "aws_api_gateway_method_settings" "method_settings" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  stage_name  = aws_api_gateway_stage.stage.stage_name

  # this means it's enabled for all paths
  method_path = "*/*"

  settings {
    data_trace_enabled = true
    metrics_enabled    = true
    logging_level      = "INFO"
  }
}

data "aws_acm_certificate" "ssl_cert" {
  domain      = "*.${var.base_domain}"
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}

resource "aws_api_gateway_domain_name" "custom_domain" {
  domain_name              = "${var.domain_prefix}.${var.base_domain}"
  regional_certificate_arn = data.aws_acm_certificate.ssl_cert.arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Required to associate the custom domain with the API
resource "aws_api_gateway_base_path_mapping" "mapping" {
  api_id      = aws_api_gateway_rest_api.rest_api.id
  stage_name  = aws_api_gateway_stage.stage.stage_name
  domain_name = aws_api_gateway_domain_name.custom_domain.domain_name
}
