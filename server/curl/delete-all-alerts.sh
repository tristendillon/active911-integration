#!/bin/bash

# Set the base URL - change this to match your API endpoint
BASE_URL="https://252d-2600-8803-2b1e-9200-58df-de2c-b763-365b.ngrok-free.app/api/alerts"

echo "=== Fetching all alerts ==="
# Get all alerts with proper content type header
response=$(curl -s -H "Content-Type: application/json" -H "Accept: application/json" $BASE_URL)

# Check if the response is valid JSON
if ! echo "$response" | jq . > /dev/null 2>&1; then
  echo "Error: Invalid JSON response"
  echo "Response: $response"
  exit 1
fi

echo "Response:"
echo "$response"

# Extract alert IDs
alert_ids=$(echo "$response" | jq -r '.[].alert.id')

# Count how many alerts were found
count=$(echo "$alert_ids" | grep -v '^$' | wc -l)
echo "Found $count alerts to delete"

# If no alerts were found
if [ "$count" -eq 0 ]; then
  echo "No alerts to delete"
  exit 0
fi

# Confirm before proceeding
read -p "Do you want to delete all $count alerts? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Operation cancelled"
  exit 0
fi

# Delete each alert
success_count=0
error_count=0

for id in $alert_ids; do
  echo -n "Deleting alert with ID: $id... "

  # Send delete request with proper content type header
  delete_response=$(curl -s -w "\n%{http_code}" -X DELETE -H "Content-Type: application/json" -H "Accept: application/json" $BASE_URL/$id)

  # Extract status code
  status_code=$(echo "$delete_response" | tail -n1)

  # Check if deletion was successful
  if [[ $status_code -ge 200 && $status_code -lt 300 ]]; then
    echo "Success (Status: $status_code)"
    ((success_count++))
  else
    response_body=$(echo "$delete_response" | sed '$d')
    echo "Failed (Status: $status_code)"
    echo "Error message: $response_body"
    ((error_count++))
  fi
done

echo "=== Deletion Summary ==="
echo "Total alerts processed: $count"
echo "Successfully deleted: $success_count"
echo "Failed to delete: $error_count"

# Verify deletion by fetching all alerts again
echo -n "Verifying deletion... "
response=$(curl -s -H "Content-Type: application/json" -H "Accept: application/json" $BASE_URL)
remaining=$(echo "$response" | jq -r '.[].alert.id' | grep -v '^$' | wc -l)
echo "found $remaining remaining alerts"

if [ "$remaining" -eq 0 ]; then
  echo "All alerts successfully deleted!"
else
  echo "Warning: Some alerts remain in the system"
fi