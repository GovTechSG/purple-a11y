#!/bin/bash

source "$(dirname "$0")/hats_shell.sh"

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ${PWD##*/} = "scripts" ]; then
  cd ..
fi

zsh
