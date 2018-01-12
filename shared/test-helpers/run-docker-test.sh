#!/usr/bin/env bash

DOCKER_ENABLED=true ./node_modules/@aragon/test-helpers/testrpc.sh
truffle test --network rpc
docker stop $(docker ps -aq)
