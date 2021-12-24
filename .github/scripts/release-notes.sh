#!/bin/bash
set -e

if [ $# -ne 8 ]; then
  echo "usage: $0 <outputPath> <app> <network> <version> <cid> <contract> <commit> <txhash>"
  exit -1
fi

output=$1
app=$2
network=$3
version=$4
cid=$5
contract=$6
commit=$7
txhash=$8

cat << EOF> $output
  date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
  app: $app.aragonpm.eth
  network: $network
  version: $version
  txHash: $txhash
  ipfsHash: $cid
  contractAddress: $contract
  commitHash: $commit
EOF
