resource "aws_ssm_parameter" "payment_plans" {
  name  = "/notifycal/${var.environment}/tier-info"
  type  = "String"
  value = jsonencode(local.payment_plans)
}

resource "aws_ssm_parameter" "country_to_sms_cost_map" {
  name  = "/notifycal/${var.environment}/country-to-sms-cost-map"
  type  = "String"
  value = jsonencode(var.country_to_sms_cost_map)
}
