#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:8080"
API_PASSWORD="e208af72a86c45945d31ac18f0007620"  # This is the default API password from your environment

# Check if a custom API password is provided
if [ "$1" != "" ]; then
  API_PASSWORD="$1"
fi

echo "Deleting all hydrants from the system..."

# Make the API call
response=$(curl -s -X DELETE "${API_BASE_URL}/hydrants/all?password=${API_PASSWORD}" \
  -H "Content-Type: application/json")

# Parse the response (requires jq)
if command -v jq &> /dev/null; then
  success=$(echo $response | jq -r '.success')
  
  if [ "$success" = "true" ]; then
    count=$(echo $response | jq -r '.data.count')
    echo "✅ Successfully deleted $count hydrants"
  else
    error=$(echo $response | jq -r '.error')
    echo "❌ Error: $error"
    exit 1
  fi
else
  # Fallback if jq is not available
  echo "Response: $response"
  
  # Check if the response contains "success":true
  if [[ "$response" == *"\"success\":true"* ]]; then
    echo "✅ Successfully deleted all hydrants"
  else
    echo "❌ Error occurred. See full response above."
    exit 1
  fi
fi

echo "Done!"