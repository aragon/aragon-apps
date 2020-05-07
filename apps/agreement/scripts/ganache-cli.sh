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

ganache_port=8545

rpc_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  if [ "$SOLIDITY_COVERAGE" = true ]; then
    export RUNNING_COVERAGE=true
  else
    echo "Starting our own ganache instance"

    node_modules/.bin/ganache-cli -l 8000000 --port "$ganache_port" -m "explain tackle mirror kit van hammer degree position ginger unfair soup bonus" > /dev/null &

    rpc_pid=$!

    echo "Waiting for ganache to launch on port "$ganache_port"..."

    while ! rpc_running; do
      sleep 0.1 # wait for 1/10 of the second before check again
    done

    echo "Ganache launched!"
  fi
}

if rpc_running; then
  echo "Using existing ganache instance"
else
  start_ganache
fi

echo "Buidler version $(npx buidler --version)"

if [ "$SOLIDITY_COVERAGE" = true ]; then
  node_modules/.bin/buidler coverage --network coverage "$@"
else
  node_modules/.bin/buidler test "$@"
fi
