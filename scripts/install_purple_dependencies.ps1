# If currently within script, go one directory up
if ((Split-Path -Path $pwd -Leaf) -eq "scripts") {
	cd ..
}

$ProgressPreferences = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

# Install Git binaries
if (-Not (Test-Path git\git-cmd.exe)) {
    Write-Output "Downloading Git"
    Invoke-WebRequest -o ".\PortableGit.7z.exe" "https://github.com/git-for-windows/git/releases/download/v2.39.1.windows.1/PortableGit-2.39.1-64-bit.7z.exe"

    Write-Output "Unzip Git"
    .\PortableGit.7z.exe -o ".\git" -y | Out-Null
    Remove-Item -Force .\PortableGit.7z.exe
}

# Install NodeJS binaries
if (-Not (Test-Path nodejs-win\node.exe)) {
    Write-Output "Downloading Node"
    Invoke-WebRequest -o ./nodejs-win.zip "https://nodejs.org/dist/v18.12.1/node-v18.12.1-win-x64.zip"     
    
    Write-Output "Unzip Node"
    Expand-Archive .\nodejs-win.zip -DestinationPath .
    Rename-Item node-v18.12.1-win-x64 -NewName nodejs-win
    Remove-Item -Force .\nodejs-win.zip
}

# Install Image<agick
if (-Not (Test-Path ImageMagick\bin\compare.exe)) {
    Write-Output "Downloading ImageMagick (Mirror)"
    Invoke-WebRequest -o ./ImageMagick-win.zip "https://mirror.checkdomain.de/imagemagick/binaries/ImageMagick-7.1.1-3-portable-Q16-x64.zip"
    Expand-Archive .\ImageMagick-win.zip -DestinationPath ImageMagick\bin
    Remove-Item -Force .\ImageMagick-win.zip
}

# Install Node dependencies
if (Test-Path purple-hats) {
    Write-Output "Installing node dependencies"
    & ".\hats_shell_ps.ps1" "cd purple-hats;npm ci"

    if (Test-Path purple-hats\.git) {
        Write-Output "Unhide .git folder"
        attrib -s -h purple-hats\.git
    }

} else {
    Write-Output "Trying to search for package.json instead"

    if (Test-Path package.json) {
        Write-Output "Installing node dependencies"
        & ".\hats_shell_ps.ps1" "npm ci"   
    
        if (Test-Path .git) {
            Write-Output "Unhide .git folder"
            attrib -s -h .git
        }

    } else {
        Write-Output "Could not find purple-hats"
    }
}
