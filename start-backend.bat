@echo off
echo Starting PHP backend server on port 8082...
if not exist logs mkdir logs
start /b php -S localhost:8082 api.php > logs/backend.log 2>&1
echo Backend started. Use 'taskkill /F /IM php.exe' to stop.
