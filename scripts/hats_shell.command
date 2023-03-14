#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ${PWD##*/} = "scripts" ]; then
  cd ..
fi

source "$(dirname "$0")/hats_shell.sh"

zsh
