resource "aws_ssm_parameter" "payment_plans" {
  name  = "/notifycal/${var.environment}/payment-plans"
  type  = "String"
  value = jsonencode(local.payment_plans)
}
