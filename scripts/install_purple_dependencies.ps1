# If currently within script, go one directory up
if ((Split-Path -Path $pwd -Leaf) -eq "scripts") {
	cd ..
}

$ProgressPreferences = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

# Install NodeJS binaries
if (-Not (Test-Path nodejs-win\node.exe)) {
    Write-Output "Downloading Node"
    Invoke-WebRequest -o ./nodejs-win.zip "https://nodejs.org/dist/v18.12.1/node-v18.12.1-win-x64.zip"     
    
    Write-Output "Unzip Node"
    Expand-Archive .\nodejs-win.zip -DestinationPath .
    Rename-Item node-v18.12.1-win-x64 -NewName nodejs-win
    Remove-Item -Force .\nodejs-win.zip
}

# Install Coretto-11
if (-Not (Test-Path jdk\bin\java.exe)) {
    Write-Output "Downloading Corretto-11"
    Invoke-WebRequest -o ./corretto-11.zip "https://corretto.aws/downloads/latest/amazon-corretto-11-x64-windows-jdk.zip"     
    
    Write-Output "Unzip Corretto-11"
    Expand-Archive .\corretto-11.zip -DestinationPath .
    Get-ChildItem ./jdk* -Directory | Rename-Item -NewName jdk
    Remove-Item -Force .\corretto-11.zip
}

# Install Node dependencies
if (Test-Path purple-hats) {
    Write-Output "Installing node dependencies"
    & ".\hats_shell_ps.ps1" "cd purple-hats;npm ci --force"

    # Omit installing Playwright browsers as it is not reuqired
    # Write-Output "Install Playwright browsers"
    # & ".\hats_shell_ps.ps1" "npx playwright install chromium"
    
    if (Test-Path purple-hats\.git) {
        Write-Output "Unhide .git folder"
        attrib -s -h purple-hats\.git
    }

} else {
    Write-Output "Trying to search for package.json instead"

    if (Test-Path package.json) {
        Write-Output "Installing node dependencies"
        & ".\hats_shell_ps.ps1" "npm ci --force" 

        Write-Output "Install Playwright browsers"
        & "npx playwright install chromium"
        
        if (Test-Path .git) {
            Write-Output "Unhide .git folder"
            attrib -s -h .git
        }

    } else {
        Write-Output "Could not find purple-hats"
    }
}
