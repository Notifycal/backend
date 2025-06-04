# output "event_bus_name" {
#   value = aws_cloudwatch_event_bus.stripe.name
# }

# output "event_bus_arn" {
#   value = aws_cloudwatch_event_bus.stripe.arn
# }

# output "sqs_queue_url" {
#   value = aws_sqs_queue.stripe_webhook.url
# }

output "debug_info" {
  value = <<EOF
Para verificar el Event Destination en Stripe:
1. Dashboard → Developers → Events (no Webhooks)
2. En la parte superior, busca "Event destinations" tab
3. Si no aparece, verifica en: https://dashboard.stripe.com/events/destinations

Para verificar en AWS:
aws events list-partner-event-sources --region ${var.aws_region}
EOF
}