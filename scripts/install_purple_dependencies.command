#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

if ! [ -f amazon-corretto-11.jdk/Contents/Home/bin/java ]; then
  curl -L -o ./corretto-11.tar.gz "https://corretto.aws/downloads/latest/amazon-corretto-11-x64-macos-jdk.tar.gz"
  tar -zxvf ./corretto-11.tar.gz
  rm -f ./corretto-11.tar.gz
fi

if ! [ -f verapdf/verapdf ]; then
  echo "Downloading VeraPDF"
  curl -L -o ./verapdf-installer.zip http://downloads.verapdf.org/rel/verapdf-installer.zip
  unzip -j ./verapdf-installer.zip -d ./verapdf-installer
  export JAVA_HOME="$PWD/amazon-corretto-11.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
  ./verapdf-installer/verapdf-install "${__dir}/verapdf-auto-install-macos.xml"
  cp -r /tmp/verapdf .
  rm -rf ./verapdf-installer.zip ./verapdf-installer /tmp/verapdf
  
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

echo "Installing Playwright browsers"
npx playwright install webkit







