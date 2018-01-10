#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

if [ "$SOLIDITY_COVERAGE" = true ]; then
    geth_port=8555
else
    geth_port=8545
fi

client_running() {
    nc -z localhost "$geth_port"
}

start_testrpc() {
    if [ "$SOLIDITY_COVERAGE" = true ]; then
    node_modules/.bin/testrpc-sc -i 16 --gasLimit 0xfffffffffff --port "$geth_port"  > /dev/null &
    else
    node_modules/.bin/ganache-cli -i 15 --gasLimit 7000000 > /dev/null &
    fi

    rpc_pid=$!
}

start_geth() {
    # initialize our network with the genesis block and start our network
    # node with unlocked accounts and has mining enabled
    geth --dev init ./genesis.json && \
    geth --dev --rpc --password ./password \
    --unlock "0" --rpccorsdomain "*" --rpcaddr "127.0.0.1" \
    --rpcport "$geth_port" --targetgaslimit 0x47E7C4 --etherbase "0"

    rpc_pid=$!
}

start_parity() {
    # extract current accounts on the dev chain network
    IFS=$'\n' addresses=($(parity account list --chain dev))

    if [ ${#addresses[@]} -lt 1 ]; then
        # bail out if we have no accounts to work with
        echo "No parity accounts found, please create at least one account (parity account new --chain dev)"
    else
        echo "Using parity account ${addresses[0]}"
        # start our parity client
        parity --chain dev \
        --author ${addresses[0]} \
        --unlock ${addresses[0]} \
        --password ./node_modules/@aragon/test-helpers/password --geth --no-dapps \
        --tx-gas-limit 0x47E7C4 --gasprice 0x0 --gas-floor-target 0x47E7C4 \
        --reseal-on-txs all --reseal-min-period 0 \
        --jsonrpc-interface all --jsonrpc-hosts all --jsonrpc-cors="http://localhost:$geth_port"
    fi
}

if client_running; then
    echo "Using existing geth instance at port $geth_port"
else
    echo "Starting our own ethereum client at port $geth_port"
    case $GETH_CLIENT in
        geth )
            start_geth
            ;;
        parity )
            start_parity
            ;;
        * )
            echo "No ethereum client specified, using testrpc..."
            start_testrpc
            ;;
    esac
fi
