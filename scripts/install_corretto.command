#!/bin/bash

__dir="$PWD"
export CORRETTO_BASEDIR="$HOME/Library/Application Support/Purple HATS"
mkdir -p "$CORRETTO_BASEDIR" 

cd "$CORRETTO_BASEDIR" 

if [[ $(uname -m) == 'arm64' ]]; then
  if ! [ -f amazon-corretto-11.jdk.aarch64/Contents/Home/bin/java ]; then
    echo "Downloading Corretto (aarch64)"
    curl -L -o ./corretto-11.tar.gz "https://corretto.aws/downloads/latest/amazon-corretto-11-aarch64-macos-jdk.tar.gz"
    tar -zxvf ./corretto-11.tar.gz
    rm -f ./corretto-11.tar.gz
    mv amazon-corretto-11.jdk amazon-corretto-11.jdk.aarch64
  else
    echo "Found Corretto (aarch64)"
  fi

elif ! [ -f amazon-corretto-11.jdk.x64/Contents/Home/bin/java ]; then
    echo "Downloading Corretto (x64)"
    curl -L -o ./corretto-11.tar.gz "https://corretto.aws/downloads/latest/amazon-corretto-11-x64-macos-jdk.tar.gz"
    tar -zxvf ./corretto-11.tar.gz
    rm -f ./corretto-11.tar.gz
    mv amazon-corretto-11.jdk amazon-corretto-11.jdk.x64
else
  echo "Found Corretto (x64)"
fi

echo "INFO: Set path to Corretto-11 JDK"
if [[ $(uname -m) == 'arm64' ]]; then
    export JAVA_HOME="$CORRETTO_BASEDIR/amazon-corretto-11.jdk.aarch64/Contents/Home"
else
    export JAVA_HOME="$CORRETTO_BASEDIR/amazon-corretto-11.jdk.x64/Contents/Home"
fi

export PATH="$JAVA_HOME/bin:$PATH"

cd "$__dir"