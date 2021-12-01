#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Set tracer
#set -o xtrace

# asign vars
ENV='default'
NETWORK=$1
DAO_ADDRESS=$2
TIME_LOCK_ADDRESS=$3
ORACLE_ADDRESS=$4

processArguments() {
  echo 'Processing args for acl..'
  RESULT=$(npx truffle exec ./scripts/processArgs.js "${DAO_ADDRESS}" "${TIME_LOCK_ADDRESS}" "${ORACLE_ADDRESS}" --network "${NETWORK}")
  PARAMS=$(echo "${RESULT}" | tail -n1)
}

grantPermission() {
  if [ $NETWORK != 'development' ]
  then
    ENV=$NETWORK
  fi
  echo Granting permission..
  dao acl grant "${PARAMS}" --env "${ENV}"
}

processArguments
grantPermission