#!/bin/bash

# Extract the base URL from the other script
BASE_URL=$(grep -o 'BASE_URL="[^"]*"' delete-all-alerts.sh | cut -d'"' -f2)
# Extract the base part without the endpoint
API_BASE="${BASE_URL%/api/alerts}"
# Create logs endpoint
LOGS_URL="${API_BASE}/api/logs"

# Default format is json
FORMAT=${1:-json}

echo "=== Fetching logs ==="
# Make request to logs endpoint with proper content type header
response=$(curl -s -H "Content-Type: application/json" -H "Accept: application/json" $LOGS_URL)

# Check if the response is valid JSON
if ! echo "$response" | jq . > /dev/null 2>&1; then
  echo "Error: Invalid JSON response"
  echo "Response: $response"
  exit 1
fi

# Output based on format
if [ "$FORMAT" = "pretty" ]; then
  echo "$response" | jq .
else
  echo "$response"
fi