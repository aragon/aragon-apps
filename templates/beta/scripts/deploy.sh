#!/bin/bash

set -e

cd ../../../aragonOS
export ENS=$(npm run deploy:devnet:ens | tail -n 1) # get last line of output
echo "Using ENS ${ENS}"
npm run deploy:devnet:apm
# extract and set ENS

cd ../aragon-id
npm run deploy:devnet

cd ../aragon-apps
#env DEBUG=true npm run publish:devnet

cd templates/beta
npm run deploy:devnet

cd node_modules/@aragon/test-helpers
npm install
cd ../../../

./node_modules/.bin/truffle test --network devnet test/docker.js
