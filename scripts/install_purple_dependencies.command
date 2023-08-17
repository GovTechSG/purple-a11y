#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

CURR_FOLDERNAME=$(basename $PWD)
if [ $CURR_FOLDERNAME = "scripts" ]; then
  cd ..
  CURR_FOLDERNAME=$(basename $PWD)
fi

if ! [ -f nodejs-mac-arm64/bin/node ]; then
  echo "Downloading NodeJS LTS (ARM64)"
  curl -o ./nodejs-mac-arm64.tar.gz --create-dirs https://nodejs.org/dist/v18.12.1/node-v18.12.1-darwin-arm64.tar.gz  
  mkdir nodejs-mac-arm64 && tar -xzf nodejs-mac-arm64.tar.gz -C nodejs-mac-arm64 --strip-components=1 && rm ./nodejs-mac-arm64.tar.gz
fi

if ! [ -f nodejs-mac-x64/bin/node ]; then
  echo "Downloading NodeJS LTS (x64)"
  curl -o ./nodejs-mac-x64.tar.gz --create-dirs https://nodejs.org/dist/v18.12.1/node-v18.12.1-darwin-x64.tar.gz     
  mkdir nodejs-mac-x64 && tar -xzf nodejs-mac-x64.tar.gz -C nodejs-mac-x64 --strip-components=1 && rm ./nodejs-mac-x64.tar.gz
fi

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source ${__dir}/hats_shell.sh

if [ -d "/Applications/Cloudflare WARP.app" ]; then
  curl -sSLJ -o "/tmp/Cloudflare_CA.pem" "https://developers.cloudflare.com/cloudflare-one/static/documentation/connections/Cloudflare_CA.pem"
  export NODE_EXTRA_CA_CERTS="/tmp/Cloudflare_CA.pem"
fi

if ! [ -f package.json ] && [ -d purple-hats ]; then
  cd purple-hats
fi

if [ -d "node_modules" ]; then
  echo "Deleting node_modules before installation"
  rm -rf node_modules 
fi

echo "Installing Node dependencies to $PWD"
npm ci --force







