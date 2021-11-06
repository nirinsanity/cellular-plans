while getopts s:a:f: flag
do
    case "${flag}" in
        s) server=${OPTARG};;
        # a) age=${OPTARG};;
        # f) fullname=${OPTARG};;
    esac
done
if [[ -z "$server" || "$server" != "prod" ]]; then
    echo "Deploying to dev.."
    function_name="fetchCellularPlansTesting"
elif [[ "$server" == "prod" ]]; then
    echo "Deploying to prod.."
    function_name="fetchCellularPlans"
fi

powershell Compress-Archive -Path "server/index.js", "server/node_modules" -Update -DestinationPath "index.zip"
FILENAME=index.zip
FILESIZE=$(stat -c%s "$FILENAME")
FILESIZE=`expr $FILESIZE / 1024`
echo $FILESIZE KB

aws lambda update-function-code --function-name $function_name --zip-file fileb://index.zip

if [[ "$server" == "prod" ]]; then
    git push origin main
fi

rm -rf index.zip