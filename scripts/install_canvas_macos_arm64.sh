#!/bin/bash

# Installation script for canvas on MacOS arm64

# Go up one level of scripts folder
CURR_FOLDERNAME="$(basename "$PWD")"
if [ "$CURR_FOLDERNAME" = "scripts" ]; then
  cd ..
  CURR_FOLDERNAME="$(basename "$PWD")"
fi

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get the machine architecture
arch=$(uname -m)

# Check if the architecture is not arm64
if [ "$arch" != "arm64" ]; then
  echo "This script requires macOS to be running on an arm64 architecture."
  exit 1
fi

if ! xcode-select -p &>/dev/null; then
  echo "Xcode Command Line Tools are not installed. Installing..."
  # Install XCode Command Line Tools.
  xcode-select --install &> /dev/null

  echo "Installation of Xcode Command Line Tools initiated. Please follow the installation prompts."
  # Wait until XCode Command Line Tools installation has finished.
  until $(xcode-select --print-path &> /dev/null); do
    sleep 5;
  done

else
  echo "Xcode Command Line Tools are already installed."
fi

# Set environment variables for brew
export HOMEBREW="$PWD/homebrew"
export PATH="$HOMEBREW/bin:$PATH"
export LDFLAGS="-L$HOMEBREW/opt/jpeg/lib"
export CPPFLAGS="-I$HOMEBREW/opt/jpeg/include"
export PKG_CONFIG_PATH="$HOMEBREW/opt/jpeg/lib/pkgconfig"

echo "Install homebrew portable"
mkdir homebrew && curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1 -C homebrew

echo "Install canvas dependencies for arm64"
brew install pkg-config cairo pango librsvg giflib 

echo "Install macpack utility"
pip3 install macpack

source "${__dir}/hats_shell.sh"

echo "Install purple dependencies"
if ! [ -f package.json ] && [ -d purple-hats ]; then
  cd purple-hats
fi

npm install

echo "Check if canvas is installed"
if npm list canvas > /dev/null 2>&1; then
  echo "Successuflly installed canvas"

  echo "Binding canvas dependencies"
  python3 ~/Library/Python/*/lib/python/site-packages/macpack/patcher.py ./node_modules/canvas/build/Release/canvas.node -d . -v
  
  echo "Create tar.gz of canvas dependencies"
  tar -czf "$__dir/node-canvas-libs.macos-arm64.tar.gz" --directory=./node_modules/canvas/build Release

else
  echo "Error occured intalling canvas. Please install canvas manually with npm install canvas@$CANVAS_VERSION -g"
fi

cd "$__dir"


