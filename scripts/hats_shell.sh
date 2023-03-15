#!/bin/bash

echo "hats Shell - Created By younglim - NO WARRANTY PROVIDED"
echo "================================================================"
echo ""

CURR_FOLDERNAME=$(basename $PWD)
if [ $CURR_FOLDERNAME = "scripts" ]; then
  cd ..
  CURR_FOLDERNAME=$(basename $PWD)
fi

if ! command -v python3 &> /dev/null
then
    echo "Installing Xcode CLI Tools"
    xcode-select --install
fi

if [[ $(uname -m) == 'arm64' ]]; then
    export ROSETTA2_STATUS_RESULT=$(/usr/bin/pgrep -q oahd && echo true || echo false)
    if ! $ROSETTA2_STATUS_RESULT; then   
        echo "Installing Rosetta 2 dependency"
        /usr/sbin/softwareupdate --install-rosetta --agree-to-license
    fi
fi

echo "INFO: Setting path to node for this session"
if [[ $(uname -m) == 'arm64' ]]; then
    export PATH_TO_NODE="$(pwd)/nodejs-mac-arm64/bin"
    export PATH="$PATH_TO_NODE:$PATH" 
else
    export PATH_TO_NODE="$(pwd)/nodejs-mac-x64/bin"
    export PATH="$PATH_TO_NODE:$PATH"
fi

if $(ls ImageMagick-*/bin/compare 1> /dev/null 2>&1) && [ -d purple-hats ]; then
	echo "INFO: Set symbolic link to ImageMagick"
   
    if find ./purple-hats -name "ImageMagick*" -maxdepth 1 -type l -ls &> /dev/null; then
        unlink ./purple-hats/ImageMagick* &>/dev/null
    fi

    export IMAGEMAGICK_FOLDERNAME=$(ls -d ImageMagick-*)
    export PATH_TO_IMAGEMAGICK="$PWD/$IMAGEMAGICK_FOLDERNAME"
    ln -sf "$PATH_TO_IMAGEMAGICK" "./purple-hats/$IMAGEMAGICK_FOLDERNAME"

    echo "INFO: Set path to ImageMagick binaries"
    export PATH="$PATH_TO_IMAGEMAGICK/bin:$PATH"

fi

echo "INFO: Path to node: $PATH_TO_NODE"

echo "INFO: Removing com.apple.quarantine attributes for required binaries to run"
xattr -rd com.apple.quarantine . &>/dev/null

export PUPPETEER_SKIP_DOWNLOAD='true'
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD='true'

if [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    echo "INFO: Using Google Chrome instead of Puppeteer's downloaded browser for web crawls"
    export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
    echo "INFO: Using Playwright Chromium instead of Puppeteer's downloaded browser for web crawls"
    export PUPPETEER_EXECUTABLE_PATH="$(find $PWD/**/ms-playwright/**/** -maxdepth 0 -name 'Chromium.app')"
fi

export PLAYWRIGHT_BROWSERS_PATH="$PWD/ms-playwright"

