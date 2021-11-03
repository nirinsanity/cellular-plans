# This deploy file only deploys lambda functions to the server

powershell Compress-Archive -Path "server/samplePhoneNumbers.json", "server/index.js", "server/node_modules" -Update -DestinationPath "index.zip"
aws lambda update-function-code --function-name fetchCellularPlans --zip-file fileb://index.zip
rm -rf index.zip
read -p "Pause"