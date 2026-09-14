#!/bin/bash

echo "oobee Shell - Created By younglim - NO WARRANTY PROVIDED"
echo "================================================================"
echo ""

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_DIR="$PWD"

CURR_FOLDERNAME="$(basename "$PWD")"

if [ "$CURR_FOLDERNAME" = "scripts" ]; then
  cd ..
  CURR_FOLDERNAME="$(basename "$PWD")"
fi

# Get current shell command
SHELL_COMMAND=$(ps -o comm= -p $$)
SHELL_NAME="${SHELL_COMMAND#-}"

if [[ $(uname -m) == 'arm64' ]]; then
    echo "INFO: Setting path to node arm64 for this session"
    export PATH_TO_NODE="$PWD/nodejs-mac-arm64/bin"

else
    echo "INFO: Setting path to node x64 for this session"
    export PATH_TO_NODE="$PWD/nodejs-mac-x64/bin"
fi


export PATH="$PATH_TO_NODE:$PATH"

echo "INFO: Set path to node_modules for this session"
if find ./oobee -name "node_modules" -maxdepth 1 -type l -ls &> /dev/null; then
    export PATH="$PWD/oobee/node_modules/.bin:$PATH"
else
    export PATH="$PWD/node_modules/.bin:$PATH"
fi

echo "INFO: Set path to Java JRE"
export JAVA_HOME="$PWD/jre"
export PATH="$JAVA_HOME/bin:$PATH"

echo "INFO: Set path to VeraPDF"
export PATH="$PWD/verapdf:$PATH"

echo "INFO: Set path to Playwright cache for this session"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/ms-playwright"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="true"

echo "INFO: Removing com.apple.quarantine attributes for required binaries to run"
# Only strip Gatekeeper quarantine from the specific tool trees that oobee
# itself just installed and verified — not the whole working directory, which
# would also unquarantine any attacker-planted files that happened to land
# alongside them (part of the asgard-0003 hardening).
for _oobee_quarantine_dir in \
  "$PWD/nodejs-mac-arm64" \
  "$PWD/nodejs-mac-x64" \
  "$PWD/jre" \
  "$PWD/verapdf"; do
  if [ -e "$_oobee_quarantine_dir" ]; then
    xattr -rd com.apple.quarantine "$_oobee_quarantine_dir" &>/dev/null || true
  fi
done
unset _oobee_quarantine_dir

cd "$ORIGINAL_DIR"
$@