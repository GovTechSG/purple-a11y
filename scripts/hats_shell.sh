#!/bin/bash

echo "hats Shell - Created By younglim - NO WARRANTY PROVIDED"
echo "================================================================"
echo ""

CURR_FOLDERNAME=$(basename "$PWD")
if [ $CURR_FOLDERNAME = "scripts" ]; then
  cd ..
  CURR_FOLDERNAME=$(basename $PWD)
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

echo "INFO: Set path to node_modules for this session"
if find ./purple-hats -name "node_modules" -maxdepth 1 -type l -ls &> /dev/null; then
    export PATH="$PWD/purple-hats/node_modules/.bin:$PATH"
else
    export PATH="$PWD/node_modules/.bin:$PATH"
fi

echo "INFO: Set path to Playwright cache for this session"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/ms-playwright"

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

echo "INFO: Removing com.apple.quarantine attributes for required binaries to run"
xattr -rd com.apple.quarantine . &>/dev/null
