output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.dynamodb_vault.arn
}

output "backup_vault_name" {
  description = "Name of the backup vault"
  value       = aws_backup_vault.dynamodb_vault.name
}

output "weekly_during_pitr_plan_arn" {
  description = "ARN of the weekly backup plan during PITR period"
  value       = aws_backup_plan.weekly_during_pitr.arn
}

output "weekly_post_pitr_plan_arn" {
  description = "ARN of the weekly backup plan post PITR period"
  value       = aws_backup_plan.weekly_post_pitr.arn
}

output "monthly_plan_arn" {
  description = "ARN of the monthly backup plan"
  value       = aws_backup_plan.monthly.arn
}