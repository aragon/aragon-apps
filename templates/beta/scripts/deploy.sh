#!/bin/bash

set -e

cd node_modules/@aragon/os
export ENS=$(npm run deploy:devnet:ens | tail -n 1) # get last line of output
echo "Using ENS ${ENS}"
npm run deploy:devnet:apm
# extract and set ENS
cd -

cd node_modules/@aragon/id
npm install
npm run deploy:devnet
cd -

#cd ../../ # aragon-apps
#env DEBUG=true npm run publish:devnet
#cd -

npm run deploy:devnet

./node_modules/.bin/truffle test --network devnet test/docker.js
