<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.5 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | 5.44.0 |
| <a name="provider_random"></a> [random](#provider\_random) | 3.6.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_post_watch_lambda"></a> [post\_watch\_lambda](#module\_post\_watch\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.2 |

## Resources

| Name | Type |
|------|------|
| [aws_api_gateway_deployment.api_deployment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment) | resource |
| [aws_api_gateway_method_settings.method_settings](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings) | resource |
| [aws_api_gateway_rest_api.auth_service](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api) | resource |
| [random_id.suffix](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/id) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_api_gw_api_name"></a> [api\_gw\_api\_name](#input\_api\_gw\_api\_name) | n/a | `string` | n/a | yes |
| <a name="input_api_stage_name"></a> [api\_stage\_name](#input\_api\_stage\_name) | n/a | `string` | n/a | yes |
| <a name="input_aws_region"></a> [aws\_region](#input\_aws\_region) | n/a | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | `string` | n/a | yes |
| <a name="input_openapi_spec_file"></a> [openapi\_spec\_file](#input\_openapi\_spec\_file) | Path to the OpenAPI spec file for this API | `string` | `"../openapi/spec.yaml"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_rendered_openapi_spec"></a> [rendered\_openapi\_spec](#output\_rendered\_openapi\_spec) | for debugging purposes mostly |
| <a name="output_stack_suffix"></a> [stack\_suffix](#output\_stack\_suffix) | n/a |
<!-- END_TF_DOCS -->