#!/bin/bash

source "$(dirname "$0")/hats_shell.sh"

cd purple-hats

echo "Installing Node dependencies..."

if [ -d "node_modules" ]; then
  rm -rf node_modules 
fi

if [ -d "/Applications/Cloudflare WARP.app" ]; then
  curl -sSLJ -o "/tmp/Cloudflare_CA.pem" "https://developers.cloudflare.com/cloudflare-one/static/documentation/connections/Cloudflare_CA.pem"
  export NODE_EXTRA_CA_CERTS="/tmp/Cloudflare_CA.pem"
fi

npm ci

echo "Downloading ImageMagick"

mkdir -p bin && cd bin

curl -sSLJ -O "https://imagemagick.org/archive/binaries/ImageMagick-x86_64-apple-darwin20.1.0.tar.gz"
tar -xf "ImageMagick-x86_64-apple-darwin20.1.0.tar.gz"
if [ -f "ImageMagick-*.tar.gz" ]; then
  rm ImageMagick-*.tar.gz
fi




