#!/bin/bash
sleep 5
IFS=$'\n' 
cd ../../shared/integrations/StandardBounties
BOUNT_ADDR=($(./node_modules/.bin/truffle migrate --network development | grep "^0x[[:alnum:]]\{40\}"))
echo "Bounties Addresses: ${BOUNT_ADDR[*]}"
BOUNT_ADDR=($(./node_modules/.bin/truffle migrate --network development | grep "^0x[[:alnum:]]\{40\}"))
echo "Alternate Bounties Addresses: ${BOUNT_ADDR[*]}"
#./node_modules/.bin/truffle version
#./node_modules/.bin/truffle migrate --network development
cd ../../../apps/projects
unset IFS
BOUNT_ADDR=${BOUNT_ADDR[*]} truffle test --network rpc
