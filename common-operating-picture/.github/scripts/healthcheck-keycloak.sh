#!/bin/bash

# Check if an endpoint is provided as an argument
if [ -z "$1" ]; then
  echo "Usage: $0 <endpoint>"
  exit 1
fi

endpoint=$1
end_time=$((SECONDS + 180)) # Calculate the end time (current time + 3 minutes)

# Initial wait for 20 seconds
sleep 20

while [ $SECONDS -lt $end_time ]; do
  # Perform the curl request and capture the HTTP status code
  http_status=$(curl -k -s -o /dev/null -w "%{http_code}" "$endpoint")
  
  # Check if the HTTP status code is 200 (success)
  if [ "$http_status" -eq 200 ]; then
    echo "Received healthy response from keycloak at $endpoint"
    exit 0
  else 
    echo "Received unhealthy $http_status response from keycloak at $endpoint"
  fi
  
  # Wait for 5 seconds before the next request
  sleep 5
done

echo "Failed to receive a successful response from $endpoint within 3 minutes"
exit 1