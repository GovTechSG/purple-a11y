#!/bin/bash

echo "hats Shell - Created By younglim - NO WARRANTY PROVIDED"
echo "================================================================"
echo ""

if [ ${PWD##*/} = "scripts" ]; then
  cd ..
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
	ln -sf "$(ls -d $PWD/ImageMagick-*)" "purple-hats/$(ls -d ImageMagick-*)"

    echo "INFO: Set path to ImageMagick"
    export PATH="$(ls -d $PWD/ImageMagick-*/bin):$PATH"

fi

echo "INFO: Path to node: $PATH_TO_NODE"

echo "INFO: Removing com.apple.quarantine attributes for required binaries to run"
find ./**/ImageMagick*/bin -exec xattr -d com.apple.quarantine {} \;&>/dev/null
find ./**/ImageMagick*/lib/*.dylib -exec xattr -d com.apple.quarantine {} \;&>/dev/null
find ./**/ms-playwright/**/** -maxdepth 0 -name "*.app" -exec xattr -d com.apple.quarantine {} \;&>/dev/null
xattr -d com.apple.quarantine $PATH_TO_NODE/node &>/dev/null

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

