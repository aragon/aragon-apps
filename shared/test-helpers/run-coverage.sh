SOLIDITY_COVERAGE=true ./node_modules/@aragon/test-helpers/ganache-cli.sh
./node_modules/.bin/solidity-coverage
kill -9 $(lsof -i:8555 -t)
