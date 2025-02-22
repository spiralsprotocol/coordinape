#!/bin/bash
set -e
SCRIPT_DIR="$(dirname $BASH_SOURCE[0])"
FIND_DEV_PID="lsof -t -i:8545 -sTCP:LISTEN"

while [[ "$#" > 0 ]]; do case $1 in
  --full) FULL=1;;
esac; shift; done

if [ "$FULL" ]; then
#  git submodule update --init --recursive
  yarn --cwd hardhat install --frozen-lockfile
  yarn --cwd hardhat compile

  echo "Starting node for auto deployment..."
  yarn hardhat:dev >/dev/null &

  while [ ! $(eval $FIND_DEV_PID) ]; do
    sleep 1
  done
  yarn --cwd hardhat deploy
fi

yarn --cwd hardhat codegen
yarn --cwd hardhat build

if [ "$FULL" ]; then
  echo "Stopping node. The 'Command failed' messages that follow are normal."
  kill $(eval $FIND_DEV_PID)
fi

$SCRIPT_DIR/link_hardhat.sh
