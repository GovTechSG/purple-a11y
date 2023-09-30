#!/bin/bash

# Installation script for canvas on MacOS arm64

# Go up one level of scripts folder
CURR_FOLDERNAME="$(basename "$PWD")"
if [ "$CURR_FOLDERNAME" = "scripts" ]; then
  cd ..
  CURR_FOLDERNAME="$(basename "$PWD")"
fi

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set canvas version
CANVAS_VERSION="2.11.2"

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
brew install pkg-config cairo pango libpng giflib librsvg

echo "Cleanup brew dependencies to reduce disk space"
brew list | grep -vE 'pkg-config|cairo|pango|libpng|giflib|librsvg|pixman|glib|gettext|libx11|harfbuzz|jpeg-turbo|libxau|libxcb|libxdmcp|libxext|libxrender|pcre2|fontconfig|freetype|fribidi|graphite2|xorgproto' | xargs brew uninstall --force --ignore-dependencies
brew cleanup --prune=all

echo "Install canvas globally"
npm install canvas@$CANVAS_VERSION -g

echo "Check if canvas is installed"
if npm list -g canvas > /dev/null 2>&1; then
  echo "Successuflly installed canvas"

  echo "Link arm64 canvas"
  if ! [ -f package.json ] && [ -d purple-hats ]; then
    cd purple-hats
  fi
  npm link canvas
  
  echo "Create tar.gz of dependencies"
  cd "$__dir"
  tar -czf "node-canvas-$CANVAS_VERSION.macos-arm64.tar.gz" homebrew nodejs-mac-arm64/lib/node_modules/canvas

else
  echo "Error occured intalling canvas. Please install canvas manually with npm install canvas@$CANVAS_VERSION -g"
fi
