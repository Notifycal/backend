resource "aws_ssm_parameter" "payment_plans" {
  name  = "/notifycal/${var.environment}/tier-info"
  type  = "String"
  value = jsonencode(local.payment_plans)
}
