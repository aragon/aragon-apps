#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

if [ "$SOLIDITY_COVERAGE" = true ]; then
	testrpc_port=8555
else
	testrpc_port=8545
fi

testrpc_running() {
	nc -z localhost "$testrpc_port"
}

start_testrpc() {
	if [ "$SOLIDITY_COVERAGE" = true ]; then
		testrpc-sc -i 16 --gasLimit 0xfffffffffff --port "$testrpc_port" -m \
     'fat super pupil virus rather alpha man surface drive increase trap winter' > /dev/null &
	elif [ "$TRUFFLE_TEST" = true ]; then
		ganache-cli -i 15 --gasLimit 50000000 --port "$testrpc_port" -m \
     'fat super pupil virus rather alpha man surface drive increase trap winter' > /dev/null &
	elif [ "$START_KIT" = true ]; then
		aragon devchain --port "$testrpc_port" &
	elif [ "$RESTART_KIT" = true ] || [ "$CYPRESS" = true ]; then
		rm -rf ~/.ipfs
		aragon devchain --reset --port "$testrpc_port" &
	fi

	testrpc_pid=$!
}

if testrpc_running; then
	echo "Killing testrpc instance at port $testrpc_port"
	kill -9 "$(lsof -i:"$testrpc_port" -sTCP:LISTEN -t)"
fi

echo "Starting our own testrpc instance at port $testrpc_port"
start_testrpc
sleep 5

# Exit error mode so the testrpc instance always gets killed
set +e
result=0
if [ "$SOLIDITY_COVERAGE" = true ]; then
	./utils/coverage-prep.sh
	solidity-coverage "$@"
	result=$?
elif [ "$TRUFFLE_TEST" = true ]; then
	./utils/test.sh | grep -v 'Compiling'
	result=$?
elif [ "$START_KIT" = true ] || [ "$RESTART_KIT" = true ]; then
	npm run publish:apps && npm run start:kit
	result=$?
elif [ "$DEV" = true ]; then
	npm run publish:http && npm run start:kit
	result=$?
elif [ "$CYPRESS" = true ]; then
	npm run publish:apps && npm run start:kit &> /dev/null &
	npm run cypress:run
	result=$?
	kill -9 "$(lsof -i:3000 -sTCP:LISTEN -t)" # kill parcel dev server
	kill -9 "$(lsof -i:8080 -sTCP:LISTEN -t)" # kill IPFS daemon
fi

kill -9 $testrpc_pid

exit $result
