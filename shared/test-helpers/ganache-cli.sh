#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

setup_coverage_variables() {
  PORT=${PORT-8555}
  BALANCE=${BALANCE-100000}
  GAS_LIMIT=${GAS_LIMIT-0xfffffffffff}
  NETWORK_ID=${NETWORK_ID-16}
}

setup_testing_variables() {
  PORT=${PORT-8545}
  BALANCE=${BALANCE-100000}
  GAS_LIMIT=${GAS_LIMIT-8000000}
  NETWORK_ID=${NETWORK_ID-15}
}

start_ganache() {
  echo "Starting ganache-cli..."
  npx ganache-cli -i ${NETWORK_ID} -l ${GAS_LIMIT} -e ${BALANCE} -p ${PORT} > /dev/null &
  rpc_pid=$!
  sleep 3
  echo "Running ganache-cli with pid ${rpc_pid} in port ${PORT}"
}

start_testrpc() {
  echo "Starting testrpc-sc..."
  npx testrpc-sc -i ${NETWORK_ID} -l ${GAS_LIMIT} -e ${BALANCE} -p ${PORT} > /dev/null &
  rpc_pid=$!
  sleep 3
  echo "Running testrpc-sc with pid ${rpc_pid} in port ${PORT}"
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
  setup_coverage_variables
  start_testrpc
  measure_coverage
else
  setup_testing_variables
  start_ganache
  run_tests
fi
