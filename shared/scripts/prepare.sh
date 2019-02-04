#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

install_frontend( {
  npm run install:frontend
}

if [ "$INSTALL_FRONTENDS" = true ]; then
  install_frontend
else
  echo "Skipping frontend installation"
fi
