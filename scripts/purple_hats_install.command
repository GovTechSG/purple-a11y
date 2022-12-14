#!/bin/bash

source "$(dirname "$0")/hats_shell.sh"

cd purple-hats

if [ -d "node_modules" ]; then
  rm -rf node_modules 
fi

echo "Installing dependencies..."
npm ci

