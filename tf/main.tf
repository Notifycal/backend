locals {
  rendered_openapi_spec = templatefile("${path.root}/${var.openapi_spec_file}", {
    version    = "v0.0.1"
    aws_region = "eu-west-1"
    lambda_functions = {
      post_watch_events_arn = module.post_watch_lambda.lambda_function_arn
    }
  })
}

resource "aws_api_gateway_rest_api" "auth_service" {
  name = "backend-api-${var.resource_suffix}"

  # OpenAPI spec file
  body = local.rendered_openapi_spec

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.auth_service.id
  stage_name  = var.api_stage_name

  # Need this to force a deployment on a change to the file as tf
  # doesn't always seem to pick it up
  stage_description = md5(local.rendered_openapi_spec)
}

resource "aws_api_gateway_method_settings" "method_settings" {
  rest_api_id = aws_api_gateway_rest_api.auth_service.id
  stage_name  = aws_api_gateway_deployment.api_deployment.stage_name

  # this means it's enabled for all paths
  method_path = "*/*"

  settings {
    data_trace_enabled = true
    metrics_enabled    = true
    logging_level      = "INFO"
  }
}

