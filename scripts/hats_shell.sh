#!/bin/bash

echo "hats Shell - Created By younglim - NO WARRANTY PROVIDED"
echo "================================================================"
echo ""

if ! command -v python3 &> /dev/null
then
    xcode-select --install
    echo "installed python3 and xcode"
fi

export CURRENT_PATH="$(pwd)"
echo "INFO: Stored current working directory at $CURRENT_PATH"

export PATH_TO_HATS="$(dirname "$0")"
cd $PATH_TO_HATS
echo "INFO: Set path to hats $(pwd)"

echo "INFO: Set path to node for this session"
export PATH="$(pwd)/nodejs/bin:$PATH"

export PATH_TO_BETTER_SQLITE3="../node_modules/better-sqlite3-with-prebuilds/build/Release/better_sqlite3.node"
echo "path to better_sqlite3: $PATH_TO_BETTER_SQLITE3"

export PATH_TO_NODE="../nodejs/bin/node"
echo "path to node: $PATH_TO_NODE"

declare -a exec=($PATH_TO_BETTER_SQLITE3 $PATH_TO_NODE)

for p in ${exec[@]} ; do
    xattr -d com.apple.quarantine $p
done

if [[ "$OSTYPE" == "darwin"* ]]; then
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
    export PUPPETEER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    echo "using chrome instead of puppeteer"
fi
