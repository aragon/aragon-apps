#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$rpc_pid" ] && ps -p $rpc_pid > /dev/null; then
    kill -9 $rpc_pid
  fi
}

setup_coverage_variables() {
  PORT=${PORT-8555}
  BALANCE=${BALANCE-100000}
  GAS_LIMIT=${GAS_LIMIT-0xfffffffffff}
  NETWORK_ID=${NETWORK_ID-16}
  ACCOUNTS=${ACCOUNTS-200}
}

setup_testing_variables() {
  PORT=${PORT-8545}
  BALANCE=${BALANCE-100000}
  GAS_LIMIT=${GAS_LIMIT-8000000}
  NETWORK_ID=${NETWORK_ID-15}
  ACCOUNTS=${ACCOUNTS-200}
}

rpc_running() {
  nc -z localhost "$PORT"
}

start_ganache() {
  if [ "$SOLIDITY_COVERAGE" = true ]; then
    export RUNNING_COVERAGE=true
  else
    echo "Starting ganache-cli..."
    npx ganache-cli -i ${NETWORK_ID} -l ${GAS_LIMIT} -a ${ACCOUNTS} -e ${BALANCE} -p ${PORT} -m "explain tackle mirror kit van hammer degree position ginger unfair soup bonus" > /dev/null &
    rpc_pid=$!
    echo "Waiting for ganache to launch on port "$PORT"..."

    while ! rpc_running; do
      sleep 0.1 # wait for 1/10 of the second before check again
    done

    echo "Running ganache-cli with pid ${rpc_pid} in port ${PORT}"
  fi
}

start_testrpc() {
  if [ "$SOLIDITY_COVERAGE" = true ]; then
    export RUNNING_COVERAGE=true
  else
    echo "Starting testrpc-sc..."
    npx testrpc-sc -i ${NETWORK_ID} -l ${GAS_LIMIT} -a ${ACCOUNTS} -e ${BALANCE} -p ${PORT} -m "explain tackle mirror kit van hammer degree position ginger unfair soup bonus" > /dev/null &
    rpc_pid=$!
    echo "Waiting for ganache to launch on port "$PORT"..."

    while ! rpc_running; do
      sleep 0.1 # wait for 1/10 of the second before check again
    done

    echo "Running ganache-cli with pid ${rpc_pid} in port ${PORT}"
  fi
}

echo "Buidler version $(npx buidler --version)"

if [ "$SOLIDITY_COVERAGE" = true ]; then
  setup_coverage_variables
  start_testrpc
  npx buidler coverage --network coverage "$@"
else
  setup_testing_variables
  start_ganache
  npx buidler test "$@"
fi
