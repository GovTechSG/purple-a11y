#!/bin/zsh

cd "$(dirname "${BASH_SOURCE[0]}")"

# Get current shell command
SHELL_COMMAND=$(ps -o comm= -p $$)
SHELL_NAME="${SHELL_COMMAND#-}"
CURR_FOLDERNAME="$(dirname "$0")"
echo "$CURR_FOLDERNAME"

if [[ $(uname -m) == 'arm64' ]]; then
    export ROSETTA2_STATUS_RESULT=$(/usr/bin/pgrep -q oahd && echo true || echo false)
    if ! $ROSETTA2_STATUS_RESULT; then   
        echo "Installing Rosetta 2 dependency"
        /usr/sbin/softwareupdate --install-rosetta --agree-to-license
    fi

    arch -x86_64 $SHELL_NAME "$CURR_FOLDERNAME/hats_shell.sh" $SHELL_NAME
    
else
    $SHELL_NAME "$CURR_FOLDERNAME/hats_shell.sh" $SHELL_NAME 
fi