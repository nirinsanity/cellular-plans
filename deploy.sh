# USAGE
# sh deploy.sh -s prod
# sh deploy.sh -s dev

set -e

while getopts s: flag
do
    case "${flag}" in
        s) server=${OPTARG};;
    esac
done

if [[ "$server" == "prod" ]]; then
    echo "Deploying to prod.."
    function_name="fetchCellularPlans"
else
    echo "Deploying to dev.."
    function_name="fetchCellularPlansTesting"
fi

# --- Backend: Lambda ---

echo "Installing server dependencies.."
(cd server && npm install --omit=dev)

echo "Packaging Lambda function.."
rm -f index.zip
(cd server && zip -r -q ../index.zip index.js node_modules)

FILESIZE=$(wc -c < index.zip | tr -d ' ')
FILESIZE=$(expr $FILESIZE / 1024)
echo "Lambda function size: ${FILESIZE}KB"

aws lambda update-function-code --function-name "$function_name" --zip-file fileb://index.zip

rm -f index.zip

# --- Frontend: Amplify ---
# The Amplify app is connected to this repo's main branch and auto-builds
# and deploys on push, so a prod deploy just needs to build locally first
# (to fail fast before pushing) and push to main.

if [[ "$server" == "prod" ]]; then
    echo "Building frontend.."
    npm install
    npm run build

    echo "Pushing to main - Amplify will auto-build and deploy the frontend from there.."
    git push origin main
fi
