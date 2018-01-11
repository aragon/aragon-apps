#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# check for coverage which will specify new port for ethereum client
if [ "$SOLIDITY_COVERAGE" = true ]; then
    geth_port=8555
else
    geth_port=8545
fi

DEFAULT_ACCOUNTS=5
DEFAULT_PASSWORD=""

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
    # initialize our network with the genesis block
    geth --dev init ./genesis.json
    # get accounts in dev network
    geth --dev --rpc --password ./password \
    --unlock "0" --rpccorsdomain "*" --rpcaddr "127.0.0.1" \
    --rpcport "$geth_port" --mine --targetgaslimit 9000000 --etherbase "0" &

    rpc_pid=$!
}

start_parity() {
    IFS=$'\n' addresses=($(parity account list --chain dev))

    echo $addresses

    if [ ${#addresses[@]} -lt 1 ]; then
        echo "No parity accounts found, creating ($DEFAULT_ACCOUNTS) default accounts"
        echo "(default password: \"$DEFAULT_PASSWORD\")"

        for (( i = 0; i < $DEFAULT_ACCOUNTS; i++ )); do
            parity account new --chain dev < $DEFAULT_PASSWORD\n $DEFAULT_PASSWORD\n
        done

        echo "Creating password file for default accounts..."
        if [ -e $1 ]; then
            echo "'password' file already exists" >&2
        fi

        for (( i = 0; i < $DEFAULT_ACCOUNTS; i++ )); do
            echo "$DEFAULT_PASSWORD" >> password
        done
    else
        parity --chain dev \
        --author ${addresses[2]} \
        --unlock ${addresses[0]},${addresses[1]},${addresses[2]} \
        --password ./password --geth --no-dapps \
        --tx-gas-limit 0x47E7C4 --gasprice 0x0 --gas-floor-target 0x47E7C4 \
        --reseal-on-txs all --reseal-min-period 0 \
        --jsonrpc-interface all --jsonrpc-hosts all --jsonrpc-cors="http://localhost:$geth_port" &

        rpc_pid=$!
    fi
}

check_docker() {
    # check that docker exists before attempting to pull/run images
    if ! [ -x "$(command -v docker)" ]; then
        echo 'Error: docker is not installed' >&2
    fi
}

docker_start_parity() {
    check_docker
    # pull the most stable release of parity
    docker pull parity/parity:stable-release --chain dev
    # run the container in detached mode
    docker run -d parity/parity:stable-release --chain dev
}

docker_start_geth() {
    check_docker
    # pull the latest image using the dev test network
    docker pull kunstmaan/ethereum-geth-devnet:latest
    # run the geth dev network container
    docker run -d kunstmaan/ethereum-geth-devnet:latest
}

if client_running; then
    echo "Using existing geth instance at port $geth_port"
else
    echo "Starting our own ethereum client at port $geth_port"
    case $GETH_CLIENT in
        geth )
            if [ "$DOCKER_ENABLED" = true ]; then
                docker_start_geth
            else
                start_geth
            fi
            ;;
        parity )
            if [ "$DOCKER_ENABLED" = true ]; then
                docker_start_parity
            else
                start_parity
            fi
            ;;
        * )
            echo "No ethereum client specified, using testrpc..."
            start_testrpc
            ;;
    esac
fi
