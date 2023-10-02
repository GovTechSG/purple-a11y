#!/bin/bash

echo "hats Shell - Created By younglim - NO WARRANTY PROVIDED"
echo "================================================================"
echo ""

CURR_FOLDERNAME=$(basename "$PWD")
if [[ "$CURR_FOLDERNAME" = "scripts" ]]; then
  cd ..
  CURR_FOLDERNAME="$(basename "$PWD")"
fi

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get current shell command
SHELL_COMMAND=$(ps -o comm= -p $$)
SHELL_NAME="${SHELL_COMMAND#-}"

if [[ $(uname -m) == 'arm64' ]]; then
    export ROSETTA2_STATUS_RESULT=$(/usr/bin/pgrep -q oahd && echo true || echo false)
    if ! $ROSETTA2_STATUS_RESULT; then   
        echo "Installing Rosetta 2 dependency"
        /usr/sbin/softwareupdate --install-rosetta --agree-to-license
    fi

    echo "Switching to x86_64 shell"
    arch -x86_64 $SHELL_NAME "$0" "$@"
    
else

    echo "INFO: Setting path to node for this session"
    export PATH_TO_NODE="$__dir/nodejs-mac-x64/bin"
    export PATH="$PATH_TO_NODE:$PATH"

    echo "INFO: Set path to node_modules for this session"
    if find ./purple-hats -name "node_modules" -maxdepth 1 -type l -ls &> /dev/null; then
        export PATH="$__dir/purple-hats/node_modules/.bin:$PATH"
    else
        export PATH="$__dir/node_modules/.bin:$PATH"
    fi

    echo "INFO: Set path to Java JRE"
    export JAVA_HOME="$__dir/jre"
    export PATH="$JAVA_HOME/bin:$PATH"

    echo "INFO: Set path to VeraPDF"
    export PATH="$__dir/verapdf:$PATH"

    echo "INFO: Set path to Playwright cache for this session"
    export PLAYWRIGHT_BROWSERS_PATH="$__dir/ms-playwright"
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="true"

    echo "INFO: Removing com.apple.quarantine attributes for required binaries to run"
    xattr -rd com.apple.quarantine . &>/dev/null

    eval "$1"
fi