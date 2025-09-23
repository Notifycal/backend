output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.dynamodb_vault.arn
}

output "backup_vault_name" {
  description = "Name of the backup vault"
  value       = aws_backup_vault.dynamodb_vault.name
}

output "backup_plan_arns" {
  description = "Map of backup plan ARNs by tier name"
  value       = { for k, v in aws_backup_plan.tiers : k => v.arn }
}

output "backup_plan_ids" {
  description = "Map of backup plan IDs by tier name"
  value       = { for k, v in aws_backup_plan.tiers : k => v.id }
}