resource "aws_sqs_queue" "get_users" {
  name                      = "get-users-${var.resource_suffix}"
  
  # TODO: FIFO? Not really, right?

  # Any message that is sent to the queue remains invisible to consumers
  # for the duration of this delay period.
  delay_seconds             = 90

  # It determines the duration during which a message remains invisible to
  # other consumers after it has been retrieved by a consumer.
  # visibility_timeout = 30
  
  # This argument is useful to provide a time period that a request could
  # wait for a message to become available in the queue. If no messages are
  # available within this time, the request will return an empty response.
  receive_wait_time_seconds = 10

  max_message_size          = 2048
  
  # If the lambda runs every X minutes, then we should be OK discarding messages after
  # that time? 
  message_retention_seconds = 86400   # 24h right now
}
