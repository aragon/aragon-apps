#!/bin/bash

set -e

cd node_modules/@aragon/os
printf "\nInstalling aragonOS dependencies...\n"
npm install
printf "\nDeploying test ENS instance...\n"
export ENS=$(npm run deploy:devnet:ens | tail -n 1) # get last line of output
printf "Using ENS ${ENS}"
printf "\nDeploying test APM instance...\n"
npm run deploy:devnet:apm
# extract and set ENS
cd -

cd node_modules/@aragon/id
printf "\nInstalling aragon-id dependencies...\n"
npm install
printf "\nDeploying test aragon-id instance...\n"
npm run deploy:devnet

cd -
printf "\nDeploying beta templates...\n"
npm run deploy:devnet

printf "\nRunning tests...\n"
./node_modules/.bin/truffle test --network devnet test/docker.js
