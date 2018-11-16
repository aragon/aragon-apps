#!/bin/bash

RED="\033[1;31m"
NOCOLOR="\033[0m"

echo -e "${RED}Removing all node_module folders recursively${NOCOLOR}"
find . -name "node_modules" -exec rm -rf '{}' +
find . -name "package-lock.json" -exec rm -rf '{}' +
