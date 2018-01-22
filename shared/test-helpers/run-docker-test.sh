#!/usr/bin/env bash

./node_modules/@aragon/test-helpers/manage-nodes.sh
truffle test --network rpc
exit_code=$?
docker stop $(docker ps -aq)
exit $exit_code
