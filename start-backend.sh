#!/bin/bash

# Start PHP backend server on port 8082
echo "Starting PHP backend server on port 8082..."
php -S localhost:8082 api.php > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Keep the script running
wait $BACKEND_PID
