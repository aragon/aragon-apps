#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit -o pipefail

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the RPC instance that we started (if we started one and if it's still running).
  if [ -n "$rpc_pid" ] && ps -p $rpc_pid > /dev/null; then
    kill -9 $rpc_pid
  fi
}

start_ganache() {
  echo "Starting ganache-cli..."
  npx ganache-cli -i ${NETWORK_ID} -l ${GAS_LIMIT} -e ${BALANCE} -p ${PORT} > /dev/null &
  rpc_pid=$!
  sleep 3
  echo "Running ganache-cli with pid ${rpc_pid}"
}

start_testrpc() {
  echo "Starting testrpc-sc..."
  npx testrpc-sc -i ${NETWORK_ID} -l ${GAS_LIMIT} -e ${BALANCE} -p ${PORT} > /dev/null &
  rpc_pid=$!
  sleep 3
  echo "Running testrpc-sc with pid ${rpc_pid}"
}

measure_coverage() {
  echo "Measuring coverage..."
  npx solidity-coverage "$@"
}

run_tests() {
  echo "Running tests..."
  npx truffle test --network rpc "$@"
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  PORT=8555
  BALANCE=10000
  GAS_LIMIT=0xfffffffffff
  NETWORK_ID=16

  start_testrpc
  measure_coverage
else
  PORT=8545
  BALANCE=100000
  GAS_LIMIT=50000000
  NETWORK_ID=15

  start_ganache
  run_tests
fi
