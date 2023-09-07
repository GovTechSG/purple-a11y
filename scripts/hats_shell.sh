#!/bin/bash

echo "hats Shell - Created By younglim - NO WARRANTY PROVIDED"
echo "================================================================"
echo ""

__dir="$PWD"

CURR_FOLDERNAME=$(basename "$PWD")
if [[ $CURR_FOLDERNAME = "scripts" ]]; then
  cd ..
  CURR_FOLDERNAME=$(basename "$PWD")
fi

if [[ $(uname -m) == 'arm64' ]]; then
    export ROSETTA2_STATUS_RESULT=$(/usr/bin/pgrep -q oahd && echo true || echo false)
    if ! $ROSETTA2_STATUS_RESULT; then   
        echo "Installing Rosetta 2 dependency"
        /usr/sbin/softwareupdate --install-rosetta --agree-to-license
    fi
fi

echo "INFO: Setting path to node for this session"
if [[ $(uname -m) == 'arm64' ]]; then
    export PATH_TO_NODE="$(pwd)/nodejs-mac-arm64/bin"
    export PATH="$PATH_TO_NODE:$PATH" 
else
    export PATH_TO_NODE="$(pwd)/nodejs-mac-x64/bin"
    export PATH="$PATH_TO_NODE:$PATH"
fi

echo "INFO: Set path to node_modules for this session"
if find ./purple-hats -name "node_modules" -maxdepth 1 -type l -ls &> /dev/null; then
    export PATH="$PWD/purple-hats/node_modules/.bin:$PATH"
else
    export PATH="$PWD/node_modules/.bin:$PATH"
fi

echo "INFO: Set path to Java JRE"
export JAVA_HOME="$(PWD)/jre"
export PATH="$JAVA_HOME/bin:$PATH"

echo "INFO: Set path to Playwright cache for this session"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/ms-playwright"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="true"

echo "INFO: Removing com.apple.quarantine attributes for required binaries to run"
xattr -rd com.apple.quarantine . &>/dev/null

$@
