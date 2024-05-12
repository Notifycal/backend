#!/bin/bash

if [ -z "$USERS_TABLE_NAME" ]; then
  echo "Error: USERS_TABLE_NAME environment variable is not set."
  exit 1
fi

# Number of random emails to generate (10 by default)
count="${1:-10}"
max_batch_size=10

# Use curl to fetch data from randomuser.me API
response=$(curl -s "https://randomuser.me/api/?results=${count}&inc=email")
batch_items=$(echo "${response}" | jq -c '[.results[].email | {PutRequest: {Item: {"UserId": {"S": .}}}}]')
total_emails=$(echo "${batch_items}" | jq '. | length')

# Split the items into chunks and write to DynamoDB
for ((i=0; i<total_emails; i+=max_batch_size)); do
  # Calculate the upper limit for the current batch
  upper_limit=$((i + max_batch_size))
  if [ $upper_limit -gt "${total_emails}" ]; then
    upper_limit=$total_emails
  fi
  
  # Extract the current batch
  current_batch=$(echo "${batch_items}" | jq ".[$i:$upper_limit]")

  # Perform batch write operation
  aws dynamodb batch-write-item --request-items "{\"$USERS_TABLE_NAME\": $current_batch}"
  echo "Inserted a batch of up to ${max_batch_size} items into DynamoDB"
done

exit 0;
